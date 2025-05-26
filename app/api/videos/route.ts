import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Configuration
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB limit

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching videos for userId: ${userId}, status: ${status || 'all'}`);
    
    let query = adminDb.collection("videos")
      .where("createdBy", "==", userId);
    
    if (status) {
      query = query.where("status", "==", status);
    }
    
    query = query.orderBy("uploadedAt", "desc");

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`No videos found for userId: ${userId}`);
      return NextResponse.json({ videos: [] });
    }

    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as {
        licenseType?: string;
        status?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uploadedAt?: any;
        [key: string]: string | number | boolean | null | undefined;
      }),
      uploadedAt: doc.data().uploadedAt?.toDate().toISOString() || null
    }));

    console.log(`Found ${videos.length} videos for userId: ${userId}`);
    return NextResponse.json({ videos });

  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch videos",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const licenseType = formData.get("licenseType") as string;
    const tags = formData.get("tags") as string;
    const userId = formData.get("userId") as string;
    const videoFile = formData.get("videoFile") as File;
    const thumbnailFile = formData.get("thumbnailFile") as File;

    // Validate required fields
    if (!title || !price || !licenseType || !userId || !videoFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate video file
    const videoValidation = validateVideoFile(videoFile);
    if (!videoValidation.valid) {
      return NextResponse.json(
        { error: videoValidation.error },
        { status: 400 }
      );
    }

    // Validate thumbnail file if provided
    if (thumbnailFile) {
      const thumbnailValidation = validateThumbnailFile(thumbnailFile);
      if (!thumbnailValidation.valid) {
        return NextResponse.json(
          { error: thumbnailValidation.error },
          { status: 400 }
        );
      }
    }

    console.log(`Uploading video for userId: ${userId}, title: ${title}, size: ${formatFileSize(videoFile.size)}`);

    // Upload video file with progress tracking
    const videoFileName = `videos/${Date.now()}_${sanitizeFileName(videoFile.name)}`;
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const videoFileRef = adminStorage.bucket().file(videoFileName);
    
    // Upload with metadata and timeout handling
    await Promise.race([
      videoFileRef.save(videoBuffer, {
        metadata: {
          contentType: videoFile.type,
          customMetadata: {
            originalName: videoFile.name,
            uploadedBy: userId,
            uploadTimestamp: new Date().toISOString()
          }
        },
        validation: 'crc32c' // Enable integrity checking
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Video upload timeout')), 5 * 60 * 1000) // 5 minute timeout
      )
    ]);

    // Make the video file publicly accessible
    await videoFileRef.makePublic();
    const videoUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${videoFileName}`;

    // Upload thumbnail file if provided
    let thumbnailUrl = null;
    if (thumbnailFile) {
      const thumbnailFileName = `thumbnails/${Date.now()}_${sanitizeFileName(thumbnailFile.name)}`;
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailFileRef = adminStorage.bucket().file(thumbnailFileName);
      
      await Promise.race([
        thumbnailFileRef.save(thumbnailBuffer, {
          metadata: {
            contentType: thumbnailFile.type,
            customMetadata: {
              originalName: thumbnailFile.name,
              uploadedBy: userId
            }
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Thumbnail upload timeout')), 30 * 1000) // 30 second timeout
        )
      ]);

      await thumbnailFileRef.makePublic();
      thumbnailUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${thumbnailFileName}`;
    }

    // Save video metadata to Firestore
    const videoData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      licenseType,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      videoUrl,
      thumbnailUrl,
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileSizeFormatted: formatFileSize(videoFile.size),
      contentType: videoFile.type,
      views: 0,
      purchases: 0,
      rating: 0,
      ratingCount: 0,
      status: "active",
      uploadedAt: FieldValue.serverTimestamp(),
      createdBy: userId,
      // Add processing status for future video processing
      processing: {
        status: "completed",
        message: "Upload successful"
      }
    };

    const docRef = await adminDb.collection("videos").add(videoData);
    
    console.log(`Video uploaded successfully with ID: ${docRef.id}`);
    
    return NextResponse.json({
      success: true,
      videoId: docRef.id,
      message: "Video uploaded successfully",
      videoUrl,
      thumbnailUrl,
      fileSize: formatFileSize(videoFile.size)
    });

  } catch (error) {
    console.error("Error uploading video:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to upload video";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = "Upload timeout - please try again or use a smaller file";
        statusCode = 408;
      } else if (error.message.includes('storage')) {
        errorMessage = "Storage error - please try again";
        statusCode = 503;
      } else if (error.message.includes('network')) {
        errorMessage = "Network error - please check your connection";
        statusCode = 502;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Try uploading a smaller file or check your internet connection"
      },
      { status: statusCode }
    );
  }
}

// Validation functions
function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No video file provided" };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return { 
      valid: false, 
      error: `Video file too large. Maximum size is ${formatFileSize(MAX_VIDEO_SIZE)}. Your file is ${formatFileSize(file.size)}.` 
    };
  }

  if (file.size < 1024) { // Less than 1KB
    return { valid: false, error: "Video file appears to be empty or corrupted" };
  }

  return { valid: true };
}

function validateThumbnailFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_THUMBNAIL_SIZE) {
    return { 
      valid: false, 
      error: `Thumbnail file too large. Maximum size is ${formatFileSize(MAX_THUMBNAIL_SIZE)}` 
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported thumbnail format. Allowed formats: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    };
  }

  return { valid: true };
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase();
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";