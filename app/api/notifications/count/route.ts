import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection not available" },
				{ status: 500 }
			);
		}

		// Get count of unread notifications for the current user
		const notificationsRef = adminDb.collection("notifications");
		
		const query = notificationsRef
			.where("userId", "==", userId)
			.where("read", "==", false);

		const snapshot = await query.get();
		const unreadCount = snapshot.size;

		return NextResponse.json({ 
			count: unreadCount,
			userId: userId 
		});

	} catch (error) {
		console.error("❌ Detailed error in notifications count API:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : undefined,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			code: (error as any)?.code,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			details: (error as any)?.details,
		});

		return NextResponse.json(
			{
				error: "Failed to fetch notification count",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}