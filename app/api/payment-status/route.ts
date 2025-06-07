import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

interface PaymentRecord {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: string;
  userId: string;
  amount: number;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripePaymentStatus?: string;
  submissionId?: string;
  projectId?: string;
  itemId?: string;
  itemData?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");
    const type = url.searchParams.get("type");
    const paymentId = url.searchParams.get("payment_id");

    console.log("Payment status check:", { sessionId, type, paymentId });

    if (!sessionId) {
      return NextResponse.json({
        status: 'not_found',
        data: { error: "Missing session_id parameter" }
      }, { status: 400 });
    }

    let paymentDoc;
    let paymentData: PaymentRecord | null = null;

    // First try to find by payment_id if provided
    if (paymentId) {
      console.log("Searching by payment_id:", paymentId);
      paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
      if (paymentDoc.exists) {
        paymentData = paymentDoc.data() as PaymentRecord;
        console.log("Found payment by ID:", paymentData.status);
      }
    }

    // If not found by payment_id, search by session_id
    if (!paymentData) {
      console.log("Searching by session_id:", sessionId);
      const paymentQuery = await adminDb.collection("payments")
        .where("stripeSessionId", "==", sessionId)
        .limit(1)
        .get();

      if (!paymentQuery.empty) {
        paymentDoc = paymentQuery.docs[0];
        paymentData = paymentDoc.data() as PaymentRecord;
        console.log("Found payment by session_id:", paymentData.status);
      } else {
        console.log("No payment found in database for session_id:", sessionId);
      }
    }

    // If still no payment record found, check Stripe session and create record if needed
    if (!paymentData) {
      console.log("No payment record found, checking Stripe session...");
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent']
        });
        
        console.log("Stripe session status:", {
          payment_status: session.payment_status,
          status: session.status,
          payment_intent_id: session.payment_intent
        });

        if (session.payment_status === "paid" && session.status === "complete") {
          // Payment was successful but no record exists - this suggests webhook failed
          // Create a temporary record or handle gracefully
          console.log("Payment successful in Stripe but no DB record - webhook may have failed");
          
          // You could create a record here if you have enough info from the session
          const tempPaymentData = {
            status: 'processing' as const,
            type: type || 'unknown',
            userId: session.client_reference_id || 'unknown',
            amount: (session.amount_total || 0) / 100,
            stripeSessionId: sessionId,
            stripePaymentIntentId: typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent?.id,
            stripePaymentStatus: session.payment_status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: 'Webhook processing delayed or failed'
          };

          // Optionally create the missing record
          try {
            const newPaymentRef = await adminDb.collection("payments").add(tempPaymentData);
            console.log("Created missing payment record:", newPaymentRef.id);
            
            return NextResponse.json({
              status: 'processing',
              data: {
                type: type || 'unknown',
                message: 'Payment successful, processing item creation (recovered from missing webhook)',
                paymentId: newPaymentRef.id
              }
            });
          } catch (createError) {
            console.error("Failed to create missing payment record:", createError);
            // Fall through to return processing status without creating record
          }

          return NextResponse.json({
            status: 'processing',
            data: {
              type: type || 'unknown',
              message: 'Payment successful, processing item creation'
            }
          });
        } else if (session.payment_status === "unpaid") {
          return NextResponse.json({
            status: 'failed',
            data: { error: 'Payment was not completed' }
          });
        } else if (session.status === "expired") {
          return NextResponse.json({
            status: 'failed',
            data: { error: 'Payment session has expired' }
          });
        } else {
          // Session exists but in unexpected state
          console.log("Unexpected session state:", session);
          return NextResponse.json({
            status: 'processing',
            data: {
              type: type || 'unknown',
              message: `Payment status: ${session.payment_status}, session: ${session.status}`
            }
          });
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (stripeError: any) {
        console.error("Error checking Stripe session:", stripeError);
        
        if (stripeError.code === 'resource_missing') {
          return NextResponse.json({
            status: 'not_found',
            data: { error: 'Payment session not found in Stripe. The session may have expired or the ID is invalid.' }
          });
        }
        
        return NextResponse.json({
          status: 'failed',
          data: { 
            error: 'Unable to verify payment status',
            details: stripeError.message
          }
        });
      }
    }

    // Check if payment is still processing and needs a status update
    if (paymentData && (paymentData.status === 'processing' || paymentData.status === 'pending')) {
      // Check if it's been processing for too long (more than 5 minutes)
      const processingTime = Date.now() - new Date(paymentData.createdAt).getTime();
      const maxProcessingTime = 5 * 60 * 1000; // 5 minutes

      if (processingTime > maxProcessingTime) {
        console.log("Payment processing timeout, marking as failed");
        // Update status to failed due to timeout
        await adminDb.collection("payments").doc(paymentDoc!.id).update({
          status: 'failed',
          error: 'Processing timeout - please contact support',
          updatedAt: new Date().toISOString()
        });

        return NextResponse.json({
          status: 'failed',
          data: {
            error: 'Processing timeout - please contact support',
            type: paymentData.type
          }
        });
      }

      // Still within processing window
      return NextResponse.json({
        status: 'processing',
        data: {
          type: paymentData.type,
          message: 'Payment is being processed'
        }
      });
    }

    // Return the current status
    return NextResponse.json({
      status: paymentData.status,
      data: {
        type: paymentData.type,
        itemId: paymentData.itemId,
        itemData: paymentData.itemData,
        error: paymentData.error,
        // Include submission-specific data if available
        ...(paymentData.type === "submission_approval" && {
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
    console.error("Error in payment status API:", error);
    
    return NextResponse.json({
      status: 'failed',
      data: { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}

// Helper function to update payment status (called by webhooks)
export async function updatePaymentStatus(
  paymentId: string,
  status: 'completed' | 'failed',
  itemData?: {
    itemId?: string;
    itemData?: Record<string, unknown>;
    error?: string;
  }
) {
  try {
    const updateData: Partial<PaymentRecord> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (itemData) {
      updateData.itemId = itemData.itemId;
      updateData.itemData = itemData.itemData;
      updateData.error = itemData.error;
    }

    await adminDb.collection("payments").doc(paymentId).update(updateData);
    
    return { success: true };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error };
  }
}

// Helper function to update payment status by session ID
export async function updatePaymentStatusBySession(
  sessionId: string,
  status: 'completed' | 'failed',
  itemData?: {
    itemId?: string;
    itemData?: Record<string, unknown>;
    error?: string;
  }
) {
  try {
    const paymentQuery = await adminDb.collection("payments")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      return { success: false, error: "Payment not found" };
    }

    const paymentDoc = paymentQuery.docs[0];
    return await updatePaymentStatus(paymentDoc.id, status, itemData);
  } catch (error) {
    console.error("Error updating payment status by session:", error);
    return { success: false, error };
  }
}