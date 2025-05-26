import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
	try {
		const { paymentId, videoId, userId, accessGranted = true } = await request.json();

		if (!paymentId || !videoId || !userId) {
			return NextResponse.json(
				{ error: "Payment ID, video ID, and user ID are required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}

		// Check if access record already exists
		const existingAccessQuery = await adminDb
			.collection("videoAccess")
			.where("videoId", "==", videoId)
			.where("userId", "==", userId)
			.where("paymentId", "==", paymentId)
			.get();

		if (!existingAccessQuery.empty) {
			return NextResponse.json({
				success: true,
				message: "Video access already exists",
				data: { accessId: existingAccessQuery.docs[0].id },
			});
		}

		// Create new video access record
		const videoAccessData = {
			paymentId,
			videoId,
			userId,
			accessGranted,
			grantedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const accessDocRef = await adminDb
			.collection("videoAccess")
			.add(videoAccessData);

		// Update user's purchased videos list (optional - for quick lookup)
		const userDocRef = adminDb.collection("users").doc(userId);
		const userDoc = await userDocRef.get();

		if (userDoc.exists) {
			const userData = userDoc.data();
			const purchasedVideos = userData?.purchasedVideos || [];
			
			// Add video if not already in the list
			if (!purchasedVideos.includes(videoId)) {
				await userDocRef.update({
					purchasedVideos: [...purchasedVideos, videoId],
					updatedAt: new Date().toISOString(),
				});
			}
		}

		// Update video's purchase count (optional analytics)
		const videoDocRef = adminDb.collection("videos").doc(videoId);
		const videoDoc = await videoDocRef.get();

		if (videoDoc.exists) {
			const videoData = videoDoc.data();
			const purchaseCount = (videoData?.purchaseCount || 0) + 1;
			
			await videoDocRef.update({
				purchaseCount,
				lastPurchasedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			message: "Video access granted successfully",
			data: {
				accessId: accessDocRef.id,
				paymentId,
				videoId,
				userId,
				accessGranted,
			},
		});
	} catch (error) {
		console.error("Error granting video access:", error);
		return NextResponse.json(
			{
				error: "Failed to grant video access",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		const videoId = searchParams.get("video_id");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}

		let query = adminDb
			.collection("videoAccess")
			.where("userId", "==", userId)
			.where("accessGranted", "==", true);

		// If specific video requested, filter by that too
		if (videoId) {
			query = query.where("videoId", "==", videoId);
		}

		const accessSnapshot = await query.get();
		
		const accessRecords = accessSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
		}));

		return NextResponse.json({
			success: true,
			data: accessRecords,
			count: accessRecords.length,
		});
	} catch (error) {
		console.error("Error fetching video access:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch video access",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}