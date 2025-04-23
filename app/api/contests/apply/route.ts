import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const {
			userId,
			contestId,
			postUrl,
			applicationText,
			sampleUrls,
			hasBusinessAccount,
		} = await request.json();

		// Validate required fields
		if (!userId || !contestId || !postUrl) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		// Verify the user exists in Auth system
		try {
			await adminAuth.getUser(userId);
		} catch (error) {
			console.error("Error verifying user:", error);
			return NextResponse.json(
				{
					error: "invalid-user",
					message: "Invalid user ID. Please sign in again.",
				},
				{ status: 401 }
			);
		}

		// Check if this user has already applied to this contest
		const existingApplicationQuery = await adminDb
			.collection("contest_applications")
			.where("userId", "==", userId)
			.where("contestId", "==", contestId)
			.limit(1)
			.get();

		if (!existingApplicationQuery.empty) {
			return NextResponse.json(
				{ error: "You have already applied to this contest" },
				{ status: 400 }
			);
		}

		// Check if the contest exists and is still accepting applications
		const contestRef = adminDb.collection("contests").doc(contestId);
		const contestDoc = await contestRef.get();

		if (!contestDoc.exists) {
			return NextResponse.json({ error: "Contest not found" }, { status: 404 });
		}

		const contestData = contestDoc.data();

		// Check if the contest is still open
		const now = new Date();
		const endDate = contestData?.prizeTimeline?.endDate
			? new Date(contestData.prizeTimeline.endDate)
			: null;

		if (endDate && endDate < now) {
			return NextResponse.json(
				{ error: "This contest has ended" },
				{ status: 400 }
			);
		}

		// Create the application document
		const applicationRef = adminDb.collection("contest_applications").doc();
		await applicationRef.set({
			userId,
			contestId,
			postUrl,
			applicationText,
			sampleUrls: sampleUrls || [],
			hasBusinessAccount: hasBusinessAccount || false,
			status: "pending", // Initial status: pending, approved, rejected
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});

		// Update contest applicants count
		await contestRef.update({
			applicantsCount: FieldValue.increment(1),
		});

		// Create a notification for the user
		await adminDb.collection("notifications").add({
			userId,
			message:
				"Your application has been submitted for review. We'll notify you once it's approved.",
			status: "unread",
			type: "contest_application",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "contest",
			contestId,
		});

		// Create a notification for the brand or admin
		await adminDb.collection("notifications").add({
			userId: contestData?.createdBy,
			message: `New application received for contest: ${contestData?.basic?.contestName || contestId}`,
			status: "unread",
			type: "new_application",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "contest",
			contestId,
			applicationId: applicationRef.id,
		});

		return NextResponse.json({
			success: true,
			message:
				"Application submitted successfully. It will be reviewed by the brand.",
			applicationId: applicationRef.id,
		});
	} catch (error) {
		console.error("Error submitting contest application:", error);
		return NextResponse.json(
			{
				error: "Failed to submit application",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
