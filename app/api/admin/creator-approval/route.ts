import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

/**
 * Handles file uploads from FormData requests
 */
async function handleFileUpload(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File; // Generic file field name
		const fileType = formData.get("fileType") as string; // Type of file: "logo", "id", or "video"
		const email = formData.get("email") as string;
		const verificationId = formData.get("verificationId") as string;
		const userId = formData.get("userId") as string;

		// Validate required fields
		if (!file || !fileType || !email || !verificationId || !userId) {
			return NextResponse.json(
				{
					error:
						"All fields (file, fileType, email, verificationId, userId) are required",
				},
				{ status: 400 }
			);
		}

		// Validate fileType
		if (!["logo", "id", "video"].includes(fileType)) {
			return NextResponse.json(
				{ error: "Invalid fileType. Must be 'logo', 'id', or 'video'" },
				{ status: 400 }
			);
		}

		// Get the file bytes
		const fileBuffer = await file.arrayBuffer();

		// Determine storage path based on fileType
		let storagePath: string;
		let fieldName: string;

		switch (fileType) {
			case "logo":
				storagePath = `creator_logos/${verificationId}/${file.name}`;
				fieldName = "logoUrl";
				break;
			case "id":
				storagePath = `creator_ids/${verificationId}/${file.name}`;
				fieldName = "verifiableIDUrl";
				break;
			case "video":
				storagePath = `creator_videos/${verificationId}/${file.name}`;
				fieldName = "verificationVideoUrl";
				break;
			default:
				storagePath = `creator_uploads/${verificationId}/${file.name}`;
				fieldName = "uploadUrl";
		}

		// Create a reference to firebase storage
		const fileRef = adminStorage.bucket().file(storagePath);

		// Upload the file
		await fileRef.save(Buffer.from(fileBuffer), {
			metadata: {
				contentType: file.type,
			},
		});

		// Make the file publicly accessible
		await fileRef.makePublic();
		const fileUrl = `https://storage.googleapis.com/${fileRef.bucket.name}/${fileRef.name}`;

		// Update verification document
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(verificationId);

		// Get the current document data
		const verificationDoc = await verificationRef.get();

		if (!verificationDoc.exists) {
			return NextResponse.json(
				{ error: "Verification record not found" },
				{ status: 404 }
			);
		}

		// Check if user is authorized to update this verification
		const verificationData = verificationDoc.data();
		if (verificationData?.userId !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized to update this verification" },
				{ status: 403 }
			);
		}

		// Update the URL in the appropriate field
		if (fileType === "logo") {
			// For logos, update both the root level field and the profileData nested field
			await verificationRef.update({
				[fieldName]: fileUrl,
				"profileData.logoUrl": fileUrl,
				updatedAt: new Date().toISOString(),
			});

			// Also update the creator profile if it exists
			const creatorProfileRef = adminDb
				.collection("creatorProfiles")
				.doc(email);
			const profileDoc = await creatorProfileRef.get();

			if (profileDoc.exists) {
				await creatorProfileRef.update({
					logoUrl: fileUrl,
					updatedAt: new Date().toISOString(),
				});
			}
		} else {
			// For other file types, update just the main field
			await verificationRef.update({
				[fieldName]: fileUrl,
				updatedAt: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			message: `${fileType} uploaded successfully`,
			fileUrl: fileUrl,
		});
	} catch (error) {
		console.error(`Error uploading file"}:`, error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to upload file";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

/**
 * POST handler for both file uploads and JSON status updates
 */
export async function POST(request: NextRequest) {
	// Check content type to determine if it's a JSON request or a FormData request
	const contentType = request.headers.get("content-type") || "";

	// Handle file upload with FormData
	if (contentType.includes("multipart/form-data")) {
		return handleFileUpload(request);
	}
	// Handle JSON requests (status updates)
	else {
		try {
			const data = await request.json();
			const { creatorEmail, userId, verificationId, action, message } = data;

			// Validate required fields
			if (!userId || !action) {
				return NextResponse.json(
					{ error: "User ID and action are required" },
					{ status: 400 }
				);
			}

			if (!creatorEmail || !verificationId) {
				return NextResponse.json(
					{ error: "Creator email and verification ID are required" },
					{ status: 400 }
				);
			}

			// Check if action is valid
			if (!["approve", "reject", "request_info", "suspend"].includes(action)) {
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
			}

			// Get verification document
			const verificationRef = adminDb
				.collection("creator_verifications")
				.doc(verificationId);
			const verificationDoc = await verificationRef.get();

			if (!verificationDoc.exists) {
				return NextResponse.json(
					{ error: "Verification record not found" },
					{ status: 404 }
				);
			}

			// Update creator status based on action
			interface UpdateData {
				status: string;
				updatedAt: string;
				feedbackMessage?: string;
			}

			const updateData: UpdateData = {
				status:
					action === "approve"
						? "approved"
						: action === "reject"
							? "rejected"
							: action === "request_info"
								? "info_requested"
								: action === "suspend"
									? "suspended"
									: "pending",
				updatedAt: new Date().toISOString(),
			};

			// Add feedback message if provided
			if (message) {
				updateData.feedbackMessage = message;
			}

			// Prepare notification message
			let notificationMessage = "";
			switch (action) {
				case "approve":
					notificationMessage =
						"Your creator profile has been approved! You can now create content.";
					break;
				case "reject":
					notificationMessage = `Your creator profile has been rejected. Reason: ${message || "Your profile does not meet our requirements."}`;
					break;
				case "request_info":
					notificationMessage = `We need more information about your creator profile: ${message || "Please provide additional information."}`;
					break;
				case "suspend":
					notificationMessage = `Your creator account has been suspended. Reason: ${message || "Your account has been suspended."}`;
					break;
			}

			// Update verification document
			await verificationRef.update(
				updateData as FirebaseFirestore.UpdateData<typeof updateData>
			);

			const creatorProfileRef = adminDb
				.collection("creatorProfiles")
				.doc(creatorEmail);
			await creatorProfileRef.update({
				verificationStatus: updateData.status,
				updatedAt: updateData.updatedAt,
			});

			// Create notification for the creator
			await adminDb.collection("notifications").add({
				recipientEmail: creatorEmail,
				message: notificationMessage,
				status: "unread",
				type: "status_update",
				createdAt: new Date().toISOString(),
				relatedTo: "creator_profile",
			});

			return NextResponse.json({
				success: true,
				message: `Creator profile successfully ${action}d`,
				data: { creatorEmail, action, updatedStatus: updateData.status },
			});
		} catch (error) {
			console.error("Error in creator approval process:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to process creator approval";
			return NextResponse.json({ error: errorMessage }, { status: 500 });
		}
	}
}

/**
 * GET handler to fetch creator data with proper file URLs and consolidated information
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status");
		const userId = searchParams.get("userId");
		const email = searchParams.get("email");
		const id = searchParams.get("id");

		// Handle direct ID lookup if provided
		if (id) {
			const verificationRef = adminDb
				.collection("creator_verifications")
				.doc(id);
			const docSnap = await verificationRef.get();

			if (!docSnap.exists) {
				return NextResponse.json(
					{ error: "Verification not found" },
					{ status: 404 }
				);
			}

			const verificationData = docSnap.data();
			const creatorEmail =
				verificationData?.profileData?.email || verificationData?.email;

			// If we have an email, fetch the creator profile to merge data
			let creatorProfileData = null;
			if (creatorEmail) {
				const profileDoc = await adminDb
					.collection("creatorProfiles")
					.doc(creatorEmail)
					.get();

				if (profileDoc.exists) {
					creatorProfileData = profileDoc.data();
				}
			}

			// Merge social media data
			const profileData = verificationData?.profileData || {};
			const socialMedia = {
				...(profileData.socialMedia || {}),
				...(creatorProfileData?.socialLinks || {}),
			};

			// Add TikTok URL if available
			if (profileData.tiktokUrl) {
				socialMedia.tiktok = profileData.tiktokUrl;
			} else if (creatorProfileData?.tiktokUrl) {
				socialMedia.tiktok = creatorProfileData.tiktokUrl;
			}

			// Consolidate all data into a single object
			const consolidatedData = {
				id: docSnap.id,
				verificationId: docSnap.id,
				userId: verificationData?.userId,
				creator:
					profileData.firstName && profileData.lastName
						? `${profileData.firstName} ${profileData.lastName}`
						: creatorProfileData?.firstName && creatorProfileData?.lastName
							? `${creatorProfileData.firstName} ${creatorProfileData.lastName}`
							: "Unknown Creator",
				status: verificationData?.status,
				createdAt:
					verificationData?.createdAt?.toDate?.() ||
					verificationData?.createdAt,
				logoUrl:
					profileData.logoUrl ||
					verificationData?.profileData?.logoUrl ||
					verificationData?.logoUrl ||
					verificationData?.profilePictureUrl ||
					// Add these additional paths:
					profileData.profilePictureUrl ||
					creatorProfileData?.profilePictureUrl ||
					// The existing fallbacks:
					creatorProfileData?.logoUrl ||
					creatorProfileData?.profileImageUrl ||
					null,
				verifiableIDUrl:
					verificationData?.verifiableIDUrl ||
					profileData.verifiableIDUrl ||
					null,
				verificationVideoUrl:
					verificationData?.verificationVideoUrl ||
					profileData.verificationVideoUrl ||
					null,
				bio: profileData.bio || creatorProfileData?.bio || null,
				socialMedia,
				firstName:
					profileData.firstName || creatorProfileData?.firstName || null,
				lastName: profileData.lastName || creatorProfileData?.lastName || null,
				email: creatorEmail || null,
				username:
					profileData.displayUsername || creatorProfileData?.username || null,
				contentTypes:
					profileData.contentTypes || creatorProfileData?.contentTypes || null,
				contentLinks:
					profileData.contentLinks || creatorProfileData?.contentLinks || null,
				country: profileData.country || creatorProfileData?.country || null,
				gender: profileData.gender || creatorProfileData?.gender || null,
				ethnicity:
					profileData.ethnicity || creatorProfileData?.ethnicity || null,
				dateOfBirth:
					profileData.dateOfBirth || creatorProfileData?.dateOfBirth || null,
				pricing: profileData.pricing ||
					creatorProfileData?.pricing || {
						oneVideo: 0,
						threeVideos: 0,
						fiveVideos: 0,
						bulkVideos: 0,
						bulkVideosNote: "",
					},
			};

			return NextResponse.json(consolidatedData);
		}

		// For list requests, we need to implement grouping by userId/email
		// First, set up the query based on filters
		let query;

		if (email) {
			query = adminDb
				.collection("creator_verifications")
				.where("profileData.email", "==", email)
				.orderBy("createdAt", "desc");
		} else if (status) {
			query = adminDb
				.collection("creator_verifications")
				.where("status", "==", status)
				.orderBy("createdAt", "desc");
		} else {
			query = adminDb
				.collection("creator_verifications")
				.orderBy("createdAt", "desc");
		}

		if (userId) {
			query = adminDb
				.collection("creator_verifications")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc");
		}

		// Execute the query without pagination to get all matching documents
		const verificationSnapshot = await query.get();

		if (verificationSnapshot.empty) {
			return NextResponse.json({
				creators: [],
				pagination: {
					total: 0,
					page,
					limit,
					pages: 0,
				},
			});
		}

		// Group verification documents by userId (or email) to consolidate duplicates
		const creatorGroups = new Map();

		for (const doc of verificationSnapshot.docs) {
			const verificationData = doc.data();
			const userId = verificationData.userId;
			const email =
				verificationData.profileData?.email || verificationData.email;

			// Create a unique key for grouping - prefer email if available, fallback to userId
			const groupKey = email || userId;

			if (!groupKey) continue; // Skip if we can't identify the creator

			// If this is a new creator or the current doc is newer than what we have
			if (
				!creatorGroups.has(groupKey) ||
				new Date(verificationData.createdAt) >
					new Date(creatorGroups.get(groupKey).createdAt)
			) {
				creatorGroups.set(groupKey, {
					doc,
					verificationData,
					userId,
					email,
				});
			}
		}

		// Now process each unique creator with their most recent verification
		const creatorPromises = Array.from(creatorGroups.values()).map(
			async ({ doc, verificationData, userId, email }) => {
				// Attempt to fetch matching creator profile
				let creatorProfileData = null;

				if (email) {
					try {
						const profileDoc = await adminDb
							.collection("creatorProfiles")
							.doc(email)
							.get();

						if (profileDoc.exists) {
							creatorProfileData = profileDoc.data();
						}
					} catch (profileError) {
						console.error(
							`Error fetching creator profile for email ${email}:`,
							profileError
						);
					}
				} else if (userId) {
					// Try to find user email from users collection if needed
					try {
						const userDoc = await adminDb.collection("users").doc(userId).get();
						if (userDoc.exists && userDoc.data()?.email) {
							const userEmail = userDoc.data()?.email;
							const profileDoc = await adminDb
								.collection("creatorProfiles")
								.doc(userEmail)
								.get();

							if (profileDoc.exists) {
								creatorProfileData = profileDoc.data();
								email = userEmail; // Update email for consistent use later
							}
						}
					} catch (userError) {
						console.error(
							`Error fetching user data for userId ${userId}:`,
							userError
						);
					}
				}

				// Extract profile data from verification data
				const profileData = verificationData.profileData || {};

				// Merge social media data properly
				const socialMedia = {
					...(profileData.socialMedia || {}),
					...(creatorProfileData?.socialLinks || {}),
				};

				// Add TikTok URL if available
				if (profileData.tiktokUrl) {
					socialMedia.tiktok = profileData.tiktokUrl;
				} else if (creatorProfileData?.tiktokUrl) {
					socialMedia.tiktok = creatorProfileData.tiktokUrl;
				}

				// Build complete creator object with consolidated data
				return {
					id: doc.id,
					verificationId: doc.id,
					userId: userId,
					creator:
						profileData.firstName && profileData.lastName
							? `${profileData.firstName} ${profileData.lastName}`
							: creatorProfileData?.firstName && creatorProfileData?.lastName
								? `${creatorProfileData.firstName} ${creatorProfileData.lastName}`
								: "Unknown Creator",
					status: verificationData.status,
					createdAt:
						verificationData.createdAt?.toDate?.() ||
						verificationData.createdAt,
						logoUrl:
						profileData.logoUrl ||
						verificationData.profileData?.logoUrl ||
						verificationData.logoUrl ||
						verificationData.profileData?.profilePictureUrl ||
						verificationData.profilePictureUrl ||
						creatorProfileData?.logoUrl ||
						creatorProfileData?.profileImageUrl ||
						null,
					verifiableIDUrl:
						verificationData.verifiableIDUrl ||
						profileData.verifiableIDUrl ||
						null,
					verificationVideoUrl:
						verificationData.verificationVideoUrl ||
						profileData.verificationVideoUrl ||
						null,
					bio: profileData.bio || creatorProfileData?.bio || null,
					socialMedia,
					firstName:
						profileData.firstName || creatorProfileData?.firstName || null,
					lastName:
						profileData.lastName || creatorProfileData?.lastName || null,
					email: email || null,
					username:
						profileData.displayUsername || creatorProfileData?.username || null,
					contentTypes:
						profileData.contentTypes ||
						creatorProfileData?.contentTypes ||
						null,
					contentLinks:
						profileData.contentLinks ||
						creatorProfileData?.contentLinks ||
						null,
					country: profileData.country || creatorProfileData?.country || null,
					gender: profileData.gender || creatorProfileData?.gender || null,
					ethnicity:
						profileData.ethnicity || creatorProfileData?.ethnicity || null,
					dateOfBirth:
						profileData.dateOfBirth || creatorProfileData?.dateOfBirth || null,
					pricing: profileData.pricing ||
						creatorProfileData?.pricing || {
							oneVideo: 0,
							threeVideos: 0,
							fiveVideos: 0,
							bulkVideos: 0,
							bulkVideosNote: "",
						},
				};
			}
		);

		// Wait for all promises to resolve
		const allCreators = await Promise.all(creatorPromises);

		// Now apply pagination to the consolidated results
		const total = allCreators.length;
		const pages = Math.ceil(total / limit);
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedCreators = allCreators.slice(startIndex, endIndex);

		// Return the final response
		return NextResponse.json({
			creators: paginatedCreators,
			pagination: {
				total,
				page,
				limit,
				pages,
			},
		});
	} catch (error) {
		console.error("Error fetching creators:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch creators",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

/**
 * PUT handler to update creator verification
 */
export async function PUT(request: NextRequest) {
	try {
		const data = await request.json();
		const { verificationId, updates } = data;

		// Validate required fields
		if (!verificationId) {
			return NextResponse.json(
				{ error: "Verification ID is required" },
				{ status: 400 }
			);
		}

		if (!updates || Object.keys(updates).length === 0) {
			return NextResponse.json(
				{ error: "No update data provided" },
				{ status: 400 }
			);
		}

		// Get verification document
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(verificationId);
		const verificationDoc = await verificationRef.get();

		if (!verificationDoc.exists) {
			return NextResponse.json(
				{ error: "Verification record not found" },
				{ status: 404 }
			);
		}

		const verificationData = verificationDoc.data();
		const creatorEmail =
			verificationData?.profileData?.email || verificationData?.email;

		// Prepare the update data with timestamp
		const updateData = {
			...updates,
			updatedAt: new Date().toISOString(),
		};

		// Fields that shouldn't be directly updated
		const restrictedFields = ["userId", "createdAt", "verificationId"];
		restrictedFields.forEach((field) => {
			if (updateData[field]) delete updateData[field];
		});

		// Update verification document
		await verificationRef.update(
			updateData as FirebaseFirestore.UpdateData<typeof updateData>
		);

		// If status is being updated, also update the creator profile
		if (updates.status && creatorEmail) {
			const creatorProfileRef = adminDb
				.collection("creatorProfiles")
				.doc(creatorEmail);

			const creatorProfileDoc = await creatorProfileRef.get();

			if (creatorProfileDoc.exists) {
				await creatorProfileRef.update({
					verificationStatus: updates.status,
					updatedAt: new Date().toISOString(),
				});
			}

			// Create notification if status is changing
			let notificationMessage = "";
			switch (updates.status) {
				case "approved":
					notificationMessage =
						"Your creator profile has been approved! You can now create content.";
					break;
				case "rejected":
					notificationMessage = `Your creator profile has been rejected. Reason: ${updates.feedbackMessage || "Your profile does not meet our requirements."}`;
					break;
				case "info_requested":
					notificationMessage = `We need more information about your creator profile: ${updates.feedbackMessage || "Please provide additional information."}`;
					break;
				case "suspended":
					notificationMessage = `Your creator account has been suspended. Reason: ${updates.feedbackMessage || "Your account has been suspended."}`;
					break;
				case "pending":
					notificationMessage =
						"Your creator profile status has been changed to pending review.";
					break;
			}

			if (notificationMessage) {
				await adminDb.collection("notifications").add({
					recipientEmail: creatorEmail,
					message: notificationMessage,
					status: "unread",
					type: "status_update",
					createdAt: new Date().toISOString(),
					relatedTo: "creator_profile",
				});
			}
		}

		// If profileData is being updated, merge it rather than replace
		if (updates.profileData && typeof updates.profileData === "object") {
			const existingProfileData = verificationData?.profileData || {};
			const mergedProfileData = {
				...existingProfileData,
				...updates.profileData,
			};

			await verificationRef.update({
				profileData: mergedProfileData,
				updatedAt: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			message: "Creator verification record updated successfully",
			data: { verificationId, updatedFields: Object.keys(updates) },
		});
	} catch (error) {
		console.error("Error updating creator verification:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Failed to update creator verification";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
