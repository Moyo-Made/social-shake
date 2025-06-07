import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

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
		// Check if the request is multipart/form-data or JSON
		const contentType = request.headers.get("content-type") || "";

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let requestData: Record<string, any> = {};

		if (contentType.includes("multipart/form-data")) {
			// Handle form data submission
			const formData = await request.formData();

			requestData.submissionId = formData.get("submissionId")?.toString();
			requestData.projectId = formData.get("projectId")?.toString();

			// Extract basic payment fields
			requestData.userId = formData.get("userId")?.toString();
			requestData.brandEmail = formData.get("brandEmail")?.toString();
			requestData.amount = formData.get("amount")?.toString();
			requestData.paymentType = formData.get("paymentType")?.toString(); // "contest", "project", "video"

			// Extract video-specific fields
			requestData.videoId = formData.get("videoId")?.toString();
			requestData.stripeConnectId = formData.get("stripeConnectId")?.toString();
			requestData.videoTitle = formData.get("videoTitle")?.toString();
			requestData.creatorEmail = formData.get("creatorEmail")?.toString();

			requestData.orderId = formData.get("orderId")?.toString();
			requestData.packageType = formData.get("packageType")?.toString();
			requestData.videoCount = formData.get("videoCount")?.toString();

			// Extract contest/project info
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
			// Handle JSON submission
			const jsonData = await request.json();
			requestData = {
				userId: jsonData.userId,
				brandEmail: jsonData.brandEmail,
				amount: jsonData.amount,
				paymentType: jsonData.paymentType || "contest", // Default to contest for backward compatibility

				// Video-specific fields
				videoId: jsonData.videoId,
				stripeConnectId: jsonData.stripeConnectId,
				videoTitle: jsonData.videoTitle,
				creatorEmail: jsonData.creatorEmail,

				// Contest/Project fields
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

		// Additional specific validations
		if (paymentType === "video") {
			if (!requestData.videoId) {
				return NextResponse.json(
					{ error: "Video ID is required for video purchases" },
					{ status: 400 }
				);
			}
		}

		// Auto-fetch submission data for submission_approval payments
		if (paymentType === "submission_approval") {
			if (!requestData.submissionId) {
				return NextResponse.json(
					{
						error: "Submission ID is required for submission approvals",
					},
					{ status: 400 }
				);
			}
			// AUTO-FETCH: Get submission data and creator's Stripe Connect ID
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

				// Get creator ID from submission
				const creatorId = submissionData?.userId;

				if (!creatorId) {
					return NextResponse.json(
						{ error: "Creator ID not found in submission" },
						{ status: 400 }
					);
				}
				// Fetch creator's Stripe Connect ID
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

				// Auto-populate the missing fields
				requestData.stripeConnectId = creatorData?.stripeAccountId;
				requestData.creatorEmail = creatorData?.email;
				requestData.projectId = submissionData?.projectId;
				requestData.creatorId = creatorId; // Store the creator ID for checkout session
				// Note: projectTitle will come from existing formData since it's not in submission
				// Validate that creator has connected their Stripe account
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
				console.log("Auto-fetched data for submission_approval:", {
					creatorId,
					stripeConnectId: requestData.stripeConnectId,
					projectId: requestData.projectId,
					creatorEmail: requestData.creatorEmail,
				});
			} catch (error) {
				console.error("Error auto-fetching submission data:", error);
				return NextResponse.json(
					{ error: "Failed to fetch submission data" },
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
		];
		const requiresCreatorAccount = creatorPaymentTypes.includes(paymentType);

		// Additional validation for creator payment types
		if (requiresCreatorAccount) {
			if (!requestData.stripeConnectId) {
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
			case "contest":
			default:
				paymentName = requestData.contestName || "Contest";
				break;
		}

		// Store payment intent data in Firestore
		const paymentData = removeUndefined({
			paymentId,
			userId,
			brandEmail: requestData.brandEmail || "",
			amount: parseFloat(amount),
			paymentType: paymentType || "contest",
			paymentName,
			status: "pending",
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

			// Order-specific fields
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

		// Create purchase/payment records for different payment types
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

		// Create similar records for other payment types if needed
		if (paymentType === "project" && requestData.stripeConnectId) {
			const projectPaymentRecord = {
				paymentId: paymentId,
				projectId: requestData.projectId,
				stripeConnectId: requestData.stripeConnectId,
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				projectTitle: requestData.projectTitle || "",
				brandEmail: requestData.brandEmail || "",
				directPayment: true,
			};

			await adminDb
				.collection("project_payments")
				.doc(paymentId)
				.set(projectPaymentRecord);
		}

		if (paymentType === "contest" && requestData.stripeConnectId) {
			const contestPaymentRecord = {
				paymentId: paymentId,
				contestId: requestData.contestId,
				stripeConnectId: requestData.stripeConnectId,
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				contestName: requestData.contestName || "",
				brandEmail: requestData.brandEmail || "",
				directPayment: true,
			};

			await adminDb
				.collection("contest_payments")
				.doc(paymentId)
				.set(contestPaymentRecord);
		}

		if (paymentType === "submission_approval" && requestData.stripeConnectId) {
			const submissionPaymentRecord = {
				paymentId: paymentId,
				submissionId: requestData.submissionId,
				projectId: requestData.projectId,
				stripeConnectId: requestData.stripeConnectId,
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				projectTitle: requestData.projectTitle || "",
				brandEmail: requestData.brandEmail || "",
				directPayment: true,
			};

			await adminDb
				.collection("submission_payments")
				.doc(paymentId)
				.set(submissionPaymentRecord);
		}

		return NextResponse.json({
			success: true,
			message: `Payment intent created for ${paymentType}`,
			paymentId,
			paymentType,
			directPayment: requiresCreatorAccount,
			creatorConnected: !!requestData.stripeConnectId,
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
