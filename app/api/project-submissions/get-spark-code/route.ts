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
    
    // Check if the submission has a spark code
    if (!submission?.sparkCode) {
      return NextResponse.json(
        { success: false, error: "No spark code found for this submission" },
        { status: 404 }
      );
    }

    // Return the spark code
    return NextResponse.json({
      success: true,
      data: {
        submissionId,
        sparkCode: submission.sparkCode
      }
    });
    
  } catch (error) {
    console.error("Error fetching spark code:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch spark code",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}