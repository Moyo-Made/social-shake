import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from 'uuid';

// const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const submissionId = formData.get('submissionId');
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);
    const fileType = formData.get('fileType') as string;
    const chunk = formData.get('chunk') as File;

    if (!submissionId || !chunk || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the existing submission to validate
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId as string);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submissionData = submissionDoc.data();
    
    // Generate unique filename and storage path for the first chunk
    let storagePath: string;
    let uniqueFileName: string;
    
    if (chunkIndex === 0) {
      const fileExtension = fileName.split('.').pop() || 'mp4';
      uniqueFileName = `${uuidv4()}.${fileExtension}`;
      storagePath = `submissions/${submissionData?.userId || 'unknown'}/${uniqueFileName}`;
      
      // Store upload metadata in a temporary collection
      await adminDb.collection("upload_sessions").doc(submissionId as string).set({
        fileName: uniqueFileName,
        originalFileName: fileName,
        fileSize,
        fileType,
        storagePath,
        totalChunks,
        chunksReceived: [],
        createdAt: new Date(),
        submissionId
      });
    } else {
      // Get upload session data
      const uploadSessionDoc = await adminDb.collection("upload_sessions").doc(submissionId as string).get();
      if (!uploadSessionDoc.exists) {
        return NextResponse.json(
          { success: false, error: "Upload session not found" },
          { status: 404 }
        );
      }
      const uploadSession = uploadSessionDoc.data();
      storagePath = uploadSession?.storagePath;
      uniqueFileName = uploadSession?.fileName;
    }

    // Upload chunk to Firebase Storage with resumable upload
    const chunkBuffer = await chunk.arrayBuffer();
    const chunkPath = `${storagePath}.chunk_${chunkIndex}`;
    const chunkFile = adminStorage.bucket().file(chunkPath);
    
    await chunkFile.save(Buffer.from(chunkBuffer), {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          chunkIndex: chunkIndex.toString(),
          submissionId: submissionId as string,
          originalFileName: fileName
        }
      }
    });

    // Update upload session with received chunk
    await adminDb.collection("upload_sessions").doc(submissionId as string).update({
      chunksReceived: FieldValue.arrayUnion(chunkIndex),
      updatedAt: new Date()
    });

    // Check if all chunks are received
    const updatedSessionDoc = await adminDb.collection("upload_sessions").doc(submissionId as string).get();
    const updatedSession = updatedSessionDoc.data();
    const chunksReceived = updatedSession?.chunksReceived || [];

    if (chunksReceived.length === totalChunks) {
      // All chunks received, combine them
      console.log(`All chunks received for ${submissionId}, combining...`);
      
      // Delete old video file if it exists
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
        }
      }

      // Combine chunks into final file
      const finalFile = adminStorage.bucket().file(storagePath);
      const writeStream = finalFile.createWriteStream({
        metadata: {
          contentType: fileType,
        }
      });

      // Read and combine chunks in order
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `${storagePath}.chunk_${i}`;
        const chunkFile = adminStorage.bucket().file(chunkPath);
        
        try {
          const [chunkBuffer] = await chunkFile.download();
          writeStream.write(chunkBuffer);
          
          // Delete chunk file after reading
          await chunkFile.delete();
        } catch (error) {
          console.error(`Error processing chunk ${i}:`, error);
          throw new Error(`Failed to process chunk ${i}`);
        }
      }

      // Finish writing the combined file
      await new Promise((resolve, reject) => {
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.end();
      });

      // Generate public URL for the final file
      const [url] = await finalFile.getSignedUrl({
        action: 'read',
        expires: '01-01-2100',
      });

      // Update the submission with new video URL and reset status to "pending"
      await submissionRef.update({
        videoUrl: url,
        status: "pending",
        fileName: uniqueFileName,
        fileSize,
        fileType,
        storagePath,
        updatedAt: new Date(),
        revisionHistory: FieldValue.arrayUnion({
          timestamp: new Date(),
          action: "revision_submitted",
        })
      });

      // Clean up upload session
      await adminDb.collection("upload_sessions").doc(submissionId as string).delete();

      return NextResponse.json({
        success: true,
        message: "Revision submitted successfully",
        completed: true,
        data: {
          submissionId,
          videoUrl: url,
          status: "pending"
        }
      });
    } else {
      // Not all chunks received yet
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
        completed: false,
        progress: Math.round((chunksReceived.length / totalChunks) * 100)
      });
    }

  } catch (error) {
    console.error("Error submitting revision:", error);
    
    // Clean up any partial uploads on error
    try {
      const submissionId = (await request.formData()).get('submissionId') as string;
      if (submissionId) {
        await adminDb.collection("upload_sessions").doc(submissionId).delete();
      }
    } catch (cleanupError) {
      console.error("Error cleaning up upload session:", cleanupError);
    }
    
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