import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

async function processThumbnail(
  thumbnail: File | null,
  contestId: string,
  userId: string,
  existingThumbnail?: string | null
): Promise<string | null> {
  // If no new thumbnail is provided, return the existing thumbnail
  if (!thumbnail || thumbnail.size === 0) {
    return existingThumbnail || null; 
  }

  try {
    console.log(`Processing thumbnail: ${thumbnail.name}, size: ${thumbnail.size} bytes`);
    
    // Check if the file is actually an image
    if (!thumbnail.type.startsWith('image/')) {
      throw new Error(`Invalid file type: ${thumbnail.type}. Only images are accepted.`);
    }
    
    // Get buffer from File object
    const arrayBuffer = await thumbnail.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      throw new Error('File buffer is empty');
    }
    
    const timestamp = Date.now();
    const fileExtension = thumbnail.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}.${fileExtension}`;
    const filePath = `contest-images/${userId}/${contestId}/${fileName}`;
    
    // Get bucket and create file reference
    const bucket = adminStorage.bucket();
    console.log('Storage bucket details:', adminStorage.bucket().name);
    const fileRef = bucket.file(filePath);
    
    // Upload file
    await new Promise<void>((resolve, reject) => {
      const blobStream = fileRef.createWriteStream({
        metadata: {
          contentType: thumbnail.type,
        },
        resumable: false
      });
      
      blobStream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
      
      blobStream.on('finish', () => {
        console.log('Upload stream finished');
        resolve();
      });
      
      // Send the buffer through the stream and end it
      blobStream.end(buffer);
    });
    
    // Make the file public
    await fileRef.makePublic();
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`Thumbnail uploaded successfully. URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error("Error processing thumbnail:", error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return existingThumbnail || null;
  }
}

