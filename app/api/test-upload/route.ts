
import { NextRequest, NextResponse } from "next/server";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/config/firebase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;

    if (!file) {
      console.error("No file provided in the request");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Get file content as ArrayBuffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file to Firebase Storage
    const storage = getStorage(app);
    const fileExtension = file.name.split(".").pop() || "jpg"; 
    const sanitizedEmail = email.replace(/[.#$[\]]/g, "_");
    const fileName = `logos/${sanitizedEmail}-${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Determine content type
    const contentType = file.type || 
      (fileExtension.toLowerCase() === "png" ? "image/png" : 
       (fileExtension.toLowerCase() === "jpg" || fileExtension.toLowerCase() === "jpeg") ? 
       "image/jpeg" : "application/octet-stream");

    // Upload the file
    await uploadBytes(storageRef, buffer, {
      contentType: contentType,
    });

    // Get the download URL
    const logoUrl = await getDownloadURL(storageRef);

    // Return success with the logoUrl
    return NextResponse.json({
      logoUrl: logoUrl,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Return a properly formatted error response
    return NextResponse.json({
      error: "Failed to upload file",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
}