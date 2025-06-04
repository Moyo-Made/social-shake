import { getFirestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

const db = getFirestore();

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

		// Query conversations where the user is a participant
		const conversationsRef = db.collection("conversations");
		const baseQuery = conversationsRef.where(
			"participants",
			"array-contains",
			userId
		);

		// Fetch the conversations
		const snapshot = await baseQuery.get();

		if (snapshot.empty) {
			return NextResponse.json({ conversations: [] }, { status: 200 });
		}

		// Transform the conversation documents and fetch creator profiles
		const conversationsWithCreatorPromises = snapshot.docs.map(async (doc) => {
			const data = doc.data();


			// Find the creator ID from participants array
			let creatorId = null;
			const isCreatorConversation = data.participants?.some(
				(participantUserId: string) => {
					const participantInfo = data.participantsInfo?.[participantUserId];
					const isCreator = participantInfo?.role === "creator";

					if (isCreator && participantUserId !== userId) {
						creatorId = participantUserId; // This will be the actual user ID
						return true;
					}
					return false;
				}
			);

			// If creatorOnly is true, only return creator conversations
			if (creatorOnly && !isCreatorConversation) {
				return null;
			}

			// Fetch creator profile if this is a creator conversation
			let creatorProfile = null;
			if (isCreatorConversation && creatorId) {
				try {
					// First try to query creatorProfiles by userId field
					const creatorProfilesQuery = await db
						.collection("creatorProfiles")
						.where("userId", "==", creatorId)
						.limit(1)
						.get();

					if (!creatorProfilesQuery.empty) {
						// Found profile by userId
						const profileData = creatorProfilesQuery.docs[0].data();
						creatorProfile = {
							avatarUrl: profileData?.tiktokAvatarUrl || null,
							displayName: profileData?.tiktokDisplayName || null,
						};
					} else {
						// If not found by userId, try to get email from users collection
						const userDoc = await db.collection("users").doc(creatorId).get();
						if (userDoc.exists && userDoc.data()?.email) {
							const creatorEmail = userDoc.data()?.email;

							// Try to get profile by email
							const creatorDoc = await db
								.collection("creatorProfiles")
								.doc(creatorEmail)
								.get();
							if (creatorDoc.exists) {
								const profileData = creatorDoc.data();
								creatorProfile = {
									avatarUrl: profileData?.tiktokAvatarUrl || null,
									displayName: profileData?.tiktokDisplayName || null,
								};
							}
						}
					}
				} catch (error) {
					console.error(
						`Error fetching creator profile for ${creatorId}:`,
						error
					);
					// Continue with null creatorProfile if there was an error
				}
			}

			// Convert Firebase timestamps to ISO strings
			const updatedAt = data.updatedAt
				? data.updatedAt.toDate().toISOString()
				: null;

			// Get unread count for this user (default to 0 if not present)
			const unreadCount = data.unreadCounts?.[userId] || 0;

			return {
				id: doc.id,
				participants: data.participants || [],
				participantsInfo: data.participantsInfo || {},
				lastMessage: data.lastMessage || "",
				updatedAt: updatedAt,
				unreadCount: unreadCount,
				isCreatorConversation,
				creatorProfile, // Include the creator profile information
			};
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

		return NextResponse.json({ conversations }, { status: 200 });
	} catch (error: unknown) {
		console.error("Error fetching conversations:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
