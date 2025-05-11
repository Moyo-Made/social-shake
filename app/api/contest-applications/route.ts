import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// GET endpoint for fetching applications
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const contestId = searchParams.get("contestId");
		const applicationId = searchParams.get("applicationId");

		// If applicationId is provided, fetch a specific application
		if (applicationId) {
			if (!adminDb) {
						throw new Error("Firebase admin database is not initialized");
					}
			const applicationDoc = await adminDb
				.collection("contest_applications")
				.doc(applicationId)
				.get();

			if (!applicationDoc.exists) {
				return NextResponse.json(
					{ error: "Application not found" },
					{ status: 404 }
				);
			}

			const applicationData = {
				id: applicationDoc.id,
				...convertTimestampsToISO(applicationDoc.data() || null),
			};

			return NextResponse.json(applicationData);
		}

		// Otherwise, fetch all applications for a contest
		if (!contestId) {
			return NextResponse.json(
				{ error: "Contest ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		const applicationsSnapshot = await adminDb
			.collection("contest_applications")
			.where("contestId", "==", contestId)
			.orderBy("createdAt", "desc")
			.get();

		const applications = [];
		for (const doc of applicationsSnapshot.docs) {
			applications.push({
				id: doc.id,
				...convertTimestampsToISO(doc.data() || null)
			});
		}

		return NextResponse.json(applications);
	} catch (error) {
		console.error("Error fetching applications:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch applications",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null): Record<string, unknown> | null {
	if (!data) return data;
	
	const result = { ...data };
	
	// Convert timestamp fields to ISO strings
	for (const [key, value] of Object.entries(result)) {
		if (value instanceof Timestamp) {
			result[key] = value.toDate().toISOString();
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			// Recursively convert nested objects
			result[key] = convertTimestampsToISO(value as Record<string, unknown>);
		}
	}
	
	return result;
}

// PUT endpoint for updating application status
export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const applicationId = searchParams.get("applicationId");

		if (!applicationId) {
			return NextResponse.json(
				{ error: "Application ID is required" },
				{ status: 400 }
			);
		}

		const { status } = await request.json();

		if (!status || !["pending", "approved", "rejected"].includes(status)) {
			return NextResponse.json(
				{ error: "Valid status is required (pending, approved, rejected)" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		const applicationRef = adminDb
			.collection("contest_applications")
			.doc(applicationId);

		const applicationDoc = await applicationRef.get();
		if (!applicationDoc.exists) {
			return NextResponse.json(
				{ error: "Application not found" },
				{ status: 404 }
			);
		}

		await applicationRef.update({
			status,
			updatedAt: FieldValue.serverTimestamp(),
		});

		// Create notification for the user
		const applicationData = applicationDoc.data();
		const notificationMessage =
			status === "approved"
				? "Your application has been approved! You can now participate in the contest."
				: status === "rejected"
					? "Your application has been declined. Please check other available contests."
					: "Your application status has been updated.";

		await adminDb.collection("notifications").add({
			userId: applicationData?.userId,
			message: notificationMessage,
			status: "unread",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "contest",
			contestId: applicationData?.contestId,
		});

		// Return the updated application with ISO format dates
		const updatedDoc = await applicationRef.get();
		const updatedData = {
			id: updatedDoc.id,
			...convertTimestampsToISO(updatedDoc.data() || null)
		};

		return NextResponse.json({
			success: true,
			message: `Application ${status === "approved" ? "approved" : "rejected"} successfully`,
			application: updatedData
		});
	} catch (error) {
		console.error("Error updating application:", error);
		return NextResponse.json(
			{
				error: "Failed to update application",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}