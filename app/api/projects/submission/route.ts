import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

// Maximum video size: 500MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB in bytes
// Chunk size for large file uploads: 5MB
const CHUNK_SIZE = 3 * 1024 * 1024; // 5MB in bytes

// Expanded video format support
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'video/3gpp',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/mp2t',
  'video/x-matroska',
  'video/mp2t',
  'video/x-m4v'
];

const SUPPORTED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mpeg',
  '.mpg',
  '.ogg',
  '.3gp',
  '.wmv',
  '.flv',
  '.mkv',
  '.m4v',
  '.ts'
];

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
    
    // Enhanced file validation
    const fileExtension = videoFile.name.toLowerCase().substring(videoFile.name.lastIndexOf('.'));
    const isValidType = SUPPORTED_VIDEO_TYPES.includes(videoFile.type);
    const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);
    
    // More lenient validation - accept if either MIME type or extension is valid
    if (!isValidType && !isValidExtension) {
      return NextResponse.json(
        { 
          error: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}`,
          supportedTypes: SUPPORTED_VIDEO_EXTENSIONS
        },
        { status: 415 }
      );
    }
    
    // Validate file size
    if (videoFile.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Video size exceeds the maximum limit of 500MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB.` },
        { status: 413 }
      );
    }
    
    // Check for empty file
    if (videoFile.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file appears to be empty. Please try again." },
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
    
    // Check if user has already submitted
    const existingSubmission = await adminDb
      .collection("project_submissions")
      .where("userId", "==", userId)
      .where("projectId", "==", projectId)
      .get();
    
    if (!existingSubmission.empty) {
      return NextResponse.json(
        { error: "You have already submitted a video for this project" },
        { status: 400 }
      );
    }
    
    // Determine upload method based on file size
    const useResumableUpload = videoFile.size > CHUNK_SIZE;
    
    if (useResumableUpload) {
      // For large files, use Firebase Storage resumable upload
      return NextResponse.json({
        useResumableUpload: true,
        message: "File is large. Please use resumable upload method.",
        maxFileSize: MAX_VIDEO_SIZE,
        uploadEndpoint: `/api/projects/submit-video/resumable`
      });
    }
    
    // Process regular upload for smaller files
    const videoArrayBuffer = await videoFile.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    
    // Generate a unique filename with original extension
    const originalExtension = fileExtension || '.mp4';
    const uniqueFileName = `${uuidv4()}${originalExtension}`;
    const filePath = `projects/${projectId}/submissions/${userId}/${uniqueFileName}`;
    
    // Upload to Firebase Storage with error handling
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);
    
    try {
      await fileRef.save(videoBuffer, {
        metadata: {
          contentType: videoFile.type || 'video/mp4',
          customMetadata: {
            originalName: videoFile.name,
            uploadedBy: userId,
            projectId: projectId,
            uploadDate: new Date().toISOString()
          }
        },
        resumable: false, // For files under 5MB, use simple upload
      });
      
      // Get the public URL
      await fileRef.makePublic();
      const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      // Create submission document
      const submissionRef = adminDb.collection("project_submissions").doc();
      
      // Start a transaction
      const result = await adminDb.runTransaction(async (transaction) => {
        // Get the current project data
        const currentProject = await transaction.get(projectRef);
        const currentSubmissionsCount = currentProject.data()?.submissionsCount || 0;
        
        // Create the submission document
        transaction.set(submissionRef, {
          userId,
          projectId,
          note,
          videoUrl,
          fileName: videoFile.name,
          fileSize: videoFile.size,
          fileType: videoFile.type,
          fileExtension: originalExtension,
          createdAt: FieldValue.serverTimestamp(),
          status: "pending",
          storagePath: filePath
        });
        
        // Increment the submission count in the project document
        transaction.update(projectRef, {
          submissionsCount: FieldValue.increment(1),
          lastSubmissionAt: FieldValue.serverTimestamp()
        });
        
        // Return the updated submission count
        return currentSubmissionsCount + 1;
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
        videoUrl,
        fileName: videoFile.name,
        fileSize: videoFile.size
      });
      
    } catch (uploadError) {
      console.error("Error uploading to Firebase Storage:", uploadError);
      
      // Try to clean up any partially uploaded file
      try {
        await fileRef.delete();
      } catch (cleanupError) {
        console.error("Error cleaning up failed upload:", cleanupError);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to upload video file",
          details: uploadError instanceof Error ? uploadError.message : String(uploadError)
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Error submitting project:", error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("request entity too large")) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 500MB." },
          { status: 413 }
        );
      }
      
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Upload timeout. Please try again with a smaller file." },
          { status: 408 }
        );
      }
      
      if (error.message.includes("network")) {
        return NextResponse.json(
          { error: "Network error. Please check your connection and try again." },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to submit project",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handle resumable uploads for large files
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form data fields
    const userId = formData.get("userId") as string;
    const projectId = formData.get("projectId") as string;
    const note = formData.get("note") as string || "";
    const videoFile = formData.get("video") as File | null;
    
    // Validate required fields
    if (!userId || !projectId || !videoFile) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify the user exists
    try {
      await adminAuth.getUser(userId);
    } catch {
      return NextResponse.json(
        { error: "Invalid user ID. Please sign in again." },
        { status: 401 }
      );
    }

    // Verify project exists and user hasn't already submitted
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Check if user has already submitted
    const existingSubmission = await adminDb
      .collection("project_submissions")
      .where("userId", "==", userId)
      .where("projectId", "==", projectId)
      .get();
    
    if (!existingSubmission.empty) {
      return NextResponse.json(
        { error: "You have already submitted a video for this project" },
        { status: 400 }
      );
    }

    // Process large file upload with resumable upload
    const videoArrayBuffer = await videoFile.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    
    // Generate a unique filename with original extension
    const fileExtension = videoFile.name.toLowerCase().substring(videoFile.name.lastIndexOf('.')) || '.mp4';
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = `projects/${projectId}/submissions/${userId}/${uniqueFileName}`;
    
    // Upload to Firebase Storage with resumable upload
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);
    
    try {
      await fileRef.save(videoBuffer, {
        metadata: {
          contentType: videoFile.type || 'video/mp4',
          customMetadata: {
            originalName: videoFile.name,
            uploadedBy: userId,
            projectId: projectId,
            uploadDate: new Date().toISOString(),
            uploadMethod: 'resumable'
          }
        },
        resumable: true, // Use resumable upload for large files
        timeout: 10 * 60 * 1000, // 10 minutes timeout
      });
      
      // Get the public URL
      await fileRef.makePublic();
      const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      // Create submission document
      const submissionRef = adminDb.collection("project_submissions").doc();
      
      // Start a transaction
      const result = await adminDb.runTransaction(async (transaction) => {
        const currentProject = await transaction.get(projectRef);
        const currentSubmissionsCount = currentProject.data()?.submissionsCount || 0;
        
        transaction.set(submissionRef, {
          userId,
          projectId,
          note,
          videoUrl,
          fileName: videoFile.name,
          fileSize: videoFile.size,
          fileType: videoFile.type,
          fileExtension,
          createdAt: FieldValue.serverTimestamp(),
          status: "pending",
          storagePath: filePath,
          uploadMethod: 'resumable'
        });
        
        transaction.update(projectRef, {
          submissionsCount: FieldValue.increment(1),
          lastSubmissionAt: FieldValue.serverTimestamp()
        });
        
        return currentSubmissionsCount + 1;
      });
      
      // Create notification
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
        message: "Large file submission completed successfully",
        submissionsCount: result,
        submissionId: submissionRef.id,
        videoUrl,
        fileName: videoFile.name,
        fileSize: videoFile.size
      });
      
    } catch (uploadError) {
      console.error("Error uploading large file:", uploadError);
      
      // Try to clean up any partially uploaded file
      try {
        await fileRef.delete();
      } catch (cleanupError) {
        console.error("Error cleaning up failed upload:", cleanupError);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to upload large video file",
          details: uploadError instanceof Error ? uploadError.message : String(uploadError)
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Error handling large file upload:", error);
    return NextResponse.json(
      { error: "Failed to process large file upload", details: String(error) },
      { status: 500 }
    );
  }
}
