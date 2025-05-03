import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// PATCH endpoint to update a submission status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const submissionId = params.id;
    
    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }
    
    const body = await request.json();
    const { status, userId } = body;
    
    // Validate required fields
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Verify the user exists
    try {
      await adminAuth.getUser(userId);
    } catch (error) {
      console.error("Error verifying user:", error);
      return NextResponse.json(
        { 
          error: "invalid-user",
          message: "Invalid user ID. Please sign in again."
        },
        { status: 401 }
      );
    }
    
    // Get the submission
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
    const submissionDoc = await submissionRef.get();
    
    if (!submissionDoc.exists) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    
    const submissionData = submissionDoc.data();
    
    // Check if the submission belongs to the requesting user
    if (submissionData?.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to update this submission" },
        { status: 403 }
      );
    }
    
    // Update the submission status
    await submissionRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Create a notification for status change
    let notificationMessage = "";
    
    switch (status) {
      case "approved":
        notificationMessage = "Your submission has been approved!";
        break;
      case "rejected":
        notificationMessage = "Your submission requires revisions.";
        break;
      default:
        notificationMessage = `Your submission status has been updated to: ${status}`;
    }
    
    await adminDb.collection("notifications").add({
      userId,
      message: notificationMessage,
      status: "unread",
      type: "submission_status_update",
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: "submission",
      submissionId
    });
    
    return NextResponse.json({
      success: true,
      message: "Submission updated successfully",
      submissionId
    });
    
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { 
        error: "Failed to update submission",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}