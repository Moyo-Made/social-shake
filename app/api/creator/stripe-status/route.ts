import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const creatorDoc = await adminDb.collection("creators").doc(userId).get();
    
    if (!creatorDoc.exists) {
      return NextResponse.json({
        connected: false,
        message: "Creator account not found"
      });
    }

    const creatorData = creatorDoc.data();
    
    // Check if the creator has a Stripe account connected
    if (!creatorData?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected"
      });
    }
    
    // Initialize Stripe using the appropriate key based on test mode
    
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

    // Get account details to check if onboarding is complete
    const account = await stripe.accounts.retrieve(creatorData.stripeAccountId);
    
    const isOnboardingComplete = 
      account.details_submitted && 
      account.charges_enabled;

    // Update onboarding status in Firestore if it has changed
    if (creatorData.stripeOnboardingComplete !== isOnboardingComplete) {
      await adminDb.collection("creators").doc(userId).update({
        stripeOnboardingComplete: isOnboardingComplete,
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      connected: true,
      stripeAccountId: creatorData.stripeAccountId,
      onboardingComplete: isOnboardingComplete,
      testMode: !!creatorData.stripeTestMode
    });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error checking Stripe status:", error);
    return NextResponse.json(
      { 
        error: "Failed to check Stripe status",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}