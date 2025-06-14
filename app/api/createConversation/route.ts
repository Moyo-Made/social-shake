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

		// Check for existing conversations using array queries only
		// This is more reliable than deterministic IDs
		const existingConversations = await db
			.collection("conversations")
			.where("participants", "array-contains", currentUserId)
			.get();

		// Check if any of these conversations include the target user
		let existingConversation = null;
		for (const doc of existingConversations.docs) {
			const participants = doc.data().participants || [];
			if (participants.includes(targetUserId)) {
				existingConversation = doc;
				break;
			}
		}

		if (existingConversation) {
			return new Response(
				JSON.stringify({
					conversationId: existingConversation.id,
					message: "Existing conversation found",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		}

		// Get profile from database based on user type
		let targetProfile = null;
		try {
			if (targetUserType === "creator") {
				// Existing creator profile logic
				const creatorProfilesQuery = await db
					.collection("creatorProfiles")
					.where("userId", "==", targetUserId)
					.limit(1)
					.get();

				if (!creatorProfilesQuery.empty) {
					const profileData = creatorProfilesQuery.docs[0].data();
					targetProfile = {
						avatarUrl: profileData?.tiktokAvatarUrl || targetUserData.avatar,
						displayName: profileData?.tiktokDisplayName || targetUserData.name,
					};
				} else {
					const userDoc = await db.collection("users").doc(targetUserId).get();
					if (userDoc.exists && userDoc.data()?.email) {
						const creatorEmail = userDoc.data()?.email;
						const creatorDoc = await db
							.collection("creatorProfiles")
							.doc(creatorEmail)
							.get();
						if (creatorDoc.exists) {
							const profileData = creatorDoc.data();
							targetProfile = {
								avatarUrl:
									profileData?.tiktokAvatarUrl || targetUserData.avatar,
								displayName:
									profileData?.tiktokDisplayName || targetUserData.name,
							};
						}
					}
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

		// Determine roles based on user type
		const determineRole = (userId: string) => {
			if (userId === targetUserId) {
				return targetUserType; // 'creator' or 'brand'
			}
			return "user";
		};

		// Create new conversation - let Firestore generate the ID
		const sortedParticipants = [currentUserId, targetUserId].sort();
		const conversationData = {
			participants: sortedParticipants, // Always store in sorted order
			participantsInfo: {
				[currentUserId]: {
					name: userData.name,
					avatar: userData.avatar,
					username: userData.username || "",
					role: determineRole(currentUserId),
				},
				[targetUserId]: {
					name: targetDisplayName,
					avatar: targetAvatarUrl,
					username: targetUserData.username || "",
					role: determineRole(targetUserId),
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

		// FIXED: Use add() instead of set() with custom ID to avoid conflicts
		const newConversationRef = await db
			.collection("conversations")
			.add(conversationData);

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

		await newConversationRef.collection("messages").add(welcomeMessage);

		return new Response(
			JSON.stringify({
				conversationId: newConversationRef.id,
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
