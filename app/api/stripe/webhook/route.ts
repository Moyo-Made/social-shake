import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";
import { headers } from "next/headers";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

// Your webhook secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Stripe webhook handler to keep account status in sync
 */
export async function POST(request: NextRequest) {
	const body = await request.text();
	const headersList = await headers();
	const sig = headersList.get("stripe-signature") as string;

	let event: Stripe.Event;

	try {
		// Verify webhook signature
		event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
		console.log("Webhook signature verified successfully");
	} catch (err) {
		console.error(`Webhook signature verification failed: ${err}`);
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	// Handle specific event types
	try {
		console.log(`Processing webhook event: ${event.type}`);

		if (event.type === "account.updated") {
			const account = event.data.object as Stripe.Account;
			console.log(`Processing account.updated for account: ${account.id}`);

			// Find the creator document with this Stripe account
			let creatorDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
			
			// Try first field name
			const creatorsSnapshot = await adminDb
				.collection("creators")
				.where("stripeAccountId", "==", account.id)
				.limit(1)
				.get();

			if (!creatorsSnapshot.empty) {
				creatorDoc = creatorsSnapshot.docs[0];
			} else {
				// Try alternative field name
				const alternativeSnapshot = await adminDb
					.collection("creators")
					.where("stripeConnectId", "==", account.id)
					.limit(1)
					.get();

				if (!alternativeSnapshot.empty) {
					creatorDoc = alternativeSnapshot.docs[0];
				}
			}

			if (!creatorDoc) {
				console.error(`Creator not found for Stripe account: ${account.id}`);
				return NextResponse.json(
					{ error: "Creator not found" },
					{ status: 404 }
				);
			}

			// Update creator document with latest Stripe status
			await creatorDoc.ref.set(
				{
					// Update both field names to ensure compatibility
					stripeAccountId: account.id,
					stripeConnectId: account.id,
					stripeOnboardingComplete:
						account.charges_enabled && account.payouts_enabled,
					stripeOnboardingStatus:
						account.charges_enabled && account.payouts_enabled
							? "complete"
							: "pending",
					stripeAccountDetails: {
						chargesEnabled: account.charges_enabled,
						payoutsEnabled: account.payouts_enabled,
						detailsSubmitted: account.details_submitted,
						defaultCurrency: account.default_currency,
						lastUpdated: new Date().toISOString(),
					},
					updatedAt: new Date().toISOString(),
				},
				{ merge: true }
			);

			console.log(`Successfully updated creator document for account: ${account.id}`);
		}
		
		// Handle checkout session completed separately
		else if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			console.log(`Processing checkout.session.completed: ${session.id}`);
			console.log(`Session metadata:`, session.metadata);

			// Handle submission approval payments
			if (
				session.metadata?.paymentType === "submission_approval" &&
				session.metadata?.submissionId
			) {
				try {
					console.log(`Processing submission approval for: ${session.metadata.submissionId}`);
					
					// Update submission directly in database
					await adminDb
						.collection("project_submissions")
						.doc(session.metadata.submissionId)
						.update({
							status: "approved",
							updatedAt: new Date().toISOString(),
						});

					console.log("Successfully updated submission status to approved");
				} catch (error) {
					console.error("Error updating submission status:", error);
					// Don't throw the error, just log it
				}
			}

			// Handle video purchases
			if (
				session.metadata?.paymentType === "video" &&
				session.metadata?.videoId
			) {
				console.log(
					"Processing video purchase webhook for video:",
					session.metadata.videoId
				);

				try {
					// Increment video purchase count
					const response = await fetch(
						`${process.env.NEXT_PUBLIC_BASE_URL}/api/videos/${session.metadata.videoId}/increment-purchase`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
						}
					);

					if (!response.ok) {
						console.error(
							"Failed to increment purchase count:",
							await response.text()
						);
					} else {
						console.log(
							"Successfully incremented purchase count for video:",
							session.metadata.videoId
						);
					}
				} catch (error) {
					console.error("Error processing video purchase webhook:", error);
				}
			}
		}
		
		// Handle other event types
		else {
			console.log(`Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(`Error handling webhook: ${error}`);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 }
		);
	}
}