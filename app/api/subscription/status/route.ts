import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get('userId');
	
	if (!userId) {
		return NextResponse.json(
			{ error: "User ID is required" }, 
			{ status: 400 }
		);
	}
	
	try {
		// Get user document from Firebase
		const userDoc = await adminDb.collection("users").doc(userId).get();
		
		if (!userDoc.exists) {
			return NextResponse.json(
				{ error: "User not found" }, 
				{ status: 404 }
			);
		}
		
		const userData = userDoc.data();
		const subscriptionStatus = userData?.subscriptionStatus;
		
		// Check if user has an active subscription
		const activeStatuses = ["active", "trialing"];
		const hasActiveSubscription = activeStatuses.includes(subscriptionStatus);
		
		// Get additional subscription details if available
		let subscriptionDetails = null;
		if (userData?.stripeSubscriptionId) {
			const subscriptionQuery = await adminDb
				.collection("subscriptions")
				.where("stripeSubscriptionId", "==", userData.stripeSubscriptionId)
				.where("userId", "==", userId)
				.limit(1)
				.get();
			
			if (!subscriptionQuery.empty) {
				const subscriptionData = subscriptionQuery.docs[0].data();
				subscriptionDetails = {
					id: subscriptionQuery.docs[0].id,
					status: subscriptionData.status,
					planType: subscriptionData.planType,
					trialEnd: subscriptionData.trialEnd,
					currentPeriodEnd: subscriptionData.currentPeriodEnd,
					cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
				};
			}
		}
		
		return NextResponse.json({ 
			hasActiveSubscription,
			subscriptionStatus,
			subscription: subscriptionDetails
		});
	} catch (error) {
		console.error("Error checking subscription status:", error);
		return NextResponse.json(
			{ error: "Failed to check subscription" }, 
			{ status: 500 }
		);
	}
}