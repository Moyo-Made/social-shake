import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    // Get payment info from request body
    const { paymentId, action } = await request.json();
    
    if (!paymentId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: "Payment ID and action are required" 
      }, { status: 400 });
    }
    
    // Valid actions are 'capture' or 'cancel'
    if (action !== 'capture' && action !== 'cancel') {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid action. Must be 'capture' or 'cancel'" 
      }, { status: 400 });
    }
    
    // Get payment record
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: "Payment record not found" 
      }, { status: 404 });
    }
    
    const paymentData = paymentDoc.data();
    
    // Check if payment has stripePaymentIntentId
    if (!paymentData?.stripePaymentIntentId) {
      return NextResponse.json({ 
        success: false, 
        error: "No payment intent ID found for this payment" 
      }, { status: 400 });
    }
    
    // Get the payment intent
    const paymentIntentId = paymentData.stripePaymentIntentId;
    
    let result;
    let newStatus;
    
    if (action === 'capture') {
      // Capture the payment
      result = await stripe.paymentIntents.capture(paymentIntentId);
      newStatus = 'completed';
    } else {
      // Cancel the payment
      result = await stripe.paymentIntents.cancel(paymentIntentId);
      newStatus = 'canceled';
    }
    
    // Update payment record
    await adminDb.collection("payments").doc(paymentId).update({
      stripePaymentStatus: result.status,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      processedBy: "admin", // You might want to store the actual admin ID here
    });
    
    // If there's a linked contest, update its status too
    if (paymentData.contestId) {
      await adminDb.collection("contests").doc(paymentData.contestId).update({
        paymentStatus: newStatus,
        status: action === 'capture' ? 'active' : 'canceled',
        updatedAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      action,
      status: result.status,
      paymentId,
      contestId: paymentData.contestId || null
    });
    
  } catch (error) {
    console.error("Error processing payment action:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to process payment action",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}