import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// GET endpoint for fetching contest submissions (joined contests)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const contestId = searchParams.get("contestId");
		const submissionId = searchParams.get("submissionId");
		const userId = searchParams.get("userId");

		// If submissionId is provided, fetch a specific submission
		if (submissionId) {
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			const submissionDoc = await adminDb
				.collection("contest_submissions")
				.doc(submissionId)
				.get();

			if (!submissionDoc.exists) {
				return NextResponse.json(
					{ error: "Submission not found" },
					{ status: 404 }
				);
			}

			const submissionData = {
				id: submissionDoc.id,
				...convertTimestampsToISO(submissionDoc.data() || null),
			};

			return NextResponse.json(submissionData);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("contest_submissions");

		// Filter by contestId if provided
		if (contestId) {
			query = query.where("contestId", "==", contestId);
		}

		// Filter by userId if provided
		if (userId) {
			query = query.where("userId", "==", userId);
		}

		// If neither contestId nor userId is provided, return an error
		if (!contestId && !userId) {
			return NextResponse.json(
				{ error: "Either contestId or userId is required" },
				{ status: 400 }
			);
		}

		// Get the submissions and order by creation date
		const submissionsSnapshot = await query
			.orderBy("createdAt", "desc")
			.get();

		const submissions = [];
		for (const doc of submissionsSnapshot.docs) {
			submissions.push({
				id: doc.id,
				...convertTimestampsToISO(doc.data() || null)
			});
		}

		return NextResponse.json(submissions);
	} catch (error) {
		console.error("Error fetching contest submissions:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch contest submissions",
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

// PUT endpoint for updating submission status
export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const submissionId = searchParams.get("submissionId");

		if (!submissionId) {
			return NextResponse.json(
				{ error: "Submission ID is required" },
				{ status: 400 }
			);
		}

		const { status } = await request.json();

		if (!status || !["pending", "approved", "rejected", "winner"].includes(status)) {
			return NextResponse.json(
				{ error: "Valid status is required (pending, approved, rejected, winner)" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		const submissionRef = adminDb
			.collection("contest_submissions")
			.doc(submissionId);

		const submissionDoc = await submissionRef.get();
		if (!submissionDoc.exists) {
			return NextResponse.json(
				{ error: "Submission not found" },
				{ status: 404 }
			);
		}

		await submissionRef.update({
			status,
			updatedAt: FieldValue.serverTimestamp(),
		});

		// Create notification for the user
		const submissionData = submissionDoc.data();
		let notificationMessage = "Your contest submission status has been updated.";
		
		if (status === "approved") {
			notificationMessage = "Your contest submission has been approved!";
		} else if (status === "rejected") {
			notificationMessage = "Your contest submission has been rejected.";
		} else if (status === "winner") {
			notificationMessage = "Congratulations! Your submission has been selected as a winner!";
		}

		await adminDb.collection("notifications").add({
			userId: submissionData?.userId,
			message: notificationMessage,
			status: "unread",
			type: "contest_submission_update",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "contest",
			contestId: submissionData?.contestId,
		});

		// Return the updated submission with ISO format dates
		const updatedDoc = await submissionRef.get();
		const updatedData = {
			id: updatedDoc.id,
			...convertTimestampsToISO(updatedDoc.data() || null)
		};

		return NextResponse.json({
			success: true,
			message: `Submission status updated to "${status}" successfully`,
			submission: updatedData
		});
	} catch (error) {
		console.error("Error updating submission:", error);
		return NextResponse.json(
			{
				error: "Failed to update submission",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}