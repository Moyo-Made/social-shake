
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import { ProjectStatus } from "@/types/projects";
import { compress, decompress } from "lz-string"; 

// Constants for payload management
const MAX_JSON_SIZE = 50 * 1024 * 1024; // 50MB max JSON size
const COMPRESSION_THRESHOLD = 1 * 1024 * 1024; // 1MB threshold for compression

// Helper function to decompress data if it's compressed
function maybeDecompress(data: string): string {
  try {
    // Check if this is a compressed string (simple heuristic)
    if (data.startsWith("COMPRESSED:")) {
      return decompress(data.substring(11));
    }
    return data;
  } catch (error) {
    console.error("Decompression error:", error);
    return data; // Return original on error
  }
}

// Helper function to handle large text fields
function processLargeTextField(value: string): string {
  // If the field is very large, consider compressing it
  if (value.length > COMPRESSION_THRESHOLD) {
    return "COMPRESSED:" + compress(value);
  }
  return value;
}

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
    const fileRef = bucket.file(filePath);

    // Upload file with resumable upload for larger files
    await new Promise<void>((resolve, reject) => {
      const blobStream = fileRef.createWriteStream({
        metadata: {
          contentType: projectThumbnail.type,
        },
        // Use resumable uploads for files larger than 5MB
        resumable: projectThumbnail.size > 5 * 1024 * 1024,
        // Higher timeout for larger files
        timeout: 300000, // 5 minutes
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

// Helper function to safely parse JSON
function safeJsonParse(value: string, key: string) {
  try {
    // If it's a large string, first check if it's compressed
    const decompressedValue = maybeDecompress(value);
    return JSON.parse(decompressedValue);
  } catch (error) {
    console.error(`Error parsing JSON for field ${key}:`, error);
    return value; // Return original value if parsing fails
  }
}

// Helper function for safely processing form data
async function processFormData(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  const thumbnailFile = formData.get("projectThumbnail") as File | null;

  // Process all form fields
  for (const [key, value] of formData.entries()) {
    if (key !== "thumbnail" && typeof value === "string") {
      // Handle large text fields that might be compressed
      if (value.length > COMPRESSION_THRESHOLD && value.startsWith("COMPRESSED:")) {
        const decompressed = maybeDecompress(value);
        
        // Try to parse JSON for known complex fields
        if (
          key === "projectDetails" ||
          key === "projectRequirements" ||
          key === "creatorPricing" ||
          key === "projectType"
        ) {
          result[key] = safeJsonParse(decompressed, key);
        } else {
          result[key] = decompressed;
        }
      } else {
        // Normal processing for smaller fields
        try {
          if (
            key === "projectDetails" ||
            key === "projectRequirements" ||
            key === "creatorPricing" ||
            key === "projectType"
          ) {
            result[key] = JSON.parse(value);
          } else {
            result[key] = value;
          }
        } catch {
          result[key] = value;
        }
      }
    }
  }

  return { result, thumbnailFile };
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
    
    // Check if we need to decompress any fields in the response
    if (data) {
      // Process potentially compressed fields
      const fieldsToCheck = ['projectDetails', 'projectRequirements', 'creatorPricing'];
      
      for (const field of fieldsToCheck) {
        // Check if the field exists and has nested properties that might be compressed
        if (data[field] && typeof data[field] === 'object') {
          for (const [key, value] of Object.entries(data[field])) {
            if (typeof value === 'string' && value.startsWith('COMPRESSED:')) {
              data[field][key] = maybeDecompress(value);
            }
          }
        }
      }
    }

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
    // Check content length header to see if we're approaching limits
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_JSON_SIZE) {
      return NextResponse.json(
        { error: "Payload too large. Please reduce the size of your submission." },
        { status: 413 }
      );
    }

    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Clone the request to avoid streaming errors
      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();
      const processedData = await processFormData(formData);
      
      requestData = processedData.result;
      thumbnailFile = processedData.thumbnailFile;
    } else {
      // Handle large JSON submission with careful parsing
      const clonedRequest = request.clone();
      const text = await clonedRequest.text();
      
      // Check if JSON data is very large and might cause parsing issues
      if (text.length > COMPRESSION_THRESHOLD) {
        console.log(`Processing large JSON payload: ${text.length} bytes`);
        try {
          requestData = JSON.parse(text);
        } catch (e) {
          console.error("Error parsing large JSON:", e);
          return NextResponse.json(
            { error: "Invalid JSON format in large payload" },
            { status: 400 }
          );
        }
      } else {
        // Normal size JSON
        requestData = await request.json();
      }
    }

    // Process large text fields in the request data
    for (const key of ['projectDetails', 'projectRequirements', 'creatorPricing']) {
      if (requestData[key] && typeof requestData[key] === 'object') {
        for (const [subKey, value] of Object.entries(requestData[key])) {
          // Compress large text fields to save storage space
          if (typeof value === 'string' && value.length > COMPRESSION_THRESHOLD) {
            requestData[key][subKey] = processLargeTextField(value);
          }
        }
      }
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
    
    // Only check brand approval status for final submissions, not drafts
    if (requestedStatus !== "draft") {
      // Get the user's brand profile to check approval status
      const brandsSnapshot = await adminDb.collection("brandProfiles")
        .where("userId", "==", userId)
        .limit(1)
        .get();
        
      if (!brandsSnapshot.empty) {
        const brandDoc = brandsSnapshot.docs[0];
        const brandData = brandDoc.data();
        
        // Check if brand is approved
        if (brandData.status !== "approved") {
          return NextResponse.json({ 
            error: "brand_not_approved", 
            message: "Your brand profile must be approved before creating projects." 
          }, { status: 403 });
        }
      } else {
        // No brand profile found
        return NextResponse.json({ 
          error: "brand_profile_missing", 
          message: "You need to create a brand profile and get it approved before creating projects." 
        }, { status: 403 });
      }
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
        // Status is "pending" to require admin approval
        determinedStatus = ProjectStatus.PENDING;
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

      // Use batched writes or transaction for better reliability with large data
      const draftRef = adminDb.collection("projectDrafts").doc(userId);
      
      try {
        // Use transaction for atomic updates
        await adminDb.runTransaction(async (transaction) => {
          transaction.set(draftRef, draftData);
        });
      } catch (error) {
        console.error("Transaction error saving draft:", error);
        if (error instanceof Error && error.message.includes("too large")) {
          return NextResponse.json(
            { error: "Draft data exceeds maximum size limit. Please reduce content size." },
            { status: 413 }
          );
        }
        throw error;
      }

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

      // Save to Firestore using transaction for atomic updates and better error handling
      try {
        await adminDb.runTransaction(async (transaction) => {
          const projectRef = adminDb.collection("projects").doc(projectId);
          transaction.set(projectRef, projectData);
          
          // Update the draft after successful submission
          const draftRef = adminDb.collection("projectDrafts").doc(userId);
          transaction.set(draftRef, { submitted: true, projectId });
        });
      } catch (error) {
        console.error("Transaction error creating project:", error);
        if (error instanceof Error && error.message.includes("too large")) {
          return NextResponse.json(
            { error: "Project data exceeds maximum size limit. Please reduce content size." },
            { status: 413 }
          );
        }
        throw error;
      }

      // Create notification for admin about new project that needs approval
      const brandEmail = await getBrandEmail(userId);
      if (brandEmail) {
        await adminDb.collection("notifications").add({
          recipientEmail: "madetechboy@gmail.com",
          message: `New project "${projectDetails.projectName}" requires approval`,
          status: "unread",
          type: "project_approval_requested",
          createdAt: new Date().toISOString(),
          relatedTo: "project",
          projectId: projectId,
          projectName: projectDetails.projectName || "Untitled Project",
          brandEmail: brandEmail,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Project created successfully and pending approval",
        data: projectData,
      });
    }
  } catch (error) {
    console.error("Error handling project:", error);
    
    // Handle specific errors for large payloads
    if (error instanceof Error && error.message.includes("too large")) {
      return NextResponse.json(
        { 
          error: "Payload too large", 
          message: "The data you're trying to submit exceeds size limits. Please reduce the size of text fields or break your submission into smaller parts.",
          details: error.message
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to process project",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Helper function to get brand email for notifications
async function getBrandEmail(userId: string): Promise<string | null> {
  try {
    const brandsSnapshot = await adminDb.collection("brandProfiles")
      .where("userId", "==", userId)
      .limit(1)
      .get();
      
    if (!brandsSnapshot.empty) {
      const brandData = brandsSnapshot.docs[0].data();
      return brandData.email || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting brand email:", error);
    return null;
  }
}

// PUT handler for updating existing projects
export async function PUT(request: NextRequest) {
  try {
    // Check content length header to see if we're approaching limits
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_JSON_SIZE) {
      return NextResponse.json(
        { error: "Payload too large. Please reduce the size of your submission." },
        { status: 413 }
      );
    }
    
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};
    let thumbnailFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle form data submission
      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();
      const processedData = await processFormData(formData);
      
      requestData = processedData.result;
      thumbnailFile = processedData.thumbnailFile || formData.get("thumbnail") as File | null;
    } else {
      // Handle large JSON submission
      const clonedRequest = request.clone();
      const text = await clonedRequest.text();
      
      // Check if JSON data is very large and might cause parsing issues
      if (text.length > COMPRESSION_THRESHOLD) {
        console.log(`Processing large JSON update payload: ${text.length} bytes`);
        try {
          requestData = JSON.parse(text);
        } catch (e) {
          console.error("Error parsing large JSON:", e);
          return NextResponse.json(
            { error: "Invalid JSON format in large payload" },
            { status: 400 }
          );
        }
      } else {
        // Normal size JSON
        requestData = await request.json();
      }
    }

    // Process large text fields in the request data
    for (const key of ['projectDetails', 'projectRequirements', 'creatorPricing']) {
      if (requestData[key] && typeof requestData[key] === 'object') {
        for (const [subKey, value] of Object.entries(requestData[key])) {
          // Compress large text fields to save storage space
          if (typeof value === 'string' && value.length > COMPRESSION_THRESHOLD) {
            requestData[key][subKey] = processLargeTextField(value);
          }
        }
      }
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

      // Save to Firestore using transaction for reliability with large data
      try {
        const draftRef = adminDb.collection("projectDrafts").doc(userId);
        await adminDb.runTransaction(async (transaction) => {
          transaction.set(draftRef, draftData, { merge: true });
        });
      } catch (error) {
        console.error("Transaction error updating draft:", error);
        if (error instanceof Error && error.message.includes("too large")) {
          return NextResponse.json(
            { error: "Draft data exceeds maximum size limit. Please reduce content size." },
            { status: 413 }
          );
        }
        throw error;
      }

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
        // If current status is PENDING/REJECTED and substantial edits have been made, 
        // set back to PENDING for re-approval
        status: projectData?.status === ProjectStatus.REJECTED ? ProjectStatus.PENDING : status,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore using transaction for reliability with large data
      try {
        const projectRef = adminDb.collection("projects").doc(projectId);
        await adminDb.runTransaction(async (transaction) => {
          transaction.update(projectRef, updatedData);
        });
      } catch (error) {
        console.error("Transaction error updating project:", error);
        if (error instanceof Error && error.message.includes("too large")) {
          return NextResponse.json(
            { error: "Project data exceeds maximum size limit. Please reduce content size." },
            { status: 413 }
          );
        }
        throw error;
      }

      // Notify admin if project was in REQUEST_EDIT status and is now fixed
      if (projectData?.status === ProjectStatus.REQUEST_EDIT) {
        const brandEmail = await getBrandEmail(userId);
        if (brandEmail) {
          await adminDb.collection("notifications").add({
            recipientEmail: "admin@yourplatform.com", // Change to your admin email
            message: `Project "${projectDetails.projectName}" has been edited and requires review`,
            status: "unread",
            type: "project_edit_submitted",
            createdAt: new Date().toISOString(),
            relatedTo: "project",
            projectId: projectId,
            projectName: projectDetails.projectName || projectData?.projectDetails?.projectName || "Untitled Project",
            brandEmail: brandEmail,
          });
        }
      }

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
    
    // Handle specific errors for large payloads
    if (error instanceof Error && error.message.includes("too large")) {
      return NextResponse.json(
        { 
          error: "Payload too large", 
          message: "The data you're trying to submit exceeds size limits. Please reduce the size of text fields or break your submission into smaller parts.",
          details: error.message
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to update project",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}