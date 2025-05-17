import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";
import { adminAuth } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Verify the user
    try {
      await adminAuth.getUser(userId);
    } catch {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Check if the user already has a connect account
    const userDoc = await adminDb.collection("creators").doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeConnectId) {
      // If they already have an account, create an account link for them to update their account
      const accountLink = await stripe.accountLinks.create({
        account: userData.stripeConnectId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?success=true`,
        type: "account_onboarding",
      });

      return NextResponse.json({ url: accountLink.url });
    }

    // Create a new Express account
    const account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        userId,
      },
    });

    // Store the connect account ID in the user's document
    await adminDb.collection("creators").doc(userId).update({
      stripeConnectId: account.id,
      stripeOnboardingStatus: "pending",
      stripeOnboardingStarted: new Date().toISOString(),
    });

    // Create an account link for the user to complete onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating connect account:", error);
    return NextResponse.json(
      {
        error: "Failed to create connect account",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}