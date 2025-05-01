/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// GET endpoint to fetch reviews for a submission
export async function GET(request: NextRequest) {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const submissionId = (searchParams.get('submissionId') || '').trim();
    
    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "Submission ID is required" },
        { status: 400 }
      );
    }
    
    // Reference to reviews collection
    const reviewsRef = adminDb.collection("submission_reviews");
    
    // Query reviews for the specified submission
    const reviewsSnapshot = await reviewsRef
      .where("submissionId", "==", submissionId)
      .orderBy("createdAt", "desc")
      .get();
    
    // Process results
    const reviews: { id: string; }[] = [];
    reviewsSnapshot.forEach(doc => {
      reviews.push({
        id: doc.id,
        ...convertFirestoreDataToClientFormat(doc.data())
      });
    });
    
    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching reviews:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch reviews",
        details: error instanceof Error ? error.message : String(error),
        reviews: [] 
      },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { submissionId, approved, feedback, issues } = body;
    
    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "Submission ID is required" },
        { status: 400 }
      );
    }
    
    // Get the submission to update revision count
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
    const submissionDoc = await submissionRef.get();
    
    if (!submissionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }
    
    const submissionData = submissionDoc.data();
    const currentRevisionCount = submissionData?.revisionsUsed || 0;
    const maxRevisions = 3;
    
    // Check if max revisions reached
    if (!approved && currentRevisionCount >= maxRevisions) {
      return NextResponse.json(
        { success: false, error: "Maximum revisions limit reached" },
        { status: 400 }
      );
    }
    
    // Create new review document
    const reviewData = {
      submissionId,
      projectId: submissionData?.projectId,
      userId: submissionData?.userId,
      approved,
      feedback: feedback || "",
      issues: issues || [],
      createdAt: Timestamp.now(),
      createdBy: body.createdBy || "admin" // Add reviewer info if available
    };
    
    // Add review to database
    const reviewRef = await adminDb.collection("submission_reviews").add(reviewData);
    
    // Update submission status and revision count
    const updateData: Record<string, any> = {
      status: approved ? "approved" : "revision_requested",
      updatedAt: Timestamp.now()
    };
    
    // Only increment revision count if not approved
    if (!approved) {
      updateData.revisionsUsed = currentRevisionCount + 1;
    }
    
    // Update the submission document
    await submissionRef.update(updateData);
    
    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
      message: approved ? "Submission approved" : "Revision requested",
      revisionsUsed: !approved ? currentRevisionCount + 1 : currentRevisionCount,
      revisionsRemaining: !approved ? maxRevisions - (currentRevisionCount + 1) : maxRevisions - currentRevisionCount
    });
    
  } catch (error) {
    console.error("❌ Error creating review:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create review",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper function to convert Firestore data to client-friendly format
function convertFirestoreDataToClientFormat(data: any) {
  if (!data) return {};
  
  const result: Record<string, any> = {};
  
  // Process fields with appropriate conversions
  result.submissionId = data.submissionId || "";
  result.projectId = data.projectId || "";
  result.userId = data.userId || "";
  result.approved = data.approved || false;
  result.feedback = data.feedback || "";
  result.issues = data.issues || [];
  result.createdBy = data.createdBy || "";
  
  // Handle timestamps
  if (data.createdAt) {
    if (data.createdAt instanceof Timestamp) {
      result.createdAt = data.createdAt.toDate().toISOString();
    } else if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
      result.createdAt = data.createdAt.toDate().toISOString();
    } else if (data.createdAt._seconds) {
      // Handle serialized Firestore timestamp
      result.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
    } else {
      // Try to use as is
      result.createdAt = data.createdAt;
    }
  } else {
    result.createdAt = new Date().toISOString();
  }
  
  // Add any additional fields from the data
  for (const [key, value] of Object.entries(data)) {
    if (!(key in result)) {
      // Skip complex objects that might cause issues when serializing
      if (typeof value !== 'function' && typeof value !== 'object') {
        result[key] = value;
      }
    }
  }
  
  return result;
}