import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { NotificationData } from "@/types/notifications";

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

		// Get notifications for the current user
		const notificationsRef = adminDb.collection("notifications");

		// Try without orderBy first to see if that's the issue
		const query = notificationsRef
			.where("userId", "==", userId)
			.orderBy("createdAt", "desc")
			.limit(50);

		const snapshot = await query.get();

		const notifications: NotificationData[] = snapshot.docs.map((doc) => {
			const data = doc.data();

			// Helper function to safely convert dates
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const convertToDate = (dateValue: any): Date | undefined => {
				if (!dateValue) return undefined;

				// If it's a Firestore Timestamp
				if (dateValue && typeof dateValue.toDate === "function") {
					return dateValue.toDate();
				}

				// If it's already a Date object
				if (dateValue instanceof Date) {
					return dateValue;
				}

				// If it's a string or number, try to parse it
				if (typeof dateValue === "string" || typeof dateValue === "number") {
					const parsed = new Date(dateValue);
					return isNaN(parsed.getTime()) ? undefined : parsed;
				}

				return undefined;
			};

			return {
				id: doc.id,
				...data,
				createdAt: convertToDate(data.createdAt) || new Date(),
				readAt: convertToDate(data.readAt),
			};
		}) as NotificationData[];

		return NextResponse.json({ notifications });
	} catch (error) {
		console.error("❌ Detailed error in notifications API:", {
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
				error: "Failed to fetch notifications",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			type,
			title,
			message,
			projectId,
			brandName,
			brandId,
			projectTitle,
			userId,
			creatorId,
			creatorName,
		} = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Create notification
		const notificationData: Omit<NotificationData, "id"> = {
			type,
			title,
			message,
			userId,
			projectId,
			brandName,
			brandId,
			projectTitle,
			creatorId,
			creatorName,
			read: false,
			responded: false,
			createdAt: new Date(),
		};

		const docRef = await adminDb
			.collection("notifications")
			.add(notificationData);

		return NextResponse.json({
			success: true,
			id: docRef.id,
			notification: { id: docRef.id, ...notificationData },
		});
	} catch (error) {
		console.error("Error creating notification:", error);
		return NextResponse.json(
			{ error: "Failed to create notification" },
			{ status: 500 }
		);
	}
}
