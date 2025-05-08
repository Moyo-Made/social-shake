import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

// Increase the body size limit to 50MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON request body
    const body = await request.json();
    const {
      userId,
      profileData,
      verificationVideo,
      verifiableID,
      profilePicture,
    } = body;

    console.log("Received submission with files:", {
      hasVideo: !!verificationVideo,
      hasID: !!verifiableID,
      hasProfilePic: !!profilePicture
    });

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse the profile data if it's a string
    const parsedProfileData =
      typeof profileData === "string" ? JSON.parse(profileData) : profileData;

    // Create a unique ID for this verification submission
    const verificationId = uuidv4();

    // Reference to verification document
    const verificationRef = adminDb
      .collection("creator_verifications")
      .doc(verificationId);

    // Upload files to Firebase Storage
    const fileUrls: Record<string, string> = {};
    const bucket = adminStorage.bucket();

    // Function to handle file uploads with better error handling and logging
    const uploadFile = async (
      fileData: { data: string; name: string; type: string } | null | undefined,
      folder: string
    ): Promise<string | null> => {
      if (!fileData || !fileData.data) {
        console.log(`No file data provided for ${folder}`);
        return null;
      }

      try {
        console.log(`Processing ${folder} file: ${fileData.name}, type: ${fileData.type}`);
        
        // Verify the base64 string is valid
        if (!fileData.data.match(/^data:.*;base64,/)) {
          // If it's not a data URL, assume it's already base64
          if (!fileData.data.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
            console.error(`Invalid base64 data for ${folder}`);
            return null;
          }
        } else {
          // Extract the base64 data from a data URL
          fileData.data = fileData.data.split(',')[1];
        }

        const fileBuffer = Buffer.from(fileData.data, "base64");
        
        // Validate the buffer has actual content
        if (fileBuffer.length === 0) {
          console.error(`Empty file buffer for ${folder}`);
          return null;
        }
        
        const fileName = `${userId}/${folder}/${Date.now()}-${fileData.name}`;
        const fileRef = bucket.file(fileName);

        console.log(`Uploading ${folder} file to path: ${fileName}`);
        
        await fileRef.save(fileBuffer, {
          metadata: {
            contentType: fileData.type,
          },
        });

        // Make the file publicly accessible
        await fileRef.makePublic();

        // Get the public URL
        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log(`Successfully uploaded ${folder} file: ${url}`);
        return url;
      } catch (error) {
        console.error(`Error uploading ${folder} file:`, error);
        return null;
      }
    };

    // Upload verification video if present
    if (verificationVideo) {
      const videoUrl = await uploadFile(
        verificationVideo,
        "verification_videos"
      );
      if (videoUrl) fileUrls.verificationVideoUrl = videoUrl;
    }

    // Upload ID if present
    if (verifiableID) {
      const idUrl = await uploadFile(verifiableID, "ids");
      if (idUrl) fileUrls.verifiableIDUrl = idUrl;
    }

    // Upload profile picture if present
    if (profilePicture) {
      const pictureUrl = await uploadFile(profilePicture, "profile_pictures");
      if (pictureUrl) fileUrls.profilePictureUrl = pictureUrl;
    }

    console.log("File URLs after upload:", fileUrls);

    // Create verification document in Firestore
    await verificationRef.set({
      createdAt: FieldValue.serverTimestamp(),
      status: "pending", // Initial status
      userId,
      ...fileUrls,
      profileData: parsedProfileData,
    });
    
    // Update user record using userId
    await adminDb.collection("creatorProfiles").doc(userId).set({
      verificationStatus: "pending",
      verificationId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json(
      {
        success: true,
        message: "Verification submitted successfully",
        verificationId,
        fileUrls, // Return the file URLs for confirmation
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting verification:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Failed to submit verification";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
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