import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("payment_id");
    const sessionId = url.searchParams.get("session_id");

    if (!paymentId || !sessionId) {
      return NextResponse.json(
        { error: "Payment ID and Session ID are required" },
        { status: 400 }
      );
    }

    // Verify the payment with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-03-31.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 400 }
      );
    }

    // Check if this payment has already been processed
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    
    if (paymentDoc.exists && paymentDoc.data()?.status === "completed") {
      return NextResponse.json(
        { 
          success: true,
          message: "Payment already processed",
          contestId: paymentDoc.data()?.contestId 
        }
      );
    }
    
    // Update payment status to verified (but not yet completed)
    await adminDb.collection("payments").doc(paymentId).update({
      status: "verified",
      stripeSessionId: sessionId,
      verifiedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      {
        error: "Failed to verify payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}