import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { payoutId } = await request.json();

    if (!payoutId) {
      return NextResponse.json(
        { error: "Payout ID is required" },
        { status: 400 }
      );
    }

    // Get the payout document
    const payoutDoc = await adminDb.collection("payouts").doc(payoutId).get();
    
    if (!payoutDoc.exists) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      );
    }

    const payoutData = payoutDoc.data();

    // Make sure it's not already processed
    if (payoutData?.status !== "pending") {
      return NextResponse.json(
        { error: `Payout cannot be processed. Current status: ${payoutData?.status}` },
        { status: 400 }
      );
    }

    // Get contest data to ensure funds are available
    const contestDoc = await adminDb.collection("contests").doc(payoutData.contestId).get();
    const contestData = contestDoc.data();

    // Make sure the contest payment has been processed
    if (!contestData?.paymentStatus || contestData?.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Contest payment has not been processed yet" },
        { status: 400 }
      );
    }

    // Get the payment record for the contest
    const paymentsSnapshot = await adminDb
      .collection("payments")
      .where("contestId", "==", payoutData.contestId)
      .where("status", "==", "succeeded")
      .get();

    if (paymentsSnapshot.empty) {
      return NextResponse.json(
        { error: "No successful payment found for this contest" },
        { status: 400 }
      );
    }

    // Get the payment intent ID
    const paymentData = paymentsSnapshot.docs[0].data();
    const paymentIntentId = paymentData.stripePaymentIntentId;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent ID found" },
        { status: 400 }
      );
    }

    // Calculate the platform fee (you can adjust this as needed)
    const platformFeePercentage = 0.10; // 10% platform fee
    const amount = payoutData.amount;
    const platformFee = Math.round(amount * platformFeePercentage);
    const creatorAmount = amount - platformFee;

    // Create a transfer to the creator's connected account
    const transfer = await stripe.transfers.create({
      amount: creatorAmount, // Amount in cents after platform fee
      currency: "usd",
      destination: payoutData.stripeConnectId,
      transfer_group: payoutData.contestId, // Group transfers by contest
      metadata: {
        payoutId: payoutId,
        contestId: payoutData.contestId,
        userId: payoutData.userId,
        position: payoutData.position,
        originalAmount: amount,
        platformFee: platformFee
      }
    });

    // Update the payout document
    await adminDb.collection("payouts").doc(payoutId).update({
      status: "completed",
      stripeTransferId: transfer.id,
      platformFee: platformFee,
      creatorAmount: creatorAmount,
      processedAt: new Date().toISOString()
    });

    // Update the winner status in the contest
    const contestWinners = contestData.winners || [];
    const updatedWinners = contestWinners.map((winner: { userId: string; position: number; payoutStatus?: string; payoutProcessedAt?: string; }) => {
      if (winner.userId === payoutData.userId && winner.position === payoutData.position) {
        return {
          ...winner,
          payoutStatus: "completed",
          payoutProcessedAt: new Date().toISOString()
        };
      }
      return winner;
    });

    await adminDb.collection("contests").doc(payoutData.contestId).update({
      winners: updatedWinners
    });

    return NextResponse.json({
      success: true,
      transfer: transfer.id,
      amount: creatorAmount
    });
  } catch (error) {
    console.error("Error processing payout:", error);
    return NextResponse.json(
      {
        error: "Failed to process payout",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}