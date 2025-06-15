import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
	request: NextRequest,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{ params }: any
) {
	try {
		const userId = request.nextUrl.searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Await params before accessing its properties
		const resolvedParams = await params;
		const notificationId = resolvedParams.id;
		const notificationRef = adminDb.collection('notifications').doc(notificationId);
		
		// Verify the notification belongs to the current user
		const doc = await notificationRef.get();
		if (!doc.exists || doc.data()?.userId !== userId) {
			return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
		}

		await notificationRef.update({
			read: true,
			readAt: new Date(),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return NextResponse.json(
			{ error: 'Failed to update notification' },
			{ status: 500 }
		);
	}
}