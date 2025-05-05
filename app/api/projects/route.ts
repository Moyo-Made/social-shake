import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import * as admin from "firebase-admin";
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

// Extract tags from project data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTags(data: any): string[] {
	const tags: Set<string> = new Set();

	// Add project type as a tag
	if (data.projectDetails?.projectType?.type) {
		tags.add(data.projectDetails.projectType.type.toLowerCase());
	}

	// Add industry as a tag if available
	if (data.projectDetails?.industry) {
		tags.add(data.projectDetails.industry.toLowerCase());
	}

	// Add categories from requirements if they exist
	if (
		data.projectRequirements?.categories &&
		Array.isArray(data.projectRequirements.categories)
	) {
		data.projectRequirements.categories.forEach((category: string) => {
			tags.add(category.toLowerCase());
		});
	}

	// Add platforms from requirements if they exist
	if (
		data.projectRequirements?.platforms &&
		Array.isArray(data.projectRequirements.platforms)
	) {
		data.projectRequirements.platforms.forEach((platform: string) => {
			tags.add(platform.toLowerCase());
		});
	}

	return Array.from(tags);
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

// Helper function to get brand email for notifications
async function getBrandEmail(userId: string): Promise<string | null> {
	try {
		const brandsSnapshot = await adminDb
			.collection("brandProfiles")
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

// GET handler to retrieve projects with enhanced filtering and pagination
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");
		const projectId = url.searchParams.get("projectId");

		// If requesting a specific project or draft
		if (projectId || (userId && !url.searchParams.has("filter"))) {
			let docRef;

			if (projectId) {
				// Get a complete project
				docRef = adminDb.collection("projects").doc(projectId);

				// Increment view count
				await docRef.update({
					"metrics.views": admin.firestore.FieldValue.increment(1),
				});
			} else {
				// Get a user's draft
				docRef = adminDb.collection("projectDrafts").doc(userId as string);
			}

			const doc = await docRef.get();

			if (!doc.exists) {
				return NextResponse.json(
					{ error: "No document found", exists: false },
					{ status: 404 }
				);
			}

			const data = doc.data();

			// Check if we need to decompress any fields in the response
			if (data) {
				// Process potentially compressed fields
				const fieldsToCheck = [
					"projectDetails",
					"projectRequirements",
					"creatorPricing",
				];

				for (const field of fieldsToCheck) {
					// Check if the field exists and has nested properties that might be compressed
					if (data[field] && typeof data[field] === "object") {
						for (const [key, value] of Object.entries(data[field])) {
							if (
								typeof value === "string" &&
								value.startsWith("COMPRESSED:")
							) {
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
		}
		// Handle filtered listing of projects
		else {
			// Extract filter parameters
			const filters = {
				status: url.searchParams.get("status") || "active",
				industry: url.searchParams.get("industry"),
				projectType: url.searchParams.get("projectType"),
				minBudget: parseInt(url.searchParams.get("minBudget") || "0"),
				maxBudget: url.searchParams.has("maxBudget")
					? parseInt(url.searchParams.get("maxBudget") || "0")
					: null,
				tag: url.searchParams.get("tag"),
				creatorId: url.searchParams.get("creatorId"), // For creator-specific projects
				featured: url.searchParams.get("featured") === "true",
			};

			// Pagination parameters
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const startAfter = url.searchParams.get("startAfter");
			const orderBy = url.searchParams.get("orderBy") || "createdAt";
			const orderDirection = url.searchParams.get("orderDirection") || "desc";

			// Build the query
			let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
				adminDb.collection("projects");

			// Apply filters
			if (filters.status) {
				query = query.where("status", "==", filters.status);
			}

			if (filters.industry) {
				query = query.where("projectDetails.industry", "==", filters.industry);
			}

			if (filters.projectType) {
				query = query.where(
					"projectDetails.projectType.type",
					"==",
					filters.projectType
				);
			}

			if (filters.creatorId) {
				query = query.where("userId", "==", filters.creatorId);
			}

			if (filters.featured) {
				query = query.where("featured", "==", true);
			}

			if (filters.tag) {
				query = query.where(
					"tags",
					"array-contains",
					filters.tag.toLowerCase()
				);
			}

			// Add sorting
			query = query.orderBy(orderBy, orderDirection === "asc" ? "asc" : "desc");

			// Add pagination starting point if provided
			if (startAfter) {
				const startAfterDoc = await adminDb
					.collection("projects")
					.doc(startAfter)
					.get();
				if (startAfterDoc.exists) {
					query = query.startAfter(startAfterDoc);
				}
			}

			// Apply limit
			query = query.limit(limit);

			// Execute query
			const snapshot = await query.get();

			// Process results
			const projects = [];
			let lastDocId = null;

			for (const doc of snapshot.docs) {
				const projectData = doc.data();

				// Filter by budget if needed (can't do this in query directly)
				if (
					(filters.minBudget > 0 &&
						(!projectData.creatorPricing?.budgetPerVideo ||
							projectData.creatorPricing?.budgetPerVideo <
								filters.minBudget)) ||
					(filters.maxBudget !== null &&
						projectData.creatorPricing?.budgetPerVideo > filters.maxBudget)
				) {
					continue;
				}

				// Process any compressed fields before returning
				const fieldsToCheck = [
					"projectDetails",
					"projectRequirements",
					"creatorPricing",
				];

				for (const field of fieldsToCheck) {
					if (projectData[field] && typeof projectData[field] === "object") {
						for (const [key, value] of Object.entries(projectData[field])) {
							if (
								typeof value === "string" &&
								value.startsWith("COMPRESSED:")
							) {
								projectData[field][key] = maybeDecompress(value);
							}
						}
					}
				}

				projects.push(projectData);
				lastDocId = doc.id;
			}

			// Return results with pagination info
			return NextResponse.json({
				success: true,
				data: projects,
				pagination: {
					hasMore: projects.length === limit,
					lastDocId: lastDocId,
					count: projects.length,
					total: snapshot.size,
				},
			});
		}
	} catch (error) {
		console.error("Error retrieving projects:", error);
		return NextResponse.json(
			{
				error: "Failed to retrieve projects",
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
				{
					error:
						"Payload too large. Please reduce the size of your submission.",
				},
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
			thumbnailFile = formData.get("projectThumbnail") as File | null;

			// Process all form fields
			formData.forEach((value, key) => {
				if (key !== "projectThumbnail" && typeof value === "string") {
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
		for (const key of [
			"projectDetails",
			"projectRequirements",
			"creatorPricing",
		]) {
			if (requestData[key] && typeof requestData[key] === "object") {
				for (const [subKey, value] of Object.entries(requestData[key])) {
					// Compress large text fields to save storage space
					if (
						typeof value === "string" &&
						value.length > COMPRESSION_THRESHOLD
					) {
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

		// Only check brand approval status for final submissions, not drafts
		if (!isDraft) {
			// Get the user's brand profile to check approval status
			const brandsSnapshot = await adminDb
				.collection("brandProfiles")
				.where("userId", "==", userId)
				.limit(1)
				.get();

			if (!brandsSnapshot.empty) {
				const brandDoc = brandsSnapshot.docs[0];
				const brandData = brandDoc.data();

				// Check if brand is approved
				if (brandData.status !== "approved") {
					return NextResponse.json(
						{
							error: "brand_not_approved",
							message:
								"Your brand profile must be approved before creating projects.",
						},
						{ status: 403 }
					);
				}
			} else {
				// No brand profile found
				return NextResponse.json(
					{
						error: "brand_profile_missing",
						message:
							"You need to create a brand profile and get it approved before creating projects.",
					},
					{ status: 403 }
				);
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
				if (
					!updatedCreatorPricing.selectionMethod &&
					prefPricing.selectionMethod
				) {
					updatedCreatorPricing.selectionMethod = prefPricing.selectionMethod;
				}
			}
		}

		// Check if this is a draft save or a final submission
		if (isDraft) {
			// Saving progress - store in projectDrafts collection
			// Format the draft data
			const draftData = {
				projectDetails,
				projectRequirements: updatedProjectRequirements,
				creatorPricing: updatedCreatorPricing,
				userId,
				status: "draft",
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
			let thumbnailName: string | null = null;

			if (thumbnailFile) {
				// File upload logic
				thumbnailUrl = await processThumbnail(thumbnailFile, projectId, userId);
				thumbnailName = thumbnailFile.name;
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
					thumbnailName = `${timestamp}.jpg`;
				} else {
					// If it's already a valid URL, use it directly
					thumbnailUrl = projectDetails.projectThumbnail;
					thumbnailName = projectDetails.thumbnailName || null;
				}
			}

			// Extract tags for better searchability
			const tags = extractTags({
				projectDetails,
				projectRequirements: updatedProjectRequirements,
			});

			// Enhanced creator-side fields
			const creatorRequirements = {
				minFollowers: updatedProjectRequirements.minFollowers || 0,
				maxFollowers: updatedProjectRequirements.maxFollowers || null,
				allowedPlatforms: updatedProjectRequirements.platforms || [],
				requiredCategories: updatedProjectRequirements.categories || [],
				experienceLevel: updatedProjectRequirements.experienceLevel || "any",
			};

			// Create the complete project data object
			const projectData = {
				userId,
				projectId,
				projectDetails: {
					...projectDetails,
					projectThumbnail: thumbnailUrl,
					thumbnailName: thumbnailName,
				},
				projectRequirements: {
					...updatedProjectRequirements,
					...creatorRequirements,
				},
				creatorPricing: updatedCreatorPricing,
				status: ProjectStatus.PENDING,
				applicationStatus: "closed", // Default to closed until approved
				metrics: {
					views: 0,
					applications: 0,
					participants: 0,
					submissions: 0,
				},
				tags: tags,
				featured: requestData.featured || false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				paymentId: null, // Add paymentId property with a default value
				paid: false, // Add paid property with a default value
				paymentAmount: null, // Add paymentAmount property with a default value
			};

			// Add this to your POST handler in the project API
			// This handles project creation after payment
			// Look for the paid flag in the request data
			const paid = requestData.paid === true;
			const paymentId = requestData.paymentId;
			// If this is a paid project being created after payment success
			if (paid && paymentId) {
				// Verify the payment exists and is completed
				const paymentDoc = await adminDb
					.collection("payments")
					.doc(paymentId)
					.get();

				if (!paymentDoc.exists) {
					return NextResponse.json(
						{ error: "Payment not found" },
						{ status: 400 }
					);
				}

				const paymentData = paymentDoc.data();
				if (!paymentData || paymentData.status !== "completed") {
					return NextResponse.json(
						{ error: "Invalid or incomplete payment" },
						{ status: 400 }
					);
				}

				// Set the project to active immediately since payment is verified
				projectData.status = ProjectStatus.ACTIVE;
				projectData.applicationStatus = "open";
				projectData.paymentId = paymentId;

				// Add any other payment-specific fields
				projectData.paid = true;
				projectData.paymentAmount = paymentData.paymentAmount;
			}

			// Save to Firestore using admin SDK
			await adminDb.collection("projects").doc(projectId).set(projectData);

			// If a user ID was provided, update the draft after successful submission
			await adminDb
				.collection("projectDrafts")
				.doc(userId)
				.set({ submitted: true, projectId });

			// Create notification for admin about new project that needs approval
			// Only create notification if it's not a paid project (since paid ones are auto-approved)
			if (!paid) {
				const brandEmail = await getBrandEmail(userId);
				if (brandEmail) {
					await adminDb.collection("notifications").add({
						recipientEmail: "madetechboy@gmail.com", // Admin email
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
			}

			return NextResponse.json({
				success: true,
				message: paid
					? "Project created and activated successfully"
					: "Project created successfully and pending approval",
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
					message:
						"The data you're trying to submit exceeds size limits. Please reduce the size of text fields or break your submission into smaller parts.",
					details: error.message,
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

// PUT handler for updating existing projects
export async function PUT(request: NextRequest) {
	try {
		// Check content length header to see if we're approaching limits
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength) > MAX_JSON_SIZE) {
			return NextResponse.json(
				{
					error:
						"Payload too large. Please reduce the size of your submission.",
				},
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
			const formData = await request.formData();
			thumbnailFile = formData.get("projectThumbnail") as File | null;

			// Extract other form fields
			formData.forEach((value, key) => {
				if (key !== "projectThumbnail" && typeof value === "string") {
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
			// Handle large JSON submission
			const clonedRequest = request.clone();
			const text = await clonedRequest.text();

			// Check if JSON data is very large and might cause parsing issues
			if (text.length > COMPRESSION_THRESHOLD) {
				console.log(
					`Processing large JSON update payload: ${text.length} bytes`
				);
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
		for (const key of [
			"projectDetails",
			"projectRequirements",
			"creatorPricing",
		]) {
			if (requestData[key] && typeof requestData[key] === "object") {
				for (const [subKey, value] of Object.entries(requestData[key])) {
					// Compress large text fields to save storage space
					if (
						typeof value === "string" &&
						value.length > COMPRESSION_THRESHOLD
					) {
						requestData[key][subKey] = processLargeTextField(value);
					}
				}
			}
		}

		const {
			projectId,
			userId,
			projectDetails = {},
			projectRequirements = {},
			creatorPricing = {},
			status: requestedStatus,
		} = requestData;

		if (!projectId) {
			return NextResponse.json(
				{ error: "Project ID is required for updates" },
				{ status: 400 }
			);
		}

		// Verify the project exists and belongs to this user
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const existingProject = projectDoc.data();

		// Authorization check - ensure the user owns the project or is an admin
		if (existingProject?.userId !== userId && userId !== "admin") {
			return NextResponse.json(
				{ error: "Not authorized to update this project" },
				{ status: 403 }
			);
		}

		// Process the thumbnail if a new one is provided
		let thumbnailUrl =
			existingProject?.projectDetails?.projectThumbnail || null;
		let thumbnailName = existingProject?.projectDetails?.thumbnailName || null;

		if (thumbnailFile) {
			thumbnailUrl = await processThumbnail(
				thumbnailFile,
				projectId,
				userId,
				thumbnailUrl
			);
			thumbnailName = thumbnailFile.name;
		} else if (
			projectDetails.projectThumbnail &&
			typeof projectDetails.projectThumbnail === "string" &&
			projectDetails.projectThumbnail !==
				existingProject?.projectDetails?.projectThumbnail
		) {
			// Handle base64 or new URL
			if (projectDetails.projectThumbnail.startsWith("data:")) {
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
				thumbnailName = `${timestamp}.jpg`;
			} else if (projectDetails.projectThumbnail.startsWith("http")) {
				// If it's a valid URL but different from existing, use it
				thumbnailUrl = projectDetails.projectThumbnail;
				thumbnailName = projectDetails.thumbnailName || null;
			}
		}

		// Extract tags for better searchability
		const updatedProject = {
			...existingProject,
			projectDetails: {
				...existingProject?.projectDetails,
				...projectDetails,
				projectThumbnail: thumbnailUrl,
				thumbnailName: thumbnailName,
			},
			projectRequirements: {
				...existingProject?.projectRequirements,
				...projectRequirements,
			},
			creatorPricing: {
				...existingProject?.creatorPricing,
				...creatorPricing,
			},
			updatedAt: new Date().toISOString(),
			tags: [] as string[], // Initialize tags property
			status: existingProject?.status || null, // Add status property
			applicationStatus: existingProject?.applicationStatus || null, // Add applicationStatus property
			rejectionReason: existingProject?.rejectionReason || null, // Add rejectionReason property
		};

		// Re-extract tags based on updated content
		const tags = extractTags(updatedProject);
		updatedProject.tags = tags;

		// Handle status changes if admin is making the update
		if (
			userId === "admin" &&
			requestedStatus &&
			requestedStatus !== existingProject?.status
		) {
			updatedProject.status = requestedStatus;

			// If changing to active, update application status
			if (requestedStatus === ProjectStatus.ACTIVE) {
				updatedProject.applicationStatus = "open";

				// Create notification for brand about project approval
				await adminDb.collection("notifications").add({
					recipientId: existingProject?.userId,
					message: `Your project "${existingProject?.projectDetails.projectName}" has been approved!`,
					status: "unread",
					type: "project_approved",
					createdAt: new Date().toISOString(),
					relatedTo: "project",
					projectId: projectId,
				});
			}
			// If rejecting project, create notification
			else if (requestedStatus === ProjectStatus.REJECTED) {
				updatedProject.applicationStatus = "closed";
				updatedProject.rejectionReason =
					requestData.rejectionReason || "Did not meet our guidelines";

				// Create notification for brand about rejection
				await adminDb.collection("notifications").add({
					recipientId: existingProject?.userId,
					message: `Your project "${existingProject?.projectDetails.projectName}" was not approved`,
					status: "unread",
					type: "project_rejected",
					createdAt: new Date().toISOString(),
					relatedTo: "project",
					projectId: projectId,
					reason: updatedProject.rejectionReason,
				});
			}
		}

		// Save the updated project
		await projectRef.update(updatedProject);

		return NextResponse.json({
			success: true,
			message: "Project updated successfully",
			data: updatedProject,
		});
	} catch (error) {
		console.error("Error updating project:", error);

		// Handle specific errors for large payloads
		if (error instanceof Error && error.message.includes("too large")) {
			return NextResponse.json(
				{
					error: "Payload too large",
					message:
						"The data you're trying to update exceeds size limits. Please reduce the size of text fields.",
					details: error.message,
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

// DELETE handler for removing projects
export async function DELETE(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const projectId = url.searchParams.get("projectId");
		const userId = url.searchParams.get("userId");

		if (!projectId) {
			return NextResponse.json(
				{ error: "Project ID is required" },
				{ status: 400 }
			);
		}

		// Verify the project exists
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const existingProject = projectDoc.data();

		// Authorization check - ensure the user owns the project or is an admin
		if (existingProject?.userId !== userId && userId !== "admin") {
			return NextResponse.json(
				{ error: "Not authorized to delete this project" },
				{ status: 403 }
			);
		}

		// Check if the project has active participants
		if (existingProject?.metrics && existingProject.metrics.participants > 0) {
			return NextResponse.json(
				{
					error: "Cannot delete project with active participants",
					message:
						"This project has active participants and cannot be deleted. Consider marking it as completed instead.",
				},
				{ status: 400 }
			);
		}

		// Delete associated files from storage
		if (
			existingProject?.projectDetails &&
			existingProject.projectDetails.projectThumbnail
		) {
			try {
				const thumbnailUrl = existingProject.projectDetails.projectThumbnail;
				if (thumbnailUrl && thumbnailUrl.includes("storage.googleapis.com")) {
					// Extract the file path from the URL
					const bucket = adminStorage.bucket();
					const filePath = thumbnailUrl.split("/").slice(4).join("/");

					// Delete the file
					await bucket
						.file(filePath)
						.delete()
						.catch(() => {
							console.log("File not found or already deleted:", filePath);
						});
				}
			} catch (error) {
				console.error("Error deleting project files:", error);
				// Continue with project deletion even if file deletion fails
			}
		}

		// Delete the project
		await projectRef.delete();

		// Also delete any applications for this project
		const applicationsQuery = adminDb
			.collection("projectApplications")
			.where("projectId", "==", projectId);

		const applicationsSnapshot = await applicationsQuery.get();

		// Use batched delete for applications
		if (!applicationsSnapshot.empty) {
			const batch = adminDb.batch();
			applicationsSnapshot.docs.forEach((doc) => {
				batch.delete(doc.ref);
			});
			await batch.commit();
		}

		return NextResponse.json({
			success: true,
			message: "Project and associated data deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting project:", error);
		return NextResponse.json(
			{
				error: "Failed to delete project",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}