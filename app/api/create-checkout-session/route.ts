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
			// Add these new parameters for proper pricing calculation
			projectFormData,
			submissionData,
			// NEW: Order-specific parameters
			orderId,
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
		const creatorPaymentTypes = [
			"video",
			"project",
			"contest",
			"submission_approval",
			"order",
			"order_escrow", // Add order_escrow to creator payment types
		];

		// Define payment types that use escrow (held until approval)
		const escrowPaymentTypes = ["order_escrow", "submission_approval"];

		const requiresCreatorAccount = creatorPaymentTypes.includes(paymentType);
		const isEscrowPayment = escrowPaymentTypes.includes(paymentType);

		// For escrow payments, creator account is still required for the transfer
		if (requiresCreatorAccount && !paymentData?.stripeConnectId) {
			return NextResponse.json(
				{
					error:
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before proceeding with payment.",
					errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED",
				},
				{ status: 400 }
			);
		}

		// Calculate the correct payment amount based on the same logic as frontend
		let calculatedAmount = parseFloat(amount);

		if (
			paymentType === "submission_approval" &&
			projectFormData &&
			submissionData
		) {
			if (
				projectFormData.creatorPricing?.selectionMethod ===
				"Invite Specific Creators"
			) {
				// Get the creator's payment data using their ID as the key
				const creatorPaymentData =
					projectFormData.creatorPricing.creatorPayments?.[
						submissionData.userId
					];

				if (creatorPaymentData) {
					// For bulk pricing, use price per video
					if (creatorPaymentData.pricingTier === "bulk rate") {
						calculatedAmount = creatorPaymentData.pricePerVideo || 0;
					} else {
						// For other pricing tiers, use total amount
						calculatedAmount = creatorPaymentData.totalAmount || 0;
					}
				}
			} else {
				// For non-specific creator selection, use budget per video
				calculatedAmount = projectFormData.creatorPricing?.budgetPerVideo || 0;
			}
		}

		// Determine payment details based on type with better fallback logic
		let productName = "";
		let productDescription = "";
		let successUrl = "";
		let cancelUrl = "";

		switch (paymentType) {
			case "order":
			case "order_escrow":
				// Use order data for naming
				const packageType = paymentData?.packageType || "Package";
				const videoCount = paymentData?.videoCount || 1;
				const videoText = videoCount === 1 ? "video" : "videos";

				productName = `${packageType} package (${videoCount} ${videoText})`;
				productDescription =
					paymentType === "order_escrow"
						? `Escrow payment for ${packageType} package with ${videoCount} ${videoText}`
						: `Direct payment for ${packageType} package with ${videoCount} ${videoText}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId || paymentData?.orderId}`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-cancelled?canceled=true`;
				break;
			case "submission_approval":
				// Better fallback chain for project title
				const submissionProjectTitle =
					submissionData?.projectTitle ||
					paymentData?.projectTitle ||
					projectFormData?.projectDetails?.projectName ||
					projectTitle ||
					"Project";

				productName = `Submission Approval - ${submissionProjectTitle}`;
				productDescription = `Payment for approved submission in project: ${submissionProjectTitle}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=project`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-cancelled?canceled=true`;
				break;
			case "video":
				productName = videoTitle || paymentData?.videoTitle || "Video Purchase";
				productDescription = `Purchase of video: ${productName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-cancelled?canceled=true`;
				break;
			case "project":
				const projectName =
					projectTitle ||
					paymentData?.projectTitle ||
					projectFormData?.projectDetails?.projectName ||
					"Project Payment";
				productName = projectName;
				productDescription = `Payment for project: ${projectName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=project`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-cancelled?canceled=true`;
				break;
			case "contest":
			default:
				const contestName =
					contestTitle ||
					paymentData?.contestName ||
					paymentData?.contestTitle ||
					"Contest Payment";
				productName = contestName;
				productDescription = `Payment for contest: ${contestName}`;
				successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=contest`;
				cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-cancelled?canceled=true`;
				break;
		}

		// Check if a PaymentIntent already exists for escrow payments
		let existingPaymentIntentId = null;
		if (isEscrowPayment && paymentData?.stripePaymentIntentId) {
			existingPaymentIntentId = paymentData.stripePaymentIntentId;
			console.log(
				`Using existing PaymentIntent for escrow: ${existingPaymentIntentId}`
			);
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
				calculatedAmount: calculatedAmount.toString(), // Store the calculated amount
				// Add specific metadata based on payment type
				...(paymentType === "video" &&
					paymentData && {
						videoId: paymentData.videoId,
						creatorId: paymentData.creatorId,
						creatorEmail: paymentData.creatorEmail,
					}),
				...(paymentType === "submission_approval" &&
					paymentData && {
						submissionId: paymentData.submissionId,
						projectId: paymentData.projectId,
						creatorId: paymentData.creatorId,
					}),
				...(paymentType === "project" &&
					paymentData && {
						projectId: paymentData.projectId,
						creatorId: paymentData.creatorId,
					}),
				...(paymentType === "contest" &&
					paymentData && {
						contestId: paymentData.contestId,
						creatorId: paymentData.creatorId,
					}),
				// NEW: Order-specific metadata
				...((paymentType === "order" || paymentType === "order_escrow") &&
					paymentData && {
						orderId: paymentData.orderId,
						creatorId: paymentData.creatorId,
						packageType: paymentData.packageType,
						videoCount: paymentData.videoCount?.toString(),
						applicationFeeAmount: paymentData.applicationFeeAmount?.toString(),
					}),
			},
		};

		// Add direct payment to creator for creator payment types
		if (requiresCreatorAccount && paymentData?.stripeConnectId) {
			paymentIntentData.on_behalf_of = paymentData.stripeConnectId;
			paymentIntentData.transfer_data = {
				destination: paymentData.stripeConnectId,
			};

			// For escrow payments, add capture_method: 'manual' to match the PaymentIntent
			if (isEscrowPayment) {
				paymentIntentData.capture_method = "manual";
			}
		}

		// For order payments, add application fee if specified
		if (
			(paymentType === "order" || paymentType === "order_escrow") &&
			paymentData?.applicationFeeAmount
		) {
			paymentIntentData.application_fee_amount = Math.round(
				paymentData.applicationFeeAmount * 100
			);
		}

		// Create Stripe checkout session
		// Create Stripe checkout session
		const sessionData = {
			payment_method_types: [
				"card",
			] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: productName,
							description: productDescription,
						},
						unit_amount: Math.round(calculatedAmount * 100), // Use calculated amount and convert to cents
					},
					quantity: 1,
				},
			],
			mode: "payment" as Stripe.Checkout.SessionCreateParams.Mode,
			// FIXED: For existing PaymentIntents, you need to handle this differently
			// Stripe Checkout doesn't support reusing existing PaymentIntents directly
			// Instead, always create new payment_intent_data
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
				calculatedAmount: calculatedAmount.toString(),
				escrowPayment: isEscrowPayment.toString(),
				// Add specific metadata based on payment type
				...(paymentType === "video" &&
					paymentData && {
						videoId: paymentData.videoId,
						creatorId: paymentData.creatorId,
						creatorEmail: paymentData.creatorEmail,
					}),
				...(paymentType === "submission_approval" &&
					paymentData && {
						submissionId: paymentData.submissionId,
						projectId: paymentData.projectId,
						creatorId: paymentData.creatorId,
					}),
				...(paymentType === "project" &&
					paymentData && {
						projectId: paymentData.projectId,
						creatorId: paymentData.creatorId,
					}),
				...(paymentType === "contest" &&
					paymentData && {
						contestId: paymentData.contestId,
						creatorId: paymentData.creatorId,
					}),
				// Order-specific metadata
				...((paymentType === "order" || paymentType === "order_escrow") &&
					paymentData && {
						orderId: paymentData.orderId,
						creatorId: paymentData.creatorId,
						packageType: paymentData.packageType,
						videoCount: paymentData.videoCount?.toString(),
						applicationFeeAmount: paymentData.applicationFeeAmount?.toString(),
					}),
			},
		};

		const session = await stripe.checkout.sessions.create(sessionData);

		// Update payment record with sessionId and calculated amount
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {
			stripeSessionId: session.id,
			stripePaymentIntentId: existingPaymentIntentId || session.payment_intent, // Use existing or new payment intent ID
			updatedAt: new Date().toISOString(),
			paymentType,
			paymentName: productName,
			calculatedAmount, // Store the calculated amount in the payment record
			// Update status based on payment type
			status: isEscrowPayment ? "pending_capture" : "pending",
		};

		await adminDb.collection("payments").doc(paymentId).update(updateData);

		// For order payments, also update the order record and order_payments collection
		if (paymentType === "order" || paymentType === "order_escrow") {
			const orderIdToUpdate = orderId || paymentData?.orderId;

			if (orderIdToUpdate) {
				// Update order with session and payment intent IDs
				await adminDb
					.collection("orders")
					.doc(orderIdToUpdate)
					.update({
						stripe_session_id: session.id,
						stripe_payment_intent_id:
							existingPaymentIntentId || session.payment_intent,
						payment_id: paymentId,
						status: "payment_pending",
						payment_type: paymentType === "order_escrow" ? "escrow" : "direct",
						updated_at: new Date().toISOString(),
					});

				// Update order_payments record if it exists
				const orderPaymentDoc = await adminDb
					.collection("order_payments")
					.doc(paymentId)
					.get();

				if (orderPaymentDoc.exists) {
					await adminDb
						.collection("order_payments")
						.doc(paymentId)
						.update({
							stripeSessionId: session.id,
							stripePaymentIntentId:
								existingPaymentIntentId || session.payment_intent,
							status: isEscrowPayment ? "pending_capture" : "pending_payment",
							updatedAt: new Date().toISOString(),
						});
				}
			}
		}

		// Update submission_payments for submission_approval escrow
		if (paymentType === "submission_approval" && paymentData?.submissionId) {
			const submissionPaymentDoc = await adminDb
				.collection("submission_payments")
				.doc(paymentId)
				.get();

			if (submissionPaymentDoc.exists) {
				await adminDb
					.collection("submission_payments")
					.doc(paymentId)
					.update({
						stripeSessionId: session.id,
						stripePaymentIntentId:
							existingPaymentIntentId || session.payment_intent,
						status: "pending_capture", // Escrow status
						updatedAt: new Date().toISOString(),
					});
			}
		}

		// Create notifications for creators based on payment type
		if (requiresCreatorAccount && paymentData?.stripeConnectId) {
			let notificationMessage = "";
			let notificationType = "";

			switch (paymentType) {
				case "order":
					notificationType = "order_payment_initiated";
					notificationMessage = `A brand has initiated payment for your order: ${productName}`;
					break;
				case "order_escrow":
					notificationType = "order_escrow_initiated";
					notificationMessage = `A brand has initiated escrow payment for your order: ${productName}. Funds will be held securely until completion.`;
					break;
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
					notificationMessage = `A brand has initiated escrow payment for your approved submission: ${productName}. Funds will be held until project completion.`;
					break;
			}

			const notificationData = {
				type: notificationType,
				creatorId: paymentData.creatorId,
				brandId: userId,
				amount: calculatedAmount, // Use calculated amount
				paymentId,
				sessionId: session.id,
				status: isEscrowPayment ? "pending_capture" : "pending_payment",
				createdAt: new Date().toISOString(),
				message: notificationMessage,
				escrowPayment: isEscrowPayment,
				// Add specific fields based on payment type
				...(paymentType === "video" && { videoId: paymentData.videoId }),
				...(paymentType === "project" && { projectId: paymentData.projectId }),
				...(paymentType === "contest" && { contestId: paymentData.contestId }),
				...(paymentType === "submission_approval" && {
					submissionId: paymentData.submissionId,
					projectId: paymentData.projectId,
				}),
				...((paymentType === "order" || paymentType === "order_escrow") && {
					orderId: paymentData.orderId,
					packageType: paymentData.packageType,
					videoCount: paymentData.videoCount,
				}),
			};

			await adminDb.collection("notifications").add(notificationData);
		}

		return NextResponse.json({
			success: true,
			sessionId: session.id,
			paymentIntentId: existingPaymentIntentId || session.payment_intent, // Return payment intent ID
			paymentType,
			directPayment: requiresCreatorAccount,
			creatorConnected: !!paymentData?.stripeConnectId,
			calculatedAmount, // Return the calculated amount for debugging
			isEscrow: isEscrowPayment,
			escrowStatus: isEscrowPayment ? "pending_capture" : null,
			...(paymentType === "order" || paymentType === "order_escrow"
				? {
						orderId: orderId || paymentData?.orderId,
						orderStatus: "payment_pending",
					}
				: {}),
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
