import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid"; // For unique file naming

/**
 * Profile picture upload handler
 * This is a dedicated endpoint for handling profile picture uploads
 */
export async function POST(request: NextRequest) {
  try {
    // Get formData from the request
    const formData = await request.formData();
    const logo = formData.get("logo") as File | null;
    const email = formData.get("email") as string;
    
    // Validate inputs
    if (!logo || !email) {
      return NextResponse.json(
        { error: "Logo file and email are required" },
        { status: 400 }
      );
    }

    // Check if the file is actually an image
    if (!logo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Invalid file type: ${logo.type}. Only images are accepted.` },
        { status: 400 }
      );
    }

    let downloadUrl = '';
    
    try {
      console.log(`Processing image: ${logo.name}, size: ${logo.size} bytes`);
      
      // Get buffer from File object
      const arrayBuffer = await logo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length === 0) {
        throw new Error('File buffer is empty');
      }
      
      // Create a unique file path with minimal special characters
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8); // Use a portion of UUID for brevity
      const fileExtension = logo.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}-${uniqueId}.${fileExtension}`;
      const filePath = `creator-logos/${email}/${fileName}`;
      
      // Get bucket and create file reference
      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(filePath);
      
      // Upload with write stream for better reliability
      await new Promise<void>((resolve, reject) => {
        const blobStream = fileRef.createWriteStream({
          metadata: {
            contentType: logo.type,
            metadata: {
              userEmail: email,
              uploadedAt: new Date().toISOString()
            }
          },
          resumable: false
        });
        
        blobStream.on('error', (error) => {
          console.error('Stream error:', error);
          reject(error);
        });
        
        blobStream.on('finish', () => {
          console.log('Upload stream finished successfully');
          resolve();
        });
        
        blobStream.end(buffer);
      });
      
      // Make the file public
      await fileRef.makePublic();
      
      // Get the public URL
      downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      console.log(`File uploaded successfully. URL: ${downloadUrl}`);
      
    } catch (uploadError: unknown) {
      console.error('Image upload error details:', uploadError);
      if (uploadError instanceof Error) {
        console.error('Error message:', uploadError.message);
        console.error('Error stack:', uploadError.stack);
      } else {
        console.error('Unknown upload error:', uploadError);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to upload image", 
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    // Update both collections with the new logo URL
    try {
      // 1. Update creatorProfiles collection
      await adminDb.collection("creatorProfiles").doc(email).update({
        logoUrl: downloadUrl,
        profilePictureUrl: downloadUrl,  // Update both field names for consistency
        updatedAt: new Date().toISOString()
      });
      
      // 2. Find and update the latest verification document
      const verificationSnapshot = await adminDb.collection("creator_verifications")
        .where("profileData.email", "==", email)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
        
      if (!verificationSnapshot.empty) {
        const verificationDoc = verificationSnapshot.docs[0];
        await verificationDoc.ref.update({
          "profileData.logoUrl": downloadUrl,
          "profileData.profilePictureUrl": downloadUrl,
          "logoUrl": downloadUrl,
          "profilePictureUrl": downloadUrl
        });
      }
      
      // Optional: Store a mapping between the file and user for admin purposes
      await adminDb.collection("profilePictureMappings").add({
        userEmail: email,
        downloadUrl: downloadUrl,
        uploadedAt: new Date().toISOString()
      });
    } catch (dbError: unknown) {
      console.error('Database update error:', dbError);
      // Even if DB update fails, we still return success with the URL
      // since the file was uploaded successfully
    }
    
    return NextResponse.json({ 
      success: true, 
      logoUrl: downloadUrl 
    });
  } catch (error: unknown) {
    console.error("Error handling profile picture upload:", error);
    return NextResponse.json(
      { 
        error: "Failed to process profile picture",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// This is used to disable the default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};