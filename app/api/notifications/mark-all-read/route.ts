import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const userId = request.nextUrl.searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		console.log(`Marking all notifications as read for user: ${userId}`);

		// Get all unread notifications for the user - using status field
		const unreadQuery = adminDb
			.collection("notifications")
			.where("userId", "==", userId)
			.where("status", "==", "unread"); // Changed from read == false

		const snapshot = await unreadQuery.get();
		console.log(`Found ${snapshot.size} unread notifications to update`);

		if (snapshot.empty) {
			return NextResponse.json({ 
				success: true, 
				updated: 0,
				message: "No unread notifications found"
			});
		}

		// Update all unread notifications in batches
		const batch = adminDb.batch();
		const currentTime = new Date();
		
		snapshot.docs.forEach((doc) => {
			console.log(`Updating notification ${doc.id} to read`);
			batch.update(doc.ref, {
				status: "read", // Changed to use status field
				readAt: currentTime,
			});
		});

		await batch.commit();
		console.log(`Successfully updated ${snapshot.size} notifications`);

		// Verify the updates by fetching the notifications again
		const verificationQuery = adminDb
			.collection("notifications")
			.where("userId", "==", userId)
			.where("status", "==", "unread"); // Changed verification query too

		const verificationSnapshot = await verificationQuery.get();
		console.log(`After update, ${verificationSnapshot.size} notifications remain unread`);

		return NextResponse.json({ 
			success: true, 
			updated: snapshot.size,
			remainingUnread: verificationSnapshot.size,
			message: `Successfully marked ${snapshot.size} notifications as read`
		});
	} catch (error) {
		console.error("Error marking all notifications as read:", error);
		return NextResponse.json(
			{ 
				error: "Failed to update notifications",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}