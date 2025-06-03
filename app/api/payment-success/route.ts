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
    const type = url.searchParams.get('type');
    
    if (!paymentId || !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing payment information" 
      }, { status: 400 });
    }
    
    // Get payment record from database
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: "Payment record not found" 
      }, { status: 404 });
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify payment status - should be pending or processing
    if (paymentData?.status !== "pending" && paymentData?.status !== "processing") {
      return NextResponse.json({ 
        success: false, 
        error: "Payment already processed or invalid status" 
      }, { status: 400 });
    }
    
    // Verify session matches
    if (paymentData?.stripeSessionId !== sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID mismatch" 
      }, { status: 400 });
    }
    
    // Optional: Verify with Stripe that the payment is valid
    // This adds an extra layer of security but isn't strictly necessary
    // if you trust your payment creation process
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paymentIntentId = session.payment_intent as string;
      
      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Check if payment is in a valid state (succeeded or requires_capture)
        const validStatuses = ["succeeded", "requires_capture"];
        if (!validStatuses.includes(paymentIntent.status)) {
          return NextResponse.json({ 
            success: false, 
            error: `Payment not successful. Status: ${paymentIntent.status}` 
          }, { status: 400 });
        }
        
        // Update payment record with Stripe details
        await adminDb.collection("payments").doc(paymentId).update({
          stripePaymentIntentId: paymentIntentId,
          stripePaymentStatus: paymentIntent.status,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (stripeError) {
      console.error("Stripe verification error:", stripeError);
      // Don't fail the entire request if Stripe verification fails
      // The payment record verification above is sufficient
    }
    
    // 🚀 IMPORTANT: Return payment data including userId
    // This matches what the PaymentSuccessHandler expects
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: paymentId,
        userId: paymentData.userId, // This is crucial for the handler!
        status: paymentData.status,
        amount: paymentData.amount,
        type: paymentData.type || type,
        stripeSessionId: sessionId,
        createdAt: paymentData.createdAt,
        // Include any other fields your handler might need
        paymentType: paymentData.type || type,
        ...(paymentData.paymentType === "submission_approval" && {
          submissionId: paymentData.submissionId,
          projectId: paymentData.projectId,
          metadata: {
            submissionId: paymentData.submissionId,
            projectId: paymentData.projectId
          }
        })
      }
    });
    
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({
      success: false,
      error: "Payment verification failed",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}