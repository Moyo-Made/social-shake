import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

// Configuration - Updated for Vercel limits
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB limit
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks (safer for Vercel)

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Updated config for smaller payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // Reduced from 6mb
    },
    responseLimit: false,
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const uploadId = searchParams.get("uploadId");
    
    // If uploadId is provided, return upload status
    if (uploadId) {
      const uploadDoc = await adminDb.collection("video_uploads").doc(uploadId).get();
      
      if (!uploadDoc.exists) {
        return NextResponse.json(
          { error: "Upload record not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(uploadDoc.data());
    }
    
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
    // Check content length before parsing
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 2 * 1024 * 1024) { // 2MB limit
      return NextResponse.json(
        { error: "Request payload too large. Maximum size is 2MB." },
        { status: 413 }
      );
    }

    const body = await request.json();
    
    // Check if this is a chunk upload or metadata upload
    if (body.chunkData) {
      return handleChunkUpload(body);
    } else {
      return handleMetadataUpload(body);
    }
  } catch (error) {
    console.error("Error in POST handler:", error);
    
    // Handle specific payload size errors
    if (error instanceof Error && error.message.includes('body limit')) {
      return NextResponse.json(
        { error: "Request too large. Please reduce chunk size." },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChunkUpload(body: any) {
  try {
    const { 
      userId, 
      chunkData, 
      fileName, 
      fileContentType,
      chunkIndex, 
      totalChunks, 
      uploadId,
      fileSize
    } = body;

    if (!userId || !chunkData || !fileName || chunkIndex === undefined || !totalChunks || !uploadId) {
      return NextResponse.json(
        { error: "Missing required parameters for chunk upload" },
        { status: 400 }
      );
    }

    // Validate payload size
    const payloadSize = JSON.stringify(body).length;
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}, payload size: ${(payloadSize / 1024).toFixed(1)}KB`);

    if (payloadSize > 1.8 * 1024 * 1024) { // 1.8MB safety margin
      return NextResponse.json(
        { error: `Chunk payload too large: ${(payloadSize / 1024 / 1024).toFixed(1)}MB. Maximum is 1.8MB.` },
        { status: 413 }
      );
    }

    // Validate file size on first chunk
    if (chunkIndex === 0 && fileSize > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { 
          error: `Video file too large. Maximum size is ${formatFileSize(MAX_VIDEO_SIZE)}. Your file is ${formatFileSize(fileSize)}.` 
        },
        { status: 400 }
      );
    }

    // Generate a temp storage path for this upload's chunks
    const tempChunkPath = `temp/videos/${userId}/${uploadId}`;
    const bucket = adminStorage.bucket();
    
    // For the chunk file
    const chunkFileName = `${tempChunkPath}/chunk-${String(chunkIndex).padStart(6, '0')}`; // Padded for proper sorting
    const chunkFileRef = bucket.file(chunkFileName);
    
    try {
      // Decode and save the chunk
      const chunkBuffer = Buffer.from(chunkData, "base64");
      await chunkFileRef.save(chunkBuffer, {
        metadata: {
          contentType: 'application/octet-stream',
          customMetadata: {
            originalFileName: fileName,
            chunkIndex: chunkIndex.toString(),
            uploadId,
            uploadedBy: userId
          }
        }
      });
    } catch (storageError) {
      console.error(`Failed to save chunk ${chunkIndex}:`, storageError);
      throw new Error(`Storage error: Failed to save chunk ${chunkIndex + 1}`);
    }

    // Update upload progress
    const uploadRef = adminDb.collection("video_uploads").doc(uploadId);
    const progress = ((chunkIndex + 1) / totalChunks) * 100;
    
    await uploadRef.update({
      [`chunks.${chunkIndex}`]: true,
      progress: Math.round(progress),
      lastChunkAt: new Date(),
      status: chunkIndex === totalChunks - 1 ? "processing" : "uploading"
    });
    
    // If this is the last chunk, combine all chunks
    if (chunkIndex === totalChunks - 1) {
      try {
        console.log(`Combining ${totalChunks} chunks for upload ${uploadId}`);
        
        // Get all chunks with proper ordering
        const [chunkFiles] = await bucket.getFiles({ 
          prefix: tempChunkPath,
          autoPaginate: true
        });
        
        // Sort chunks by index (padded names ensure proper order)
        chunkFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        if (chunkFiles.length !== totalChunks) {
          throw new Error(`Expected ${totalChunks} chunks, found ${chunkFiles.length}`);
        }
        
        // Final video file path
        const finalFileName = `videos/${Date.now()}_${sanitizeFileName(fileName)}`;
        const finalFileRef = bucket.file(finalFileName);
        
        // Create a write stream for the final file
        const writeStream = finalFileRef.createWriteStream({
          metadata: {
            contentType: fileContentType,
            customMetadata: {
              originalName: fileName,
              uploadedBy: userId,
              uploadTimestamp: new Date().toISOString(),
              totalChunks: totalChunks.toString()
            }
          }
        });
        
        // Process each chunk and append to final file
        for (let i = 0; i < chunkFiles.length; i++) {
          console.log(`Processing chunk ${i + 1}/${chunkFiles.length}`);
          const [chunkData] = await chunkFiles[i].download();
          writeStream.write(chunkData);
        }
        
        // Close the write stream and wait for completion
        await new Promise<void>((resolve, reject) => {
          writeStream.end();
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });
        
        // Make the file publicly accessible
        await finalFileRef.makePublic();
        
        // Get the public URL
        const videoUrl = `https://storage.googleapis.com/${bucket.name}/${finalFileName}`;
        
        // Clean up temp chunks
        console.log(`Cleaning up ${chunkFiles.length} temporary chunks`);
        const deletePromises = chunkFiles.map(chunkFile => 
          chunkFile.delete().catch(err => console.warn(`Failed to delete chunk ${chunkFile.name}:`, err))
        );
        await Promise.allSettled(deletePromises);
        
        // Update upload record with video URL
        await uploadRef.update({
          videoUrl,
          status: "video_uploaded",
          completedAt: new Date(),
          progress: 100,
          fileName: sanitizeFileName(fileName)
        });
        
        console.log(`Video chunks combined successfully for upload: ${uploadId}, URL: ${videoUrl}`);
        
        return NextResponse.json({
          success: true,
          message: "Video uploaded successfully",
          uploadId,
          videoUrl,
          progress: 100,
          status: "video_uploaded"
        });
      } catch (error) {
        console.error("Error processing video chunks:", error);
        
        // Update upload status to failed
        await uploadRef.update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date()
        });
        
        throw error;
      }
    } else {
      // Return progress information for non-final chunks
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded successfully`,
        uploadId,
        progress: Math.round(progress),
        status: "uploading"
      });
    }
  } catch (error) {
    console.error("Error uploading video chunk:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload chunk";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMetadataUpload(body: any) {
  try {
    const { 
      title,
      description,
      price,
      licenseType,
      tags,
      userId,
      uploadId,
      thumbnailData,
      thumbnailFileName,
      thumbnailContentType
    } = body;

    // Validate required fields
    if (!title || !price || !licenseType || !userId || !uploadId) {
      return NextResponse.json(
        { error: "Missing required metadata fields" },
        { status: 400 }
      );
    }

    // Get the upload record to check if video is uploaded
    const uploadRef = adminDb.collection("video_uploads").doc(uploadId);
    const uploadDoc = await uploadRef.get();
    
    if (!uploadDoc.exists) {
      return NextResponse.json(
        { error: "Upload record not found" },
        { status: 404 }
      );
    }

    const uploadData = uploadDoc.data();
    if (uploadData?.status !== "video_uploaded") {
      return NextResponse.json(
        { error: "Video must be uploaded before submitting metadata" },
        { status: 400 }
      );
    }

    let thumbnailUrl = null;

    // Handle thumbnail upload if provided
    if (thumbnailData && thumbnailFileName) {
      // Validate thumbnail
      const thumbnailValidation = validateThumbnailData(thumbnailData, thumbnailContentType);
      if (!thumbnailValidation.valid) {
        return NextResponse.json(
          { error: thumbnailValidation.error },
          { status: 400 }
        );
      }

      try {
        const thumbnailBuffer = Buffer.from(thumbnailData, "base64");
        const thumbnailFileRef = adminStorage.bucket().file(thumbnailFileName);
        
        await thumbnailFileRef.save(thumbnailBuffer, {
          metadata: {
            contentType: thumbnailContentType,
            customMetadata: {
              uploadedBy: userId,
              uploadId
            }
          }
        });

        await thumbnailFileRef.makePublic();
        thumbnailUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${thumbnailFileName}`;
      } catch (thumbnailError) {
        console.warn("Failed to upload thumbnail:", thumbnailError);
        // Continue without thumbnail rather than failing the entire upload
      }
    }

    // Save video metadata to Firestore
    const videoData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      licenseType,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      videoUrl: uploadData.videoUrl,
      thumbnailUrl,
      fileName: uploadData.fileName || "video",
      fileSize: uploadData.fileSize || 0,
      fileSizeFormatted: formatFileSize(uploadData.fileSize || 0),
      contentType: uploadData.fileContentType || "video/mp4",
      views: 0,
      purchases: 0,
      rating: 0,
      ratingCount: 0,
      status: "active",
      uploadedAt: FieldValue.serverTimestamp(),
      createdBy: userId,
      uploadId,
      processing: {
        status: "completed",
        message: "Upload successful"
      }
    };

    const docRef = await adminDb.collection("videos").add(videoData);
    
    // Update upload record to completed
    await uploadRef.update({
      status: "completed",
      videoId: docRef.id,
      finalizedAt: new Date()
    });
    
    console.log(`Video finalized successfully with ID: ${docRef.id}`);
    
    return NextResponse.json({
      success: true,
      videoId: docRef.id,
      uploadId,
      message: "Video published successfully",
      videoUrl: uploadData.videoUrl,
      thumbnailUrl
    });

  } catch (error) {
    console.error("Error processing video metadata:", error);
    
    let errorMessage = "Failed to process video metadata";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('storage')) {
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
        details: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}

