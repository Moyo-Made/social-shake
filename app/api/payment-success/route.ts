import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function GET(request: NextRequest) {
  try {
    // Get the payment_id and session_id from URL params
    const url = new URL(request.url);
    const paymentId = url.searchParams.get('payment_id');
    const sessionId = url.searchParams.get('session_id');
    
    if (!paymentId || !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing payment ID or session ID" 
      }, { status: 400 });
    }
    
    // Verify the payment record exists
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: "Payment record not found" 
      }, { status: 404 });
    }
    
    const paymentData = paymentDoc.data();
    
    // Check that the session ID matches
    if (paymentData?.stripeSessionId !== sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID mismatch" 
      }, { status: 400 });
    }
    
    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Get the payment intent
    const paymentIntentId = session.payment_intent as string;
    if (!paymentIntentId) {
      return NextResponse.json({ 
        success: false, 
        error: "No payment intent found" 
      }, { status: 400 });
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Check payment status - for manual capture, "requires_capture" is a successful state
    // The payment is authorized but not yet captured
    const isSuccessful = 
      paymentIntent.status === "succeeded" || 
      paymentIntent.status === "requires_capture";
    
    if (!isSuccessful) {
      return NextResponse.json({ 
        success: false, 
        error: `Payment not successful. Status: ${paymentIntent.status}` 
      }, { status: 400 });
    }
    
    // Update payment record with payment intent ID and status
    await adminDb.collection("payments").doc(paymentId).update({
      stripePaymentIntentId: paymentIntentId,
      stripePaymentStatus: paymentIntent.status,
      updatedAt: new Date().toISOString(),
    });
    
    return NextResponse.json({ 
      success: true,
      paymentStatus: paymentIntent.status,
      requiresCapture: paymentIntent.status === "requires_capture"
    });
    
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to verify payment",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}