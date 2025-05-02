import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
	// Parse the JSON data from the request
	const data = await request.json();
	const { tiktokLink, submissionId } = data;

	if (!tiktokLink || !submissionId) {
	  return NextResponse.json(
		{ success: false, error: "Missing required fields" },
		{ status: 400 }
	  );
	}

	// Fetch the existing submission
	const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
	const submissionDoc = await submissionRef.get();

	if (!submissionDoc.exists) {
	  return NextResponse.json(
		{ success: false, error: "Submission not found" },
		{ status: 404 }
	  );
	}

	// Validate tiktok link
	// This is where you would add any validation logic for the tiktok link
	// For example, you might check if it matches a specific format or if it exists in another collection

	// Update the submission with tiktok link and status
	await submissionRef.update({
	  tiktokLink: tiktokLink,
	  status: "tiktokLink_received", // Update status as needed
	  updatedAt: new Date(),
	  // Keep track of revision history
	  revisionHistory: FieldValue.arrayUnion({
		timestamp: new Date(),
		action: "tiktokLink_submitted",
	  })
	});

	// Return success response
	return NextResponse.json({
	  success: true,
	  message: "Tiktok Link submitted successfully",
	  data: {
		submissionId,
		status: "tiktokLink_received",
	  }
	});
	
  } catch (error) {
	console.error("Error submitting tiktok link:", error);
	return NextResponse.json(
	  { 
		success: false, 
		error: "Failed to submit tiktok link",
		details: error instanceof Error ? error.message : String(error)
	  },
	  { status: 500 }
	);
  }
}