// Initialize upload session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fileName, fileSize, fileContentType } = body;

    if (!userId || !fileName || !fileSize) {
      return NextResponse.json(
        { error: "Missing required parameters for upload initialization" },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { 
          error: `Video file too large. Maximum size is ${formatFileSize(MAX_VIDEO_SIZE)}. Your file is ${formatFileSize(fileSize)}.` 
        },
        { status: 400 }
      );
    }

    const uploadId = uuidv4();
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(`Initializing upload: ${fileName} (${formatFileSize(fileSize)}) -> ${totalChunks} chunks`);

    // Create upload record
    await adminDb.collection("video_uploads").doc(uploadId).set({
      userId,
      fileName,
      fileSize,
      fileContentType,
      totalChunks,
      chunks: {},
      progress: 0,
      status: "initialized",
      createdAt: new Date(),
      uploadId
    });

    return NextResponse.json({
      success: true,
      uploadId,
      totalChunks,
      chunkSize: CHUNK_SIZE,
      message: "Upload session initialized"
    });

  } catch (error) {
    console.error("Error initializing upload:", error);
    return NextResponse.json(
      { 
        error: "Failed to initialize upload",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Validation functions
function validateThumbnailData(data: string, contentType: string): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: "No thumbnail data provided" };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return { 
      valid: false, 
      error: `Unsupported thumbnail format. Allowed formats: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    };
  }

  // Rough size check (base64 is ~33% larger than binary)
  const estimatedSize = (data.length * 3) / 4;
  if (estimatedSize > MAX_THUMBNAIL_SIZE) {
    return { 
      valid: false, 
      error: `Thumbnail file too large. Maximum size is ${formatFileSize(MAX_THUMBNAIL_SIZE)}` 
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

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}