// GET handler to retrieve a specific draft
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const contestId = url.searchParams.get('contestId');
    
    if (!userId && !contestId) {
      return NextResponse.json(
        { error: "Either userId or contestId is required" },
        { status: 400 }
      );
    }
    
    let docRef;
    
    if (contestId) {
      // Get a complete contest
      docRef = adminDb.collection("contests").doc(contestId);
    } else {
      // Get a user's draft
      docRef = adminDb.collection("contestDrafts").doc(userId as string);
    }
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: "No draft found", exists: false },
        { status: 404 }
      );
    }
    
    const data = doc.data();
    
    return NextResponse.json({
      success: true,
      exists: true,
      data: data,
    });
  } catch (error) {
    console.error("Error retrieving draft:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve draft",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST handler with improved type annotations
export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get('content-type') || '';
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data submission
      const formData = await request.formData();
      thumbnailFile = formData.get("thumbnail") as File | null;
      
      // Extract other form fields
      formData.forEach((value, key) => {
        if (key !== "thumbnail" && typeof value === "string") {
          // Parse nested JSON objects if they exist
          try {
            if (key === "basic" || key === "requirements" || key === "prizeTimeline" || 
                key === "contestType" || key === "incentives") {
              requestData[key] = JSON.parse(value);
            } else {
              requestData[key] = value;
            }
          } catch {
            requestData[key] = value;
          }
        }
      });
    } else {
      // Handle JSON submission (without file)
      requestData = await request.json();
    }
    
    const {
      basic = {},
      requirements = {},
      prizeTimeline = {},
      contestType = {},
      incentives = {},
      userId, // Changed from brandEmail to userId
      isDraft
    } = requestData;

    // Check if userId is provided
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if this is a draft save or a final submission
    if (isDraft) {
      // Saving progress - store in contestDrafts collection
      // Format the draft data
      const draftData = {
        basic,
        requirements,
        prizeTimeline,
        contestType,
        incentives,
        userId, // Storing userId instead of brandEmail
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb.collection("contestDrafts").doc(userId).set(draftData);

      return NextResponse.json({
        success: true,
        message: "Draft saved successfully",
        data: draftData,
      });
    } else {
      // Final submission - validate required fields
      if (!basic.contestName) {
        return NextResponse.json(
          { error: "Contest name is required" },
          { status: 400 }
        );
      }

      // Generate a unique contestId if not provided
      const contestId =
        requestData.contestId ||
        `contest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Check if the contest already exists
      const contestDoc = await adminDb
        .collection("contests")
        .doc(contestId)
        .get();

      if (contestDoc.exists) {
        return NextResponse.json(
          { error: "Contest with this ID already exists" },
          { status: 409 }
        );
      }

      // Process the thumbnail
      let thumbnailUrl: string | null = null;

      if (thumbnailFile) {
        // Existing File upload logic
        thumbnailUrl = await processThumbnail(thumbnailFile, contestId, userId);
      } else if (basic.thumbnail && typeof basic.thumbnail === "string") {
        // Handle base64 or existing URL
        if (basic.thumbnail.startsWith("data:")) {
          // Convert base64 to file upload
          const imageBuffer = Buffer.from(
            basic.thumbnail.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
          );
      
          const bucket = adminStorage.bucket();
          const timestamp = Date.now();
          const filePath = `contest-images/${userId}/${contestId}/${timestamp}.jpg`;
          const file = bucket.file(filePath);
      
          await file.save(imageBuffer, {
            metadata: {
              contentType: "image/jpeg",
            },
          });
      
          await file.makePublic();
          thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        } else {
          // If it's already a valid URL, use it directly
          thumbnailUrl = basic.thumbnail;
        }
      }
      // Format dates
      const startDate = prizeTimeline.startDate
        ? new Date(prizeTimeline.startDate).toISOString()
        : null;
      const endDate = prizeTimeline.endDate
        ? new Date(prizeTimeline.endDate).toISOString()
        : null;

      // Create the complete contest data object
      const contestData = {
        userId, // Changed from brandEmail to userId
        contestId,
        basic: {
          ...basic,
          thumbnail: thumbnailUrl,
        },
        requirements,
        prizeTimeline: {
          ...prizeTimeline,
          startDate,
          endDate,
        },
        contestType,
        incentives,
        status: "active",
        participants: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb.collection("contests").doc(contestId).set(contestData);

      // If a user ID was provided, update the draft after successful submission
      await adminDb
        .collection("contestDrafts")
        .doc(userId)
        .set({ submitted: true, contestId });

      return NextResponse.json({
        success: true,
        message: "Contest created successfully",
        data: contestData,
      });
    }
  } catch (error) {
    console.error("Error handling contest:", error);
    return NextResponse.json(
      {
        error: "Failed to process contest",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT handler for updating existing contests or drafts
export async function PUT(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get('content-type') || '';
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data submission
      const formData = await request.formData();
      thumbnailFile = formData.get("thumbnail") as File | null;
      
      // Extract other form fields
      formData.forEach((value, key) => {
        if (key !== "thumbnail" && typeof value === "string") {
          // Parse nested JSON objects if they exist
          try {
            if (key === "basic" || key === "requirements" || key === "prizeTimeline" || 
                key === "contestType" || key === "incentives") {
              requestData[key] = JSON.parse(value);
            } else {
              requestData[key] = value;
            }
          } catch {
            requestData[key] = value;
          }
        }
      });
    } else {
      // Handle JSON submission (without file)
      requestData = await request.json();
    }
    
    const {
      basic = {},
      requirements = {},
      prizeTimeline = {},
      contestType = {},
      incentives = {},
      userId, // Changed from brandEmail to userId
      isDraft,
      contestId
    } = requestData;

    // Either userId or contestId is required
    if (!userId && !contestId) {
      return NextResponse.json(
        { error: "Either userId (for drafts) or contestId (for published contests) is required" },
        { status: 400 }
      );
    }

    // Check if this is a draft update or a published contest update
    if (isDraft) {
      // Updating a draft - store in contestDrafts collection
      // Format the draft data
      const draftData = {
        basic,
        requirements,
        prizeTimeline,
        contestType,
        incentives,
        userId, // Changed from brandEmail to userId
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb.collection("contestDrafts").doc(userId).set(draftData, { merge: true });

      return NextResponse.json({
        success: true,
        message: "Draft updated successfully",
        data: draftData,
      });
    } else {
      // Updating a published contest
      if (!contestId) {
        return NextResponse.json(
          { error: "Contest ID is required for updating published contests" },
          { status: 400 }
        );
      }

      // Check if the contest exists
      const contestDoc = await adminDb
        .collection("contests")
        .doc(contestId)
        .get();

      if (!contestDoc.exists) {
        return NextResponse.json(
          { error: "Contest not found" },
          { status: 404 }
        );
      }

      // Optional: Verify the user has permission to update this contest
      const contestData = contestDoc.data();
      if (contestData && contestData.userId !== userId) {
        return NextResponse.json(
          { error: "You don't have permission to update this contest" },
          { status: 403 }
        );
      }

      // Process the thumbnail
      let thumbnailUrl: string | null = basic.thumbnail;
      
      if (thumbnailFile) {
        // Use the method for file upload with userId instead of brandEmail
        thumbnailUrl = await processThumbnail(thumbnailFile, contestId, userId);
      } else if (basic.thumbnail && typeof basic.thumbnail === "string" && basic.thumbnail.startsWith("data:")) {
        // Handle base64 string
        const imageBuffer = Buffer.from(
          basic.thumbnail.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );

        const bucket = adminStorage.bucket();
        const timestamp = Date.now();
        // Update path to use userId instead of brandEmail
        const filePath = `contest-images/${userId}/${contestId}/${timestamp}.jpg`;
        const file = bucket.file(filePath);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        await file.makePublic();
        thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      }

      // Format dates
      const startDate = prizeTimeline.startDate
        ? new Date(prizeTimeline.startDate).toISOString()
        : null;
      const endDate = prizeTimeline.endDate
        ? new Date(prizeTimeline.endDate).toISOString()
        : null;

      // Create the updated contest data object
      const updatedContestData = {
        basic: {
          ...basic,
          thumbnail: thumbnailUrl,
        },
        requirements,
        prizeTimeline: {
          ...prizeTimeline,
          startDate,
          endDate,
        },
        contestType,
        incentives,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore using admin SDK
      await adminDb.collection("contests").doc(contestId).update(updatedContestData);

      return NextResponse.json({
        success: true,
        message: "Contest updated successfully",
        data: updatedContestData,
      });
    }
  } catch (error) {
    console.error("Error updating contest:", error);
    return NextResponse.json(
      {
        error: "Failed to update contest",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}