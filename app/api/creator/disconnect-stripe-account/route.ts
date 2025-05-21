import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the creator document to check if they have a Stripe account
    const creatorDoc = await adminDb.collection("creators").doc(userId).get();
    
    if (!creatorDoc.exists) {
      return NextResponse.json(
        { error: "Creator account not found" },
        { status: 404 }
      );
    }

    const creatorData = creatorDoc.data();
    
    // If there's no Stripe account connected, just return success
    if (!creatorData?.stripeAccountId) {
      return NextResponse.json({
        success: true,
        message: "No Stripe account was connected"
      });
    }

    // Initialize Stripe client
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    //   apiVersion: "2025-03-31.basil",
    // });

    // We don't actually delete the Stripe account, just disconnect it in our system
    // This approach is more recoverable and aligns with Stripe's recommended practices
    
    // Update the creator document to remove Stripe connection
    await adminDb.collection("creators").doc(userId).update({
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      stripeTestMode: false,
      stripeDisconnectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully"
    });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error disconnecting Stripe account:", error);
    return NextResponse.json(
      { 
        error: "Failed to disconnect Stripe account",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}