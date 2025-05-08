import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // Reduced for individual file uploads
    },
    responseLimit: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fileType, fileData, verificationId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!fileType || !fileData) {
      return NextResponse.json(
        { error: "File type and data are required" },
        { status: 400 }
      );
    }

    // Generate or use provided verification ID
    const currentVerificationId = verificationId || uuidv4();
    
    // Upload file to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileBuffer = Buffer.from(fileData.data, "base64");
    const fileName = `${userId}/${fileType}/${Date.now()}-${fileData.name}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: fileData.type,
      },
    });

    // Make the file publicly accessible
    await fileRef.makePublic();

    // Get the public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Update verification document if it exists, or create a new placeholder
    const verificationRef = adminDb
      .collection("creator_verifications")
      .doc(currentVerificationId);
    
    // Check if doc exists first
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

    return NextResponse.json(
      {
        success: true,
        message: `${fileType} uploaded successfully`,
        verificationId: currentVerificationId,
        fileUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error uploading file:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload file";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}