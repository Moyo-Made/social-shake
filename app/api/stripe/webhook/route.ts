import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";
import { headers } from "next/headers";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

// Your webhook secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Stripe webhook handler to keep account status in sync
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle specific event types
  try {
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      
      // Find the creator document with this Stripe account
      const creatorsSnapshot = await adminDb
        .collection("creators")
        .where("stripeAccountId", "==", account.id)
        .limit(1)
        .get();
      
      // If no results, try the other field name
      if (creatorsSnapshot.empty) {
        const alternativeSnapshot = await adminDb
          .collection("creators")
          .where("stripeConnectId", "==", account.id)
          .limit(1)
          .get();
          
        if (alternativeSnapshot.empty) {
          return NextResponse.json({ error: "Creator not found" }, { status: 404 });
        }
        
        const creatorDoc = alternativeSnapshot.docs[0];
        
        // Update creator document with latest Stripe status
        await creatorDoc.ref.set({
          // Update both field names to ensure compatibility
          stripeAccountId: account.id,
          stripeConnectId: account.id,
          stripeOnboardingComplete: account.charges_enabled && account.payouts_enabled,
          stripeOnboardingStatus: (account.charges_enabled && account.payouts_enabled) ? "complete" : "pending",
          stripeAccountDetails: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            defaultCurrency: account.default_currency,
            lastUpdated: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        return NextResponse.json({ success: true });
      }

      // ADD: Handle checkout session completed for video purchases
  else if ((event.type as string) === 'checkout.session.completed') {
    const session = event.data.object as unknown as Stripe.Checkout.Session;
    
    console.log('Checkout session completed:', session.id);
    
    // Check if this is a video purchase
    if (session.metadata?.paymentType === 'video' && session.metadata?.videoId) {
      console.log('Processing video purchase webhook for video:', session.metadata.videoId);
      
      try {
        // Increment video purchase count
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/videos/${session.metadata.videoId}/increment-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          console.error('Failed to increment purchase count:', await response.text());
        } else {
          console.log('Successfully incremented purchase count for video:', session.metadata.videoId);
        }
        
      } catch (error) {
        console.error('Error processing video purchase webhook:', error);
      }
    }
  }
      
      const creatorDoc = creatorsSnapshot.docs[0];
      
      // Update creator document with latest Stripe status
      await creatorDoc.ref.set({
        // Update both field names to ensure compatibility
        stripeAccountId: account.id,
        stripeConnectId: account.id,
        stripeOnboardingComplete: account.charges_enabled && account.payouts_enabled,
        stripeOnboardingStatus: (account.charges_enabled && account.payouts_enabled) ? "complete" : "pending",
        stripeAccountDetails: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          defaultCurrency: account.default_currency,
          lastUpdated: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error(`Error handling webhook: ${error}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}