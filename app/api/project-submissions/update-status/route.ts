import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const requestData = await request.json();
		const { submissionId, status, sparkCode, tiktokLink, feedback } =
			requestData;

		if (!submissionId) {
			return NextResponse.json(
				{ success: false, error: "Submission ID is required" },
				{ status: 400 }
			);
		}

		// Get the current Firebase user from the client-side token
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const token = authHeader.split("Bearer ")[1];

		// Verify the token on the server side
		try {
			await getAuth().verifyIdToken(token);
			// Token verification successful
		} catch {
			return NextResponse.json(
				{ success: false, error: "Invalid authentication token" },
				{ status: 401 }
			);
		}

		// Get submission reference
		const submissionRef = adminDb
			.collection("project_submissions")
			.doc(submissionId);
		const submissionDoc = await submissionRef.get();

		if (!submissionDoc.exists) {
			return NextResponse.json(
				{ success: false, error: "Submission not found" },
				{ status: 404 }
			);
		}

		const submissionData = submissionDoc.data();

		// Prepare update data
		const updateData: Record<string, string | Timestamp | undefined> = {
			status,
			updatedAt: Timestamp.now(),
		};

		// Add additional fields if provided
		if (sparkCode) {
			updateData.sparkCode = sparkCode;
		}

		if (tiktokLink) {
			updateData.tiktokLink = tiktokLink; // Fixed: Using correct field name
		}

		if (feedback) {
			updateData.feedback = feedback;
		}

		// Update the submission
		await submissionRef.update(updateData);

		// Get the updated submission
		const updatedSubmissionDoc = await submissionRef.get();
		const updatedSubmissionData = {
			id: updatedSubmissionDoc.id,
			...(updatedSubmissionDoc.data()
				? convertFirestoreDataToClientFormat(updatedSubmissionDoc.data()!)
				: {}),
		};

		// Send notification if needed
		if (status === "spark_submitted" || status === "spark_verified") {
			// Create a notification in the database
			await adminDb.collection("notifications").add({
				type:
					status === "spark_submitted"
						? "spark_code_submitted"
						: "spark_code_verified",
				submissionId,
				projectId: submissionData?.projectId,
				userId: submissionData?.userId,
				createdAt: FieldValue.serverTimestamp(),
				read: false,
			});
		}

		// Return success response with updated data
		return NextResponse.json({
			success: true,
			message: `Submission status updated to ${status}`,
			submission: updatedSubmissionData,
		});
	} catch (error) {
		console.error("Error updating submission status:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update submission status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert Firestore data to client-friendly format
function convertFirestoreDataToClientFormat(
	data: FirebaseFirestore.DocumentData
) {
	if (!data) return {};

	const result: Record<string, string | number | boolean | null | undefined> =
		{};

	// Copy all fields from data to result
	Object.entries(data).forEach(([key, value]) => {
		// Handle Firestore timestamps
		if (value instanceof Timestamp) {
			result[key] = value.toDate().toISOString();
		} else if (
			value &&
			typeof value === "object" &&
			"seconds" in value &&
			"nanoseconds" in value
		) {
			// Handle Firestore timestamp-like objects
			result[key] = new Date(
				(value as { seconds: number }).seconds * 1000
			).toISOString();
		} else {
			// Copy as is for other fields
			result[key] = value;
		}
	});

	return result;
}
