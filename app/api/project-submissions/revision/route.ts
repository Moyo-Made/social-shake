import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Parse the form data from the request
    const formData = await request.formData();
    const submissionId = formData.get('submissionId');
    const videoFile = formData.get('video') as File;

    if (!submissionId || !videoFile) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the existing submission
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId as string);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submissionData = submissionDoc.data();
    
    // Delete the old video file if it exists
    if (submissionData?.storagePath) {
      try {
        const oldFileRef = adminStorage.bucket().file(submissionData.storagePath);
        const [exists] = await oldFileRef.exists();
        
        if (exists) {
          await oldFileRef.delete();
          console.log(`Deleted old file at ${submissionData.storagePath}`);
        }
      } catch (deleteError) {
        console.error("Error deleting old file:", deleteError);
        // Continue with the process even if deletion fails
      }
    }

    // Generate a new filename and storage path
    const fileExtension = videoFile.name.split('.').pop() || 'mp4';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storagePath = `submissions/${submissionData?.userId || 'unknown'}/${fileName}`;

    // Upload the new video file
    const buffer = await videoFile.arrayBuffer();
    const file = adminStorage.bucket().file(storagePath);
    
    await file.save(Buffer.from(buffer), {
      metadata: {
        contentType: videoFile.type,
      }
    });

    // Generate public URL for the file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100', // Set a far future expiration
    });

    // Update the submission with new video URL and reset status to "pending"
    await submissionRef.update({
      videoUrl: url,
      status: "pending", // Reset status to pending
      fileName,
      fileSize: videoFile.size,
      fileType: videoFile.type,
      storagePath,
      updatedAt: new Date(),
      // Keep track of revision history
      revisionHistory: FieldValue.arrayUnion({
        timestamp: new Date(),
        action: "revision_submitted",
      })
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Revision submitted successfully",
      data: {
        submissionId,
        videoUrl: url,
        status: "pending"
      }
    });
    
  } catch (error) {
    console.error("Error submitting revision:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to submit revision",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}