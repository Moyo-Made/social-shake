import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const {
			amount,
			paymentId,
			contestTitle,
			projectTitle,
			videoTitle,
			userEmail,
			userId,
			paymentType = "contest", // Default for backward compatibility
		} = await request.json();

		if (!amount || !paymentId || !userEmail) {
			return NextResponse.json(
				{ error: "Amount, payment ID, and user email are required" },
				{ status: 400 }
			);
		}

		// Verify that the payment record exists
		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}

		const paymentDoc = await adminDb
			.collection("payments")
			.doc(paymentId)
			.get();

		if (!paymentDoc.exists) {
			return NextResponse.json(
				{ error: "Payment record not found" },
				{ status: 404 }
			);
		}

		const paymentData = paymentDoc.data();

		// Determine payment details based on type
		let productName = "";
		let productDescription = "";
		let successUrl = "";
		let cancelUrl = "";

		switch (paymentType) {
			case "submission_approval":
				productName = `Submission Approval - ${projectTitle || paymentData?.projectTitle || "Project"}`;
				productDescription = `Payment for approved submission`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=project`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/project/new?canceled=true`;
				break;
			case "video":
				productName = videoTitle || paymentData?.videoTitle || "Video Purchase";
				productDescription = `Purchase of video: ${productName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/video-purchase-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/videos?canceled=true`;
				break;
			case "project":
				productName =
					projectTitle || paymentData?.projectTitle || "Project Payment";
				productDescription = `Payment for project: ${productName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=project`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/project/new?canceled=true`;
				break;
			case "contest":
			default:
				productName =
					contestTitle || paymentData?.contestName || "Contest Payment";
				productDescription = `Payment for contest: ${productName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=contest`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/contest/new?canceled=true`;
				break;
		}

		// Create a Stripe checkout session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: productName,
							description: productDescription,
						},
						unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
					},
					quantity: 1,
				},
			],
			mode: "payment",
			payment_intent_data: {
				...(paymentType === "video" &&
					paymentData?.creatorId && {
						on_behalf_of: paymentData.creatorId, // Creator's Stripe Connect account ID
						transfer_data: {
							destination: paymentData.creatorId,
						},
					}),
				metadata: {
					paymentId,
					userId,
					paymentType,
					paymentName: productName,
					description: productDescription,
					// Add video-specific metadata if applicable
					...(paymentType === "video" &&
						paymentData && {
							videoId: paymentData.videoId,
							creatorId: paymentData.creatorId,
							creatorEmail: paymentData.creatorEmail,
						}),
					// Add submission-specific metadata
					...(paymentType === "submission_approval" &&
						paymentData && {
							submissionId: paymentData.submissionId,
							projectId: paymentData.projectId,
							creatorId: paymentData.creatorId,
						}),
				},
			},
			success_url: successUrl,
			cancel_url: cancelUrl,
			customer_email: userEmail,
			metadata: {
				paymentId,
				userId,
				paymentType,
				paymentName: productName,
				description: productDescription,
				// Add video-specific metadata if applicable
				...(paymentType === "video" &&
					paymentData && {
						videoId: paymentData.videoId,
						creatorId: paymentData.creatorId,
						creatorEmail: paymentData.creatorEmail,
					}),
			},
		});

		// Update payment record with sessionId
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {
			stripeSessionId: session.id,
			updatedAt: new Date().toISOString(),
			paymentType,
			paymentName: productName,
		};

		await adminDb.collection("payments").doc(paymentId).update(updateData);

		// For video purchases, also create a notification for the creator
		if (paymentType === "video" && paymentData?.creatorId) {
			const notificationData = {
				type: "video_purchase_initiated",
				creatorId: paymentData.creatorId,
				brandId: userId,
				videoId: paymentData.videoId,
				amount: parseFloat(amount),
				paymentId,
				sessionId: session.id,
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				message: `A brand has initiated purchase of your video: ${productName}`,
			};

			await adminDb.collection("notifications").add(notificationData);
		}

		return NextResponse.json({
			success: true,
			sessionId: session.id,
			paymentType,
		});
	} catch (error) {
		console.error("Error creating checkout session:", error);
		return NextResponse.json(
			{
				error: "Failed to create checkout session",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
