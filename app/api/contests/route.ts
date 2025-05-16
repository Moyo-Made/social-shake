import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import * as admin from "firebase-admin";

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
		if (!adminStorage) {
			throw new Error("Firebase admin storage is not initialized");
		}
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
	if (
		data.requirements?.platforms &&
		Array.isArray(data.requirements.platforms)
	) {
		data.requirements.platforms.forEach((platform: string) => {
			tags.add(platform.toLowerCase());
		});
	}

	return Array.from(tags);
}

// Helper function to get brand email for notifications
async function getBrandEmail(userId: string): Promise<string | null> {
	try {
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
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

// GET handler to retrieve contests with enhanced filtering and pagination
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");
		const contestId = url.searchParams.get("contestId");

		// If requesting a specific contest or draft
		if (contestId || (userId && !url.searchParams.has("filter"))) {
			let docRef;

			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			if (contestId) {
				// Get a complete contest
				docRef = adminDb.collection("contests").doc(contestId);

				// Increment view count
				await docRef.update({
					"metrics.views": admin.firestore.FieldValue.increment(1),
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
				maxPrize: url.searchParams.has("maxPrize")
					? parseInt(url.searchParams.get("maxPrize") || "0")
					: null,
				tag: url.searchParams.get("tag"),
				creatorId: url.searchParams.get("creatorId"), // For creator-specific contests
				featured: url.searchParams.get("featured") === "true",
				endDateBefore: url.searchParams.get("endDateBefore"),
				endDateAfter: url.searchParams.get("endDateAfter"),
			};

			// Pagination parameters
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const startAfter = url.searchParams.get("startAfter");
			const orderBy = url.searchParams.get("orderBy") || "createdAt";
			const orderDirection = url.searchParams.get("orderDirection") || "desc";

			// Build the query
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
				adminDb.collection("contests");

			// Apply filters
			// Apply status filter
			if (filters.status && filters.status !== "all") {
				const today = new Date().toISOString(); // Current date in ISO format

				query = query.where("status", "in", ["published", "active"]); // Base status filter

				if (filters.status === "active") {
					// Active: current date is between start and end date
					query = query.where("prizeTimeline.startDate", "<=", today);
					query = query.where("prizeTimeline.endDate", ">=", today);
				} else if (filters.status === "scheduled") {
					// Scheduled: start date is in the future
					query = query.where("prizeTimeline.startDate", ">", today);
				} else if (filters.status === "completed") {
					// Completed: end date has passed
					query = query.where("prizeTimeline.endDate", "<", today);
				}
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
				query = query.where(
					"tags",
					"array-contains",
					filters.tag.toLowerCase()
				);
			}

			if (filters.endDateBefore) {
				query = query.where(
					"prizeTimeline.endDate",
					"<=",
					filters.endDateBefore
				);
			}

			if (filters.endDateAfter) {
				query = query.where(
					"prizeTimeline.endDate",
					">=",
					filters.endDateAfter
				);
			}

			// Add sorting
			query = query.orderBy(orderBy, orderDirection === "asc" ? "asc" : "desc");

			// Add pagination starting point if provided
			if (startAfter) {
				const startAfterDoc = await adminDb
					.collection("contests")
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
			const contests = [];
			let lastDocId = null;

			for (const doc of snapshot.docs) {
				const contestData = doc.data();

				// Filter by price if needed (can't do this in query directly)
				if (
					(filters.minPrize > 0 &&
						(!contestData.prizeTimeline?.prizeAmount ||
							contestData.prizeTimeline?.prizeAmount < filters.minPrize)) ||
					(filters.maxPrize !== null &&
						contestData.prizeTimeline?.prizeAmount > filters.maxPrize)
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
					total: snapshot.size,
				},
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

		// Only check brand approval for final submissions, not drafts
		if (!isDraft) {
			// Get the user's brand profile to check approval status
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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
								"Your brand profile must be approved before creating contests.",
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
							"You need to create a brand profile and get it approved before creating contests.",
					},
					{ status: 403 }
				);
			}
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
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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

					if (!adminStorage) {
						throw new Error("Firebase admin storage is not initialized");
					}
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
				contestType,
			});

			// Enhanced creator-side fields
			const creatorRequirements = {
				minFollowers: requirements.minFollowers || 0,
				maxFollowers: requirements.maxFollowers || null,
				allowedPlatforms: requirements.platforms || [],
				requiredCategories: requirements.categories || [],
				experienceLevel: requirements.experienceLevel || "any",
			};

			// Create the complete contest data object with enhanced fields
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const contestData: any = {
				userId,
				contestId,
				basic: {
					...basic,
					thumbnail: thumbnailUrl,
					thumbnailName: thumbnailName,
				},
				requirements: {
					...requirements,
					...creatorRequirements,
					estimatedCompletionTime: requirements.estimatedTime || null,
				},
				prizeTimeline: {
					...prizeTimeline,
					startDate,
					endDate,
					applicationDeadline,
				},
				contestType,
				incentives: {
					...incentives,
					paymentModel: incentives.paymentModel || "fixed",
				},
				status: "pending", // Changed from "active" to "pending" to require admin approval
				applicationStatus: "closed", // Changed from "open" to "closed" until approved
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
			};

			// Add this to your POST handler in the contest API
			// This handles contest creation after payment
			// Look for the paid flag in the request data
			const paid = requestData.paid === true;
			const paymentId = requestData.paymentId;
			// If this is a paid contest being created after payment success
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

				// Set the contest to active immediately since payment is verified
				contestData.status = "active";
				contestData.applicationStatus = "open";
				contestData.paymentId = paymentId;

				// Add any other payment-specific fields
				contestData.paid = true;
				contestData.paymentAmount = paymentData.paymentAmount;
			}

			// Save to Firestore using admin SDK
			await adminDb.collection("contests").doc(contestId).set(contestData);

			// If a user ID was provided, update the draft after successful submission
			await adminDb
				.collection("contestDrafts")
				.doc(userId)
				.set({ submitted: true, contestId });

			// Create notification for admin about new contest that needs approval
			// Only create notification if it's not a paid contest (since paid ones are auto-approved)
			if (!paid) {
				const brandEmail = await getBrandEmail(userId);
				if (brandEmail) {
					await adminDb.collection("notifications").add({
						recipientEmail: "madetechboy@gmail.com", // Admin email
						message: `New contest "${basic.contestName}" requires approval`,
						status: "unread",
						type: "contest_approval_requested",
						createdAt: new Date().toISOString(),
						relatedTo: "contest",
						contestId: contestId,
						contestName: basic.contestName || "Untitled Contest",
						brandEmail: brandEmail,
					});
				}
			}

			return NextResponse.json({
				success: true,
				message: paid
					? "Contest created and activated successfully"
					: "Contest created successfully and pending approval",
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
			status,
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
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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

			// Verify the user has permission to update this contest
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

				if (!adminStorage) {
					throw new Error("Firebase admin storage is not initialized");
				}
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
				contestType,
			});

			// Enhanced creator-side fields
			const creatorRequirements = {
				minFollowers: requirements.minFollowers || 0,
				maxFollowers: requirements.maxFollowers || null,
				allowedPlatforms: requirements.platforms || [],
				requiredCategories: requirements.categories || [],
				experienceLevel: requirements.experienceLevel || "any",
			};

			// Determine status: if contest was rejected and is being edited, set back to pending
			let updatedStatus = status;
			const applicationStatus = contestData?.applicationStatus;

			if (contestData?.status === "rejected") {
				updatedStatus = "pending";

				// Create notification for admin about updated contest that needs re-approval
				const brandEmail = await getBrandEmail(userId);
				if (brandEmail) {
					await adminDb.collection("notifications").add({
						recipientEmail: "madetechboy@gmail.com", // Admin email
						message: `Updated contest "${basic.contestName}" requires re-approval`,
						status: "unread",
						type: "contest_edit_submitted",
						createdAt: new Date().toISOString(),
						relatedTo: "contest",
						contestId: contestId,
						contestName:
							basic.contestName ||
							contestData?.basic?.contestName ||
							"Untitled Contest",
						brandEmail: brandEmail,
					});
				}
			}

			// Create the updated contest data object
			const updatedContestData = {
				basic: {
					...basic,
					thumbnail: thumbnailUrl,
					thumbnailName: thumbnailName,
				},
				requirements: {
					...requirements,
					...creatorRequirements,
					estimatedCompletionTime: requirements.estimatedTime || null,
				},
				prizeTimeline: {
					...prizeTimeline,
					startDate,
					endDate,
					applicationDeadline,
				},
				contestType,
				incentives: {
					...incentives,
					paymentModel: incentives.paymentModel || "fixed",
				},
				status: updatedStatus,
				applicationStatus: applicationStatus,
				tags: tags,
				featured:
					requestData.featured !== undefined
						? requestData.featured
						: contestData?.featured || false,
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
