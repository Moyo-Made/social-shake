import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    // Handle both form data and JSON requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: Record<string, any>;
    let imageFile: File | null = null;
    
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle form data submission with possible file upload
      const formData = await request.formData();
      imageFile = formData.get("profileImage") as File | null;
      
      data = {};
      formData.forEach((value, key) => {
        if (key !== "profileImage" && typeof value === "string") {
          data[key] = value;
        }
      });
    } else {
      // Handle JSON submission
      data = await request.json();
    }

    const { email } = data;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Using Admin SDK for Firestore operations
    const creatorRef = adminDb.collection("creatorProfiles").doc(email);
    const docSnap = await creatorRef.get();

    interface ProfileData {
      [key: string]: string | number | boolean | null | undefined;
      userType: string;
      updatedAt: string;
      createdAt: string;
      profileImageUrl?: string;
      imageUploadError?: string;
    }

    const profileData: ProfileData = {
      ...data,
      userType: "creator",
      updatedAt: new Date().toISOString(),
      createdAt: docSnap.exists
        ? docSnap.data()?.createdAt
        : new Date().toISOString(),
    };

    // Handle image upload if file exists
    if (imageFile && imageFile.size > 0) {
      try {
        console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);
        
        // Check if the file is actually an image
        if (!imageFile.type.startsWith('image/')) {
          throw new Error(`Invalid file type: ${imageFile.type}. Only images are accepted.`);
        }
        
        // Get buffer from File object
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        if (buffer.length === 0) {
          throw new Error('File buffer is empty');
        }
        
        // Use a simpler file path with fewer special characters
        const timestamp = Date.now();
        const fileExtension = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}.${fileExtension}`;
        const filePath = `creator-images/${email}/${fileName}`;
        
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
        
        profileData.profileImageUrl = publicUrl;
      } catch (uploadError: unknown) {
        console.error('Image upload error details:', uploadError);
        if (uploadError instanceof Error) {
          console.error('Error message:', uploadError.message);
          console.error('Error stack:', uploadError.stack);
        } else {
          console.error('Unknown upload error:', uploadError);
        }
        
        // Add the error to profileData but continue with the rest of the request
        profileData.imageUploadError = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      }
    }

    // Save to Firestore regardless of image upload result
    await creatorRef.set(profileData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Creator profile saved successfully",
      data: profileData,
    });
  } catch (error: unknown) {
    console.error("Error saving creator profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save creator profile";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    let tiktokId = searchParams.get("tiktokId");

    console.log("Received query for creator profile lookup:", {
      profileId,
      userId,
      email,
      tiktokId
    });

    // Handle TikTok provider format in userId (e.g. tiktok:12345)
    if (userId && userId.includes(':')) {
      const [provider, providerId] = userId.split(':');
      console.log(`Detected provider format in userId: ${provider}:${providerId}`);
      
      if (provider === 'tiktok') {
        // Store the extracted TikTok ID
        tiktokId = providerId;
        console.log(`Extracted TikTok ID from userId: ${tiktokId}`);
      }
    }

    // 1. First try checking for the full userId as it is, including provider prefix
    if (userId) {
      console.log(`Checking for creator profile with full userId: ${userId}`);
      const userIdQuery = await adminDb
        .collection("creatorProfiles")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!userIdQuery.empty) {
        const profileData = userIdQuery.docs[0].data();
        console.log("Found creator profile using full userId:", profileData);
        return NextResponse.json(profileData);
      }
    }

    // 2. Try by TikTok ID if available
    if (tiktokId) {
      console.log(`Checking for creator profile with tiktokId: ${tiktokId}`);
      const tiktokQuery = await adminDb
        .collection("creatorProfiles")
        .where("tiktokId", "==", tiktokId)
        .limit(1)
        .get();

      if (!tiktokQuery.empty) {
        const profileData = tiktokQuery.docs[0].data();
        console.log("Found creator profile using tiktokId:", profileData);
        return NextResponse.json(profileData);
      }
    }

    // 3. If we have a provider prefix and no profile found yet, try more combinations
    if (userId && userId.includes(':')) {
      const [provider, providerId] = userId.split(':');
      
      // Try the provider ID directly (without prefix)
      console.log(`Checking for creator profile with providerId: ${providerId}`);
      const providerIdQuery = await adminDb
        .collection("creatorProfiles")
        .where("userId", "==", providerId)
        .limit(1)
        .get();

      if (!providerIdQuery.empty) {
        const profileData = providerIdQuery.docs[0].data();
        console.log("Found creator profile using providerId as userId:", profileData);
        return NextResponse.json(profileData);
      }

      // For TikTok specifically, also try "provider" + "Id" fields
      if (provider === 'tiktok') {
        // Try the provider field approach
        console.log(`Checking with ${provider}Id field (tiktokId): ${providerId}`);
        const providerFieldQuery = await adminDb
          .collection("creatorProfiles")
          .where(`${provider}Id`, "==", providerId)
          .limit(1)
          .get();

        if (!providerFieldQuery.empty) {
          const profileData = providerFieldQuery.docs[0].data();
          console.log(`Found creator profile using ${provider}Id field:`, profileData);
          return NextResponse.json(profileData);
        }
      }
    }

    // 4. If profile by ID still not found, try by profileId if provided
    if (profileId) {
      console.log(`Checking for creator profile with profileId: ${profileId}`);
      const profilesQuery = await adminDb
        .collectionGroup("creatorProfiles")
        .where("profileId", "==", profileId)
        .limit(1)
        .get();

      if (!profilesQuery.empty) {
        const profileData = profilesQuery.docs[0].data();
        console.log("Found creator profile using profileId:", profileData);
        return NextResponse.json(profileData);
      }
    }

    // 5. Try by email if available
    if (email) {
      console.log(`Checking for creator profile with email: ${email}`);
      const creatorRef = adminDb.collection("creatorProfiles").doc(email);
      const docSnap = await creatorRef.get();
      
      if (docSnap.exists) {
        const profileData = {
          id: docSnap.id,
          ...docSnap.data(),
          email: email,
        };
        console.log("Found creator profile using email as document ID:", profileData);
        return NextResponse.json(profileData);
      }

      // Also try email as a field
      const emailQuery = await adminDb
        .collection("creatorProfiles")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const profileData = emailQuery.docs[0].data();
        console.log("Found creator profile using email field:", profileData);
        return NextResponse.json(profileData);
      }
    }

    // If we're here, we couldn't find the profile with any method
    console.warn("No creator profile found with any of the provided identifiers");
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Detailed error fetching creator profile:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch creator profile",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { email } = data;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Using Admin SDK for Firestore operations
    const creatorRef = adminDb.collection("creatorProfiles").doc(email);
    const docSnap = await creatorRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    // Clean the received data to prevent field duplication
    const { socialLinks, ...otherData } = data;
    
    // Remove any dot-notation socialLinks fields if they exist
    const cleanedData = Object.keys(otherData).reduce((acc, key) => {
      if (!key.startsWith('socialLinks.')) {
        acc[key] = otherData[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
    
    // Create a clean update object
    const updateData = {
      ...cleanedData,
      socialLinks: socialLinks || {},  // Ensure it's an object
      updatedAt: new Date().toISOString()
    };

    // Update the document
    await creatorRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Creator profile updated successfully",
      data: updateData
    });
  } catch (error) {
    console.error("Error updating creator profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update creator profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}