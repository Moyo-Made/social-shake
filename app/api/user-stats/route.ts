/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

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

    const paymentsSnapshot = await adminDb
    .collection("payments")
    .where("brandEmail", "==", userEmail)
    .where("status", "==", "completed")
    .get();

    const paymentsFromCollection = paymentsSnapshot.docs.map(doc => doc.data());
    const totalSpendFromPayments = paymentsFromCollection.reduce((total, payment) => {
      return total + (payment.amount || payment.calculatedAmount || 0);
    }, 0);

    // Optional: Also check Stripe for any missing payments (BACKUP METHOD)
    let totalSpendFromStripe = 0;
    let stripePayments: any[] = [];
    const debugInfo: any = {
      hasStripeCustomerId: !!stripeCustomerId,
      stripeCustomerId: stripeCustomerId,
      paymentsFromCollection: paymentsFromCollection.length,
      totalFromPaymentsCollection: totalSpendFromPayments,
      stripePaymentIntentsCount: 0,
      stripeCheckoutSessionsCount: 0,
      allPaymentIntents: [],
      successfulPaymentIntents: [],
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

        // Also check Checkout Sessions (this might be where your payments are)
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
        // Use payments collection as primary source
        totalSpend: totalSpendFromPayments,
        totalPayments: paymentsFromCollection.length,
        projects: projects,
        contests: contests,
        paymentHistory: paymentsFromCollection.map(payment => ({
          id: payment.paymentId,
          amount: payment.amount || payment.calculatedAmount,
          currency: 'usd', // assuming USD, adjust as needed
          created: new Date(payment.createdAt),
          description: payment.paymentName,
          type: payment.paymentType,
          status: payment.status,
        })),
        hasProjectDraft: projectDraft !== null,
        hasContestDraft: contestDraft !== null,
        summary: {
          activeProjects: projects.filter(p => p.status === "active" || p.status === "invite").length,
          completedProjects: projects.filter(p => p.status === "completed").length,
          activeContests: contests.filter(c => c.status === "active").length,
          completedContests: contests.filter(c => c.status === "completed").length,
        },
        // Enhanced debug information
        debug: {
          ...debugInfo,
          // Comparison between sources
          totalFromPaymentsCollection: totalSpendFromPayments,
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