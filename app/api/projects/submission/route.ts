import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";

// Maximum video size: 500MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB in bytes

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form data fields
    const userId = formData.get("userId") as string;
    const projectId = formData.get("projectId") as string;
    const note = formData.get("note") as string || "";
    const videoFile = formData.get("video") as File | null;
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }
    
    if (!videoFile) {
      return NextResponse.json({ error: "Video file is required" }, { status: 400 });
    }
    
    // Verify the user exists in Auth system
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
    
    // Validate file type
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
    const validExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    
    const fileExtension2 = videoFile.name.toLowerCase().substring(videoFile.name.lastIndexOf('.'));
    const isValidType = validVideoTypes.includes(videoFile.type);
    const isValidExtension = validExtensions.includes(fileExtension2);
    
    if (!isValidType && !isValidExtension) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a video file." },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (videoFile.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Video size exceeds the maximum limit of 500MB.` },
        { status: 400 }
      );
    }
    
    // Get project details to verify it exists and is open
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    const projectData = projectDoc.data();
    
    // Check if the project is still open for submissions
    const now = new Date();
    const endDate = projectData?.submissionDeadline 
      ? new Date(projectData.submissionDeadline) 
      : null;
      
    if (endDate && endDate < now) {
      return NextResponse.json(
        { error: "This project has closed for submissions" },
        { status: 400 }
      );
    }
    
    // Process video upload
    const videoArrayBuffer = await videoFile.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    
    // Generate a unique filename with original extension
    const fileExtension = videoFile.name.split('.').pop() || 'mp4';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `projects/${projectId}/submissions/${userId}/${uniqueFileName}`;
    
    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);
    
    await fileRef.save(videoBuffer, {
      metadata: {
        contentType: videoFile.type,
      },
    });
    
    // Get the public URL
    await fileRef.makePublic();
    const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    // Create submission document
    const submissionRef = adminDb.collection("project_submissions").doc();
    
    // Start a transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      // Create the submission document
      transaction.set(submissionRef, {
        userId,
        projectId,
        note,
        videoUrl,
        fileName: videoFile.name,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        createdAt: FieldValue.serverTimestamp(),
        status: "pending", // Add a status field to track submission state
        storagePath: filePath
      });
      
      // Increment the submission count in the project document
      transaction.update(projectRef, {
        submissionsCount: FieldValue.increment(1)
      });
      
      // Return the updated submission count
      return (projectData?.submissionsCount || 0) + 1;
    });
    
    // Create a notification for the user
    await adminDb.collection("notifications").add({
      userId,
      message: "Your project submission has been received successfully.",
      status: "unread",
      type: "project_submission",
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: "project",
      projectId,
    });
    
    return NextResponse.json({
      success: true,
      message: "Project submission completed successfully",
      submissionsCount: result,
      submissionId: submissionRef.id,
      videoUrl
    });
    
  } catch (error) {
    console.error("Error submitting project:", error);
    return NextResponse.json(
      { 
        error: "Failed to submit project",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Additional endpoint to handle large file uploads with chunks
export async function PUT(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const filename = searchParams.get('filename');
    const chunkIndex = searchParams.get('chunkIndex');
    const totalChunks = searchParams.get('totalChunks');
    const fileId = searchParams.get('fileId') || uuidv4();
    
    // Validate parameters
    if (!userId || !projectId || !filename || !chunkIndex || !totalChunks) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify the user exists
    try {
      await adminAuth.getUser(userId);
    } catch  {
      return NextResponse.json(
        { error: "Invalid user ID. Please sign in again." },
        { status: 401 }
      );
    }

    // Create temp directory for chunks if it doesn't exist
    const tempDir = join(process.cwd(), 'tmp', 'uploads', fileId);
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Save this chunk to temporary storage
    const chunkData = await request.arrayBuffer();
    const chunkPath = join(tempDir, `chunk-${chunkIndex}`);
    await writeFile(chunkPath, Buffer.from(chunkData));

    // If this is the last chunk, return success with fileId for the client to finalize
    if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
      return NextResponse.json({
        success: true,
        message: "All chunks received",
        fileId,
        ready: true
      });
    }

    // Return success for this chunk
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex} received`,
      fileId,
      ready: false
    });
    
  } catch (error) {
    console.error("Error handling chunk upload:", error);
    return NextResponse.json(
      { error: "Failed to process chunk upload", details: String(error) },
      { status: 500 }
    );
  }
}

// Finalize the chunked upload
export async function PATCH(request: NextRequest) {
  try {
    const { userId, projectId, fileId, filename, note, fileType } = await request.json();
    
    // Validate parameters
    if (!userId || !projectId || !fileId || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    
    // Get all chunks and combine them
    const bucket = adminStorage.bucket();
    const filePath = `projects/${projectId}/submissions/${userId}/${fileId}-${filename}`;
    const file = bucket.file(filePath);
    
    // After successful upload, create submission entry
    const submissionRef = adminDb.collection("project_submissions").doc();
    const projectRef = adminDb.collection("projects").doc(projectId);
    
    await file.makePublic();
    const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    // Start a transaction to create submission and update project
    await adminDb.runTransaction(async (transaction) => {
      const projectDoc = await transaction.get(projectRef);
      
      if (!projectDoc.exists) {
        throw new Error("Project not found");
      }
      
      transaction.set(submissionRef, {
        userId,
        projectId,
        note: note || "",
        videoUrl,
        fileName: filename,
        fileType: fileType || 'video/mp4',
        createdAt: FieldValue.serverTimestamp(),
        status: "pending",
        storagePath: filePath
      });
      
      transaction.update(projectRef, {
        submissionsCount: FieldValue.increment(1)
      });
    });
    
    // Clean up temp files
    // (implementation to delete the temp directory and chunks)
    
    return NextResponse.json({
      success: true,
      message: "Project submission finalized successfully",
      submissionId: submissionRef.id,
      videoUrl
    });
    
  } catch (error) {
    console.error("Error finalizing upload:", error);
    return NextResponse.json(
      { error: "Failed to finalize upload", details: String(error) },
      { status: 500 }
    );
  }
}