import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { adminStorage } from "@/config/firebase-admin"; // Make sure this is imported

export async function POST(request: NextRequest) {
	// Check content type to determine if it's a JSON request or a FormData request
	const contentType = request.headers.get("content-type") || "";

	// Handle file upload with FormData
	if (contentType.includes("multipart/form-data")) {
		try {
			const formData = await request.formData();
			const logoFile = formData.get("logo") as File;
			const email = formData.get("email") as string;
			const verificationId = formData.get("verificationId") as string;

			// Validate required fields
			if (!logoFile || !email || !verificationId) {
				return NextResponse.json(
					{ error: "Logo file, email, and verification ID are required" },
					{ status: 400 }
				);
			}

			// Get the file bytes
			const fileBuffer = await logoFile.arrayBuffer();
			
			// Create a reference to firebase storage
			const fileRef = adminStorage
				.bucket()
				.file(`creator_logos/${verificationId}/${logoFile.name}`);
			
			// Upload the file
			await fileRef.save(Buffer.from(fileBuffer), {
				metadata: {
					contentType: logoFile.type,
				},
			});
			
			// Get the public URL
			await fileRef.makePublic();
			const logoUrl = `https://storage.googleapis.com/${fileRef.bucket.name}/${fileRef.name}`;
			
			// Update both verification document and creator profile with the new logo URL
			const verificationRef = adminDb
				.collection("creator_verifications")
				.doc(verificationId);
			
			await verificationRef.update({
				"profileData.logoUrl": logoUrl,
				updatedAt: new Date().toISOString(),
			});
			
			const creatorProfileRef = adminDb.collection("creatorProfiles").doc(email);
			await creatorProfileRef.update({
				logoUrl: logoUrl,
				updatedAt: new Date().toISOString(),
			});
			
			return NextResponse.json({
				success: true,
				message: "Logo uploaded successfully",
				logoUrl: logoUrl,
			});
		} catch (error) {
			console.error("Error uploading logo:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to upload logo";
			return NextResponse.json({ error: errorMessage }, { status: 500 });
		}
	} 
	// Handle JSON requests (original POST functionality)
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

// Unchanged GET and PUT methods below
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status"); // No default status
		const userId = searchParams.get("userId");
		const email = searchParams.get("email"); // Add email param

		// Declare the query variable
		let query;

		// Check if we're querying by email
		if (email) {
			query = adminDb
				.collection("creator_verifications")
				.where("profileData.email", "==", email)
				.orderBy("createdAt", "desc");
		}
		// Handle different query types based on the status parameter
		else if (status) {
			// Query for a specific status
			query = adminDb
				.collection("creator_verifications")
				.where("status", "==", status)
				.orderBy("createdAt", "desc");
		} else {
			// If no status is provided or status is 'all', fetch all creators
			query = adminDb
				.collection("creator_verifications")
				.orderBy("createdAt", "desc");
		}

		// If userId is provided, modify the query
		if (userId) {
			query = adminDb
				.collection("creator_verifications")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc");
		}

		// Get total count for pagination
		const countSnapshot = await query.get();
		const total = countSnapshot.size;

		// Calculate pagination
		const offset = (page - 1) * limit;

		// Apply pagination to query
		query = query.limit(limit).offset(offset);
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

		// Process each verification document and fetch corresponding profile data
		const creatorPromises = verificationSnapshot.docs.map(async (doc) => {
			const verificationData = doc.data();
			const userId = verificationData.userId;

			console.log("Verification data for creator:", userId, JSON.stringify(verificationData, null, 2));
			console.log("Pricing data:", JSON.stringify(verificationData.pricing, null, 2));
			
			let creatorProfileData = null;

			// Try to fetch profile data from creatorProfiles collection
			try {
				// First try to get by email if it exists in verification data
				let email =
					verificationData.profileData?.email || verificationData.email;

				// If no email found, try to fetch by userId from another collection or use a default
				if (!email) {
					// Try to find user email from users collection if needed
					const userDoc = await adminDb.collection("users").doc(userId).get();
					if (userDoc.exists) {
						email = userDoc.data()?.email;
					}
				}

				if (email) {
					const profileDoc = await adminDb
						.collection("creatorProfiles")
						.doc(email)
						.get();
					if (profileDoc.exists) {
						creatorProfileData = profileDoc.data();
					}
				}
			} catch (profileError) {
				console.error(
					`Error fetching creator profile for userId ${userId}:`,
					profileError
				);
			}

			// Extract profile data from verification data
			const profileData = verificationData.profileData || {};

			// Merge social media data properly, including TikTok
			const socialMedia = {
				...(profileData.socialMedia || {}),
				...(creatorProfileData?.socialLinks || {}),
			};

			// Add TikTok URL if available (stored separately in some records)
			if (profileData.tiktokUrl) {
				socialMedia.tiktok = profileData.tiktokUrl;
			} else if (creatorProfileData?.tiktokUrl) {
				socialMedia.tiktok = creatorProfileData.tiktokUrl;
			}

			// Build complete creator object combining verification and profile data
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
				  verificationData.createdAt?.toDate?.() || verificationData.createdAt,
				// Modify this line to correctly find the logo URL
				logoUrl:
				  profileData.logoUrl || // Check first in profileData since this is where we update it
				  verificationData.profileData?.logoUrl || // Then in nested profileData
				  verificationData.profilePictureUrl ||
				  creatorProfileData?.logoUrl || // Also check in creatorProfile
				  creatorProfileData?.profileImageUrl ||
				  null,
				bio: profileData.bio || creatorProfileData?.bio || null,
				socialMedia,
				firstName:
				  profileData.firstName || creatorProfileData?.firstName || null,
				lastName: profileData.lastName || creatorProfileData?.lastName || null,
				email: profileData.email || creatorProfileData?.email || null,
				username:
				  profileData.displayUsername || creatorProfileData?.username || null,
				contentTypes: profileData.contentTypes || null,
				contentLinks: profileData.contentLinks || null,
				country: profileData.country || creatorProfileData?.country || null,
				gender: profileData.gender || creatorProfileData?.gender || null,
				ethnicity:
				  profileData.ethnicity || creatorProfileData?.ethnicity || null,
				dateOfBirth:
				  profileData.dateOfBirth || creatorProfileData?.dateOfBirth || null,
				verifiableIDUrl: verificationData.verifiableIDUrl || null,
				verificationVideoUrl: verificationData.verificationVideoUrl || null,
				pricing: profileData.pricing || {
				  oneVideo: 0,
				  threeVideos: 0,
				  fiveVideos: 0,
				  bulkVideos: 0,
				  bulkVideosNote: ""
				}
			  };
		});

		// Wait for all promises to resolve
		const creators = await Promise.all(creatorPromises);

		// Calculate total pages
		const pages = Math.ceil(total / limit);

		// Return the final response
		return NextResponse.json({
			creators,
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
	  const creatorEmail = verificationData?.profileData?.email || verificationData?.email;
  
	  // Prepare the update data with timestamp
	  const updateData = {
		...updates,
		updatedAt: new Date().toISOString()
	  };
  
	  // Fields that shouldn't be directly updated
	  const restrictedFields = ['userId', 'createdAt', 'verificationId'];
	  restrictedFields.forEach(field => {
		if (updateData[field]) delete updateData[field];
	  });
  
	  // Update verification document
	  await verificationRef.update(updateData as FirebaseFirestore.UpdateData<typeof updateData>);
  
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
			notificationMessage = "Your creator profile has been approved! You can now create content.";
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
			notificationMessage = "Your creator profile status has been changed to pending review.";
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
	  if (updates.profileData && typeof updates.profileData === 'object') {
		const existingProfileData = verificationData?.profileData || {};
		const mergedProfileData = {
		  ...existingProfileData,
		  ...updates.profileData
		};
		
		await verificationRef.update({
		  profileData: mergedProfileData,
		  updatedAt: new Date().toISOString()
		});
	  }
  
	  return NextResponse.json({
		success: true,
		message: "Creator verification record updated successfully",
		data: { verificationId, updatedFields: Object.keys(updates) }
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