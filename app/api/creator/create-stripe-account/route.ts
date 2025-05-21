import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Initialize Stripe with TEST mode key and ensure you use TEST_KEY for development

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const { userId, email, redirectUrl } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Check if user already has a Stripe account
		const creatorDoc = await adminDb.collection("creators").doc(userId).get();

		// Handle case when the document doesn't exist
		if (!creatorDoc.exists) {
			// Create a new document if it doesn't exist
			await adminDb.collection("creators").doc(userId).set({
				userId,
				email,
				createdAt: new Date().toISOString(),
			});
		}

		const creatorData = creatorDoc.exists ? creatorDoc.data() : null;

		// If user already has a Stripe account, create a new onboarding link
		if (creatorData?.stripeAccountId) {
			try {
				const accountLink = await stripe.accountLinks.create({
					account: creatorData.stripeAccountId,
					refresh_url: `${redirectUrl}?stripe_refresh=true`,
					return_url: `${redirectUrl}?stripe_success=true`,
					type: "account_onboarding",
				});

				return NextResponse.json({ url: accountLink.url });
			} catch (stripeError) {
				console.error("Error creating account link:", stripeError);
				return NextResponse.json(
					{ error: "Failed to create onboarding link" },
					{ status: 500 }
				);
			}
		}

		// Create a new Stripe Connect account in TEST mode
		try {
			const account = await stripe.accounts.create({
				type: "express",
				email: email || undefined,
				capabilities: {
					transfers: { requested: true },
					card_payments: { requested: true },
				},
				business_type: "individual",
				metadata: {
					userId: userId,
					environment: "test", // Mark as test account
				},
			});

			// Store the Stripe account ID in Firestore - use set with merge for more reliability
			await adminDb.collection("creators").doc(userId).set(
				{
					stripeAccountId: account.id,
					stripeOnboardingComplete: false,
					stripeTestMode: true, // Flag to indicate this is a test account
					updatedAt: new Date().toISOString(),
				},
				{ merge: true }
			);

			// Create an account link for onboarding
			const accountLink = await stripe.accountLinks.create({
				account: account.id,
				refresh_url: `${redirectUrl}?stripe_refresh=true`,
				return_url: `${redirectUrl}?stripe_success=true`,
				type: "account_onboarding",
			});

			return NextResponse.json({ url: accountLink.url });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (stripeError: any) {
			console.error("Stripe API error:", stripeError);
			// Return more specific error information
			return NextResponse.json(
				{
					error: "Failed to create Stripe account",
					message: stripeError.message || "Unknown Stripe error",
					code: stripeError.code || "unknown",
				},
				{ status: 500 }
			);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		console.error("Error creating Stripe account:", error);
		return NextResponse.json(
			{
				error: "Failed to create Stripe account",
				message: error.message || "Unknown error",
			},
			{ status: 500 }
		);
	}
}
