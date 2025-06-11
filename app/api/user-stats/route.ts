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

    // Check if user exists and has Stripe customer ID
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;


    let totalSpendFromStripe = 0;
    let paymentIntents: Stripe.PaymentIntent[] = [];
    const debugInfo: {
      hasStripeCustomerId: boolean;
      stripeCustomerId: string | undefined;
      paymentIntentsCount: number;
      allPaymentIntents: {
        id: string;
        status: Stripe.PaymentIntent.Status;
        amount: number;
        currency: string;
        created: Date;
        description: string | null;
      }[];
      successfulPaymentIntents: {
        id: string;
        amount: number;
        currency: string;
        created: Date;
      }[];
      stripeError?: string;
      paymentsByMetadata?: number;
      customersFoundByEmail?: number;
      foundCustomerByEmail?: string;
    } = {
      hasStripeCustomerId: !!stripeCustomerId,
      stripeCustomerId: stripeCustomerId,
      paymentIntentsCount: 0,
      allPaymentIntents: [],
      successfulPaymentIntents: [],
    };

    if (stripeCustomerId) {
      try {
        // Fetch ALL payment intents first to see what's there
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


        // Filter successful ones
        paymentIntents = paymentIntentsResponse.data.filter(
          pi => pi.status === 'succeeded'
        );

        debugInfo.successfulPaymentIntents = paymentIntents.map(pi => ({
          id: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          created: new Date(pi.created * 1000),
        }));

        debugInfo.paymentIntentsCount = paymentIntents.length;

        // Calculate total spend from successful payments
        totalSpendFromStripe = paymentIntents.reduce((total, pi) => {
          return total + (pi.amount / 100);
        }, 0);

      } catch (stripeError) {
        console.error("Stripe API Error:", stripeError);
        debugInfo.stripeError = stripeError instanceof Error ? stripeError.message : String(stripeError);
      }
    } else {
      
      // Option 1: Search by metadata (if you store userId in Stripe metadata)
      try {
        const paymentIntentsResponse = await stripe.paymentIntents.list({
          limit: 100,
        });
        
        // Filter by metadata if you store userId there
        const userPayments = paymentIntentsResponse.data.filter(pi => 
          pi.metadata?.userId === userId || pi.metadata?.user_id === userId
        );
        
        debugInfo.paymentsByMetadata = userPayments.length;
        
        if (userPayments.length > 0) {
          paymentIntents = userPayments.filter(pi => pi.status === 'succeeded');
          totalSpendFromStripe = paymentIntents.reduce((total, pi) => total + (pi.amount / 100), 0);
        }
      } catch (error) {
        if (error instanceof Error) {
          debugInfo.stripeError = error.message;
        } else {
        
        }
      }

      // Option 2: Check if email is stored and search by that
      if (userData?.email && totalSpendFromStripe === 0) {
        try {
          const customers = await stripe.customers.list({
            email: userData.email,
            limit: 10,
          });
          
          debugInfo.customersFoundByEmail = customers.data.length;
          
          if (customers.data.length > 0) {
            const customer = customers.data[0];
            const paymentIntentsResponse = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            });
            
            paymentIntents = paymentIntentsResponse.data.filter(pi => pi.status === 'succeeded');
            totalSpendFromStripe = paymentIntents.reduce((total, pi) => total + (pi.amount / 100), 0);
            
            debugInfo.foundCustomerByEmail = customer.id;
          }
        } catch (error) {
          if (error instanceof Error) {
            debugInfo.stripeError = error.message;
            console.error("Stripe email search error:", error.message);
          } else {
            console.error("Stripe email search error:", error);
          }
        }
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

    // Return comprehensive debug info
    return NextResponse.json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalContests: contests.length,
        totalSpend: totalSpendFromStripe,
        totalPayments: paymentIntents.length,
        projects: projects,
        contests: contests,
        paymentHistory: paymentIntents.map(pi => ({
          id: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          created: new Date(pi.created * 1000),
          description: pi.description,
        })),
        hasProjectDraft: projectDraft !== null,
        hasContestDraft: contestDraft !== null,
        summary: {
          activeProjects: projects.filter(p => p.status === "active").length,
          completedProjects: projects.filter(p => p.status === "completed").length,
          activeContests: contests.filter(c => c.status === "active").length,
          completedContests: contests.filter(c => c.status === "completed").length,
        },
        // Debug information
        debug: debugInfo
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