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

		// Get all unread notifications for the user
		const unreadQuery = adminDb
			.collection("notifications")
			.where("userId", "==", userId)
			.where("read", "==", false);

		const snapshot = await unreadQuery.get();

		// Update all unread notifications
		const batch = adminDb.batch();
		snapshot.docs.forEach((doc) => {
			batch.update(doc.ref, {
				read: true,
				readAt: new Date(),
			});
		});

		await batch.commit();

		return NextResponse.json({ success: true, updated: snapshot.size });
	} catch (error) {
		console.error("Error marking all notifications as read:", error);
		return NextResponse.json(
			{ error: "Failed to update notifications" },
			{ status: 500 }
		);
	}
}
