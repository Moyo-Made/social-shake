import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const {
			userEmail,
			userId,
			userName,
			userType = "brand", // brand or creator
			planType = "pro", // pro plan
			successUrl,
			cancelUrl,
		} = await request.json();

		if ( !userEmail || !userId) {
			return NextResponse.json(
				{ error: "User email and ID are required" },
				{ status: 400 }
			);
		}

		// Check if user already has an active subscription
		const existingSubscription = await adminDb
			.collection("subscriptions")
			.where("userId", "==", userId)
			.where("status", "in", ["active", "trialing"])
			.limit(1)
			.get();

		if (!existingSubscription.empty) {
			return NextResponse.json(
				{ error: "User already has an active subscription" },
				{ status: 400 }
			);
		}

		// Create or retrieve Stripe customer
		let customer;
		const existingCustomers = await stripe.customers.list({
			email: userEmail,
			limit: 1,
		});

		if (existingCustomers.data.length > 0) {
			customer = existingCustomers.data[0];
		} else {
			customer = await stripe.customers.create({
				email: userEmail,
				name: userName,
				metadata: {
					userId: userId,
					userType: userType,
				},
			});
		}

		// Create the subscription price if it doesn't exist
		// You should create this once in your Stripe dashboard or via a setup script
		const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
		
		if (!priceId) {
			return NextResponse.json(
				{ error: "Subscription price not configured" },
				{ status: 500 }
			);
		}

		// Create checkout session for subscription with free trial
		const session = await stripe.checkout.sessions.create({
			customer: customer.id,
			payment_method_types: ["card"],
			line_items: [
				{
					price: priceId, // Your $99/month price ID
					quantity: 1,
				},
			],
			mode: "subscription",
			success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/brand/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/brand/pricing?canceled=true`,
			
			// Free trial configuration
			subscription_data: {
				trial_period_days: 7,
				metadata: {
					userId: userId,
					userType: userType,
					planType: planType,
				},
			},
			
			// Important: This ensures the card is authorized but not charged during trial
			payment_method_collection: "always",
			
			metadata: {
				userId: userId,
				userEmail: userEmail,
				userType: userType,
				planType: planType,
				paymentType: "subscription",
			},

			// Optional: Add automatic tax calculation
			automatic_tax: { enabled: false },
			
			// Optional: Allow promotion codes
			allow_promotion_codes: true,
		});

		// Create subscription record in your database
		const subscriptionData = {
			userId: userId,
			userType: userType,
			planType: planType,
			stripeCustomerId: customer.id,
			stripeSessionId: session.id,
			status: "pending", // Will be updated via webhook
			trialStart: null, // Will be set via webhook
			trialEnd: null, // Will be set via webhook
			currentPeriodStart: null,
			currentPeriodEnd: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const subscriptionRef = await adminDb
			.collection("subscriptions")
			.add(subscriptionData);

		// Update user record to indicate subscription initiated
		await adminDb.collection("users").doc(userId).update({
			subscriptionStatus: "pending",
			stripeCustomerId: customer.id,
			subscriptionId: subscriptionRef.id,
			updatedAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			sessionId: session.id,
			sessionUrl: session.url,
			customerId: customer.id,
			subscriptionId: subscriptionRef.id,
			trialDays: 7,
		});

	} catch (error) {
		console.error("Error creating subscription checkout session:", error);
		return NextResponse.json(
			{
				error: "Failed to create subscription checkout session",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}