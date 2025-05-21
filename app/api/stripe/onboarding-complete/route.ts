import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";
import { cookies } from "next/headers";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

/**
 * This endpoint handles the return from Stripe onboarding process
 * It should be called when a user is redirected back from Stripe
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const stripeSuccess = searchParams.get('stripe_success');
    const userId = (await cookies()).get('userId')?.value;

    if (!userId) {
      return NextResponse.redirect(new URL('/dashboard?error=auth_required', request.url));
    }

    // If this wasn't a successful return, redirect to dashboard
    if (stripeSuccess !== 'true') {
      return NextResponse.redirect(new URL('/dashboard?error=stripe_cancelled', request.url));
    }
    
    // Get the creator document
    const creatorDoc = await adminDb.collection("creators").doc(userId).get();
    
    if (!creatorDoc.exists) {
      return NextResponse.redirect(new URL('/dashboard?error=account_not_found', request.url));
    }
    
    const creatorData = creatorDoc.data();
    const stripeAccountId = creatorData?.stripeAccountId || creatorData?.stripeConnectId;
    
    if (!stripeAccountId) {
      return NextResponse.redirect(new URL('/dashboard?error=stripe_not_connected', request.url));
    }
    
    // Verify the status with Stripe directly
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    // Update the creator document based on actual Stripe status
    await adminDb.collection("creators").doc(userId).set({
      // Update both field names to ensure compatibility
      stripeAccountId: stripeAccountId,
      stripeConnectId: stripeAccountId,
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
    
    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?stripe=success', request.url));
    
  } catch (error) {
    console.error("Error handling Stripe return:", error);
    return NextResponse.redirect(
      new URL('/dashboard?error=stripe_verification_failed', request.url)
    );
  }
}