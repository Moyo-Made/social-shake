import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// POST - Create new creator status for a project
export async function POST(request: NextRequest) {
	try {
		const { creatorId, projectId, status, trackingNumber } =
			await request.json();

		// Validate required fields
		if (!creatorId || !projectId || !status) {
			return NextResponse.json(
				{ error: "Missing required fields: creatorId, projectId, status" },
				{ status: 400 }
			);
		}

		// Create document ID as combination of creatorId and projectId
		const docId = `${creatorId}_${projectId}`;

		// Check if document already exists
		const existingDoc = await adminDb
			.collection("projectCreatorStatus")
			.doc(docId)
			.get();

		if (existingDoc.exists) {
			return NextResponse.json(
				{
					error:
						"Creator status already exists for this project. Use PUT to update.",
				},
				{ status: 409 } // Conflict
			);
		}

		const statusData = {
			creatorId,
			projectId,
			status,
			trackingNumber: trackingNumber || null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Create new document
		await adminDb.collection("projectCreatorStatus").doc(docId).set(statusData);

		return NextResponse.json({
			success: true,
			message: "Creator status created successfully",
			data: statusData,
		});
	} catch (error) {
		console.error("Error creating creator status:", error);
		return NextResponse.json(
			{
				error: "Failed to create creator status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// PUT - Update creator status for a project
export async function PUT(request: NextRequest) {
	try {
		const { creatorId, projectId, status, trackingNumber } =
			await request.json();

		// Validate required fields
		if (!creatorId || !projectId || !status) {
			return NextResponse.json(
				{ error: "Missing required fields: creatorId, projectId, status" },
				{ status: 400 }
			);
		}

		// Create document ID as combination of creatorId and projectId
		const docId = `${creatorId}_${projectId}`;

		// Check if document exists
		const existingDoc = await adminDb
			.collection("projectCreatorStatus")
			.doc(docId)
			.get();

		if (!existingDoc.exists) {
			return NextResponse.json(
				{ error: "Creator status not found. Use POST to create new status." },
				{ status: 404 }
			);
		}

		const statusData = {
			creatorId,
			projectId,
			status,
			trackingNumber: trackingNumber || null,
			updatedAt: new Date(),
			// Keep original createdAt
			createdAt: existingDoc.data()?.createdAt || new Date(),
		};

		// Update existing document
		await adminDb.collection("projectCreatorStatus").doc(docId).set(statusData);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const io = (global as any).io;
		if (io) {
			// Get the brand/project owner ID first
			// You might need to fetch the project to get the brand's userId
			const projectDoc = await adminDb
				.collection("projects")
				.doc(projectId)
				.get();
			const brandUserId = projectDoc.data()?.userId;

			if (brandUserId) {
				// Send notification to the brand
				io.to(`brand-${brandUserId}`).emit("creator-status-update", {
					projectId: projectId,
					creatorId: creatorId,
					status: status,
					trackingNumber: trackingNumber,
					message: `Creator confirmed product receipt`,
					timestamp: new Date().toISOString(),
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: "Creator status updated successfully",
			data: statusData,
		});
	} catch (error) {
		console.error("Error updating creator status:", error);
		return NextResponse.json(
			{
				error: "Failed to update creator status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// GET - Fetch creator status for a project or all statuses for a project
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const creatorId = url.searchParams.get("creatorId");
		const projectId = url.searchParams.get("projectId");

		if (!projectId) {
			return NextResponse.json(
				{ error: "Missing required parameter: projectId" },
				{ status: 400 }
			);
		}

		// If creatorId is provided, get specific creator status
		if (creatorId) {
			const docId = `${creatorId}_${projectId}`;

			const doc = await adminDb
				.collection("projectCreatorStatus")
				.doc(docId)
				.get();

			if (!doc.exists) {
				// Return default status if no record exists
				return NextResponse.json({
					success: true,
					data: {
						creatorId,
						projectId,
						status: "pending_shipment",
						trackingNumber: null,
						createdAt: null,
						updatedAt: null,
					},
				});
			}

			const data = doc.data();
			return NextResponse.json({
				success: true,
				data: {
					creatorId: data?.creatorId,
					projectId: data?.projectId,
					status: data?.status || "pending_shipment",
					trackingNumber: data?.trackingNumber || null,
					createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
					updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
				},
			});
		}

		// If no creatorId, get all statuses for the project
		const snapshot = await adminDb
			.collection("projectCreatorStatus")
			.where("projectId", "==", projectId)
			.get();

		const statuses = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			statuses.push({
				id: doc.id,
				creatorId: data.creatorId,
				projectId: data.projectId,
				status: data.status,
				trackingNumber: data.trackingNumber,
				createdAt: data.createdAt?.toDate?.() || data.createdAt,
				updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
			});
		}

		return NextResponse.json({
			success: true,
			data: statuses,
			count: statuses.length,
		});
	} catch (error) {
		console.error("Error fetching creator status:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch creator status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
