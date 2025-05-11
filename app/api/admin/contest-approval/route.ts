import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { ContestStatus } from "@/types/projects";

export async function POST(request: NextRequest) {
	try {
		const data = await request.json();
		const { brandEmail, contestId, action, message } = data;

		// Validate required fields
		if (!contestId || !action) {
			return NextResponse.json(
				{ error: "Contest ID and action are required" },
				{ status: 400 }
			);
		}

		if (!brandEmail) {
			return NextResponse.json(
				{ error: "Brand email is required" },
				{ status: 400 }
			);
		}

		// Check if action is valid
		if (
			!["activate", "rejected", "completed", "request_edit", "cancel"].includes(
				action
			)
		) {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		// Get contest
		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}

		const contestRef = adminDb.collection("contests").doc(contestId);
		const contestDoc = await contestRef.get();

		if (!contestDoc.exists) {
			return NextResponse.json({ error: "Contest not found" }, { status: 404 });
		}

		const contestData = contestDoc.data();
		const userId = contestData?.userId;

		if (!userId) {
			return NextResponse.json(
				{ error: "Contest has no associated user ID" },
				{ status: 400 }
			);
		}

		// Update contest status based on action
		interface UpdateData {
			status?: ContestStatus;
			updatedAt: string;
			rejectionReason?: string;
			requestedInfo?: string;
		}

		const updateData: UpdateData = {
			updatedAt: new Date().toISOString(),
		};

		let notificationMessage = "";

		switch (action) {
			case "activate":
				updateData.status = ContestStatus.ACTIVE;
				notificationMessage = `Your contest "${contestData?.contestDetails?.contestName}" has been approved! Creators can now submit entries.`;
				break;
			case "rejected":
				updateData.status = ContestStatus.REJECTED;
				updateData.rejectionReason =
					message || "Your contest does not meet our requirements.";
				notificationMessage = `Your contest "${contestData?.contestDetails?.contestName}" has been rejected. Reason: ${message || "Your contest does not meet our requirements."}`;
				break;
			case "request_edit":
				updateData.status = ContestStatus.REQUEST_EDIT;
				updateData.rejectionReason =
					message || "We requested an edit to your contest.";
				notificationMessage = `Your contest "${contestData?.contestDetails?.contestName}" requires an edit. Reason: ${message || "We requested an edit to your contest."}`;
				break;
			case "completed":
				updateData.status = ContestStatus.COMPLETED;
				notificationMessage = `Your contest "${contestData?.contestDetails?.contestName}" has been marked as completed.`;
				break;
		}

		// Update contest
		await contestRef.update(
			updateData as FirebaseFirestore.UpdateData<typeof updateData>
		);

		// Create notification for the brand
		await adminDb.collection("notifications").add({
			recipientEmail: brandEmail,
			message: notificationMessage,
			status: "unread",
			type: "contest_status_update",
			createdAt: new Date().toISOString(),
			relatedTo: "contest",
			contestId: contestId,
			contestName:
				contestData?.contestDetails?.contestName || "Untitled Contest",
		});

		return NextResponse.json({
			success: true,
			message: `Contest successfully ${action}d`,
			data: {
				brandEmail,
				contestId,
				action,
				updatedStatus: updateData.status,
				contestName: contestData?.contestDetails?.contestName,
			},
		});
	} catch (error) {
		console.error("Error in contest approval process:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Failed to process contest approval";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// Endpoint to get all contests with pagination and filtering
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const brandId = searchParams.get("brandId");
		const limit = parseInt(searchParams.get("limit") || "50");
		const page = parseInt(searchParams.get("page") || "1");
		const offset = (page - 1) * limit;

		if (!adminDb) {
			throw new Error("Database connection is not initialized");
		}
		let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
			adminDb.collection("contests");
		let countQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
			adminDb.collection("contests");

		// Add status filter if provided
		if (
			status &&
			Object.values(ContestStatus).includes(status as ContestStatus)
		) {
			query = query.where("status", "==", status);
		}

		// Add brand filter if provided
		if (brandId) {
			query = query.where("userId", "==", brandId);
		}

		// Add sorting and pagination
		query = query.orderBy("createdAt", "desc").limit(limit).offset(offset);

		const snapshot = await query.get();

		// Transform the data
		const contests = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		// Get total count for pagination info
		if (status) {
			countQuery = countQuery.where("status", "==", status);
		}

		if (brandId) {
			countQuery = countQuery.where("userId", "==", brandId);
		}

		const totalSnapshot = await countQuery.count().get();
		const total = totalSnapshot.data().count;

		return NextResponse.json({
			contests,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching contests:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to fetch contests";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
