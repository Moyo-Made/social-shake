import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { ProjectStatus } from "@/types/projects";

export async function POST(request: NextRequest) {
	try {
		const data = await request.json();
		const { brandEmail, projectId, action, message } = data;

		// Validate required fields
		if (!projectId || !action) {
			return NextResponse.json(
				{ error: "Project ID and action are required" },
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

		// Get project
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const projectData = projectDoc.data();
		const userId = projectData?.userId;

		if (!userId) {
			return NextResponse.json(
				{ error: "Project has no associated user ID" },
				{ status: 400 }
			);
		}

		// Update project status based on action
		interface UpdateData {
			status?: ProjectStatus;
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
				updateData.status = ProjectStatus.ACTIVE;
				notificationMessage = `Your project "${projectData?.projectDetails?.projectName}" has been approved! Creators can now submit pitches.`;
				break;
			case "rejected":
				updateData.status = ProjectStatus.REJECTED;
				updateData.rejectionReason =
					message || "Your project does not meet our requirements.";
				notificationMessage = `Your project "${projectData?.projectDetails?.projectName}" has been rejected. Reason: ${message || "Your project does not meet our requirements."}`;
				break;
			case "request_edit":
				updateData.status = ProjectStatus.REQUEST_EDIT;
				updateData.rejectionReason =
					message || "We requested an edit to your project.";
				notificationMessage = `Your project "${projectData?.projectDetails?.projectName}" requires an edit .Reason: ${message || "We requested an edit to your project."}`;
				break;
			case "completed":
				updateData.status = ProjectStatus.COMPLETED;
				notificationMessage = `Your project "${projectData?.projectDetails?.projectName}" has been marked as completed.`;
				break;
		}

		// Update project
		await projectRef.update(
			updateData as FirebaseFirestore.UpdateData<typeof updateData>
		);

		// Create notification for the brand
		await adminDb.collection("notifications").add({
			recipientEmail: brandEmail,
			message: notificationMessage,
			status: "unread",
			type: "project_status_update",
			createdAt: new Date().toISOString(),
			relatedTo: "project",
			projectId: projectId,
			projectName:
				projectData?.projectDetails?.projectName || "Untitled Project",
		});

		return NextResponse.json({
			success: true,
			message: `Project successfully ${action}d`,
			data: {
				brandEmail,
				projectId,
				action,
				updatedStatus: updateData.status,
				projectName: projectData?.projectDetails?.projectName,
			},
		});
	} catch (error) {
		console.error("Error in project approval process:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Failed to process project approval";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// Endpoint to get all projects with pagination and filtering
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const brandId = searchParams.get("brandId");
		const limit = parseInt(searchParams.get("limit") || "50");
		const page = parseInt(searchParams.get("page") || "1");
		const offset = (page - 1) * limit;

		let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
			adminDb.collection("projects");
		let countQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
			adminDb.collection("projects");

		// Add status filter if provided
		if (
			status &&
			Object.values(ProjectStatus).includes(status as ProjectStatus)
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
		const projects = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		// Get total count for pagination info
		// Count query already initialized as a Query above

		if (status) {
			countQuery = countQuery.where("status", "==", status);
		}

		if (brandId) {
			countQuery = countQuery.where("userId", "==", brandId);
		}

		const totalSnapshot = await countQuery.count().get();
		const total = totalSnapshot.data().count;

		return NextResponse.json({
			projects,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching projects:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to fetch projects";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
