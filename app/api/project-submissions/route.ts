/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// GET endpoint to fetch submissions for a project
export async function GET(request: NextRequest) {
  
  try {
    // Get and log all search parameters
    const { searchParams } = new URL(request.url);
    const allParams = Object.fromEntries(searchParams.entries());
    console.log("📝 All request parameters:", allParams);
    
    // Extract parameters, trim any whitespace
    const projectId = (searchParams.get('projectId') || '').trim();
    const submissionId = (searchParams.get('submissionId') || '').trim();
    
    // Reference to submissions collection
    const projectSubmissionsRef = adminDb.collection("project_submissions");
    
    // If specific submissionId is provided, fetch just that submission
    if (submissionId) {
      const submissionDoc = await projectSubmissionsRef.doc(submissionId).get();
      
      if (!submissionDoc.exists) {
        return NextResponse.json(
          { success: false, error: "Submission not found" },
          { status: 404 }
        );
      }
      
      const submissionData = {
        id: submissionDoc.id,
        ...convertFirestoreDataToClientFormat(submissionDoc.data())
      };
      
      return NextResponse.json(submissionData);
    }
    
    // Otherwise, fetch submissions for a project
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }
    
    // Query submissions for the specified project
    const submissionsSnapshot = await projectSubmissionsRef
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "desc")
      .get();
    
    
    // Process results
    const submissions: { id: string; }[] = [];
    submissionsSnapshot.forEach(doc => {
      submissions.push({
        id: doc.id,
        ...convertFirestoreDataToClientFormat(doc.data())
      });
    });
    
    return NextResponse.json({
      success: true,
      submissions,
      count: submissions.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching submissions:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch submissions",
        details: error instanceof Error ? error.message : String(error),
        submissions: [] 
      },
      { status: 500 }
    );
  }
}

// Helper function to convert Firestore data to client-friendly format
function convertFirestoreDataToClientFormat(data: any) {
  if (!data) return {};
  
  const result: Record<string, any> = {};
  
  // Process known fields with appropriate conversions
  result.userId = data.userId || "";
  result.projectId = data.projectId || "";
  result.videoUrl = data.videoUrl || "";
  result.note = data.note || "";
  result.status = data.status || "pending";
  result.fileName = data.fileName || "";
  result.fileSize = data.fileSize || 0;
  result.fileType = data.fileType || "";
  result.storagePath = data.storagePath || "";
  
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
  
  // Handle additional fields
  if (data.updatedAt) {
    if (data.updatedAt instanceof Timestamp) {
      result.updatedAt = data.updatedAt.toDate().toISOString();
    } else if (typeof data.updatedAt.toDate === 'function') {
      result.updatedAt = data.updatedAt.toDate().toISOString();
    } else {
      result.updatedAt = data.updatedAt;
    }
  }
  
  if (data.videoNumber !== undefined) result.videoNumber = data.videoNumber;
  if (data.revisionNumber !== undefined) result.revisionNumber = data.revisionNumber;
  
  // Add user information if available
  if (data.userDisplayName) result.userDisplayName = data.userDisplayName;
  if (data.userPhotoURL) result.userPhotoURL = data.userPhotoURL;
  
  // Copy any additional fields that might be useful
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