import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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

		// AUTO-FETCH SUBMISSION DATA FOR SUBMISSION APPROVALS
		if (paymentType === "submission_approval" && requestData.submissionId) {
			try {
				console.log(
					"🔍 Fetching submission data for:",
					requestData.submissionId
				);

				// Fetch submission data to get creatorId and other details
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

				// Auto-populate missing fields from submission data
				if (!requestData.creatorId) {
					requestData.creatorId = submissionData?.userId;
				}
				if (!requestData.projectId) {
					requestData.projectId = submissionData?.projectId;
				}
				if (!requestData.projectTitle) {
					// You might want to fetch project title from projects collection
					// For now, we'll use a default or leave it empty
					requestData.projectTitle = `Project ${submissionData?.projectId}`;
				}

				console.log("✅ Auto-populated submission data:", {
					submissionId: requestData.submissionId,
					creatorId: requestData.creatorId,
					projectId: requestData.projectId,
				});
			} catch (error) {
				console.error("❌ Error fetching submission data:", error);
				return NextResponse.json(
					{ error: "Failed to fetch submission data" },
					{ status: 500 }
				);
			}
		}

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

		// Validation for submission approvals (should now have auto-populated data)
		if (paymentType === "submission_approval") {
			if (!requestData.submissionId || !requestData.creatorId) {
				return NextResponse.json(
					{
						error:
							"Submission ID and Creator ID are required for submission approvals",
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

			// Submission approval specific fields
			...(paymentType === "submission_approval" && {
				submissionId: requestData.submissionId,
				projectId: requestData.projectId,
				projectTitle: requestData.projectTitle,
				creatorId: requestData.creatorId, // Now auto-populated
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

// GET endpoint to fetch submissions for a project
export async function GET(request: NextRequest) {
	try {
		// Get and log all search parameters
		const { searchParams } = new URL(request.url);
		const allParams = Object.fromEntries(searchParams.entries());
		console.log("📝 All request parameters:", allParams);

		// Extract parameters, trim any whitespace
		const projectId = (searchParams.get("projectId") || "").trim();
		const userId = (searchParams.get("userId") || "").trim();
		const submissionId = (searchParams.get("submissionId") || "").trim();

		// Reference to submissions collection
		const projectSubmissionsRef = adminDb.collection("project_submissions");

		// If specific submissionId is provided, fetch just that submission
		if (submissionId) {
			const submissionDoc = await projectSubmissionsRef.doc(submissionId).get();

			if (!submissionDoc.exists) {
				return NextResponse.json(
					{ success: false, error: "Submission not found" },
					{ status: 404 }
				);
			}

			const submissionData = {
				id: submissionDoc.id,
				...convertFirestoreDataToClientFormat(submissionDoc.data()),
			};

			return NextResponse.json(submissionData);
		}

		// Otherwise, fetch submissions for a project
		if (!projectId) {
			return NextResponse.json(
				{ success: false, error: "Project ID is required" },
				{ status: 400 }
			);
		}

		// Query submissions for the specified project
		let query = projectSubmissionsRef.where("projectId", "==", projectId);

		// Only add userId filter if userId is provided
		if (userId) {
			query = query.where("userId", "==", userId);
		}

		const submissionsSnapshot = await query.orderBy("createdAt", "desc").get();

		// Process results
		const submissions: { id: string }[] = [];
		submissionsSnapshot.forEach((doc) => {
			submissions.push({
				id: doc.id,
				...convertFirestoreDataToClientFormat(doc.data()),
			});
		});

		return NextResponse.json({
			success: true,
			submissions,
			count: submissions.length,
		});
	} catch (error) {
		console.error("❌ Error fetching submissions:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch submissions",
				details: error instanceof Error ? error.message : String(error),
				submissions: [],
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert Firestore data to client-friendly format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertFirestoreDataToClientFormat(data: any) {
	if (!data) return {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Record<string, any> = {};

	// Process known fields with appropriate conversions
	result.userId = data.userId || "";
	result.projectId = data.projectId || "";
	result.videoUrl = data.videoUrl || "";
	result.note = data.note || "";
	result.status = data.status || "pending";
	result.fileName = data.fileName || "";
	result.fileSize = data.fileSize || 0;
	result.fileType = data.fileType || "";
	result.storagePath = data.storagePath || "";

	// Handle timestamps
	if (data.createdAt) {
		if (data.createdAt instanceof Timestamp) {
			result.createdAt = data.createdAt.toDate().toISOString();
		} else if (
			data.createdAt.toDate &&
			typeof data.createdAt.toDate === "function"
		) {
			result.createdAt = data.createdAt.toDate().toISOString();
		} else if (data.createdAt._seconds) {
			// Handle serialized Firestore timestamp
			result.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
		} else {
			// Try to use as is
			result.createdAt = data.createdAt;
		}
	} else {
		result.createdAt = new Date().toISOString();
	}

	// Handle additional fields
	if (data.updatedAt) {
		if (data.updatedAt instanceof Timestamp) {
			result.updatedAt = data.updatedAt.toDate().toISOString();
		} else if (typeof data.updatedAt.toDate === "function") {
			result.updatedAt = data.updatedAt.toDate().toISOString();
		} else {
			result.updatedAt = data.updatedAt;
		}
	}

	if (data.videoNumber !== undefined) result.videoNumber = data.videoNumber;
	if (data.revisionNumber !== undefined)
		result.revisionNumber = data.revisionNumber;

	// Add user information if available
	if (data.userDisplayName) result.userDisplayName = data.userDisplayName;
	if (data.userPhotoURL) result.userPhotoURL = data.userPhotoURL;

	// Copy any additional fields that might be useful
	for (const [key, value] of Object.entries(data)) {
		if (!(key in result)) {
			// Skip complex objects that might cause issues when serializing
			if (typeof value !== "function" && typeof value !== "object") {
				result[key] = value;
			}
		}
	}

	return result;
}
