import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { amount, paymentId, contestTitle, userEmail, userId } = await request.json();

    if (!amount || !paymentId || !userEmail) {
      return NextResponse.json(
        { error: "Amount, payment ID, and user email are required" },
        { status: 400 }
      );
    }

    // Verify that the payment record exists
    if (!adminDb) {
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: contestTitle || "Contest Payment",
              description: "Payment for contest creation",
            },
            unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/brand/dashboard/contests/new?canceled=true`,
      customer_email: userEmail,
      metadata: {
        paymentId,
        userId,
      },
    });

    // Update payment record with sessionId
    await adminDb.collection("payments").doc(paymentId).update({
      stripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
