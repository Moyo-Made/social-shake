import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

async function processThumbnail(
  projectThumbnail: File | null,
  projectId: string,
  userId: string,
  existingThumbnail?: string | null
): Promise<string | null> {
  // If no new thumbnail is provided, return the existing thumbnail
  if (!projectThumbnail || projectThumbnail.size === 0) {
    return existingThumbnail || null;
  }

  try {
    console.log(
      `Processing thumbnail: ${projectThumbnail.name}, size: ${projectThumbnail.size} bytes`
    );

    // Check if the file is actually an image
    if (!projectThumbnail.type.startsWith("image/")) {
      throw new Error(
        `Invalid file type: ${projectThumbnail.type}. Only images are accepted.`
      );
    }

    // Get buffer from File object
    const arrayBuffer = await projectThumbnail.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    const timestamp = Date.now();
    const fileExtension = projectThumbnail.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}.${fileExtension}`;
    const filePath = `project-images/${userId}/${projectId}/${fileName}`;

    // Get bucket and create file reference
    const bucket = adminStorage.bucket();
    console.log("Storage bucket details:", adminStorage.bucket().name);
    const fileRef = bucket.file(filePath);

    // Upload file
    await new Promise<void>((resolve, reject) => {
      const blobStream = fileRef.createWriteStream({
        metadata: {
          contentType: projectThumbnail.type,
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

// New utility function to get user preferences
async function getUserPreferences(userId: string) {
  try {
    const docRef = adminDb.collection("userPreferences").doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data();
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }
}

// GET handler to retrieve a specific draft or project
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const projectId = url.searchParams.get("projectId");

    if (!userId && !projectId) {
      return NextResponse.json(
        { error: "Either userId or projectId is required" },
        { status: 400 }
      );
    }

    let docRef;

    if (projectId) {
      // Get a complete project
      docRef = adminDb.collection("projects").doc(projectId);
    } else {
      // Get a user's draft
      docRef = adminDb.collection("projectDrafts").doc(userId as string);
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
    console.error("Error retrieving project data:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve project data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST handler for creating or updating draft projects
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
      thumbnailFile = formData.get("projectThumbnail") as File | null;

      // Extract other form fields
      formData.forEach((value, key) => {
        if (key !== "thumbnail" && typeof value === "string") {
          // Parse nested JSON objects if they exist
          try {
            if (
              key === "projectDetails" ||
              key === "projectRequirements" ||
              key === "creatorPricing" ||
              key === "projectType"
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
      projectDetails = {},
      projectRequirements = {},
      creatorPricing = {},
      userId,
      status: requestedStatus,
    } = requestData;

    // Check if userId is provided
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Get user preferences if available
    const userPreferences = await getUserPreferences(userId);
    
    // Apply user preferences to the request data if fields are empty
    const updatedProjectRequirements = { ...projectRequirements };
    const updatedCreatorPricing = { ...creatorPricing };
    
    if (userPreferences) {
      // Apply project requirements preferences if they exist and current values are empty
      if (userPreferences.projectRequirements) {
        const prefReqs = userPreferences.projectRequirements;
        
        // Only apply if the current value is empty or undefined
        if (!updatedProjectRequirements.aspectRatio && prefReqs.aspectRatio) {
          updatedProjectRequirements.aspectRatio = prefReqs.aspectRatio;
        }
        
        if (!updatedProjectRequirements.duration && prefReqs.duration) {
          updatedProjectRequirements.duration = prefReqs.duration;
        }
        
        if (!updatedProjectRequirements.brandAssets && prefReqs.brandAssets) {
          updatedProjectRequirements.brandAssets = prefReqs.brandAssets;
        }
      }
      
      // Apply creator pricing preferences if they exist
      if (userPreferences.creatorPricing) {
        const prefPricing = userPreferences.creatorPricing;
        
        // Only apply if the current value is empty or undefined
        if (!updatedCreatorPricing.selectionMethod && prefPricing.selectionMethod) {
          updatedCreatorPricing.selectionMethod = prefPricing.selectionMethod;
        }
      }
    }

    // Determine the appropriate status based on project completeness
    let determinedStatus: string;
    
    // Check if the client explicitly requested draft status
    if (requestedStatus === "draft") {
      determinedStatus = "draft";
    } else {
      // Validate completeness of the project
      const isThumbnailMissing = !thumbnailFile && 
        (!projectDetails.projectThumbnail || 
         (typeof projectDetails.projectThumbnail === "string" && 
          !projectDetails.projectThumbnail.startsWith("http")));
      
      const isBudgetNotSet = !updatedCreatorPricing.budgetPerVideo || 
                updatedCreatorPricing.budgetPerVideo <= 0;
      
      const isProjectNameEmpty = !projectDetails.projectName;
      
      // Determine status based on completeness
      if (isThumbnailMissing || isBudgetNotSet || isProjectNameEmpty) {
        determinedStatus = "draft";
      } else {
        determinedStatus = "Accepting Pitches";
      }
    }

    // Check if this is a draft save or a final submission
    if (determinedStatus === "draft") {
      // Saving progress - store in projectDrafts collection
      // Format the draft data
      const draftData = {
        projectDetails,
        projectRequirements: updatedProjectRequirements,
        creatorPricing: updatedCreatorPricing,
        userId,
        status: determinedStatus,
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb.collection("projectDrafts").doc(userId).set(draftData);

      return NextResponse.json({
        success: true,
        message: "Draft saved successfully",
        data: draftData,
      });
    } else {
      // Final submission - validate required fields
      if (!projectDetails.projectName) {
        return NextResponse.json(
          { error: "Project name is required" },
          { status: 400 }
        );
      }

      // Generate a unique projectId if not provided
      const projectId =
        requestData.projectId ||
        `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Check if the project already exists
      const projectDoc = await adminDb
        .collection("projects")
        .doc(projectId)
        .get();

      if (projectDoc.exists) {
        return NextResponse.json(
          { error: "Project with this ID already exists" },
          { status: 409 }
        );
      }

      // Process the thumbnail
      let thumbnailUrl: string | null = null;

      if (thumbnailFile) {
        // File upload logic
        thumbnailUrl = await processThumbnail(thumbnailFile, projectId, userId);
      } else if (
        projectDetails.projectThumbnail &&
        typeof projectDetails.projectThumbnail === "string"
      ) {
        // Handle base64 or existing URL
        if (projectDetails.projectThumbnail.startsWith("data:")) {
          // Convert base64 to file upload
          const imageBuffer = Buffer.from(
            projectDetails.projectThumbnail.replace(
              /^data:image\/\w+;base64,/,
              ""
            ),
            "base64"
          );

          const bucket = adminStorage.bucket();
          const timestamp = Date.now();
          const filePath = `project-images/${userId}/${projectId}/${timestamp}.jpg`;
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
          thumbnailUrl = projectDetails.projectThumbnail;
        }
      }

      // Create the complete project data object
      const projectData = {
        userId,
        projectId,
        projectDetails: {
          ...projectDetails,
          projectThumbnail: thumbnailUrl,
        },
        projectRequirements: updatedProjectRequirements,
        creatorPricing: updatedCreatorPricing,
        status: determinedStatus,
        participants: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb.collection("projects").doc(projectId).set(projectData);

      // Update the draft after successful submission
      await adminDb
        .collection("projectDrafts")
        .doc(userId)
        .set({ submitted: true, projectId });

      return NextResponse.json({
        success: true,
        message: "Project created successfully",
        data: projectData,
      });
    }
  } catch (error) {
    console.error("Error handling project:", error);
    return NextResponse.json(
      {
        error: "Failed to process project",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT handler for updating existing projects
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
              key === "projectDetails" ||
              key === "projectRequirements" ||
              key === "creatorPricing" ||
              key === "projectType"
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
      projectDetails = {},
      projectRequirements = {},
      creatorPricing = {},
      userId,
      status,
      projectId,
    } = requestData;

    // Either userId or projectId is required
    if (!userId && !projectId) {
      return NextResponse.json(
        {
          error:
            "Either userId (for drafts) or projectId (for published projects) is required",
        },
        { status: 400 }
      );
    }

    // Check if this is a draft update or a published project update
    if (status === "draft") {
      // Updating a draft - store in projectDrafts collection
      const draftData = {
        projectDetails,
        projectRequirements,
        creatorPricing,
        userId,
        status: "draft",
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firestore using admin SDK
      await adminDb
        .collection("projectDrafts")
        .doc(userId)
        .set(draftData, { merge: true });

      return NextResponse.json({
        success: true,
        message: "Draft updated successfully",
        data: draftData,
      });
    } else {
      // Updating a published project
      if (!projectId) {
        return NextResponse.json(
          { error: "Project ID is required for updating published projects" },
          { status: 400 }
        );
      }

      // Check if the project exists
      const projectDoc = await adminDb
        .collection("projects")
        .doc(projectId)
        .get();

      if (!projectDoc.exists) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Verify the user has permission to update this project
      const projectData = projectDoc.data();
      if (projectData && projectData.userId !== userId) {
        return NextResponse.json(
          { error: "You don't have permission to update this project" },
          {status: 403 }
        );
      }

      // Process the thumbnail if provided
      let thumbnailUrl: string | null = projectData?.projectDetails.projectThumbnail;

      if (thumbnailFile) {
        // Process new thumbnail file
        thumbnailUrl = await processThumbnail(
          thumbnailFile, 
          projectId, 
          userId, 
          projectData?.projectDetails.projectThumbnail
        );
      } else if (
        projectDetails.projectThumbnail &&
        typeof projectDetails.projectThumbnail === "string" &&
        projectDetails.projectThumbnail.startsWith("data:")
      ) {
        // Handle base64 thumbnail
        const imageBuffer = Buffer.from(
          projectDetails.projectThumbnail.replace(
            /^data:image\/\w+;base64,/,
            ""
          ),
          "base64"
        );

        const bucket = adminStorage.bucket();
        const timestamp = Date.now();
        const filePath = `project-images/${userId}/${projectId}/${timestamp}.jpg`;
        const file = bucket.file(filePath);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        await file.makePublic();
        thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      }

      // Create the updated project data object
      const updatedData = {
        projectDetails: {
          ...projectDetails,
          projectThumbnail: thumbnailUrl,
        },
        projectRequirements,
        creatorPricing,
        status,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore using admin SDK
      await adminDb
        .collection("projects")
        .doc(projectId)
        .update(updatedData);

      return NextResponse.json({
        success: true,
        message: "Project updated successfully",
        data: {
          ...projectData,
          ...updatedData,
        },
      });
    }
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        error: "Failed to update project",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}