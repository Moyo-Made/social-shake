import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function GET(request: NextRequest) {
  try {
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
    
    // Get payment type from payment record or session metadata
    const paymentType = paymentData?.paymentType || session.metadata?.type || "contest";
    
    // FIXED: Since we're using manual capture for all payment types now,
    // check for both succeeded and requires_capture as valid states
    const validStatuses = ["succeeded", "requires_capture"];
    const isSuccessful = validStatuses.includes(paymentIntent.status);
    
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
    
    // REMOVED: Don't process video purchases here anymore
    // This will be handled in the success handler after all business logic completes
    // and the payment is manually captured
    
    return NextResponse.json({ 
      success: true,
      paymentStatus: paymentIntent.status,
      paymentType: paymentType,
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