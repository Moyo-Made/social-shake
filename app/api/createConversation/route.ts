import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

const db = getFirestore();

export async function POST(req: NextRequest) {
	try {
		const {
			currentUserId,
			creatorId,
			brandId,
			userData,
			creatorData,
			brandData,
		} = await req.json();

		// Accept either creatorId or brandId
		const targetUserId = creatorId || brandId;
		const targetUserData = creatorData || brandData;
		const targetUserType = creatorId ? "creator" : "brand";

		if (!currentUserId || !targetUserId) {
			return new Response(
				JSON.stringify({ error: "Missing required fields" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		// Create a deterministic conversation ID based on sorted user IDs
		const sortedParticipants = [currentUserId, targetUserId].sort();
		const conversationId = `${sortedParticipants[0]}_${sortedParticipants[1]}`;

		// Check if conversation with this exact ID already exists
		const existingConvRef = db.collection("conversations").doc(conversationId);
		const existingConvDoc = await existingConvRef.get();

		if (existingConvDoc.exists) {
			return new Response(
				JSON.stringify({
					conversationId: existingConvDoc.id,
					message: "Existing conversation found",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		}

		// Alternative approach: Query both directions to ensure we catch existing conversations
		const existingConversation1 = await db
			.collection("conversations")
			.where("participants", "==", [currentUserId, targetUserId])
			.limit(1)
			.get();

		const existingConversation2 = await db
			.collection("conversations")
			.where("participants", "==", [targetUserId, currentUserId])
			.limit(1)
			.get();

		if (!existingConversation1.empty) {
			const doc = existingConversation1.docs[0];
			return new Response(
				JSON.stringify({
					conversationId: doc.id,
					message: "Existing conversation found",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		}

		if (!existingConversation2.empty) {
			const doc = existingConversation2.docs[0];
			return new Response(
				JSON.stringify({
					conversationId: doc.id,
					message: "Existing conversation found",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		}

		// Get profile from database based on user type
		let targetProfile = null;
		try {
			if (targetUserType === "creator") {
				let profilePictureUrl = null;
				let displayName = null;

				try {
					// 1. Get profile picture from creator_verifications collection
					const creatorVerificationQuery = await db
						.collection("creator_verifications")
						.where("userId", "==", targetUserId)
						.limit(1)
						.get();

					if (!creatorVerificationQuery.empty) {
						const verificationData = creatorVerificationQuery.docs[0].data();
						profilePictureUrl = verificationData?.profilePictureUrl;
					}

					// 2. Get display name from creatorProfiles collection
					const creatorProfileQuery = await db
						.collection("creatorProfiles")
						.where("userId", "==", targetUserId)
						.limit(1)
						.get();

					if (!creatorProfileQuery.empty) {
						const profileData = creatorProfileQuery.docs[0].data();
						const firstName = profileData?.firstName || "";
						const lastName = profileData?.lastName || "";
						displayName = `${firstName} ${lastName}`.trim();
					}

					// If no name found, try to get from users collection
					if (!displayName) {
						const userDoc = await db
							.collection("users")
							.doc(targetUserId)
							.get();

						if (userDoc.exists) {
							const userData = userDoc.data();
							// Check if user has displayUsername or email
							displayName =
								userData?.displayUsername ||
								userData?.email?.split("@")[0] ||
								"Creator";
						} else {
							console.warn(
								`No user document found for targetUserId: ${targetUserId}`
							);
						}
					}

					// Set the target profile with fetched data
					targetProfile = {
						avatarUrl: profilePictureUrl || targetUserData.avatar,
						displayName: displayName || targetUserData.name,
					};
				} catch (error) {
					console.error("Error fetching creator profile:", error);
					targetProfile = {
						avatarUrl: targetUserData.avatar,
						displayName: targetUserData.name,
					};
				}
			} else if (targetUserType === "brand") {
				// For brands, use the provided brandData directly
				targetProfile = {
					avatarUrl: targetUserData.avatar,
					displayName: targetUserData.name,
				};
			}
		} catch (error) {
			console.error(
				`Error fetching ${targetUserType} profile for ${targetUserId}:`,
				error
			);
			targetProfile = {
				avatarUrl: targetUserData.avatar,
				displayName: targetUserData.name,
			};
		}

		// Use fetched profile or fallback to provided data
		const targetAvatarUrl = targetProfile?.avatarUrl || targetUserData.avatar;
		const targetDisplayName = targetProfile?.displayName || targetUserData.name;

		// FIXED: Need to determine the current user's role properly too
		// First, check if the current user is a creator
		let currentUserRole = "user"; // Default to user
		let currentUserProfile = {
			name: userData.name,
			avatar: userData.avatar,
		};

		// Check if current user is a creator by looking in creator_verifications or creatorProfiles
		try {
			const currentUserCreatorCheck = await db
				.collection("creator_verifications")
				.where("userId", "==", currentUserId)
				.limit(1)
				.get();

			if (!currentUserCreatorCheck.empty) {
				currentUserRole = "creator";

				// Fetch current user's creator profile data
				let currentUserDisplayName = userData.name;
				let currentUserAvatar = userData.avatar;

				// Get profile picture from creator_verifications
				const currentUserVerificationData =
					currentUserCreatorCheck.docs[0].data();
				if (currentUserVerificationData?.profilePictureUrl) {
					currentUserAvatar = currentUserVerificationData.profilePictureUrl;
				}

				// Get display name from creatorProfiles
				const currentUserProfileQuery = await db
					.collection("creatorProfiles")
					.where("userId", "==", currentUserId)
					.limit(1)
					.get();

				if (!currentUserProfileQuery.empty) {
					const profileData = currentUserProfileQuery.docs[0].data();
					const firstName = profileData?.firstName || "";
					const lastName = profileData?.lastName || "";
					const fullName = `${firstName} ${lastName}`.trim();
					if (fullName) {
						currentUserDisplayName = fullName;
					}
				}

				// If still no name, try users collection
				if (
					!currentUserDisplayName ||
					currentUserDisplayName === userData.name
				) {
					const currentUserDoc = await db
						.collection("users")
						.doc(currentUserId)
						.get();
					if (currentUserDoc.exists) {
						const currentUserData = currentUserDoc.data();
						currentUserDisplayName =
							currentUserData?.displayUsername ||
							currentUserData?.email?.split("@")[0] ||
							userData.name;
					}
				}

				currentUserProfile = {
					name: currentUserDisplayName,
					avatar: currentUserAvatar,
				};
			}
		} catch (error) {
			console.error("Error checking current user creator status:", error);
		}

		const targetUserRole = targetUserType; // This will be "creator" or "brand"

		// Create new conversation with deterministic ID and sorted participants
		const conversationData = {
			participants: sortedParticipants, // Always store in sorted order
			participantsInfo: {
				[currentUserId]: {
					name: currentUserProfile.name,
					avatar: currentUserProfile.avatar,
					username: userData.username || "",
					role: currentUserRole, // Now properly determined as "user" or "creator"
				},
				[targetUserId]: {
					name: targetDisplayName,
					avatar: targetAvatarUrl,
					username: targetUserData.username || "",
					role: targetUserRole, // This will be "creator" or "brand"
					...(targetUserType === "creator" && {
						tiktokAvatarUrl: targetProfile?.avatarUrl || targetUserData.avatar,
						tiktokDisplayName:
							targetProfile?.displayName || targetUserData.name,
					}),
				},
			},
			createdAt: new Date(),
			updatedAt: new Date(),
			lastMessage: "Start a conversation",
			unreadCounts: {
				[currentUserId]: 0,
				[targetUserId]: 0,
			},
			// Store profile data at the conversation level for easier retrieval
			[`${targetUserType}Profile`]: {
				avatarUrl: targetProfile?.avatarUrl || targetUserData.avatar,
				displayName: targetProfile?.displayName || targetUserData.name,
			},
		};

		// Use the deterministic conversation ID
		await existingConvRef.set(conversationData);

		// Create welcome message to initialize the conversation
		const welcomeMessage = {
			sender: "system",
			content: "Conversation started",
			timestamp: new Date(),
			readStatus: {
				[currentUserId]: true,
				[targetUserId]: true,
			},
		};

		await existingConvRef.collection("messages").add(welcomeMessage);

		return new Response(
			JSON.stringify({
				conversationId: conversationId,
				message: "Conversation created successfully",
			}),
			{ status: 201, headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("Error creating conversation:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create conversation" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}
