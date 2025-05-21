import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const { userId, stripeAccountId = true } = await request.json();

    if (!userId || !stripeAccountId) {
      return NextResponse.json(
        { error: "User ID and Stripe Account ID are required" },
        { status: 400 }
      );
    }

    // Initialize Stripe with the appropriate key based on test mode
   
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-03-31.basil",
   });

    // Create dashboard login link
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    
    return NextResponse.json({ url: loginLink.url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error creating Stripe dashboard link:", error);
    return NextResponse.json(
      { 
        error: "Failed to create Stripe dashboard link",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}