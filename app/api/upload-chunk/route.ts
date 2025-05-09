import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This higher limit is for chunks, not the entire file
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb', // Each chunk should be under this size
    },
    responseLimit: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      fileType, 
      chunkData, 
      fileName, 
      fileContentType,
      chunkIndex, 
      totalChunks, 
      fileId,
      verificationId 
    } = body;

    if (!userId || !fileType || !chunkData || !fileName || chunkIndex === undefined || !totalChunks) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Use provided fileId or generate a new one for the first chunk
    const currentFileId = fileId || `${Date.now()}-${uuidv4()}`;
    
    // Generate a temp storage path for this file's chunks
    const tempChunkPath = `temp/${userId}/${currentFileId}`;
    const bucket = adminStorage.bucket();
    
    // For the chunk file
    const chunkFileName = `${tempChunkPath}/chunk-${chunkIndex}`;
    const chunkFileRef = bucket.file(chunkFileName);
    
    // Decode and save the chunk
    const chunkBuffer = Buffer.from(chunkData, "base64");
    await chunkFileRef.save(chunkBuffer);
    
    // If this is the last chunk, combine all chunks
    if (chunkIndex === totalChunks - 1) {
      // Create a record to track processing status
      const processingRef = adminDb.collection("file_processing").doc(currentFileId);
      await processingRef.set({
        status: "processing",
        userId,
        fileType,
        startedAt: new Date(),
      });
      
      try {
        // Get all chunks 
        const [chunkFiles] = await bucket.getFiles({ prefix: tempChunkPath });
        chunkFiles.sort((a, b) => {
          const aIndex = parseInt(a.name.split('-').pop() || '0');
          const bIndex = parseInt(b.name.split('-').pop() || '0');
          return aIndex - bIndex;
        });
        
        // Final file path
        const finalFileName = `${userId}/${fileType}/${Date.now()}-${fileName}`;
        const finalFileRef = bucket.file(finalFileName);
        
        // Create a write stream for the final file
        const writeStream = finalFileRef.createWriteStream({
          metadata: {
            contentType: fileContentType,
          }
        });
        
        // Process each chunk and append to final file
        for (const chunkFile of chunkFiles) {
          const [chunkData] = await chunkFile.download();
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
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${finalFileName}`;
        
        // Clean up temp chunks
        const deletePromises = chunkFiles.map(chunkFile => chunkFile.delete());
        await Promise.all(deletePromises);
        
        // Update or create verification record
        const currentVerificationId = verificationId || uuidv4();
        const verificationRef = adminDb
          .collection("creator_verifications")
          .doc(currentVerificationId);
        
        const doc = await verificationRef.get();
        
        if (doc.exists) {
          // Update existing document with the new file URL
          await verificationRef.update({
            [`${fileType}Url`]: fileUrl,
            updatedAt: new Date(),
          });
        } else {
          // Create a new document with minimal information
          await verificationRef.set({
            createdAt: new Date(),
            status: "incomplete", // Will be changed to pending when all files are uploaded
            userId,
            [`${fileType}Url`]: fileUrl,
          });
        }
        
        // Update processing status
        await processingRef.update({
          status: "completed",
          completedAt: new Date(),
          fileUrl
        });
        
        return NextResponse.json({
          success: true,
          message: `${fileType} uploaded successfully`,
          verificationId: currentVerificationId,
          fileUrl,
          fileId: currentFileId
        });
      } catch (error) {
        console.error("Error processing chunks:", error);
        
        // Update processing status to failed
        await processingRef.update({
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
        fileId: currentFileId,
        progress: ((chunkIndex + 1) / totalChunks) * 100
      });
    }
  } catch (error) {
    console.error(`Error uploading chunk:`, error);
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

// GET endpoint to check file processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }
    
    const processingDoc = await adminDb.collection("file_processing").doc(fileId).get();
    
    if (!processingDoc.exists) {
      return NextResponse.json(
        { error: "Processing record not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(processingDoc.data());
  } catch (error) {
    console.error("Error checking file status:", error);
    return NextResponse.json(
      { error: "Failed to check file status" },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}