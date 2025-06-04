import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

	try {
		const body = await request.text();
		const sig = request.headers.get("stripe-signature") || "";

		let event;

		try {
			event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", err);
			return NextResponse.json(
				{ error: "Webhook signature verification failed" },
				{ status: 400 }
			);
		}

		// Handle the event
		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;

			if (session.payment_status === "paid") {
				// Get the contestId from metadata
				const contestId = session.metadata?.contestId;

				if (!contestId) {
					console.error("No contestId found in session metadata");
					return NextResponse.json(
						{ error: "No contestId found" },
						{ status: 400 }
					);
				}

				// Get the temporary contest
				const tempContestDoc = await adminDb
					.collection("tempContests")
					.doc(contestId)
					.get();

				if (!tempContestDoc.exists) {
					console.error("Temporary contest not found:", contestId);
					return NextResponse.json(
						{ error: "Temporary contest not found" },
						{ status: 404 }
					);
				}

				const tempContestData = tempContestDoc.data();

				// Create the final contest with active status
				const finalContestData = {
					...tempContestData,
					status: "active",
					paymentId: session.id,
					paymentAmount: session.amount_total
						? session.amount_total / 100
						: null,
					paymentDate: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				// Remove temporary fields
				if ("expiresAt" in finalContestData) {
					delete finalContestData.expiresAt;
				}

				// Save to contests collection
				await adminDb
					.collection("contests")
					.doc(contestId)
					.set(finalContestData);

				// Optionally delete the temporary record
				await adminDb.collection("tempContests").doc(contestId).delete();

				console.log(`Contest ${contestId} activated after payment`);
			}
		}

		if (event.type === "payment_intent.succeeded") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;

			if (paymentIntent.metadata?.paymentType === "video") {
				// Update video purchase status
				const paymentId = paymentIntent.metadata.paymentId;

				await adminDb.collection("video_purchases").doc(paymentId).update({
					status: "completed",
					paidAt: new Date().toISOString(),
					stripePaymentIntentId: paymentIntent.id,
				});

				// Notify creator
				await adminDb.collection("notifications").add({
					type: "video_purchased",
					creatorId: paymentIntent.metadata.creatorId,
					message: "Your video has been purchased and payment transferred!",
					createdAt: new Date().toISOString(),
				});
			}

			// Handle submission approval payments
			if (paymentIntent.metadata?.paymentType === "submission_approval") {
				const submissionId = paymentIntent.metadata.submissionId;
				const projectId = paymentIntent.metadata.projectId;
				const creatorId = paymentIntent.metadata.creatorId;

				if (submissionId && projectId) {
					try {
						// Update submission status to approved in project_submissions collection
						await adminDb
							.collection("project_submissions")
							.doc(submissionId)
							.update({
								status: "approved",
								approvedAt: new Date().toISOString(),
								paymentId: paymentIntent.metadata.paymentId,
								paymentAmount: paymentIntent.amount / 100,
								paidAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							});

						// Notify creator
						await adminDb.collection("notifications").add({
							type: "submission_approved",
							creatorId: creatorId,
							projectId: projectId,
							submissionId: submissionId,
							message:
								"Your submission has been approved and payment processed!",
							createdAt: new Date().toISOString(),
						});

						console.log(`Submission ${submissionId} approved after payment`);
					} catch (error) {
						console.error("Error updating submission:", error);
					}
				}
			}
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 }
		);
	}
}

// Configure the raw body for webhook handling
export const config = {
	api: {
		bodyParser: false,
	},
};
