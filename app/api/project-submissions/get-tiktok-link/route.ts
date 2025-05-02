import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
	// Parse the JSON data from the request
	const data = await request.json();
	const { submissionId } = data;

	if (!submissionId) {
	  return NextResponse.json(
		{ success: false, error: "Missing submission ID" },
		{ status: 400 }
	  );
	}

	// Fetch the submission from Firestore
	const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
	const submissionDoc = await submissionRef.get();

	if (!submissionDoc.exists) {
	  return NextResponse.json(
		{ success: false, error: "Submission not found" },
		{ status: 404 }
	  );
	}

	const submission = submissionDoc.data();
	
	// Check if the submission has a tiktok link
	if (!submission?.tiktokLink) {
	  return NextResponse.json(
		{ success: false, error: "No tiktok link found for this submission" },
		{ status: 404 }
	  );
	}

	// Return the tiktok link
	return NextResponse.json({
	  success: true,
	  data: {
		submissionId,
		tiktokLink: submission.tiktokLink
	  }
	});
	
  } catch (error) {
	console.error("Error fetching tiktok link:", error);
	return NextResponse.json(
	  { 
		success: false, 
		error: "Failed to fetch tiktok link",
		details: error instanceof Error ? error.message : String(error)
	  },
	  { status: 500 }
	);
  }
}