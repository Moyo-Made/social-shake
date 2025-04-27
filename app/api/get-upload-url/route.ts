import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId, fileType, fileExt, folder } = await request.json();
    
    if (!userId || !fileType || !folder) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    const filename = `${userId}/${folder}/${Date.now()}-${uuidv4()}.${fileExt || 'file'}`;
    
    // Get a reference to the bucket
    const bucket = adminStorage.bucket();
    const file = bucket.file(filename);
    
    // Create a signed URL for direct upload
    // Expiration time set to 15 minutes
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });
    
    // Also generate a read URL that will be valid after upload
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Return both URLs and the file path
    return NextResponse.json({
      uploadUrl: signedUrl,
      downloadUrl,
      filePath: filename,
      success: true
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL", details: error },
      { status: 500 }
    );
  }
}