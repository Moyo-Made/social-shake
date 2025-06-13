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
            resolve(true);
          });
          
          blobStream.end(buffer);
        });
        
        // Make the file public
        await fileRef.makePublic();
        
        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
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

    // Handle TikTok provider format in userId (e.g. tiktok:12345)
    if (userId && userId.includes(':')) {
      const [provider, providerId] = userId.split(':');
      
      if (provider === 'tiktok') {
        // Store the extracted TikTok ID
        tiktokId = providerId;
      }
    }

    // Initialize profileData and creatorEmail for later use with verification data
    let profileData: { [key: string]: unknown; email?: string } = {};
    let creatorEmail = email; // Initial value is the email parameter
    let creatorUserId = userId; // Store userId for verification lookup

    // 1. First try checking for the full userId as it is, including provider prefix
    if (userId) {
      const userIdQuery = await adminDb
        .collection("creatorProfiles")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!userIdQuery.empty) {
        profileData = userIdQuery.docs[0].data();
        // Save email for verification lookup
        if (profileData.email) creatorEmail = profileData.email as string;
      }
    }

    // 2. Try by TikTok ID if available and profile not found yet
    if (tiktokId && Object.keys(profileData).length === 0) {
      const tiktokQuery = await adminDb
        .collection("creatorProfiles")
        .where("tiktokId", "==", tiktokId)
        .limit(1)
        .get();

      if (!tiktokQuery.empty) {
        profileData = tiktokQuery.docs[0].data();
        // Save email for verification lookup
        if (profileData.email) creatorEmail = profileData.email as string;
        if (profileData.userId) creatorUserId = profileData.userId as string;
      }
    }

    // 3. If we have a provider prefix and no profile found yet, try more combinations
    if (userId && userId.includes(':') && Object.keys(profileData).length === 0) {
      const [provider, providerId] = userId.split(':');
      
      // Try the provider ID directly (without prefix)
      const providerIdQuery = await adminDb
        .collection("creatorProfiles")
        .where("userId", "==", providerId)
        .limit(1)
        .get();

      if (!providerIdQuery.empty) {
        profileData = providerIdQuery.docs[0].data();
        // Save email for verification lookup
        if (profileData.email) creatorEmail = profileData.email as string;
      }

      // For TikTok specifically, also try "provider" + "Id" fields
      if (provider === 'tiktok' && Object.keys(profileData).length === 0) {
        // Try the provider field approach
        const providerFieldQuery = await adminDb
          .collection("creatorProfiles")
          .where(`${provider}Id`, "==", providerId)
          .limit(1)
          .get();

        if (!providerFieldQuery.empty) {
          profileData = providerFieldQuery.docs[0].data();
          // Save email for verification lookup
          if (profileData.email) creatorEmail = profileData.email as string;
          if (profileData.userId) creatorUserId = profileData.userId as string;
        }
      }
    }

    // 4. If profile by ID still not found, try by profileId if provided
    if (profileId && Object.keys(profileData).length === 0) {
      const profilesQuery = await adminDb
        .collectionGroup("creatorProfiles")
        .where("profileId", "==", profileId)
        .limit(1)
        .get();

      if (!profilesQuery.empty) {
        profileData = profilesQuery.docs[0].data();
        // Save email for verification lookup
        if (profileData.email) creatorEmail = profileData.email as string;
        if (profileData.userId) creatorUserId = profileData.userId as string;
      }
    }

    // 5. Try by email if available and profile not found yet
    if (email && Object.keys(profileData).length === 0) {
      const creatorRef = adminDb.collection("creatorProfiles").doc(email);
      const docSnap = await creatorRef.get();
      
      if (docSnap.exists) {
        profileData = {
          id: docSnap.id,
          ...docSnap.data(),
          email: email,
        };
        // Save email for verification lookup
        creatorEmail = email;
        if (profileData.userId) creatorUserId = profileData.userId as string;
      } else {
        // Also try email as a field
        const emailQuery = await adminDb
          .collection("creatorProfiles")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!emailQuery.empty) {
          profileData = emailQuery.docs[0].data();
          // Save email for verification lookup
          creatorEmail = email;
          if (profileData.userId) creatorUserId = profileData.userId as string;
        }
      }
    }

    // If we didn't find a profile with any method
    if (Object.keys(profileData).length === 0) {
      console.warn("No creator profile found with any of the provided identifiers");
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // 6. Fetch verification data now that we have found a profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let verificationData: { [key: string]: any } = {};
    
    // Try to find verification by email first (most reliable)
    if (creatorEmail) {
      
      // Get the most recent verification document
      const verificationByEmailSnapshot = await adminDb.collection("creator_verifications")
        .where("profileData.email", "==", creatorEmail)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      
      if (!verificationByEmailSnapshot.empty) {
        const verificationDoc = verificationByEmailSnapshot.docs[0];
        verificationData = verificationDoc.data();
        verificationData.id = verificationDoc.id;
      }
    }
    
    // If no verification found by email but we have userId, try that next
    if (Object.keys(verificationData).length === 0 && creatorUserId) {
      
      const verificationByUserIdSnapshot = await adminDb.collection("creator_verifications")
        .where("userId", "==", creatorUserId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      
      if (!verificationByUserIdSnapshot.empty) {
        const verificationDoc = verificationByUserIdSnapshot.docs[0];
        verificationData = verificationDoc.data();
        verificationData.id = verificationDoc.id;
      }
    }

    // Create comprehensive merged response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mergedResponse: { [key: string]: any } = {
      ...profileData,
    };

    // Add verification fields if found
    if (Object.keys(verificationData).length > 0) {
      // Extract all verification specific fields
      const {
        status,
        createdAt,
        updatedAt,
        profilePictureUrl,
        verificationVideoUrl,
        verifiableIDUrl,
        logoUrl,
        notes,
        adminNotes,
        // Exclude profileData to avoid overwriting our main profile data with potentially older data
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        profileData: _profileData,
        ...otherVerificationFields
      } = verificationData;

      // Include verification status and ID
      mergedResponse = {
        ...mergedResponse,
        verificationStatus: status || "pending",
        verificationId: verificationData.id,
        verificationCreatedAt: createdAt || null,
        verificationUpdatedAt: updatedAt || null,
      };

      // Include media URLs from verification
      if (profilePictureUrl) mergedResponse.profilePictureUrl = profilePictureUrl;
      if (verificationVideoUrl) mergedResponse.verificationVideoUrl = verificationVideoUrl;
      if (verifiableIDUrl) mergedResponse.verifiableIDUrl = verifiableIDUrl;
      if (logoUrl) mergedResponse.logoUrl = logoUrl;
      
      // Include notes
      if (notes) mergedResponse.verificationNotes = notes;
      if (adminNotes) mergedResponse.adminNotes = adminNotes;
      
      // Include any other verification fields not explicitly handled
      mergedResponse = {
        ...mergedResponse,
        ...otherVerificationFields
      };
      
      // Only selectively use profileData from verification if needed
      if (verificationData.profileData) {
        // If there are missing fields in our main profile data but present in verification.profileData,
        // we can use those as fallbacks
        for (const [key, value] of Object.entries(verificationData.profileData)) {
          if (mergedResponse[key] === undefined && value !== undefined) {
            mergedResponse[key] = value;
          }
        }
      }
    } else {
      mergedResponse.verificationStatus = "not_submitted";
    }
    
    
    return NextResponse.json(mergedResponse);
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

/**
 * Profile update handler for creator profiles
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, ...updatedFields } = data;
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Update creatorProfiles collection first
    await adminDb.collection("creatorProfiles").doc(email).update({
      ...updatedFields,
      updatedAt: new Date()
    });
    
    // Find the latest verification document if it exists and update relevant fields
    // This ensures data consistency between collections
    const verificationSnapshot = await adminDb.collection("creator_verifications")
      .where("profileData.email", "==", email)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
      
    if (!verificationSnapshot.empty) {
      const verificationDoc = verificationSnapshot.docs[0];
      
      // Update only relevant fields in profileData
      const profileDataUpdates = {
        firstName: updatedFields.firstName,
        lastName: updatedFields.lastName,
        bio: updatedFields.bio,
        username: updatedFields.username,
        country: updatedFields.country,
        gender: updatedFields.gender,
        ethnicity: updatedFields.ethnicity,
        dateOfBirth: updatedFields.dateOfBirth,
        contentTypes: updatedFields.contentTypes,
        contentLinks: updatedFields.contentLinks,
        socialMedia: updatedFields.socialMedia,
        pricing: updatedFields.pricing
      };
      
      // Filter out undefined values
      const filteredUpdates = Object.entries(profileDataUpdates)
        .filter(([, value]) => value !== undefined)
        .reduce((obj: Record<string, unknown>, [key, value]) => {
          obj[`profileData.${key}`] = value;
          return obj;
        }, {} as Record<string, unknown>);
        
      // Only update if we have fields to update
      if (Object.keys(filteredUpdates).length > 0) {
        await verificationDoc.ref.update(filteredUpdates);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating creator profile:", error);
    return NextResponse.json(
      { 
        error: "Failed to update creator profile",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}