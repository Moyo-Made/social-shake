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

		// Check if creator has connected Stripe account for creator payment types
		const creatorPaymentTypes = ["video", "project", "contest", "submission_approval"];
		const requiresCreatorAccount = creatorPaymentTypes.includes(paymentType);
		
		if (requiresCreatorAccount && !paymentData?.stripeConnectId) {
			return NextResponse.json(
				{ 
					error: "Creator hasn't connected their Stripe account yet. Please ask them to connect their account before proceeding with payment.",
					errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED"
				},
				{ status: 400 }
			);
		}

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

		// Create payment intent data with direct creator payment for all creator payment types
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const paymentIntentData: any = {
			metadata: {
				paymentId,
				userId,
				paymentType,
				paymentName: productName,
				description: productDescription,
				// Add specific metadata based on payment type
				...(paymentType === "video" && paymentData && {
					videoId: paymentData.videoId,
					creatorId: paymentData.creatorId,
					creatorEmail: paymentData.creatorEmail,
				}),
				...(paymentType === "submission_approval" && paymentData && {
					submissionId: paymentData.submissionId,
					projectId: paymentData.projectId,
					creatorId: paymentData.creatorId,
				}),
				...(paymentType === "project" && paymentData && {
					projectId: paymentData.projectId,
					creatorId: paymentData.creatorId,
				}),
				...(paymentType === "contest" && paymentData && {
					contestId: paymentData.contestId,
					creatorId: paymentData.creatorId,
				}),
			},
		};

		// Add direct payment to creator for all creator payment types
		if (requiresCreatorAccount && paymentData?.stripeConnectId) {
			paymentIntentData.on_behalf_of = paymentData.stripeConnectId;
			paymentIntentData.transfer_data = {
				destination: paymentData.stripeConnectId,
			};
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
			payment_intent_data: paymentIntentData,
			success_url: successUrl,
			cancel_url: cancelUrl,
			customer_email: userEmail,
			metadata: {
				paymentId,
				userId,
				paymentType,
				paymentName: productName,
				description: productDescription,
				// Add specific metadata based on payment type
				...(paymentType === "video" && paymentData && {
					videoId: paymentData.videoId,
					creatorId: paymentData.creatorId,
					creatorEmail: paymentData.creatorEmail,
				}),
				...(paymentType === "submission_approval" && paymentData && {
					submissionId: paymentData.submissionId,
					projectId: paymentData.projectId,
					creatorId: paymentData.creatorId,
				}),
				...(paymentType === "project" && paymentData && {
					projectId: paymentData.projectId,
					creatorId: paymentData.creatorId,
				}),
				...(paymentType === "contest" && paymentData && {
					contestId: paymentData.contestId,
					creatorId: paymentData.creatorId,
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

		// Create notifications for creators based on payment type
		if (requiresCreatorAccount && paymentData?.stripeConnectId) {
			let notificationMessage = "";
			let notificationType = "";

			switch (paymentType) {
				case "video":
					notificationType = "video_purchase_initiated";
					notificationMessage = `A brand has initiated purchase of your video: ${productName}`;
					break;
				case "project":
					notificationType = "project_payment_initiated";
					notificationMessage = `A brand has initiated payment for your project: ${productName}`;
					break;
				case "contest":
					notificationType = "contest_payment_initiated";
					notificationMessage = `A brand has initiated payment for contest: ${productName}`;
					break;
				case "submission_approval":
					notificationType = "submission_payment_initiated";
					notificationMessage = `A brand has initiated payment for your approved submission: ${productName}`;
					break;
			}

			const notificationData = {
				type: notificationType,
				creatorId: paymentData.creatorId,
				brandId: userId,
				amount: parseFloat(amount),
				paymentId,
				sessionId: session.id,
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				message: notificationMessage,
				// Add specific fields based on payment type
				...(paymentType === "video" && { videoId: paymentData.videoId }),
				...(paymentType === "project" && { projectId: paymentData.projectId }),
				...(paymentType === "contest" && { contestId: paymentData.contestId }),
				...(paymentType === "submission_approval" && { 
					submissionId: paymentData.submissionId,
					projectId: paymentData.projectId 
				}),
			};

			await adminDb.collection("notifications").add(notificationData);
		}

		return NextResponse.json({
			success: true,
			sessionId: session.id,
			paymentType,
			directPayment: requiresCreatorAccount,
			creatorConnected: !!paymentData?.stripeConnectId,
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