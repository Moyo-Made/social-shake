import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-03-31.basil",
});

// Helper function to remove undefined values
const removeUndefined = (
	obj: { [s: string]: unknown } | ArrayLike<unknown>
) => {
	return Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined)
	);
};

export async function POST(request: NextRequest) {
	try {
		// [Your existing form data parsing logic remains the same]
		const contentType = request.headers.get("content-type") || "";
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let requestData: Record<string, any> = {};

		if (contentType.includes("multipart/form-data")) {
			const formData = await request.formData();
			// Extract all your existing fields...
			requestData.submissionId = formData.get("submissionId")?.toString();
			requestData.projectId = formData.get("projectId")?.toString();
			requestData.userId = formData.get("userId")?.toString();
			requestData.brandEmail = formData.get("brandEmail")?.toString();
			requestData.amount = formData.get("amount")?.toString();
			requestData.paymentType = formData.get("paymentType")?.toString();
			requestData.videoId = formData.get("videoId")?.toString();
			requestData.stripeConnectId = formData.get("stripeConnectId")?.toString();
			requestData.videoTitle = formData.get("videoTitle")?.toString();
			requestData.creatorEmail = formData.get("creatorEmail")?.toString();
			requestData.orderId = formData.get("orderId")?.toString();
			requestData.packageType = formData.get("packageType")?.toString();
			requestData.videoCount = formData.get("videoCount")?.toString();

			try {
				const basicJson = formData.get("basic")?.toString();
				if (basicJson) {
					const basic = JSON.parse(basicJson);
					requestData.contestName = basic.contestName;
					requestData.contestType = basic.contestType;
					requestData.projectTitle = basic.projectTitle;
					requestData.contestId = basic.contestId;
				}
			} catch (e) {
				console.error("Error parsing basic info:", e);
			}
		} else {
			const jsonData = await request.json();
			requestData = {
				userId: jsonData.userId,
				brandEmail: jsonData.brandEmail,
				amount: jsonData.amount,
				paymentType: jsonData.paymentType || "contest",
				videoId: jsonData.videoId,
				stripeConnectId: jsonData.stripeConnectId,
				videoTitle: jsonData.videoTitle,
				creatorEmail: jsonData.creatorEmail,
				contestName: jsonData.basic?.contestName || jsonData.contestName,
				contestType: jsonData.basic?.contestType || jsonData.contestType,
				contestId: jsonData.basic?.contestId || jsonData.contestId,
				projectTitle: jsonData.basic?.projectTitle || jsonData.projectTitle,
				projectId: jsonData.projectId,
				submissionId: jsonData.submissionId,
				orderId: jsonData.orderId,
				packageType: jsonData.packageType,
				videoCount: jsonData.videoCount,
			};
		}

		const { userId, amount, paymentType } = requestData;

		// Validate required fields
		if (!userId || !amount) {
			return NextResponse.json(
				{ error: "User ID and payment amount are required" },
				{ status: 400 }
			);
		}

		// Auto-fetch creator data for submission_approval payments
		if (paymentType === "submission_approval") {
			if (!requestData.submissionId) {
				return NextResponse.json(
					{ error: "Submission ID is required for submission approvals" },
					{ status: 400 }
				);
			}

			try {
				const submissionDoc = await adminDb
					.collection("project_submissions")
					.doc(requestData.submissionId)
					.get();

				if (!submissionDoc.exists) {
					return NextResponse.json(
						{ error: "Submission not found" },
						{ status: 404 }
					);
				}

				const submissionData = submissionDoc.data();
				const creatorId = submissionData?.userId;

				if (!creatorId) {
					return NextResponse.json(
						{ error: "Creator ID not found in submission" },
						{ status: 400 }
					);
				}

				const creatorDoc = await adminDb
					.collection("creators")
					.doc(creatorId)
					.get();

				if (!creatorDoc.exists) {
					return NextResponse.json(
						{ error: "Creator not found" },
						{ status: 404 }
					);
				}

				const creatorData = creatorDoc.data();
				requestData.stripeConnectId = creatorData?.stripeAccountId;
				requestData.creatorEmail = creatorData?.email;
				requestData.projectId = submissionData?.projectId;
				requestData.creatorId = creatorId;

				if (!requestData.stripeConnectId) {
					return NextResponse.json(
						{
							error:
								"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before approving submission payment.",
							errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED",
							paymentType,
							creatorId: creatorId,
						},
						{ status: 400 }
					);
				}
			} catch (error) {
				console.error("Error auto-fetching submission data:", error);
				return NextResponse.json(
					{ error: "Failed to fetch submission data" },
					{ status: 500 }
				);
			}
		}

		if (paymentType === "order_escrow") {
			if (!requestData.orderId) {
				return NextResponse.json(
					{ error: "Order ID is required for escrow orders" },
					{ status: 400 }
				);
			}
		
			// Try to get creatorId from request first, then from orders collection
			let creatorId = requestData.creatorId;
		
			if (!creatorId) {
				// Try to fetch creatorId from orders collection with better error handling
				try {
					const orderDoc = await adminDb
						.collection("orders")
						.doc(requestData.orderId)
						.get();
		
					if (!orderDoc.exists) {
						return NextResponse.json(
							{ 
								error: `Order with ID ${requestData.orderId} not found`,
								errorCode: "ORDER_NOT_FOUND"
							},
							{ status: 404 }
						);
					}
		
					const orderData = orderDoc.data();
					console.log("Order data:", orderData); // Debug log
					
					// Try multiple possible field names (prioritize creator_id since that's your actual field)
					creatorId = orderData?.creator_id || 
							   orderData?.creatorId || 
							   orderData?.userId || 
							   orderData?.user_id;
		
					if (!creatorId) {
						console.error("Order data fields:", Object.keys(orderData || {}));
						return NextResponse.json(
							{
								error: "Creator ID not found in order data. Available fields: " + 
									   Object.keys(orderData || {}).join(", "),
								errorCode: "CREATOR_ID_NOT_IN_ORDER"
							},
							{ status: 400 }
						);
					}
		
					console.log("Found creatorId from order:", creatorId);
				} catch (error) {
					console.error("Error fetching order data:", error);
					return NextResponse.json(
						{ 
							error: "Failed to fetch order data from database",
							details: error instanceof Error ? error.message : String(error)
						},
						{ status: 500 }
					);
				}
			}
		
			if (!creatorId) {
				return NextResponse.json(
					{
						error: "Creator ID is required for escrow orders. Please provide creatorId in request or ensure order exists with creator information.",
						errorCode: "CREATOR_ID_REQUIRED",
						debug: {
							orderId: requestData.orderId,
							requestHasCreatorId: !!requestData.creatorId
						}
					},
					{ status: 400 }
				);
			}
		
			// Rest of the creator fetching logic remains the same...
			try {
				const creatorDoc = await adminDb
					.collection("creators")
					.doc(creatorId)
					.get();
		
				if (!creatorDoc.exists) {
					return NextResponse.json(
						{ 
							error: `Creator with ID ${creatorId} not found`,
							errorCode: "CREATOR_NOT_FOUND"
						},
						{ status: 404 }
					);
				}
		
				const creatorData = creatorDoc.data();
				requestData.stripeConnectId = creatorData?.stripeAccountId;
				requestData.creatorEmail = creatorData?.email;
				requestData.creatorId = creatorId;
		
				if (!requestData.stripeConnectId) {
					return NextResponse.json(
						{
							error: "Creator hasn't connected their Stripe account yet. Please ask them to connect their account before creating an escrow order.",
							errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED",
							paymentType,
							creatorId: creatorId,
						},
						{ status: 400 }
					);
				}
		
				console.log("Auto-fetched data for order_escrow:", {
					creatorId,
					stripeConnectId: requestData.stripeConnectId,
					creatorEmail: requestData.creatorEmail,
				});
			} catch (error) {
				console.error("Error auto-fetching creator data for order:", error);
				return NextResponse.json(
					{ 
						error: "Failed to fetch creator data from database",
						details: error instanceof Error ? error.message : String(error)
					},
					{ status: 500 }
				);
			}
		}

		// Define payment types that require creator accounts
		const creatorPaymentTypes = [
			"video",
			"project",
			"contest",
			"submission_approval",
			"order_escrow", // New escrow payment type
		];

		// Define payment types that use escrow (held until approval)
		const escrowPaymentTypes = ["order_escrow", "submission_approval"];

		const requiresCreatorAccount = creatorPaymentTypes.includes(paymentType);
		const isEscrowPayment = escrowPaymentTypes.includes(paymentType);

		// Validation for creator payment types
		if (requiresCreatorAccount && !requestData.stripeConnectId) {
			let errorMessage = "";
			switch (paymentType) {
				case "video":
					errorMessage =
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before purchasing videos.";
					break;
				case "project":
					errorMessage =
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before proceeding with project payment.";
					break;
				case "contest":
					errorMessage =
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before proceeding with contest payment.";
					break;
				case "submission_approval":
					errorMessage =
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before approving submission payment.";
					break;
				case "order_escrow":
					errorMessage =
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before creating an escrow order.";
					break;
			}

			return NextResponse.json(
				{
					error: errorMessage,
					errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED",
					paymentType,
				},
				{ status: 400 }
			);
		}

		// Create a payment ID
		const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		// Determine payment name based on type
		let paymentName = "";
		switch (paymentType) {
			case "video":
				paymentName = requestData.videoTitle || "Video Purchase";
				break;
			case "project":
				paymentName = requestData.projectTitle || "Project";
				break;
			case "submission_approval":
				paymentName = `Submission Approval - ${requestData.projectTitle || "Project"}`;
				break;
			case "order_escrow":
				paymentName = `Order Payment - ${requestData.packageType || "Package"}`;
				break;
			case "contest":
			default:
				paymentName = requestData.contestName || "Contest";
				break;
		}

		// For escrow payments, create Stripe PaymentIntent with on_behalf_of but hold the funds
		let stripePaymentIntentId = null;
		if (isEscrowPayment && requestData.stripeConnectId) {
			try {
				const paymentIntent = await stripe.paymentIntents.create({
					amount: Math.round(parseFloat(amount) * 100), // Convert to cents
					currency: "usd",
					on_behalf_of: requestData.stripeConnectId, // Charge on behalf of creator
					transfer_data: {
						destination: requestData.stripeConnectId,
					},
					// Don't capture immediately - this creates the "escrow" effect
					capture_method: "manual",
					metadata: {
						paymentId: paymentId,
						paymentType: paymentType,
						creatorId: requestData.creatorId || "",
						orderId: requestData.orderId || "",
						submissionId: requestData.submissionId || "",
					},
				});

				stripePaymentIntentId = paymentIntent.id;
				console.log(`Created escrow PaymentIntent: ${stripePaymentIntentId}`);
			} catch (stripeError) {
				console.error("Error creating Stripe PaymentIntent:", stripeError);
				return NextResponse.json(
					{ error: "Failed to create payment intent with Stripe" },
					{ status: 500 }
				);
			}
		}

		// Store payment intent data in Firestore
		const paymentData = removeUndefined({
			paymentId,
			userId,
			brandEmail: requestData.brandEmail || "",
			amount: parseFloat(amount),
			paymentType: paymentType || "contest",
			paymentName,
			status: isEscrowPayment ? "pending_capture" : "pending", // Different status for escrow
			escrowPayment: isEscrowPayment,
			stripePaymentIntentId: stripePaymentIntentId,
			createdAt: new Date().toISOString(),
			requiresCreatorAccount,
			directPayment: requiresCreatorAccount,

			// Creator fields (for all creator payment types)
			...(requiresCreatorAccount && {
				stripeConnectId: requestData.stripeConnectId,
				creatorEmail: requestData.creatorEmail || "",
				creatorId: requestData.creatorId || "",
			}),

			// Video-specific fields
			...(paymentType === "video" && {
				videoId: requestData.videoId,
				videoTitle: requestData.videoTitle || "",
			}),

			// Contest-specific fields
			...(paymentType === "contest" && {
				contestName: requestData.contestName,
				contestType: requestData.contestType,
				contestId: requestData.contestId,
			}),

			// Project-specific fields
			...(paymentType === "project" && {
				projectTitle: requestData.projectTitle,
				projectId: requestData.projectId,
			}),

			// Submission approval specific fields
			...(paymentType === "submission_approval" && {
				submissionId: requestData.submissionId,
				projectId: requestData.projectId,
				projectTitle: requestData.projectTitle,
			}),

			// Order-specific fields (including escrow orders)
			...((paymentType === "order" || paymentType === "order_escrow") && {
				orderId: requestData.orderId,
				packageType: requestData.packageType,
				videoCount: requestData.videoCount,
			}),
		});

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		await adminDb.collection("payments").doc(paymentId).set(paymentData);

		// Create specific collection records based on payment type
		if (paymentType === "order_escrow" && requestData.stripeConnectId) {
			const escrowOrderRecord = {
				paymentId: paymentId,
				orderId: requestData.orderId,
				stripeConnectId: requestData.stripeConnectId,
				stripePaymentIntentId: stripePaymentIntentId,
				brandId: userId,
				creatorId: requestData.creatorId,
				amount: parseFloat(amount),
				status: "pending_capture", // Funds are authorized but not captured yet
				escrowStatus: "held", // Additional escrow tracking
				createdAt: new Date().toISOString(),
				packageType: requestData.packageType || "",
				videoCount: requestData.videoCount || "",
				brandEmail: requestData.brandEmail || "",
				creatorEmail: requestData.creatorEmail || "",
				directPayment: true,
				escrowPayment: true,
			};

			await adminDb
				.collection("order_payments")
				.doc(paymentId)
				.set(escrowOrderRecord);
		}

		// [Keep all your existing collection record creation logic for other payment types]
		if (paymentType === "video" && requestData.stripeConnectId) {
			const purchaseRecord = {
				purchaseId: paymentId,
				videoId: requestData.videoId,
				stripeConnectId: requestData.stripeConnectId,
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				videoTitle: requestData.videoTitle || "",
				brandEmail: requestData.brandEmail || "",
				directPayment: true,
			};

			await adminDb
				.collection("video_purchases")
				.doc(paymentId)
				.set(purchaseRecord);
		}

		if (paymentType === "submission_approval" && requestData.stripeConnectId) {
			const submissionPaymentRecord = {
				paymentId: paymentId,
				submissionId: requestData.submissionId,
				projectId: requestData.projectId,
				stripeConnectId: requestData.stripeConnectId,
				stripePaymentIntentId: stripePaymentIntentId, // Include for escrow tracking
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_capture", // Changed from pending_payment for escrow
				escrowStatus: "held",
				createdAt: new Date().toISOString(),
				projectTitle: requestData.projectTitle || "",
				brandEmail: requestData.brandEmail || "",
				directPayment: true,
				escrowPayment: true,
			};

			await adminDb
				.collection("submission_payments")
				.doc(paymentId)
				.set(submissionPaymentRecord);
		}

		// [Include your other existing collection records...]

		return NextResponse.json({
			success: true,
			message: `Payment intent created for ${paymentType}`,
			paymentId,
			paymentType,
			directPayment: requiresCreatorAccount,
			escrowPayment: isEscrowPayment,
			stripePaymentIntentId: stripePaymentIntentId,
			creatorConnected: !!requestData.stripeConnectId,
			status: isEscrowPayment ? "pending_capture" : "pending",
		});
	} catch (error) {
		console.error("Error creating payment intent:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create payment intent",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
