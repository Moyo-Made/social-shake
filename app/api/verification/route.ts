import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		// If no userId is provided, return error
		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Try multiple approaches to find the verification document
		let verificationData = null;
		let docId = null

		// Approach 2: Try using userId as document ID
		if (!verificationData) {
			try {
				const verificationRef = adminDb
					.collection("creator_verifications")
					.doc(userId);
				const docSnap = await verificationRef.get();

				if (docSnap.exists) {
					verificationData = docSnap.data();
					docId = docSnap.id;
					console.log(`Found verification by userId as docId: ${userId}`);
				}
			} catch (error) {
				console.log(`Error fetching by userId ${userId}:`, error);
			}
		}

		// If still no verification found, check if user has a creator profile
		// This helps distinguish between "no profile" vs "API error"
		if (!verificationData) {
			try {
				const profileRef = adminDb.collection("creatorProfiles").doc(userId);
				const profileSnap = await profileRef.get();

				if (profileSnap.exists) {
					console.log(
						`Found creator profile but no verification for userId: ${userId}`
					);

					// Return a "not_submitted" status if profile exists but no verification
					return NextResponse.json({
						id: null,
						status: "not_submitted",
						userId: userId,
						message: "Creator profile exists but verification not submitted",
						profileExists: true,
						createdAt: null,
						updatedAt: new Date().toISOString(),
						rejectionReason: null,
						infoRequest: null,
						suspensionReason: null,
					});
				} else {
					console.log(`No creator profile found for userId: ${userId}`);
					// Return "missing" status if no profile exists at all
					return NextResponse.json({
						id: null,
						status: "missing",
						userId: userId,
						message: "No creator profile found",
						profileExists: false,
						createdAt: null,
						updatedAt: new Date().toISOString(),
						rejectionReason: null,
						infoRequest: null,
						suspensionReason: null,
					});
				}
			} catch (profileError) {
				console.error(
					`Error checking creator profile for ${userId}:`,
					profileError
				);
				// If we can't check the profile, return a temporary error
				// but don't make it a hard 500 error
				return NextResponse.json({
					id: null,
					status: "pending", // Default to pending instead of error
					userId: userId,
					message: "Unable to verify profile status, please try again",
					profileExists: null,
					createdAt: null,
					updatedAt: new Date().toISOString(),
					rejectionReason: null,
					infoRequest: null,
					suspensionReason: null,
				});
			}
		}

		// Security check: Make sure the user can only access their own verification data
		if (verificationData?.userId && verificationData.userId !== userId) {
			console.log(
				`Unauthorized access attempt: ${userId} tried to access verification belonging to ${verificationData.userId}`
			);
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 403 }
			);
		}

		const profileData = verificationData?.profileData || {};

		// Debug logging
		console.log("Document data structure found:", {
			docId,
			hasProfileData: !!verificationData?.profileData,
			topLevelStatus: verificationData?.status,
			topLevelUserId: verificationData?.userId,
			profileDataKeys: Object.keys(profileData),
		});

		// Prepare response with proper field extraction
		const responseData = {
			id: docId,
			// Core verification fields (always at root level)
			status: verificationData?.status || "pending",
			userId: verificationData?.userId || userId, // Fallback to provided userId
			createdAt: verificationData?.createdAt,
			updatedAt: verificationData?.updatedAt,
			rejectionReason: verificationData?.rejectionReason || null,
			infoRequest: verificationData?.infoRequest || null,
			suspensionReason: verificationData?.suspensionReason || null,

			// Profile fields - check both root and nested locations
			bio: verificationData?.bio || profileData.bio || null,
			tiktokUrl: verificationData?.tiktokUrl || profileData.tiktokUrl || null,
			ethnicity: verificationData?.ethnicity || profileData.ethnicity || null,
			dateOfBirth:
				verificationData?.dateOfBirth || profileData.dateOfBirth || null,
			gender: verificationData?.gender || profileData.gender || null,
			country: verificationData?.country || profileData.country || null,
			contentTypes:
				verificationData?.contentTypes || profileData.contentTypes || [],
			contentLinks:
				verificationData?.contentLinks || profileData.contentLinks || [],
			socialMedia: verificationData?.socialMedia ||
				profileData.socialMedia || {
					instagram: "",
					twitter: "",
					facebook: "",
					youtube: "",
					tiktok: "",
				},
			pricing: verificationData?.pricing || profileData.pricing || {},
			abnNumber: verificationData?.abnNumber || profileData.abnNumber || null,
			languages: verificationData?.languages || profileData.languages || [],

			// File URLs - check both root and nested locations
			profilePictureUrl:
				verificationData?.profilePictureUrl ||
				profileData.profilePictureUrl ||
				null,
			verificationVideoUrl:
				verificationData?.verificationVideoUrl ||
				profileData.verificationVideoUrl ||
				null,
			verifiableIDUrl:
				verificationData?.verifiableIDUrl ||
				profileData.verifiableIDUrl ||
				null,
			aboutMeVideoUrl:
				verificationData?.aboutMeVideoUrl ||
				profileData.aboutMeVideoUrl ||
				profileData.aboutMeVideo ||
				null,
			portfolioVideoUrls:
				verificationData?.portfolioVideoUrls ||
				profileData.portfolioVideoUrls ||
				[],

			// Keep the original profileData for backwards compatibility
			profileData: profileData,
		};

		// Broadcast real-time update when verification is accessed (non-blocking)
		// FIXED: Don't let broadcast failures affect the main API response
		broadcastVerificationUpdate(userId, responseData);

		// Create response with proper headers for Safari
		const response = NextResponse.json(responseData);
		response.headers.set(
			"Cache-Control",
			"no-cache, no-store, must-revalidate"
		);
		response.headers.set("Pragma", "no-cache");
		response.headers.set("Expires", "0");

		return response;
	} catch (error) {
		console.error("Error fetching verification:", error);

		// Don't return 500 errors for missing data - this contributes to the error state
		// Instead, return a structured response that the client can handle gracefully
		return NextResponse.json(
			{
				id: null,
				status: "pending", // Default to pending instead of causing error state
				userId: new URL(request.url).searchParams.get("userId") || null,
				message: "Temporary error fetching verification status",
        isTemporary: true,
				errorDetails: error instanceof Error ? error.message : String(error),
				createdAt: null,
				updatedAt: new Date().toISOString(),
				rejectionReason: null,
				infoRequest: null,
				suspensionReason: null,
			},
			{ status: 200 }
		); // Return 200 instead of 500 to prevent error state
	}
}

