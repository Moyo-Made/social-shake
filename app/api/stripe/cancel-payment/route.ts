import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, paymentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent ID is required" },
        { status: 400 }
      );
    }

    // Cancel the payment intent
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    // Update payment record
    if (paymentId && adminDb) {
      await adminDb.collection("payments").doc(paymentId).update({
        cancelled: true,
        cancelledAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: paymentIntent.status,
        status: "cancelled",
      });
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
      },
    });
  } catch (error) {
    console.error("Error canceling payment:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}