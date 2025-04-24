import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";

// Initialize storage if not already initialized
const storage = getStorage();
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const bucket = storage.bucket(bucketName);

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Verify the user exists in Auth system
    try {
      await adminAuth.getUser(userId);
    } catch (error) {
      console.error("Error verifying user:", error);
      return NextResponse.json(
        { error: "Invalid user ID. Please sign in again." },
        { status: 401 }
      );
    }
    
    // Get file data as array buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `contest_uploads/${userId}/${uuidv4()}.${fileExtension}`;
    
    // Upload to Firebase Storage
    const fileRef = bucket.file(fileName);
    await fileRef.save(Buffer.from(fileBuffer));
    
    // Make the file publicly accessible
    await fileRef.makePublic();
    
    // Get the public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    return NextResponse.json({
      success: true,
      fileUrl: fileUrl
    });
    
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}