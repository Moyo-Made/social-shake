import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

// This secret should match the one configured in your Stripe webhook settings
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") as string;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed:`, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  switch (event.type as any) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      
      // Find the user with this connect account
      const usersSnapshot = await adminDb
        .collection('creators')
        .where('stripeConnectId', '==', account.id)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userId = usersSnapshot.docs[0].id;
        
        // Check if the account has all requirements completed
        if (
          account.charges_enabled &&
          account.payouts_enabled && 
          account.details_submitted
        ) {
          // Update user record to mark onboarding as complete
          await adminDb.collection('creators').doc(userId).update({
            stripeOnboardingStatus: 'complete',
            stripeOnboardingCompleted: new Date().toISOString(),
            stripeAccountDetails: {
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
              detailsSubmitted: account.details_submitted,
              defaultCurrency: account.default_currency,
              businessType: account.business_type,
              updatedAt: new Date().toISOString()
            }
          });
          
          console.log(`✅ User ${userId} has completed Stripe onboarding`);
        } else {
          // Still pending or something is missing
          await adminDb.collection('creators').doc(userId).update({
            stripeOnboardingStatus: 'pending',
            stripeAccountDetails: {
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
              detailsSubmitted: account.details_submitted,
              updatedAt: new Date().toISOString()
            }
          });
          
          console.log(`⏳ User ${userId} Stripe onboarding update - still pending`);
        }
      }
      break;
    }
    
    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
      
      // Update payout record if found
      if (transfer.metadata?.userId && transfer.metadata?.contestId) {
        const payoutsSnapshot = await adminDb
          .collection('payouts')
          .where('contestId', '==', transfer.metadata.contestId)
          .where('userId', '==', transfer.metadata.userId)
          .where('stripeTransferId', '==', transfer.id)
          .limit(1)
          .get();
        
        if (!payoutsSnapshot.empty) {
          await adminDb.collection('payouts').doc(payoutsSnapshot.docs[0].id).update({
            transferStatus: 'created',
            transferDetails: {
              amount: transfer.amount / 100, // Convert from cents back to dollars
              currency: transfer.currency,
              created: new Date(transfer.created * 1000).toISOString(),
              destination: transfer.destination,
            },
            updatedAt: new Date().toISOString(),
          });
        }
      }
      break;
    }
    
    case 'transfer.paid': {
      const transfer = event.data.object as Stripe.Transfer;
      
      // Update payout record if found
      if (transfer.metadata?.userId && transfer.metadata?.contestId) {
        const payoutsSnapshot = await adminDb
          .collection('payouts')
          .where('contestId', '==', transfer.metadata.contestId)
          .where('userId', '==', transfer.metadata.userId)
          .where('stripeTransferId', '==', transfer.id)
          .limit(1)
          .get();
        
        if (!payoutsSnapshot.empty) {
          await adminDb.collection('payouts').doc(payoutsSnapshot.docs[0].id).update({
            transferStatus: 'paid',
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      break;
    }
    
    case 'transfer.failed': {
      const transfer = event.data.object as Stripe.Transfer;
      
      // Update payout record if found
      if (transfer.metadata?.userId && transfer.metadata?.contestId) {
        const payoutsSnapshot = await adminDb
          .collection('payouts')
          .where('contestId', '==', transfer.metadata.contestId)
          .where('userId', '==', transfer.metadata.userId)
          .where('stripeTransferId', '==', transfer.id)
          .limit(1)
          .get();
        
        if (!payoutsSnapshot.empty) {
          await adminDb.collection('payouts').doc(payoutsSnapshot.docs[0].id).update({
            transferStatus: 'failed',
            status: 'failed',
            error: 'Transfer failed at Stripe',
            updatedAt: new Date().toISOString(),
          });
        }
      }
      break;
    }
    
    // Add additional event types as needed
    
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}