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

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    // Update payment record
    if (paymentId && adminDb) {
      await adminDb.collection("payments").doc(paymentId).update({
        captured: true,
        capturedAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: paymentIntent.status,
      });
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      },
    });
  } catch (error) {
    console.error("Error capturing payment:", error);
    return NextResponse.json(
      {
        error: "Failed to capture payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}