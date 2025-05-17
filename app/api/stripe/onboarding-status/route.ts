import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the user document
    const userDoc = await adminDb.collection("creators").doc(userId).get();
    const userData = userDoc.data();

    // If no Stripe Connect ID, they haven't started onboarding
    if (!userData?.stripeConnectId) {
      return NextResponse.json({ status: "not_started" });
    }

    // Check the account status with Stripe
    const account = await stripe.accounts.retrieve(userData.stripeConnectId);

    // Update the status in our database
    const onboardingStatus = account.details_submitted ? "complete" : "pending";
    
    // Only update if the status has changed
    if (userData.stripeOnboardingStatus !== onboardingStatus) {
      await adminDb.collection("creators").doc(userId).update({
        stripeOnboardingStatus: onboardingStatus,
        stripeOnboardingUpdated: new Date().toISOString(),
      });
    }

    return NextResponse.json({ 
      status: onboardingStatus,
      accountId: userData.stripeConnectId 
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      {
        error: "Failed to check onboarding status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}