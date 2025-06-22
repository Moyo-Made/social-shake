/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

// Helper function to calculate months between two dates
function calculateMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = end.getDate() - start.getDate();
  
  let totalMonths = years * 12 + months;
  
  // If the end day is greater than or equal to start day, add the partial month
  if (days >= 0) {
    totalMonths += 1; // Count the current/final month
  }
  
  return Math.max(0, totalMonths);
}

// Helper function to calculate actual billing periods
function calculateBillingPeriods(subscription: any): number {
  const now = new Date();
  
  // Don't count billing periods for subscriptions that haven't started billing yet
  if (subscription.status === 'trialing' || subscription.status === 'pending' || subscription.status === 'incomplete') {
    return 0;
  }
  
  // For active subscriptions, calculate from when billing actually started
  if (subscription.status === 'active') {
    const billingStart = subscription.trialEnd ? 
      new Date(subscription.trialEnd) : 
      new Date(subscription.createdAt);
    
    // Only count if billing has actually started (not in future)
    if (billingStart > now) {
      return 0;
    }
    
    return calculateMonthsBetween(billingStart, now);
  }
  
  // For canceled subscriptions, calculate the full period they were active and billing
  if (subscription.status === 'canceled') {
    const billingStart = subscription.trialEnd ? 
      new Date(subscription.trialEnd) : 
      new Date(subscription.createdAt || subscription.trialStart);
    
    const billingEnd = subscription.canceledAt ? 
      new Date(subscription.canceledAt) : 
      now;
    
    // Only count periods where billing actually occurred
    if (billingStart >= billingEnd) {
      return 0;
    }
    
    return calculateMonthsBetween(billingStart, billingEnd);
  }
  
  // For other statuses, don't count any billing periods
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get user data
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;
    const stripeCustomerId = userData?.stripeCustomerId;

    // Get payments from payments collection
    const paymentsSnapshot = await adminDb
      .collection("payments")
      .where("brandEmail", "==", userEmail)
      .where("status", "==", "completed")
      .get();

    const paymentsFromCollection = paymentsSnapshot.docs.map(doc => doc.data());
    const totalSpendFromPayments = paymentsFromCollection.reduce((total, payment) => {
      return total + (payment.amount || payment.calculatedAmount || 0);
    }, 0);

    // ========== FIXED SUBSCRIPTION SPEND CALCULATION ==========
    
    // Get user's subscriptions
    const subscriptionsSnapshot = await adminDb
      .collection("subscriptions")
      .where("userId", "==", userId)
      .get();

    const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      stripeSubscriptionId: doc.data().stripeSubscriptionId,
      status: doc.data().status,
      amount: doc.data().amount,
      createdAt: doc.data().createdAt,
      trialStart: doc.data().trialStart,
      trialEnd: doc.data().trialEnd,
      canceledAt: doc.data().canceledAt,
      ...doc.data()
    }));

    let totalSubscriptionSpend = 0;
    const subscriptionSpendDetails: any[] = [];

    for (const subscription of subscriptions) {
      try {
        // Get subscription amount from Stripe (more reliable than stored data)
        let subscriptionAmount = 0;
        
        if (subscription.stripeSubscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId,
            {
              expand: ['items.data.price'] // Ensure price data is expanded
            }
          );
          
          // FIXED: Correct way to access unit_amount
          if (stripeSubscription.items?.data?.length > 0) {
            const firstItem = stripeSubscription.items.data[0];
            if (firstItem.price?.unit_amount && firstItem.price.unit_amount > 0) {
              subscriptionAmount = firstItem.price.unit_amount / 100; // Convert from cents
            }
          }
        }

        // Fallback to stored amount if Stripe call fails or returns 0
        if (subscriptionAmount === 0 && subscription.amount && subscription.amount > 0) {
          subscriptionAmount = subscription.amount;
        }

        // Skip subscriptions with no amount - they shouldn't contribute to spend
        if (subscriptionAmount === 0) {
          console.warn(`Subscription ${subscription.id} has no amount available from Stripe or database`);
        }

        // FIXED: Use proper billing period calculation
        const billingPeriods = calculateBillingPeriods(subscription);
        const subscriptionSpend = subscriptionAmount * billingPeriods;

        // Only add to total if there's actually a spend amount
        if (subscriptionSpend > 0) {
          totalSubscriptionSpend += subscriptionSpend;
        }

        // Determine start and end dates for display
        const subscriptionStart = subscription.trialEnd ? 
          new Date(subscription.trialEnd) : 
          new Date(subscription.createdAt || subscription.trialStart);
        
        const subscriptionEnd = subscription.canceledAt ? 
          new Date(subscription.canceledAt) : 
          new Date();

        subscriptionSpendDetails.push({
          subscriptionId: subscription.id,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          monthlyAmount: subscriptionAmount,
          billingPeriods: Math.round(billingPeriods * 100) / 100,
          totalSpend: Math.round(subscriptionSpend * 100) / 100,
          status: subscription.status,
          startDate: subscriptionStart.toISOString(),
          endDate: subscriptionEnd.toISOString(),
          isActive: subscription.status === 'active' || subscription.status === 'trialing',
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          billingStarted: subscription.trialEnd || subscription.createdAt,
          // Add debug info for this subscription
          debug: {
            hasStripeAmount: subscriptionAmount > 0 && subscription.stripeSubscriptionId,
            amountSource: subscriptionAmount > 0 ? (subscription.stripeSubscriptionId ? 'stripe' : 'database') : 'none',
            shouldCountBilling: billingPeriods > 0,
            statusAllowsBilling: !['trialing', 'pending', 'incomplete'].includes(subscription.status)
          }
        });

      } catch (subscriptionError) {
        console.error(`Error calculating spend for subscription ${subscription.id}:`, subscriptionError);
        // Continue with other subscriptions even if one fails
        
        // Add error details to debug
        subscriptionSpendDetails.push({
          subscriptionId: subscription.id,
          error: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError),
          monthlyAmount: 0,
          billingPeriods: 0,
          totalSpend: 0,
          status: subscription.status
        });
      }
    }

    // ========== CALCULATE TOTAL SPEND INCLUDING SUBSCRIPTIONS ==========
    const totalSpend = totalSpendFromPayments + totalSubscriptionSpend;

    // Optional: Also check Stripe for any missing payments (BACKUP METHOD)
    let totalSpendFromStripe = 0;
    let stripePayments: any[] = [];
    const debugInfo: any = {
      hasStripeCustomerId: !!stripeCustomerId,
      stripeCustomerId: stripeCustomerId,
      paymentsFromCollection: paymentsFromCollection.length,
      totalFromPaymentsCollection: totalSpendFromPayments,
      totalFromSubscriptions: totalSubscriptionSpend,
      totalSubscriptions: subscriptions.length,
      stripePaymentIntentsCount: 0,
      stripeCheckoutSessionsCount: 0,
      allPaymentIntents: [],
      successfulPaymentIntents: [],
      subscriptionSpendDetails: subscriptionSpendDetails
    };

    if (stripeCustomerId) {
      try {
        // Check PaymentIntents
        const paymentIntentsResponse = await stripe.paymentIntents.list({
          customer: stripeCustomerId,
          limit: 100,
        });

        debugInfo.allPaymentIntents = paymentIntentsResponse.data.map(pi => ({
          id: pi.id,
          status: pi.status,
          amount: pi.amount / 100,
          currency: pi.currency,
          created: new Date(pi.created * 1000),
          description: pi.description,
        }));

        const successfulPaymentIntents = paymentIntentsResponse.data.filter(
          pi => pi.status === 'succeeded'
        );

        debugInfo.successfulPaymentIntents = successfulPaymentIntents.map(pi => ({
          id: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          created: new Date(pi.created * 1000),
        }));

        debugInfo.stripePaymentIntentsCount = successfulPaymentIntents.length;

        // Also check Checkout Sessions
        const checkoutSessionsResponse = await stripe.checkout.sessions.list({
          customer: stripeCustomerId,
          limit: 100,
        });

        const successfulSessions = checkoutSessionsResponse.data.filter(
          session => session.payment_status === 'paid'
        );

        debugInfo.stripeCheckoutSessionsCount = successfulSessions.length;
        debugInfo.checkoutSessions = successfulSessions.map(session => ({
          id: session.id,
          amount_total: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          created: new Date(session.created * 1000),
          payment_status: session.payment_status,
        }));

        // Calculate total from both PaymentIntents and Checkout Sessions
        const paymentIntentsTotal = successfulPaymentIntents.reduce((total, pi) => {
          return total + (pi.amount / 100);
        }, 0);

        const checkoutSessionsTotal = successfulSessions.reduce((total, session) => {
          return total + (session.amount_total ? session.amount_total / 100 : 0);
        }, 0);

        totalSpendFromStripe = paymentIntentsTotal + checkoutSessionsTotal;
        stripePayments = [...successfulPaymentIntents, ...successfulSessions];

      } catch (stripeError) {
        console.error("Stripe API Error:", stripeError);
        debugInfo.stripeError = stripeError instanceof Error ? stripeError.message : String(stripeError);
      }
    }

    // Fetch other data
    const projectsSnapshot = await adminDb
      .collection("projects")
      .where("userId", "==", userId)
      .get();

    const projects = projectsSnapshot.docs.map(doc => doc.data());
    
    const contestsSnapshot = await adminDb
      .collection("contests")
      .where("userId", "==", userId)
      .get();

    const contests = contestsSnapshot.docs.map(doc => doc.data());

    // Get active drafts
    const projectDraftDoc = await adminDb
      .collection("projectDrafts")
      .doc(userId)
      .get();
    
    const contestDraftDoc = await adminDb
      .collection("contestDrafts")
      .doc(userId)
      .get();

    const projectDraft = projectDraftDoc.exists && !projectDraftDoc.data()?.submitted 
      ? projectDraftDoc.data() 
      : null;
    
    const contestDraft = contestDraftDoc.exists && !contestDraftDoc.data()?.submitted 
      ? contestDraftDoc.data() 
      : null;

    return NextResponse.json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalContests: contests.length,
        // UPDATED: Now includes both payments and subscriptions
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalPayments: paymentsFromCollection.length,
        totalSubscriptionSpend: Math.round(totalSubscriptionSpend * 100) / 100,
        totalSubscriptions: subscriptions.length,
        projects: projects,
        contests: contests,
        subscriptions: subscriptions,
        paymentHistory: paymentsFromCollection.map(payment => ({
          id: payment.paymentId,
          amount: payment.amount || payment.calculatedAmount,
          currency: 'usd', // assuming USD, adjust as needed
          created: new Date(payment.createdAt),
          description: payment.paymentName,
          type: payment.paymentType,
          status: payment.status,
        })),
        subscriptionHistory: subscriptionSpendDetails,
        hasProjectDraft: projectDraft !== null,
        hasContestDraft: contestDraft !== null,
        summary: {
          activeProjects: projects.filter(p => p.status === "active" || p.status === "invite").length,
          completedProjects: projects.filter(p => p.status === "completed").length,
          activeContests: contests.filter(c => c.status === "active").length,
          completedContests: contests.filter(c => c.status === "completed").length,
          activeSubscriptions: subscriptions.filter(s => s.status === "active" || s.status === "trialing").length,
        },
        // Enhanced debug information
        debug: {
          ...debugInfo,
          // Comparison between sources
          totalFromPaymentsCollection: totalSpendFromPayments,
          totalFromSubscriptions: totalSubscriptionSpend,
          totalCombined: totalSpend,
          totalFromStripe: totalSpendFromStripe,
          paymentsInCollection: paymentsFromCollection.length,
          paymentsInStripe: stripePayments.length,
          // Show actual payments from collection
          paymentsCollectionData: paymentsFromCollection.map(p => ({
            id: p.paymentId,
            amount: p.amount || p.calculatedAmount,
            type: p.paymentType,
            status: p.status,
            createdAt: p.createdAt,
            checkoutSessionId: p.checkoutSessionId,
            stripePaymentIntentId: p.stripePaymentIntentId,
          }))
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}