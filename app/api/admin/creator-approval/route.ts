import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

/**
 * GET handler to fetch creator data with comprehensive profile details
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
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
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

			// If we have an email, fetch the complete creator profile to merge data
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

			// Ensure TikTok data is included
			if (profileData.tiktokUrl) {
				socialMedia.tiktok = profileData.tiktokUrl;
			} else if (creatorProfileData?.tiktokUrl) {
				socialMedia.tiktok = creatorProfileData.tiktokUrl;
			}

			// Include TikTok-specific data if available
			const tiktokData = {
				...(profileData.tiktokData || {}),
				...(creatorProfileData?.tiktokData || {}),
				tiktokHandle:
					profileData.tiktokHandle || creatorProfileData?.tiktokHandle || null,
				tiktokFollowers:
					profileData.tiktokFollowers ||
					creatorProfileData?.tiktokFollowers ||
					null,
				tiktokEngagementRate:
					profileData.tiktokEngagementRate ||
					creatorProfileData?.tiktokEngagementRate ||
					null,
				tiktokContentCategory:
					profileData.tiktokContentCategory ||
					creatorProfileData?.tiktokContentCategory ||
					null,
				tiktokAverageViews:
					profileData.tiktokAverageViews ||
					creatorProfileData?.tiktokAverageViews ||
					null,
			};

			// Collect portfolio video URLs from multiple sources
			const portfolioVideoUrls = [];
			
			// First, check for individual portfolio video URLs in the root level
			const rootData = verificationData;
			for (let i = 0; i < 10; i++) { // Check up to 10 portfolio videos
				const portfolioVideoKey = `portfolioVideo-${i}Url`;
				if (rootData && rootData[portfolioVideoKey]) {
					portfolioVideoUrls.push(rootData[portfolioVideoKey]);
				}
			}
			
			// Also check in profileData for individual portfolio video URLs
			for (let i = 0; i < 10; i++) {
				const portfolioVideoKey = `portfolioVideo-${i}Url`;
				if (profileData[portfolioVideoKey]) {
					portfolioVideoUrls.push(profileData[portfolioVideoKey]);
				}
			}
			
			// Check for portfolioVideoUrls array in profileData
			if (profileData.portfolioVideoUrls && Array.isArray(profileData.portfolioVideoUrls)) {
				portfolioVideoUrls.push(...profileData.portfolioVideoUrls);
			}
			
			// Check for portfolioVideoUrls array in creatorProfileData
			if (creatorProfileData?.portfolioVideoUrls && Array.isArray(creatorProfileData.portfolioVideoUrls)) {
				portfolioVideoUrls.push(...creatorProfileData.portfolioVideoUrls);
			}
			
			// Remove duplicates and filter out empty/null values
			const uniquePortfolioVideoUrls = [...new Set(portfolioVideoUrls)].filter(url => url && url.trim() !== '');

			// Consolidate all data into a single object, including all creator profile fields
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
					profileData.profilePictureUrl ||
					creatorProfileData?.profilePictureUrl ||
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
				aboutMeVideoUrl:
					profileData.aboutMeVideoUrl ||
					profileData.aboutMeVideo ||
					creatorProfileData?.aboutMeVideoUrl ||
					verificationData?.aboutMeVideoUrl ||
					null,
				portfolioVideoUrls: uniquePortfolioVideoUrls,
				abnNumber:
					profileData.abnNumber || creatorProfileData?.abnNumber || null,
				bio: profileData.bio || creatorProfileData?.bio || null,
				socialMedia,
				tiktokData, // Include all TikTok-specific data
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
				// Include any additional creator profile fields that might be available
				profileLinks: creatorProfileData?.profileLinks || null,
				brandCollaborations: creatorProfileData?.brandCollaborations || null,
				demographics: creatorProfileData?.demographics || null,
				specialties: creatorProfileData?.specialties || null,
				languages: creatorProfileData?.languages || null,
				preferredContactMethod:
					creatorProfileData?.preferredContactMethod || null,
				availability: creatorProfileData?.availability || null,
				portfolioItems: creatorProfileData?.portfolioItems || null,
				businessInformation: creatorProfileData?.businessInformation || null,
				achievements: creatorProfileData?.achievements || null,
				// Include the entire creatorProfileData for complete access to all fields
				creatorProfileData: creatorProfileData || null,
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

		// Filter by userId if specified (with multiple format variations)
		let filteredDocs = verificationSnapshot.docs;
		if (userId) {
			const decodedUserId = decodeURIComponent(userId);
			const normalizedUserId = decodedUserId.replace(/%3A/g, ":");

			// Create variations of the userId to check against
			const userIdVariations = [
				userId, // Original as provided
				decodedUserId, // URL decoded version
				normalizedUserId, // With %3A replaced by :
				encodeURIComponent(userId), // Re-encoded version
				userId.replace(/:/g, "%3A"), // Replace : with %3A
			];

			// Filter documents that match any of the userId variations
			filteredDocs = verificationSnapshot.docs.filter((doc) => {
				const docUserId = doc.data().userId;
				return userIdVariations.some(
					(idVariation) => docUserId === idVariation
				);
			});

			// Log diagnostic info if no matches found
			if (filteredDocs.length === 0) {
				console.log(
					"No matches found. Searched for these userId variations:",
					userIdVariations
				);
				console.log(
					"Available userIds in database:",
					verificationSnapshot.docs.map((doc) => doc.data().userId)
				);
			}
		}

		// Group verification documents by userId (or email) to consolidate duplicates
		const creatorGroups = new Map();

		for (const doc of filteredDocs) {
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
				let userData = null;

				if (email) {
					if (!adminDb) {
						throw new Error("Firebase admin database is not initialized");
					}
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
					// Get user data to access displayName
					const userDoc = await adminDb.collection("users").doc(userId).get();

					if (userDoc.exists) {
						userData = userDoc.data();
					}

					// Try to find user email from users collection if needed
					if (!adminDb) {
						throw new Error("Firebase admin database is not initialized");
					}
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

				// Include TikTok-specific data if available
				const tiktokData = {
					...(profileData.tiktokData || {}),
					...(creatorProfileData?.tiktokData || {}),
					tiktokHandle:
						profileData.tiktokHandle ||
						creatorProfileData?.tiktokHandle ||
						null,
					tiktokFollowers:
						profileData.tiktokFollowers ||
						creatorProfileData?.tiktokFollowers ||
						null,
					tiktokEngagementRate:
						profileData.tiktokEngagementRate ||
						creatorProfileData?.tiktokEngagementRate ||
						null,
					tiktokContentCategory:
						profileData.tiktokContentCategory ||
						creatorProfileData?.tiktokContentCategory ||
						null,
					tiktokAverageViews:
						profileData.tiktokAverageViews ||
						creatorProfileData?.tiktokAverageViews ||
						null,
				};

				// Collect portfolio video URLs from multiple sources
				const portfolioVideoUrls = [];
				
				// First, check for individual portfolio video URLs in the root level
				const rootData = verificationData;
				for (let i = 0; i < 10; i++) { // Check up to 10 portfolio videos
					const portfolioVideoKey = `portfolioVideo-${i}Url`;
					if (rootData[portfolioVideoKey]) {
						portfolioVideoUrls.push(rootData[portfolioVideoKey]);
					}
				}
				
				// Also check in profileData for individual portfolio video URLs
				for (let i = 0; i < 10; i++) {
					const portfolioVideoKey = `portfolioVideo-${i}Url`;
					if (profileData[portfolioVideoKey]) {
						portfolioVideoUrls.push(profileData[portfolioVideoKey]);
					}
				}
				
				// Check for portfolioVideoUrls array in profileData
				if (profileData.portfolioVideoUrls && Array.isArray(profileData.portfolioVideoUrls)) {
					portfolioVideoUrls.push(...profileData.portfolioVideoUrls);
				}
				
				// Check for portfolioVideoUrls array in creatorProfileData
				if (creatorProfileData?.portfolioVideoUrls && Array.isArray(creatorProfileData.portfolioVideoUrls)) {
					portfolioVideoUrls.push(...creatorProfileData.portfolioVideoUrls);
				}
				
				// Remove duplicates and filter out empty/null values
				const uniquePortfolioVideoUrls = [...new Set(portfolioVideoUrls)].filter(url => url && url.trim() !== '');

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
								: userData?.displayName || "Unknown Creator",
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
					tiktokData, // Include all TikTok-specific data
					firstName:
						profileData.firstName || creatorProfileData?.firstName || null,
					lastName:
						profileData.lastName || creatorProfileData?.lastName || null,
					aboutMeVideoUrl:
						profileData.aboutMeVideoUrl ||
						creatorProfileData?.aboutMeVideoUrl ||
						verificationData?.aboutMeVideoUrl ||
						null,
					portfolioVideoUrls: uniquePortfolioVideoUrls,
					abnNumber:
						profileData.abnNumber || creatorProfileData?.abnNumber || null,
						
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
					// Include any additional creator profile fields that might be available
					profileLinks: creatorProfileData?.profileLinks || null,
					brandCollaborations: creatorProfileData?.brandCollaborations || null,
					demographics: creatorProfileData?.demographics || null,
					specialties: creatorProfileData?.specialties || null,
					languages: creatorProfileData?.languages || null,
					preferredContactMethod:
						creatorProfileData?.preferredContactMethod || null,
					availability: creatorProfileData?.availability || null,
					portfolioItems: creatorProfileData?.portfolioItems || null,
					businessInformation: creatorProfileData?.businessInformation || null,
					achievements: creatorProfileData?.achievements || null,
					// Include the entire creatorProfileData for complete access to all fields
					creatorProfileData: creatorProfileData || null,
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

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { verificationId, action, message } = body;

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Handle different actions (approve, reject, request_info, suspend)
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(verificationId);

		let updateData = {};

		switch (action) {
			case "approve":
				updateData = { status: "approved" };
				break;
			case "reject":
				updateData = { status: "rejected", rejectionReason: message };
				break;
			case "request_info":
				updateData = { status: "info_requested", infoRequest: message };
				break;
			case "suspend":
				updateData = { status: "suspended", suspensionReason: message };
				break;
			default:
				throw new Error("Invalid action type");
		}

		await verificationRef.update(updateData);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating creator status:", error);
		return NextResponse.json(
			{
				error: "Failed to update creator status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}