// FIXED: Separate broadcast function that won't affect main API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function broadcastVerificationUpdate(userId: string, responseData: any) {
	// Use setTimeout instead of setImmediate for better browser compatibility
	setTimeout(async () => {
		try {
			const socketServerUrl =
				process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";

			// Add more robust error handling and retry logic
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			const broadcastResponse = await fetch(
				`${socketServerUrl}/api/broadcast-verification`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId,
						event: "verification-status-update",
						data: {
							status: responseData.status,
							rejectionReason: responseData.rejectionReason,
							infoRequest: responseData.infoRequest,
							suspensionReason: responseData.suspensionReason,
							updatedAt: responseData.updatedAt || new Date().toISOString(),
						},
					}),
					signal: controller.signal,
				}
			);

			clearTimeout(timeoutId);

			if (!broadcastResponse.ok) {
				console.warn(
					`Broadcast failed with status: ${broadcastResponse.status}. This is non-critical.`
				);
			} else {
				console.log(
					`Successfully broadcasted verification status for ${userId}`
				);
			}
		} catch (broadcastError) {
			// Only log warnings for broadcast failures, don't throw errors
			if (broadcastError instanceof Error && broadcastError.name === 'AbortError') {
				console.warn("Broadcast timeout (non-critical):", broadcastError.message);
			} else {
				console.warn("Broadcast error (non-critical):", broadcastError);
			}
		}
	}, 0);
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { status, rejectionReason, infoRequest, suspensionReason } = body;

		if (!status) {
			return NextResponse.json(
				{ error: "Status is required" },
				{ status: 400 }
			);
		}

		// Use the same multi-approach strategy as GET
		let verificationRef = null;
		let documentId = null;

		// Try to find the document using the same logic as GET
		if (id) {
			const testRef = adminDb.collection("creator_verifications").doc(id);
			const testSnap = await testRef.get();
			if (
				testSnap.exists &&
				(!testSnap.data()?.userId || testSnap.data()?.userId === userId)
			) {
				verificationRef = testRef;
				documentId = id;
			}
		}

		if (!verificationRef) {
			const testRef = adminDb.collection("creator_verifications").doc(userId);
			const testSnap = await testRef.get();
			if (testSnap.exists) {
				verificationRef = testRef;
				documentId = userId;
			}
		}

		if (!verificationRef) {
			const querySnap = await adminDb
				.collection("creator_verifications")
				.where("userId", "==", userId)
				.limit(1)
				.get();

			if (!querySnap.empty) {
				verificationRef = querySnap.docs[0].ref;
				documentId = querySnap.docs[0].id;
			}
		}

		if (!verificationRef) {
			return NextResponse.json(
				{ error: "Verification not found" },
				{ status: 404 }
			);
		}

		// Prepare update data
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {
			status,
			userId, // Ensure userId is always set
			updatedAt: new Date().toISOString(),
		};

		// Clear previous status-specific fields
		updateData.rejectionReason = null;
		updateData.infoRequest = null;
		updateData.suspensionReason = null;

		// Add optional fields based on status
		if (status === "rejected" && rejectionReason) {
			updateData.rejectionReason = rejectionReason;
		}
		if (status === "info_requested" && infoRequest) {
			updateData.infoRequest = infoRequest;
		}
		if (status === "suspended" && suspensionReason) {
			updateData.suspensionReason = suspensionReason;
		}

		// Update the document
		await verificationRef.update(updateData);

		// Also update the creator profile verification status (non-blocking)
		updateCreatorProfile(userId, status);

		// Broadcast the status change (non-blocking)
		broadcastStatusUpdate(userId, updateData, rejectionReason, infoRequest, suspensionReason);

		const response = NextResponse.json({
			message: "Verification status updated successfully",
			id: documentId,
			...updateData,
		});

		// Add headers for Safari compatibility
		response.headers.set(
			"Cache-Control",
			"no-cache, no-store, must-revalidate"
		);
		response.headers.set("Pragma", "no-cache");
		response.headers.set("Expires", "0");

		return response;
	} catch (error) {
		console.error("Error updating verification status:", error);
		return NextResponse.json(
			{
				error: "Failed to update verification status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// FIXED: Separate helper functions for non-blocking operations
async function updateCreatorProfile(userId: string, status: string) {
	setTimeout(async () => {
		try {
			await adminDb.collection("creatorProfiles").doc(userId).update({
				verificationStatus: status,
				updatedAt: new Date().toISOString(),
			});
			console.log(`Updated creator profile status for ${userId}`);
		} catch (profileUpdateError) {
			console.warn("Error updating creator profile status:", profileUpdateError);
		}
	}, 0);
}

async function broadcastStatusUpdate(
	userId: string, 
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	updateData: any, 
	rejectionReason?: string, 
	infoRequest?: string, 
	suspensionReason?: string
) {
	setTimeout(async () => {
		try {
			const socketServerUrl =
				process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			const broadcastResponse = await fetch(
				`${socketServerUrl}/api/broadcast-verification`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId,
						event: "verification-status-update",
						data: {
							status: updateData.status,
							rejectionReason: rejectionReason || null,
							infoRequest: infoRequest || null,
							suspensionReason: suspensionReason || null,
							updatedAt: updateData.updatedAt,
						},
					}),
					signal: controller.signal,
				}
			);

			clearTimeout(timeoutId);

			if (broadcastResponse.ok) {
				console.log(`Successfully broadcasted status update for ${userId}`);
			} else {
				console.warn(`Broadcast failed with status: ${broadcastResponse.status}. This is non-critical.`);
			}
		} catch (broadcastError) {
			if (broadcastError instanceof Error && broadcastError.name === 'AbortError') {
				console.warn("Broadcast timeout (non-critical):", broadcastError.message);
			} else {
				console.warn("Broadcast error (non-critical):", broadcastError);
			}
		}
	}, 0);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";