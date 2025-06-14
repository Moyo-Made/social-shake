import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		// Get the user ID and creator filter from query parameters
		const userId = request.nextUrl.searchParams.get("userId");
		const creatorOnly =
			request.nextUrl.searchParams.get("creatorOnly") === "true";

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		console.log(`Fetching conversations for user: ${userId}`);

		// Query conversations where the user is a participant
		const conversationsRef = adminDb.collection("conversations");
		const baseQuery = conversationsRef.where(
			"participants",
			"array-contains",
			userId
		);

		// Fetch the conversations
		const snapshot = await baseQuery.get();

		console.log(`Found ${snapshot.docs.length} conversations`);

		if (snapshot.empty) {
			return NextResponse.json({ conversations: [] }, { status: 200 });
		}

		// Transform the conversation documents and fetch creator profiles
		const conversationsWithCreatorPromises = snapshot.docs.map(async (doc) => {
			const data = doc.data();
			console.log(`Processing conversation ${doc.id}`);

			// Find the other participant (not the current user)
			const otherParticipants = data.participants?.filter(
				(participantId: string) => participantId !== userId
			) || [];

			let creatorId = null;
			let isCreatorConversation = false;
			
			// Check if any other participant is a creator by checking creatorProfiles collection
			for (const participantId of otherParticipants) {
				try {
					// Check if this participant has a creator profile
					const creatorProfileQuery = await adminDb
						.collection("creatorProfiles")
						.where("userId", "==", participantId)
						.limit(1)
						.get();

					if (!creatorProfileQuery.empty) {
						creatorId = participantId;
						isCreatorConversation = true;
						console.log(`Found creator: ${participantId}`);
						break; // Found a creator, break the loop
					}
				} catch (error) {
					console.error(`Error checking creator status for ${participantId}:`, error);
				}
			}

			// If creatorOnly is true, only return creator conversations
			if (creatorOnly && !isCreatorConversation) {
				console.log(`Filtering out non-creator conversation ${doc.id}`);
				return null;
			}

			// Fetch creator profile if this is a creator conversation
			let creatorProfile = null;
			if (isCreatorConversation && creatorId) {
				try {
					// Query creatorProfiles by userId field
					const creatorProfilesQuery = await adminDb
						.collection("creatorProfiles")
						.where("userId", "==", creatorId)
						.limit(1)
						.get();

					if (!creatorProfilesQuery.empty) {
						const profileData = creatorProfilesQuery.docs[0].data();
						creatorProfile = {
							avatarUrl: profileData?.tiktokAvatarUrl || null,
							displayName: profileData?.tiktokDisplayName || null,
							userId: creatorId,
						};
						console.log(`Found creator profile for ${creatorId}: ${creatorProfile.displayName}`);
					} else {
						// Fallback: Try to get profile by email if userId lookup fails
						try {
							const userDoc = await adminDb.collection("users").doc(creatorId).get();
							if (userDoc.exists && userDoc.data()?.email) {
								const creatorEmail = userDoc.data()?.email;
								const creatorDoc = await adminDb
									.collection("creatorProfiles")
									.doc(creatorEmail)
									.get();
								if (creatorDoc.exists) {
									const profileData = creatorDoc.data();
									creatorProfile = {
										avatarUrl: profileData?.tiktokAvatarUrl || null,
										displayName: profileData?.tiktokDisplayName || null,
										userId: creatorId,
									};
									console.log(`Found creator profile by email for ${creatorId}: ${creatorProfile.displayName}`);
								}
							}
						} catch (emailError) {
							console.error(`Error fetching creator by email for ${creatorId}:`, emailError);
						}
					}
				} catch (error) {
					console.error(`Error fetching creator profile for ${creatorId}:`, error);
				}
			}

			// Convert Firebase timestamps to ISO strings
			const updatedAt = data.updatedAt
				? data.updatedAt.toDate().toISOString()
				: new Date().toISOString();

			// Get unread count for this user (default to 0 if not present)
			const unreadCount = data.unreadCounts?.[userId] || 0;

			const conversation = {
				id: doc.id,
				participants: data.participants || [],
				participantsInfo: data.participantsInfo || {},
				lastMessage: data.lastMessage || "",
				updatedAt: updatedAt,
				unreadCount: unreadCount,
				isCreatorConversation,
				creatorProfile,
			};

			console.log(`Processed conversation ${doc.id}:`, {
				isCreatorConversation,
				hasCreatorProfile: !!creatorProfile,
				unreadCount,
				lastMessage: data.lastMessage?.substring(0, 50) + "..." || "No message"
			});

			return conversation;
		});

		// Resolve all promises
		const conversationsWithCreator = await Promise.all(
			conversationsWithCreatorPromises
		);

		// Filter out null entries and sort by updatedAt timestamp (newest first)
		const conversations = conversationsWithCreator
			.filter(Boolean)
			.sort((a, b) => {
				if (!a || !a.updatedAt) return 1;
				if (!b || !b.updatedAt) return -1;
				return (
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
				);
			});

		console.log(`Returning ${conversations.length} conversations`);
		console.log('Conversations summary:', conversations.map(c => {
			if (!c) return null; // Ensure c is not null
			return {
				id: c.id,
				isCreator: c.isCreatorConversation,
				hasProfile: !!c.creatorProfile,
				lastMessage: c.lastMessage?.substring(0, 30) + "..." || "No message"
			};
		}).filter(Boolean)); // Filter out null values after mapping

		return NextResponse.json({ conversations }, { status: 200 });
		
	} catch (error: unknown) {
		console.error("Error fetching conversations:", error);
		
		if (error instanceof Error) {
			console.error("Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name
			});
		}
		
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}