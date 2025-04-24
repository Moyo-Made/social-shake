import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage, adminAuth } from "@/config/firebase-admin";

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
    let userId = searchParams.get("userId");
    const email = searchParams.get("email");

    console.log("Received query for creator profile lookup:", {
      profileId,
      userId,
      email,
    });

    // If profileId is provided directly, we can look it up across all users
    if (profileId) {
      // First try to find the profile using a query across all users
      const profilesQuery = await adminDb
        .collectionGroup("creatorProfiles")
        .where("profileId", "==", profileId)
        .limit(1)
        .get();

      if (!profilesQuery.empty) {
        const profileData = profilesQuery.docs[0].data();
        console.log("Retrieved creator profile data:", profileData);
        return NextResponse.json(profileData);
      }

      console.warn(`No creator profile found for profileId: ${profileId}`);
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // If only userId is provided (no email)
    if (userId && !email) {
      // Query the creatorProfiles collection for documents where userId matches
      const creatorProfilesQuery = await adminDb
        .collection("creatorProfiles")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!creatorProfilesQuery.empty) {
        const profileData = creatorProfilesQuery.docs[0].data();
        console.log("Retrieved creator profile data by userId:", profileData);
        return NextResponse.json(profileData);
      }

      console.warn(`No creator profile found for userId: ${userId}`);
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // If email is provided but no userId, we need to find the associated userId first
    if (email && !userId) {
      console.log("Looking up user by email:", email);
      const userQuery = await adminDb
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (userQuery.empty) {
        // Try Auth system as fallback
        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          userId = userRecord.uid;
        } catch {
          console.warn(`No user found for email: ${email}`);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
      } else {
        userId = userQuery.docs[0].id;
      }
    }

    // If we still have no userId at this point, return an error
    if (!userId) {
      console.warn("No userId available for creator profile lookup");
      return NextResponse.json(
        { error: "UserID or email is required" },
        { status: 400 }
      );
    }

    // If we have both email and userId, try to get the profile by email first
    if (email) {
      const creatorRef = adminDb.collection("creatorProfiles").doc(email);
      const docSnap = await creatorRef.get();
      
      if (docSnap.exists) {
        const profileData = {
          id: docSnap.id,
          ...docSnap.data(),
          email: email,
        };
        console.log("Retrieved creator profile data by email:", profileData);
        return NextResponse.json(profileData);
      }
    }

    // If we couldn't find by email or no email was provided, try by userId
    const creatorProfilesQuery = await adminDb
      .collection("creatorProfiles")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!creatorProfilesQuery.empty) {
      const profileData = creatorProfilesQuery.docs[0].data();
      console.log("Retrieved creator profile data by userId fallback:", profileData);
      return NextResponse.json(profileData);
    }

    console.warn(`No creator profile found for userId: ${userId}`);
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