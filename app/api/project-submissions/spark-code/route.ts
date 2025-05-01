import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON data from the request
    const data = await request.json();
    const { sparkCode, submissionId } = data;

    if (!sparkCode || !submissionId) {
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

    // Validate spark code
    // This is where you would add any validation logic for the spark code
    // For example, you might check if it matches a specific format or if it exists in another collection

    // Update the submission with spark code
    await submissionRef.update({
      sparkCode: sparkCode,
      status: "spark_received", // Update status as needed
      updatedAt: new Date(),
      // Keep track of revision history
      revisionHistory: FieldValue.arrayUnion({
        timestamp: new Date(),
        action: "spark_code_submitted",
      })
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Spark code submitted successfully",
      data: {
        submissionId,
        status: "spark_received"
      }
    });
    
  } catch (error) {
    console.error("Error submitting spark code:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to submit spark code",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}