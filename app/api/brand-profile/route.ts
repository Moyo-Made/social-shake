import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("logo") as File | null;
    const email = formData.get("email") as string;

    const formDataObj: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (key !== "logo" && typeof value === "string") {
        formDataObj[key] = value;
      }
    });

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Using Admin SDK for Firestore operations
    const brandRef = adminDb.collection("brandProfiles").doc(email);
    const docSnap = await brandRef.get();

    const profileData: Record<string, string | number | boolean | null> = {
      ...formDataObj,
      updatedAt: new Date().toISOString(),
      createdAt: docSnap.exists
        ? docSnap.data()?.createdAt
        : new Date().toISOString(),
    };

    // Handle image upload if file exists
    if (imageFile && imageFile.size > 0) {
      try {
        console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);
        
        // Check if the file is actually an image by examining its type
        if (!imageFile.type.startsWith('image/')) {
          throw new Error(`Invalid file type: ${imageFile.type}. Only images are accepted.`);
        }
        
        // Get buffer from File object
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        if (buffer.length === 0) {
          throw new Error('File buffer is empty');
        }
        
        console.log(`Buffer created successfully, size: ${buffer.length} bytes`);
        
        // Use a simpler file path with fewer special characters
        const timestamp = Date.now();
        const fileExtension = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}.${fileExtension}`;
        const filePath = `brand-images/${email}/${fileName}`;
        
        // Get bucket and create file reference
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(filePath);
        
        // Upload with simplified options
        await new Promise((resolve, reject) => {
          const blobStream = fileRef.createWriteStream({
            metadata: {
              contentType: imageFile.type,
            },
            resumable: false
          });
          
          blobStream.on('error', (error) => {
            console.error('Stream error:', error);
            reject(error);
          });
          
          blobStream.on('finish', () => {
            console.log('Upload stream finished');
            resolve(true);
          });
          
          blobStream.end(buffer);
        });
        
        // Make the file public
        await fileRef.makePublic();
        
        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        console.log(`File uploaded successfully. URL: ${publicUrl}`);
        
        profileData.logoUrl = publicUrl;
      } catch (uploadError: unknown) {
        console.error('Image upload error details:', uploadError);
        if (uploadError instanceof Error) {
          console.error('Error message:', uploadError.message);
          console.error('Error stack:', uploadError.stack);
        } else {
          console.error('Unknown upload error:', uploadError);
        }
        
        // Add the error to profileData but continue with the rest of the request
        profileData.logoUploadError = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      }
    } else if (imageFile) {
      console.warn('Image file provided but has zero size');
      profileData.logoUploadError = 'Empty file provided';
    }

    // Save to Firestore regardless of image upload result
    await brandRef.set(profileData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Brand profile saved successfully",
      data: profileData,
    });
  } catch (error: unknown) {
    console.error("Error saving brand profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save brand profile";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Your existing GET implementation remains unchanged
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Using Admin SDK for Firestore
    const brandRef = adminDb.collection("brandProfiles").doc(email);
    const docSnap = await brandRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(docSnap.data());
  } catch (error) {
    console.error("Error fetching brand profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand profile" },
      { status: 500 }
    );
  }
}