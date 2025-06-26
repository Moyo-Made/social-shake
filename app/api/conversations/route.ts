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

					if (isCreator) {
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
				// Only fetch profile if the creator is NOT the current user
				if (creatorId !== userId) {
					try {
						let profilePictureUrl = null;
						let displayName = null;

						// 1. Get profile picture from creator_verifications collection
						const creatorVerificationQuery = await db
							.collection("creator_verifications")
							.where("userId", "==", creatorId)
							.limit(1)
							.get();

						if (!creatorVerificationQuery.empty) {
							const verificationData = creatorVerificationQuery.docs[0].data();
							profilePictureUrl = verificationData?.profilePictureUrl;
						}

						// 2. Get display name from creatorProfiles collection
						const creatorProfileQuery = await db
							.collection("creatorProfiles")
							.where("userId", "==", creatorId)
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
							const userDoc = await db.collection("users").doc(creatorId).get();

							if (userDoc.exists) {
								const userData = userDoc.data();
								// Check if user has displayUsername or email
								displayName =
									userData?.displayUsername ||
									userData?.email?.split("@")[0] ||
									"Creator";
							} else {
								console.warn(
									`No user document found for creatorId: ${creatorId}`
								);
							}
						}

						// Set creator profile with fetched data
						creatorProfile = {
							avatarUrl: profilePictureUrl,
							displayName: displayName,
						};

					} catch (error) {
						console.error(
							`Error fetching creator profile for ${creatorId}:`,
							error
						);
					}
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
