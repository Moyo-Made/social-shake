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
    
    console.log("Payment verification attempt:", { paymentId, sessionId, type });
    
    // Get payment record from database
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: "Payment record not found" 
      }, { status: 404 });
    }
    
    const paymentData = paymentDoc.data();
    
    
    // FIXED: More flexible status validation
    const validPendingStatuses = ["pending", "processing", "pending_capture"];
    const currentStatus = paymentData?.status;
    
    // If payment is already completed successfully, return success
    if (currentStatus === "completed" || currentStatus === "succeeded") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified successfully",
        payment: {
          id: paymentId,
          userId: paymentData?.userId,
          status: currentStatus,
          amount: paymentData?.amount,
          type: paymentData?.paymentType || type,
          stripeSessionId: sessionId,
          createdAt: paymentData?.createdAt,
          paymentType: paymentData?.paymentType || type,
          escrowPayment: paymentData?.escrowPayment || false,
          stripePaymentIntentId: paymentData?.stripePaymentIntentId,
        }
      });
    }
    
    // Check if status is valid for processing
    if (!validPendingStatuses.includes(currentStatus)) {
      return NextResponse.json({ 
        success: false, 
        error: `Payment in invalid status: ${currentStatus}. Expected one of: ${validPendingStatuses.join(', ')}`,
        debug: {
          currentStatus,
          validStatuses: validPendingStatuses
        }
      }, { status: 400 });
    }
    
    // Verify session ID matches (more flexible check)
    if (paymentData?.stripeSessionId && paymentData.stripeSessionId !== sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID mismatch",
        debug: {
          expected: paymentData.stripeSessionId,
          received: sessionId
        }
      }, { status: 400 });
    }
    
    // Stripe verification with enhanced debugging
    try {
      // First, retrieve and examine the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log("Stripe Session Details:", {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        payment_intent: session.payment_intent,
        mode: session.mode,
        amount_total: session.amount_total,
        currency: session.currency
      });
      
      // Determine if this is an escrow payment
      const isEscrowPayment = paymentData?.escrowPayment || 
                             paymentData?.paymentType === "order_escrow" || 
                             paymentData?.paymentType === "submission_approval";
      
      // FIXED: Check payment status with escrow consideration
      // For escrow payments, session.payment_status will be 'unpaid' even when PaymentIntent is 'requires_capture'
      // We need to check the actual PaymentIntent status instead
      if (!isEscrowPayment && session.payment_status !== 'paid') {
        const errorContext = {
          payment_status: session.payment_status,
          session_status: session.status,
          session_mode: session.mode,
          payment_intent_status: null as string | null,
          last_payment_error: null as string | null
        };
        
        // If there's a payment intent, get its details too
        if (session.payment_intent) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            errorContext.payment_intent_status = paymentIntent.status;
            errorContext.last_payment_error = paymentIntent.last_payment_error?.message || null;
            
            console.log("PaymentIntent Details:", {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              last_payment_error: paymentIntent.last_payment_error
            });
          } catch (piError) {
            console.error("Error retrieving PaymentIntent:", piError);
          }
        }
        
        return NextResponse.json({ 
          success: false, 
          error: `Payment session not completed. Status: ${session.payment_status}`,
          context: errorContext,
          message: session.payment_status === 'unpaid' 
            ? "The payment was not completed. Please ensure you completed the checkout process."
            : `Payment status is ${session.payment_status}. Expected 'paid'.`
        }, { status: 400 });
      }
      
      // Get the PaymentIntent from the session
      const paymentIntentId = session.payment_intent as string;
  
  if (!paymentIntentId) {
    return NextResponse.json({ 
      success: false, 
      error: "No payment intent found in session",
      debug: {
        session_id: sessionId,
        session_mode: session.mode
      }
    }, { status: 400 });
  }
      
      // FIXED: Handle PaymentIntent ID mismatch gracefully
      if (paymentData?.stripePaymentIntentId && 
          paymentData?.stripePaymentIntentId !== paymentIntentId) {
        console.warn(`PaymentIntent ID mismatch. Stored: ${paymentData?.stripePaymentIntentId}, Session: ${paymentIntentId}`);
        // Continue with verification using the session's PaymentIntent ID
      }
      
      // Check the PaymentIntent status
      if (paymentData?.stripePaymentIntentId && 
        paymentData?.stripePaymentIntentId !== paymentIntentId) {
      console.warn(`PaymentIntent ID mismatch. Stored: ${paymentData?.stripePaymentIntentId}, Session: ${paymentIntentId}`);
      // Continue with verification using the session's PaymentIntent ID
    }
    
    // Check the PaymentIntent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const stripePaymentStatus = paymentIntent.status;
    
    console.log("PaymentIntent verification:", {
      id: paymentIntentId,
      status: stripePaymentStatus,
      amount: paymentIntent.amount,
      capture_method: paymentIntent.capture_method,
      isEscrowPayment
    });
    
    // Determine valid statuses based on escrow setting
    let validStatuses = [];
    if (isEscrowPayment) {
      validStatuses = ["requires_capture", "succeeded"];
    } else {
      validStatuses = ["succeeded"];
    }
      
    if (!validStatuses.includes(paymentIntent.status)) {
      return NextResponse.json({ 
        success: false, 
        error: `Payment intent not in valid state. Status: ${paymentIntent.status}. Expected: ${validStatuses.join(" or ")}`,
        debug: {
          paymentIntentId,
          currentStatus: paymentIntent.status,
          expectedStatuses: validStatuses,
          isEscrowPayment,
          sessionPaymentStatus: session.payment_status
        }
      }, { status: 400 });
    }
      
      // FIXED: Update payment record with correct PaymentIntent ID
      const updateData = {
        stripePaymentIntentId: paymentIntentId, // Use the actual PaymentIntent ID from session
        stripePaymentStatus: stripePaymentStatus,
        updatedAt: new Date().toISOString(),
        status: isEscrowPayment && paymentIntent.status === "requires_capture" 
          ? "pending_capture" 
          : "completed"
      };
      
      await adminDb.collection("payments").doc(paymentId).update(updateData);
      
      console.log("Updated payment record:", updateData);
      
      // Handle different payment types
      if (paymentData?.paymentType === "order" || paymentData?.paymentType === "order_escrow") {
        const orderId = paymentData.orderId;
        if (orderId) {
          const orderStatus = isEscrowPayment && paymentIntent.status === "requires_capture" 
            ? "payment_escrowed" 
            : "payment_completed";
            
          try {
            await adminDb.collection("orders").doc(orderId).update({
              status: orderStatus,
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString()
            });
            
            console.log(`Updated order ${orderId} with status: ${orderStatus}`);
          } catch (orderUpdateError) {
            console.error("Failed to update order:", orderUpdateError);
            // Don't fail the entire verification
          }
          
          // Update order_payments record if it exists
          try {
            const orderPaymentDoc = await adminDb.collection("order_payments").doc(paymentId).get();
            if (orderPaymentDoc.exists) {
              await adminDb.collection("order_payments").doc(paymentId).update({
                stripePaymentIntentId: paymentIntentId,
                status: isEscrowPayment ? "escrowed" : "completed",
                updatedAt: new Date().toISOString()
              });
              
              console.log(`Updated order_payments ${paymentId}`);
            }
          } catch (orderPaymentError) {
            console.error("Failed to update order_payments:", orderPaymentError);
          }
        }
      }
      
      // Handle submission approval payments
      if (paymentData?.paymentType === "submission_approval" && paymentData?.submissionId) {
        try {
          const submissionPaymentDoc = await adminDb.collection("submission_payments").doc(paymentId).get();
          if (submissionPaymentDoc.exists) {
            await adminDb.collection("submission_payments").doc(paymentId).update({
              stripePaymentIntentId: paymentIntentId,
              status: paymentIntent.status === "requires_capture" ? "escrowed" : "completed",
              updatedAt: new Date().toISOString()
            });
            
            console.log(`Updated submission_payments ${paymentId}`);
          }
        } catch (submissionPaymentError) {
          console.error("Failed to update submission_payments:", submissionPaymentError);
        }
      }
      
    } catch (stripeError) {
      console.error("Stripe verification error:", stripeError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to verify payment with Stripe",
        details: stripeError instanceof Error ? stripeError.message : String(stripeError),
        debug: {
          paymentId,
          sessionId
        }
      }, { status: 500 });
    }
    
    // FIXED: Return success response with updated data
    const updatedPaymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    const updatedPaymentData = updatedPaymentDoc.data();
    
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: paymentId,
        userId: updatedPaymentData?.userId,
        status: updatedPaymentData?.status,
        amount: updatedPaymentData?.amount,
        type: updatedPaymentData?.paymentType || type,
        stripeSessionId: sessionId,
        createdAt: updatedPaymentData?.createdAt,
        paymentType: updatedPaymentData?.paymentType || type,
        escrowPayment: updatedPaymentData?.escrowPayment || false,
        stripePaymentIntentId: updatedPaymentData?.stripePaymentIntentId,
        
        // Include conditional fields based on payment type
        ...(updatedPaymentData?.paymentType === "submission_approval" && {
          submissionId: updatedPaymentData.submissionId,
          projectId: updatedPaymentData.projectId,
          metadata: {
            submissionId: updatedPaymentData.submissionId,
            projectId: updatedPaymentData.projectId
          }
        }),
        
        ...(updatedPaymentData?.paymentType === "order_escrow" && {
          orderId: updatedPaymentData.orderId,
          creatorId: updatedPaymentData.creatorId,
          packageType: updatedPaymentData.packageType,
          videoCount: updatedPaymentData.videoCount,
          metadata: {
            orderId: updatedPaymentData.orderId,
            creatorId: updatedPaymentData.creatorId,
            packageType: updatedPaymentData.packageType,
            videoCount: updatedPaymentData.videoCount
          }
        }),
        
        ...(updatedPaymentData?.paymentType === "video" && {
          videoId: updatedPaymentData.videoId,
          videoTitle: updatedPaymentData.videoTitle,
          metadata: {
            videoId: updatedPaymentData.videoId,
            videoTitle: updatedPaymentData.videoTitle
          }
        }),
        
        ...((updatedPaymentData?.paymentType === "contest" || updatedPaymentData?.paymentType === "project") && {
          contestId: updatedPaymentData.contestId,
          contestName: updatedPaymentData.contestName,
          contestType: updatedPaymentData.contestType,
          projectId: updatedPaymentData.projectId,
          projectTitle: updatedPaymentData.projectTitle,
          metadata: {
            contestId: updatedPaymentData.contestId,
            contestName: updatedPaymentData.contestName,
            contestType: updatedPaymentData.contestType,
            projectId: updatedPaymentData.projectId,
            projectTitle: updatedPaymentData.projectTitle
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