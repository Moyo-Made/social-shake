import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import * as admin from 'firebase-admin';

async function processThumbnail(
  thumbnail: File | null,
  contestId: string,
  userId: string,
  existingThumbnail?: string | null
): Promise<string | null> {
  // If no new thumbnail is provided, return the existing thumbnail
  if (!thumbnail || (thumbnail instanceof File && thumbnail.size === 0)) {
    return existingThumbnail || null;
  }

  try {
    console.log(
      `Processing thumbnail: ${thumbnail.name}, size: ${thumbnail.size} bytes`
    );

    // Check if the file is actually an image
    if (!thumbnail.type.startsWith("image/")) {
      throw new Error(
        `Invalid file type: ${thumbnail.type}. Only images are accepted.`
      );
    }

    // Get buffer from File object
    const arrayBuffer = await thumbnail.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    const timestamp = Date.now();
    const fileExtension = thumbnail.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}.${fileExtension}`;
    const filePath = `contest-images/${userId}/${contestId}/${fileName}`;

    // Get bucket and create file reference
    const bucket = adminStorage.bucket();
    console.log("Storage bucket details:", adminStorage.bucket().name);
    const fileRef = bucket.file(filePath);

    // Upload file
    await new Promise<void>((resolve, reject) => {
      const blobStream = fileRef.createWriteStream({
        metadata: {
          contentType: thumbnail.type,
        },
        resumable: false,
      });

      blobStream.on("error", (error) => {
        console.error("Stream error:", error);
        reject(error);
      });

      blobStream.on("finish", () => {
        console.log("Upload stream finished");
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
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return existingThumbnail || null;
  }
}

// Extract tags from contest data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTags(data: any): string[] {
  const tags: Set<string> = new Set();
  
  // Add industry as a tag
  if (data.basic?.industry) {
    tags.add(data.basic.industry.toLowerCase());
  }
  
  // Add contest type as a tag
  if (data.contestType?.type) {
    tags.add(data.contestType.type.toLowerCase());
  }
  
  // Add category tags if they exist
  if (data.basic?.categories && Array.isArray(data.basic.categories)) {
    data.basic.categories.forEach((category: string) => {
      tags.add(category.toLowerCase());
    });
  }
  
  // Add platform tags if they exist
  if (data.requirements?.platforms && Array.isArray(data.requirements.platforms)) {
    data.requirements.platforms.forEach((platform: string) => {
      tags.add(platform.toLowerCase());
    });
  }
  
  return Array.from(tags);
}

// GET handler to retrieve contests with enhanced filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const contestId = url.searchParams.get("contestId");

    // If requesting a specific contest or draft
    if (contestId || (userId && !url.searchParams.has("filter"))) {
      let docRef;

      if (contestId) {
        // Get a complete contest
        docRef = adminDb.collection("contests").doc(contestId);
        
        // Increment view count
        await docRef.update({
          "metrics.views": admin.firestore.FieldValue.increment(1)
        });
      } else {
        // Get a user's draft
        docRef = adminDb.collection("contestDrafts").doc(userId as string);
      }

      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { error: "No document found", exists: false },
          { status: 404 }
        );
      }

      const data = doc.data();

      return NextResponse.json({
        success: true,
        exists: true,
        data: data,
      });
    } 
    // Handle filtered listing of contests
    else {
      // Extract filter parameters
      const filters = {
        status: url.searchParams.get("status") || "active",
        industry: url.searchParams.get("industry"),
        contestType: url.searchParams.get("contestType"),
        minPrize: parseInt(url.searchParams.get("minPrize") || "0"),
        maxPrize: url.searchParams.has("maxPrize") ? parseInt(url.searchParams.get("maxPrize") || "0") : null,
        tag: url.searchParams.get("tag"),
        creatorId: url.searchParams.get("creatorId"), // For creator-specific contests
        featured: url.searchParams.get("featured") === "true",
      };

      // Pagination parameters
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const startAfter = url.searchParams.get("startAfter");
      const orderBy = url.searchParams.get("orderBy") || "createdAt";
      const orderDirection = url.searchParams.get("orderDirection") || "desc";

      // Build the query
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("contests");

      // Apply filters
      if (filters.status) {
        query = query.where("status", "==", filters.status);
      }

      if (filters.industry) {
        query = query.where("basic.industry", "==", filters.industry);
      }

      if (filters.contestType) {
        query = query.where("contestType.type", "==", filters.contestType);
      }

      if (filters.creatorId) {
        query = query.where("userId", "==", filters.creatorId);
      }

      if (filters.featured) {
        query = query.where("featured", "==", true);
      }

      if (filters.tag) {
        query = query.where("tags", "array-contains", filters.tag.toLowerCase());
      }

      // Add sorting
      query = query.orderBy(orderBy, orderDirection === "asc" ? "asc" : "desc");

      // Add pagination starting point if provided
      if (startAfter) {
        const startAfterDoc = await adminDb.collection("contests").doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      // Apply limit
      query = query.limit(limit);

      // Execute query
      const snapshot = await query.get();
      
      // Process results
      const contests = [];
      let lastDocId = null;

      for (const doc of snapshot.docs) {
        const contestData = doc.data();
        
        // Filter by price if needed (can't do this in query directly)
        if (
          (filters.minPrize > 0 && (!contestData.prizeTimeline.prizeAmount || contestData.prizeTimeline.prizeAmount < filters.minPrize)) ||
          (filters.maxPrize !== null && contestData.prizeTimeline.prizeAmount > filters.maxPrize)
        ) {
          continue;
        }
        
        contests.push(contestData);
        lastDocId = doc.id;
      }

      // Return results with pagination info
      return NextResponse.json({
        success: true,
        data: contests,
        pagination: {
          hasMore: contests.length === limit,
          lastDocId: lastDocId,
          count: contests.length,
          total: snapshot.size
        }
      });
    }
  } catch (error) {
    console.error("Error retrieving contests:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve contests",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST handler with enhanced data model for creator-side functionality
export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle form data submission
      const formData = await request.formData();
      thumbnailFile = formData.get("thumbnail") as File | null;

      // Extract other form fields
      formData.forEach((value, key) => {
        if (key !== "thumbnail" && typeof value === "string") {
          // Parse nested JSON objects if they exist
          try {
            if (
              key === "basic" ||
              key === "requirements" ||
              key === "prizeTimeline" ||
              key === "contestType" ||
              key === "incentives"
            ) {
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
      userId,
      isDraft,
    } = requestData;

    // Add this in your POST/PUT handler after getting the formData
    console.log(
      "Received thumbnail:",
      typeof thumbnailFile,
      thumbnailFile instanceof File
        ? `File size: ${thumbnailFile.size}`
        : thumbnailFile
    );

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
        userId,
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
      let thumbnailName: string | null = null;

      if (thumbnailFile) {
        // Existing File upload logic
        thumbnailUrl = await processThumbnail(thumbnailFile, contestId, userId);
        thumbnailName = thumbnailFile.name;
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
          thumbnailName = `${timestamp}.jpg`;
        } else {
          // If it's already a valid URL, use it directly
          thumbnailUrl = basic.thumbnail;
          thumbnailName = basic.thumbnailName || null;
        }
      }
      
      // Format dates
      const startDate = prizeTimeline.startDate
        ? new Date(prizeTimeline.startDate).toISOString()
        : null;
      const endDate = prizeTimeline.endDate
        ? new Date(prizeTimeline.endDate).toISOString()
        : null;
      const applicationDeadline = prizeTimeline.applicationDeadline
        ? new Date(prizeTimeline.applicationDeadline).toISOString()
        : endDate;

      // Extract tags for better searchability
      const tags = extractTags({
        basic,
        requirements,
        contestType
      });
      
      // Enhanced creator-side fields
      const creatorRequirements = {
        minFollowers: requirements.minFollowers || 0,
        maxFollowers: requirements.maxFollowers || null,
        allowedPlatforms: requirements.platforms || [],
        requiredCategories: requirements.categories || [],
        experienceLevel: requirements.experienceLevel || "any"
      };

      // Create the complete contest data object with enhanced fields
      const contestData = {
        userId,
        contestId,
        basic: {
          ...basic,
          thumbnail: thumbnailUrl,
          thumbnailName: thumbnailName
        },
        requirements: {
          ...requirements,
          ...creatorRequirements,
          estimatedCompletionTime: requirements.estimatedTime || null
        },
        prizeTimeline: {
          ...prizeTimeline,
          startDate,
          endDate,
          applicationDeadline
        },
        contestType,
        incentives: {
          ...incentives,
          paymentModel: incentives.paymentModel || "fixed"
        },
        status: "active",
        applicationStatus: "open", // "open", "reviewing", "closed"
        metrics: {
          views: 0,
          applications: 0,
          participants: 0,
          submissions: 0
        },
        tags: tags,
        featured: requestData.featured || false,
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

// PUT handler with enhanced data model for updating existing contests or drafts
export async function PUT(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle form data submission
      const formData = await request.formData();
      thumbnailFile = formData.get("thumbnail") as File | null;

      // Extract other form fields
      formData.forEach((value, key) => {
        if (key !== "thumbnail" && typeof value === "string") {
          // Parse nested JSON objects if they exist
          try {
            if (
              key === "basic" ||
              key === "requirements" ||
              key === "prizeTimeline" ||
              key === "contestType" ||
              key === "incentives"
            ) {
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
      userId,
      isDraft,
      contestId,
    } = requestData;

    // Either userId or contestId is required
    if (!userId && !contestId) {
      return NextResponse.json(
        {
          error:
            "Either userId (for drafts) or contestId (for published contests) is required",
        },
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
        userId,
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb
        .collection("contestDrafts")
        .doc(userId)
        .set(draftData, { merge: true });

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
      let thumbnailName: string | null = basic.thumbnailName || null;

      if (thumbnailFile) {
        // Use the method for file upload
        thumbnailUrl = await processThumbnail(
          thumbnailFile, 
          contestId, 
          userId, 
          contestData?.basic?.thumbnail
        );
        thumbnailName = thumbnailFile.name;
      } else if (
        basic.thumbnail &&
        typeof basic.thumbnail === "string" &&
        basic.thumbnail.startsWith("data:")
      ) {
        // Handle base64 string
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
        thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        thumbnailName = `${timestamp}.jpg`;
      }

      // Format dates
      const startDate = prizeTimeline.startDate
        ? new Date(prizeTimeline.startDate).toISOString()
        : null;
      const endDate = prizeTimeline.endDate
        ? new Date(prizeTimeline.endDate).toISOString()
        : null;
      const applicationDeadline = prizeTimeline.applicationDeadline
        ? new Date(prizeTimeline.applicationDeadline).toISOString()
        : endDate;

      // Extract updated tags
      const tags = extractTags({
        basic,
        requirements,
        contestType
      });
      
      // Enhanced creator-side fields
      const creatorRequirements = {
        minFollowers: requirements.minFollowers || 0,
        maxFollowers: requirements.maxFollowers || null,
        allowedPlatforms: requirements.platforms || [],
        requiredCategories: requirements.categories || [],
        experienceLevel: requirements.experienceLevel || "any"
      };

      // Create the updated contest data object
      const updatedContestData = {
        basic: {
          ...basic,
          thumbnail: thumbnailUrl,
          thumbnailName: thumbnailName
        },
        requirements: {
          ...requirements,
          ...creatorRequirements,
          estimatedCompletionTime: requirements.estimatedTime || null
        },
        prizeTimeline: {
          ...prizeTimeline,
          startDate,
          endDate,
          applicationDeadline
        },
        contestType,
        incentives: {
          ...incentives,
          paymentModel: incentives.paymentModel || "fixed"
        },
        tags: tags,
        featured: requestData.featured !== undefined ? requestData.featured : contestData?.featured || false,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore using admin SDK
      await adminDb
        .collection("contests")
        .doc(contestId)
        .update(updatedContestData);

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