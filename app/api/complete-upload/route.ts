import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { verificationId, userId, fileType, uploadPath } = await request.json();

    if (!verificationId || !userId || !fileType || !uploadPath) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Map file type to URL field name
    const urlFieldMap: Record<string, string> = {
      "verificationVideo": "verificationVideoUrl",
      "verifiableID": "verifiableIDUrl",
      "profilePicture": "profilePictureUrl"
    };
    
    const urlField = urlFieldMap[fileType] || `${fileType}Url`;

    // Make the file public
    if (!adminStorage) {
      throw new Error("Firebase admin storage is not initialized");
    }
    const bucket = adminStorage.bucket();
    const file = bucket.file(uploadPath);
    await file.makePublic();

    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${uploadPath}`;

    // Update verification document
    if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
    const verificationRef = adminDb
      .collection("creator_verifications")
      .doc(verificationId);
    
    const doc = await verificationRef.get();
    
    if (doc.exists) {
      await verificationRef.update({
        [urlField]: fileUrl,
        updatedAt: new Date(),
      });
    } else {
      await verificationRef.set({
        createdAt: new Date(),
        status: "incomplete",
        userId,
        [urlField]: fileUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${fileType} upload completed`,
      fileUrl,
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to complete upload" 
    }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}