import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";
import { StripeSubscriptionWithPeriods } from "../../webhooks/stripe/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

// Helper function to safely convert Unix timestamp to ISO string
function timestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null;
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.warn(`Invalid timestamp: ${timestamp}`, error);
    return null;
  }
}

// Helper function to get billing period dates for trialing subscriptions
function getBillingPeriodDates(subscription: StripeSubscriptionWithPeriods) {
  // For trialing subscriptions, calculate the billing period from trial end
  if (subscription.status === 'trialing' && subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    
    // Get the billing interval from the subscription items
    const priceItem = subscription.items.data[0];
    if (!priceItem?.price) {
      return {
        currentPeriodStart: null,
        currentPeriodEnd: null
      };
    }
    
    const interval = priceItem.price.recurring?.interval;
    const intervalCount = priceItem.price.recurring?.interval_count || 1;
    
    // Calculate period end based on interval
    const periodEnd = new Date(trialEndDate);
    if (interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
    } else if (interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
    } else if (interval === 'week') {
      periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
    } else if (interval === 'day') {
      periodEnd.setDate(periodEnd.getDate() + intervalCount);
    }
    
    return {
      currentPeriodStart: trialEndDate.toISOString(),
      currentPeriodEnd: periodEnd.toISOString()
    };
  }
  
  // For non-trialing subscriptions, use the actual current period
  return {
    currentPeriodStart: timestampToISO(subscription.current_period_start),
    currentPeriodEnd: timestampToISO(subscription.current_period_end)
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const subscriptionId = url.searchParams.get('subscription_id');
    const sessionId = url.searchParams.get('session_id');
    
    if (!subscriptionId || !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing subscription information" 
      }, { status: 400 });
    }
    
    console.log("Subscription verification attempt:", { subscriptionId, sessionId });
    
    // Get subscription record from database
    const subscriptionDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    
    if (!subscriptionDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: "Subscription record not found" 
      }, { status: 404 });
    }
    
    const subscriptionData = subscriptionDoc.data();
    
    // More flexible status validation
    const validPendingStatuses = ["pending", "processing", "trialing"];
    const currentStatus = subscriptionData?.status;
    
    // If subscription is already completed successfully, return success
    if (currentStatus === "active" || currentStatus === "trialing") {
      return NextResponse.json({
        success: true,
        message: "Subscription already verified successfully",
        subscription: {
          id: subscriptionId,
          userId: subscriptionData?.userId,
          status: currentStatus,
          stripeSubscriptionId: subscriptionData?.stripeSubscriptionId,
          planType: subscriptionData?.planType,
          amount: subscriptionData?.amount || 0,
          currency: subscriptionData?.currency || "usd",
          trialStart: subscriptionData?.trialStart,
          trialEnd: subscriptionData?.trialEnd,
          currentPeriodStart: subscriptionData?.currentPeriodStart,
          currentPeriodEnd: subscriptionData?.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionData?.cancelAtPeriodEnd,
          createdAt: subscriptionData?.createdAt,
        },
        customer: {
          id: subscriptionData?.stripeCustomerId,
          email: subscriptionData?.customerEmail,
          name: subscriptionData?.customerName,
        }
      });
    }
    
    // Check if status is valid for processing
    if (!validPendingStatuses.includes(currentStatus)) {
      return NextResponse.json({ 
        success: false, 
        error: `Subscription in invalid status: ${currentStatus}. Expected one of: ${validPendingStatuses.join(', ')}`,
        debug: {
          currentStatus,
          validStatuses: validPendingStatuses
        }
      }, { status: 400 });
    }
    
    // Verify session ID matches (more flexible check)
    if (subscriptionData?.stripeSessionId && subscriptionData.stripeSessionId !== sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID mismatch",
        debug: {
          expected: subscriptionData.stripeSessionId,
          received: sessionId
        }
      }, { status: 400 });
    }
    
    // Stripe verification with enhanced debugging
    try {
      // First, retrieve and examine the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "customer"],
      });
      
      console.log("Stripe Session Details:", {
        id: session.id,
        status: session.status,
        mode: session.mode,
        subscription: session.subscription ? 'present' : 'missing',
        customer: session.customer ? 'present' : 'missing'
      });
      
      // Verify this is a subscription session
      if (session.mode !== "subscription") {
        return NextResponse.json({ 
          success: false, 
          error: `Session is not a subscription. Mode: ${session.mode}`,
          debug: { sessionMode: session.mode }
        }, { status: 400 });
      }
      
      // Check session completion status
      if (session.status !== "complete") {
        return NextResponse.json({ 
          success: false, 
          error: `Checkout session not completed. Status: ${session.status}`,
          message: session.status === 'open' 
            ? "The checkout session is still in progress. Please complete the checkout process."
            : `Session status is ${session.status}. Expected 'complete'.`
        }, { status: 400 });
      }
      
      // Verify subscription exists in session
      if (!session.subscription) {
        return NextResponse.json({ 
          success: false, 
          error: "No subscription found in completed session",
          debug: { sessionId }
        }, { status: 400 });
      }
      
      const stripeSubscription = session.subscription as StripeSubscriptionWithPeriods;
      
      console.log("Stripe Subscription Details:", {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        trial_start: stripeSubscription.trial_start,
        trial_end: stripeSubscription.trial_end,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      });
      
      // Check if stored Stripe subscription ID matches
      if (subscriptionData?.stripeSubscriptionId && 
          subscriptionData?.stripeSubscriptionId !== stripeSubscription.id) {
        console.warn(`Stripe subscription ID mismatch. Stored: ${subscriptionData?.stripeSubscriptionId}, Session: ${stripeSubscription.id}`);
        // Continue with verification using the session's subscription ID
      }
      
      // Validate subscription status
      const validSubscriptionStatuses = ["active", "trialing", "past_due"];
      if (!validSubscriptionStatuses.includes(stripeSubscription.status)) {
        return NextResponse.json({ 
          success: false, 
          error: `Subscription not in valid state. Status: ${stripeSubscription.status}. Expected: ${validSubscriptionStatuses.join(" or ")}`,
          debug: {
            subscriptionId: stripeSubscription.id,
            currentStatus: stripeSubscription.status,
            expectedStatuses: validSubscriptionStatuses
          }
        }, { status: 400 });
      }
      
      // Get user ID from session metadata or subscription data
      const userId = session.metadata?.userId || subscriptionData?.userId;
      if (!userId) {
        return NextResponse.json({
          error: "User ID not found in session metadata or subscription data",
        }, { status: 400 });
      }
      
      // Get billing period dates (handles trialing subscriptions properly)
      const billingPeriod = getBillingPeriodDates(stripeSubscription);
      
      // Prepare subscription update data with safe timestamp conversion
      const subscriptionUpdateData = {
        stripeSubscriptionId: stripeSubscription.id,
        stripeSessionId: sessionId, // Ensure session ID is stored
        status: stripeSubscription.status,
        trialStart: timestampToISO(stripeSubscription.trial_start),
        trialEnd: timestampToISO(stripeSubscription.trial_end),
        currentPeriodStart: billingPeriod.currentPeriodStart,
        currentPeriodEnd: billingPeriod.currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      };
      
      // Update subscription document
      await subscriptionDoc.ref.update(subscriptionUpdateData);
      
      console.log("Updated subscription record:", subscriptionUpdateData);
      
      // Update user document
      await adminDb.collection("users").doc(userId).update({
        subscriptionStatus: stripeSubscription.status,
        stripeSubscriptionId: stripeSubscription.id,
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`Updated user ${userId} with subscription status: ${stripeSubscription.status}`);
      
    } catch (stripeError) {
      console.error("Stripe verification error:", stripeError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to verify subscription with Stripe",
        details: stripeError instanceof Error ? stripeError.message : String(stripeError),
        debug: {
          subscriptionId,
          sessionId
        }
      }, { status: 500 });
    }
    
    // Return success response with updated data
    const updatedSubscriptionDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    const updatedSubscriptionData = updatedSubscriptionDoc.data();
    
    return NextResponse.json({
      success: true,
      message: "Subscription verified successfully",
      subscription: {
        id: subscriptionId,
        userId: updatedSubscriptionData?.userId,
        status: updatedSubscriptionData?.status,
        stripeSubscriptionId: updatedSubscriptionData?.stripeSubscriptionId,
        planType: updatedSubscriptionData?.planType || "pro",
        amount: updatedSubscriptionData?.amount || 0,
        currency: updatedSubscriptionData?.currency || "usd",
        trialStart: updatedSubscriptionData?.trialStart,
        trialEnd: updatedSubscriptionData?.trialEnd,
        currentPeriodStart: updatedSubscriptionData?.currentPeriodStart,
        currentPeriodEnd: updatedSubscriptionData?.currentPeriodEnd,
        cancelAtPeriodEnd: updatedSubscriptionData?.cancelAtPeriodEnd,
        createdAt: updatedSubscriptionData?.createdAt,
        stripeSessionId: sessionId,
      },
      customer: {
        id: updatedSubscriptionData?.stripeCustomerId,
        email: updatedSubscriptionData?.customerEmail,
        name: updatedSubscriptionData?.customerName,
      }
    });
    
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return NextResponse.json({
      success: false,
      error: "Subscription verification failed",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Keep your existing POST method for the current flow
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe with error handling
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "customer"],
      });
    } catch (stripeError) {
      console.error("Stripe session retrieval error:", stripeError);
      return NextResponse.json(
        { error: "Invalid or expired session ID" },
        { status: 404 }
      );
    }

    // For subscription mode, we need to check different conditions
    if (session.mode === "subscription") {
      // For subscriptions with trials, the session might be complete even without payment
      if (session.status !== "complete") {
        return NextResponse.json(
          { error: "Checkout session not completed" },
          { status: 400 }
        );
      }
    } else {
      // For one-time payments, check payment status
      if (
        session.payment_status !== "paid" &&
        session.payment_status !== "no_payment_required"
      ) {
        return NextResponse.json(
          { error: "Payment not completed" },
          { status: 400 }
        );
      }
    }

    // Verify subscription exists for subscription mode
    if (session.mode === "subscription" && !session.subscription) {
      return NextResponse.json(
        { error: "No subscription found for this session" },
        { status: 400 }
      );
    }

    const stripeSubscription = session.subscription as StripeSubscriptionWithPeriods;
    const customer = session.customer as Stripe.Customer;

    // Get user ID from session metadata
    const userId = session.metadata?.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session metadata" },
        { status: 400 }
      );
    }

    // Find subscription in database
    const subscriptionQuery = await adminDb
      .collection("subscriptions")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();

    if (subscriptionQuery.empty) {
      // Try to find by userId as fallback
      const userSubscriptionQuery = await adminDb
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (userSubscriptionQuery.empty) {
        return NextResponse.json(
          { error: "Subscription record not found in database" },
          { status: 404 }
        );
      }

      // Update the found subscription with session ID
      const subscriptionDoc = userSubscriptionQuery.docs[0];
      await subscriptionDoc.ref.update({
        stripeSessionId: sessionId,
        updatedAt: new Date().toISOString(),
      });
    }

    // Get the subscription document (either from original query or fallback)
    const finalSubscriptionQuery = subscriptionQuery.empty 
      ? await adminDb
        .collection("subscriptions")
        .where("userId", "==", userId)
        .where("stripeSessionId", "==", sessionId)
        .limit(1)
        .get()
      : subscriptionQuery;

    const subscriptionDoc = finalSubscriptionQuery.docs[0];

    // Get billing period dates (handles trialing subscriptions properly)
    const billingPeriod = getBillingPeriodDates(stripeSubscription);

    // Prepare subscription update data with safe timestamp conversion
    const subscriptionUpdateData = {
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      trialStart: timestampToISO(stripeSubscription.trial_start),
      trialEnd: timestampToISO(stripeSubscription.trial_end),
      currentPeriodStart: billingPeriod.currentPeriodStart,
      currentPeriodEnd: billingPeriod.currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    };

    // Update subscription document
    await subscriptionDoc.ref.update(subscriptionUpdateData);

    // Update user document
    await adminDb.collection("users").doc(userId).update({
      subscriptionStatus: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      updatedAt: new Date().toISOString(),
    });

    // Get the updated subscription data
    const subscriptionData = subscriptionDoc.data();

    // Prepare response data
    const responseData = {
      success: true,
      subscription: {
        id: subscriptionDoc.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        trialStart: subscriptionUpdateData.trialStart,
        trialEnd: subscriptionUpdateData.trialEnd,
        currentPeriodStart: subscriptionUpdateData.currentPeriodStart,
        currentPeriodEnd: subscriptionUpdateData.currentPeriodEnd,
        planType: subscriptionData?.planType || "pro",
        amount: stripeSubscription.items.data[0]?.price.unit_amount || 0,
        currency: stripeSubscription.items.data[0]?.price.currency || "usd",
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      customer: {
        id: typeof customer === "string" ? customer : customer.id,
        email: typeof customer === "string" ? null : customer.email,
        name: typeof customer === "string" ? null : customer.name,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error verifying subscription:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to verify subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}