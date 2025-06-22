import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";
import { StripeSubscriptionWithPeriods } from "../../webhooks/stripe/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

// Types
interface SubscriptionData {
	amount: number;
	id: string;
	userId: string;
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	status: string;
	cancelAtPeriodEnd?: boolean;
	canceledAt?: string;
	reactivatedAt?: string;
	updatedAt?: string;
}

interface RequestBody {
	action: "cancel" | "reactivate" | "create_portal_session" | "get_status";
	userId: string;
}

interface SubscriptionStatus {
	id: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialStart: string | null;
	trialEnd: string | null;
	amount: number;
}

// Helper function to safely convert Unix timestamp to ISO string
function timestampToISO(timestamp: number | null | undefined): string | null {
	if (!timestamp || timestamp <= 0) return null;
	try {
		return new Date(timestamp * 1000).toISOString();
	} catch (error) {
		console.warn(`Invalid timestamp: ${timestamp}`, error);
		return null;
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: RequestBody = await request.json();
		const { action, userId } = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Get user's subscription
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("userId", "==", userId)
			.where("status", "in", ["active", "trialing"])
			.limit(1)
			.get();

		if (subscriptionQuery.empty) {
			return NextResponse.json(
				{ error: "No active subscription found" },
				{ status: 404 }
			);
		}

		const subscriptionDoc = subscriptionQuery.docs[0];
		const subscriptionData = subscriptionDoc.data() as SubscriptionData;
		subscriptionData.id = subscriptionDoc.id;

		switch (action) {
			case "cancel":
				return await cancelSubscription(subscriptionData);
			
			case "reactivate":
				return await reactivateSubscription(subscriptionData);
			
			case "create_portal_session":
				return await createPortalSession(subscriptionData);
			
			case "get_status":
				return await getSubscriptionStatus(subscriptionData);
			
			default:
				return NextResponse.json(
					{ error: "Invalid action" },
					{ status: 400 }
				);
		}

	} catch (error) {
		console.error("Error in subscription manager:", error);
		return NextResponse.json(
			{
				error: "Subscription management failed",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

async function cancelSubscription(subscriptionData: SubscriptionData) {
	try {
		// Cancel at period end (so user keeps access until current period ends)
		const subscriptionResponse = await stripe.subscriptions.update(
			subscriptionData.stripeSubscriptionId,
			{
				cancel_at_period_end: true,
			}
		) as unknown as StripeSubscriptionWithPeriods;

		// Update database
		await adminDb
			.collection("subscriptions")
			.doc(subscriptionData.id)
			.update({
				cancelAtPeriodEnd: true,
				canceledAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

		const cancelAtISO = timestampToISO(subscriptionResponse.current_period_end);

		return NextResponse.json({
			success: true,
			message: "Subscription will be canceled at the end of the current period",
			cancelAt: cancelAtISO,
		});

	} catch (error) {
		console.error("Error canceling subscription:", error);
		throw error;
	}
}

async function reactivateSubscription(subscriptionData: SubscriptionData) {
	try {
		// Remove the cancellation
		const subscriptionResponse = await stripe.subscriptions.update(
			subscriptionData.stripeSubscriptionId,
			{
				cancel_at_period_end: false,
			}
		) as unknown as StripeSubscriptionWithPeriods;

		// Update database
		await adminDb
			.collection("subscriptions")
			.doc(subscriptionData.id)
			.update({
				cancelAtPeriodEnd: false,
				reactivatedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

		const nextBillingDateISO = timestampToISO(subscriptionResponse.current_period_end);

		return NextResponse.json({
			success: true,
			message: "Subscription reactivated successfully",
			nextBillingDate: nextBillingDateISO,
		});

	} catch (error) {
		console.error("Error reactivating subscription:", error);
		throw error;
	}
}

async function createPortalSession(subscriptionData: SubscriptionData) {
	try {
		// Create a Stripe Customer Portal session
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: subscriptionData.stripeCustomerId,
			return_url: `${process.env.NEXT_PUBLIC_APP_URL}/brand/subscription`,
		});

		return NextResponse.json({
			success: true,
			portalUrl: portalSession.url,
		});

	} catch (error) {
		console.error("Error creating portal session:", error);
		throw error;
	}
}

async function getSubscriptionStatus(subscriptionData: SubscriptionData) {
	try {
		// Get latest subscription data from Stripe
		const subscriptionResponse = await stripe.subscriptions.retrieve(
			subscriptionData.stripeSubscriptionId,
			{
				expand: ['items.data.price'] // Ensure price data is expanded
			}
		) as unknown as StripeSubscriptionWithPeriods;

		console.log("Stripe subscription raw data:", {
			id: subscriptionResponse.id,
			status: subscriptionResponse.status,
			current_period_start: subscriptionResponse.current_period_start,
			current_period_end: subscriptionResponse.current_period_end,
			trial_start: subscriptionResponse.trial_start,
			trial_end: subscriptionResponse.trial_end,
			cancel_at_period_end: subscriptionResponse.cancel_at_period_end,
			// Add detailed items debugging
			items_count: subscriptionResponse.items?.data?.length || 0,
			items_data: subscriptionResponse.items?.data?.map(item => ({
				id: item.id,
				price_id: item.price?.id,
				unit_amount: item.price?.unit_amount,
				currency: item.price?.currency,
				recurring: item.price?.recurring
			}))
		});

		const currentPeriodStartISO = timestampToISO(subscriptionResponse.current_period_start);
		const currentPeriodEndISO = timestampToISO(subscriptionResponse.current_period_end);
		const trialStartISO = timestampToISO(subscriptionResponse.trial_start);
		const trialEndISO = timestampToISO(subscriptionResponse.trial_end);

		console.log("Converted timestamps:", {
			currentPeriodStartISO,
			currentPeriodEndISO,
			trialStartISO,
			trialEndISO
		});

		// For trialing subscriptions, period dates might be null/undefined
		// Use trial dates or provide fallback values
		let finalPeriodStart = currentPeriodStartISO;
		let finalPeriodEnd = currentPeriodEndISO;

		if (subscriptionResponse.status === 'trialing') {
			// For trialing subscriptions, use trial dates as fallback
			if (!finalPeriodStart && trialStartISO) {
				finalPeriodStart = trialStartISO;
			}
			if (!finalPeriodEnd && trialEndISO) {
				finalPeriodEnd = trialEndISO;
			}
		}

		// If we still don't have period dates, provide reasonable defaults
		if (!finalPeriodStart) {
			finalPeriodStart = new Date().toISOString();
			console.warn("Using current date as fallback for period start");
		}
		
		if (!finalPeriodEnd) {
			// Default to 30 days from now
			const defaultEnd = new Date();
			defaultEnd.setDate(defaultEnd.getDate() + 30);
			finalPeriodEnd = defaultEnd.toISOString();
			console.warn("Using 30-day fallback for period end");
		}

		// Better amount calculation with detailed logging
		let subscriptionAmount = 0;
		let amountSource = "";
		
		if (subscriptionResponse.items?.data?.length > 0) {
			const firstItem = subscriptionResponse.items.data[0];
			console.log("First subscription item:", {
				id: firstItem.id,
				price: firstItem.price,
				unit_amount: firstItem.price?.unit_amount
			});
			
			if (firstItem.price?.unit_amount && firstItem.price.unit_amount > 0) {
				subscriptionAmount = firstItem.price.unit_amount / 100;
				amountSource = "stripe";
				console.log(`Found subscription amount from Stripe: ${subscriptionAmount}`);
			} else {
				console.warn("No unit_amount found in first item price or unit_amount is 0");
			}
		} else {
			console.warn("No subscription items found");
		}

		// Fallback to database stored amount if Stripe doesn't have it
		if (subscriptionAmount === 0 && subscriptionData.amount && subscriptionData.amount > 0) {
			subscriptionAmount = subscriptionData.amount;
			amountSource = "database";
			console.log(`Using stored amount from database: ${subscriptionAmount}`);
		}

		// Last resort fallback (but log it as an error)
		if (subscriptionAmount === 0) {
			subscriptionAmount = 99; // Your current fallback
			amountSource = "hardcoded";
			console.error("No subscription amount found from Stripe or database, using fallback of 99");
		}

		const subscriptionStatus: SubscriptionStatus = {
			id: subscriptionResponse.id,
			status: subscriptionResponse.status,
			currentPeriodStart: finalPeriodStart,
			currentPeriodEnd: finalPeriodEnd,
			cancelAtPeriodEnd: subscriptionResponse.cancel_at_period_end || false,
			trialStart: trialStartISO,
			trialEnd: trialEndISO,
			amount: subscriptionAmount,
		};

		return NextResponse.json({
			success: true,
			subscription: subscriptionStatus,
			// Add debug info to help troubleshoot
			debug: {
				stripeItemsCount: subscriptionResponse.items?.data?.length || 0,
				foundAmountInStripe: subscriptionResponse.items?.data?.[0]?.price?.unit_amount ? true : false,
				amountSource: amountSource,
				stripeUnitAmount: subscriptionResponse.items?.data?.[0]?.price?.unit_amount,
				databaseAmount: subscriptionData.amount,
				finalAmount: subscriptionAmount
			}
		});

	} catch (error) {
		console.error("Error getting subscription status:", error);
		throw error;
	}
}