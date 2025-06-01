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
			requestData.creatorId = formData.get("creatorId")?.toString();
			requestData.videoTitle = formData.get("videoTitle")?.toString();
			requestData.creatorEmail = formData.get("creatorEmail")?.toString();

			// Extract contest/project info
			try {
				const basicJson = formData.get("basic")?.toString();
				if (basicJson) {
					const basic = JSON.parse(basicJson);
					requestData.contestName = basic.contestName;
					requestData.contestType = basic.contestType;
					requestData.projectTitle = basic.projectTitle;
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
				creatorId: jsonData.creatorId,
				videoTitle: jsonData.videoTitle,
				creatorEmail: jsonData.creatorEmail,

				// Contest/Project fields
				contestName: jsonData.basic?.contestName,
				contestType: jsonData.basic?.contestType,
				projectTitle: jsonData.basic?.projectTitle || jsonData.projectTitle,
				submissionId: jsonData.submissionId,
				projectId: jsonData.projectId,
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

		// Additional validation for video purchases
		if (paymentType === "video") {
			if (!requestData.videoId || !requestData.creatorId) {
				return NextResponse.json(
					{ error: "Video ID and Creator ID are required for video purchases" },
					{ status: 400 }
				);
			}
		}

		if (paymentType === "submission_approval") {
			if (!requestData.submissionId ) {
				return NextResponse.json(
					{
						error:
							"Submission ID is required for submission approvals",
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
			case "contest":
			default:
				paymentName = requestData.contestName || "Contest";
			case "submission_approval":
				paymentName = `Submission Approval - ${requestData.projectTitle || "Project"}`;
				break;
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

			// Video-specific fields (only included if it's a video purchase)
			...(paymentType === "video" && {
				videoId: requestData.videoId,
				creatorId: requestData.creatorId,
				videoTitle: requestData.videoTitle || "",
				creatorEmail: requestData.creatorEmail || "",
			}),

			// Contest-specific fields
			...(paymentType === "contest" && {
				contestName: requestData.contestName,
				contestType: requestData.contestType,
			}),

			// Project-specific fields
			...(paymentType === "project" && {
				projectTitle: requestData.projectTitle,
			}),

			...(paymentType === "submission_approval" && {
				submissionId: requestData.submissionId,
				projectId: requestData.projectId,
				projectTitle: requestData.projectTitle,
			}),
		});

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		await adminDb.collection("payments").doc(paymentId).set(paymentData);

		// For video purchases, also create a purchase record for the creator
		if (paymentType === "video" && requestData.creatorId) {
			const purchaseRecord = {
				purchaseId: paymentId,
				videoId: requestData.videoId,
				creatorId: requestData.creatorId,
				brandId: userId,
				amount: parseFloat(amount),
				status: "pending_payment",
				createdAt: new Date().toISOString(),
				videoTitle: requestData.videoTitle || "",
				brandEmail: requestData.brandEmail || "",
			};

			await adminDb
				.collection("video_purchases")
				.doc(paymentId)
				.set(purchaseRecord);
		}

		return NextResponse.json({
			success: true,
			message: `Payment intent created for ${paymentType}`,
			paymentId,
			paymentType,
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
