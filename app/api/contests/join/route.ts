import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body once
    const { userId, postUrl, postDescription, contestId, mediaUrl } = await request.json();
    
    // Validate required userId
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Validate other required inputs
    if (!postUrl || !contestId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify the user exists in Auth system
    try {
      if (!adminAuth) {
        throw new Error("Firebase admin auth is not initialized");
      }
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
    
    // Create a transaction to handle the contest submission and counter update
    if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
    const submissionRef = adminDb.collection("contest_submissions").doc();
    const contestRef = adminDb.collection("contests").doc(contestId);
    
    // Check if this user has already submitted to this contest
    const existingSubmissionsQuery = await adminDb
      .collection("contest_submissions")
      .where("userId", "==", userId)
      .where("contestId", "==", contestId)
      .limit(1)
      .get();
    
    if (!existingSubmissionsQuery.empty) {
      return NextResponse.json(
        { error: "You have already joined this contest" },
        { status: 400 }
      );
    }
    
    // Start a transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      // Get the current contest document
      const contestDoc = await transaction.get(contestRef);
      
      if (!contestDoc.exists) {
        throw new Error("Contest not found");
      }
      
      const contestData = contestDoc.data();
      
      // Check if the contest is still open
      const now = new Date();
      const endDate = contestData?.prizeTimeline?.endDate 
        ? new Date(contestData.prizeTimeline.endDate) 
        : null;
        
      if (endDate && endDate < now) {
        throw new Error("This contest has ended");
      }
      
      // Create the submission document
      transaction.set(submissionRef, {
        userId,
        contestId,
        postUrl,
        description: postDescription || "",
        mediaUrl: mediaUrl || null,
        createdAt: FieldValue.serverTimestamp(),
        status: "pending" // Add a status field to track submission state
      });
      
      // Increment the participant count in the contest document
      transaction.update(contestRef, {
        participantsCount: FieldValue.increment(1)
      });
      
      // Return the updated participant count
      return (contestData?.participantsCount || 0) + 1;
    });
    
    // Create a notification for the user
    await adminDb.collection("notifications").add({
      userId,
      message: "Your contest submission has been received successfully.",
      status: "unread",
      type: "contest_submission",
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: "contest",
      contestId,
    });
    
    return NextResponse.json({
      success: true,
      message: "Contest entry submitted successfully",
      participantCount: result,
      submissionId: submissionRef.id
    });
    
  } catch (error) {
    console.error("Error submitting contest entry:", error);
    return NextResponse.json(
      { 
        error: "Failed to submit contest entry",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}