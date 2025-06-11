/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { NotificationData } from "@/types/notifications";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		console.log(`🔍 GET /api/notifications called for userId: ${userId}`);

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
		const query = notificationsRef
			.where("userId", "==", userId)
			.orderBy("createdAt", "desc")
			.limit(50);

		console.log(`📊 Executing Firestore query for userId: ${userId}`);
		const snapshot = await query.get();
		console.log(`📋 Found ${snapshot.docs.length} total notifications`);

		const notifications: NotificationData[] = snapshot.docs.map((doc) => {
			const data = doc.data();

			// Log each notification's read status - FIXED: Check status field
			console.log(`📄 Notification ${doc.id}:`, {
				type: data.type,
				status: data.status, // Changed from read to status
				readAt: data.readAt,
				title: data.title?.substring(0, 50) + '...',
				createdAt: data.createdAt,
			});

			// Helper function to safely convert dates
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

			const notification = {
				id: doc.id,
				...data,
				createdAt: convertToDate(data.createdAt) || new Date(),
				readAt: convertToDate(data.readAt),
			} as NotificationData;

			return notification;
		});

		// Count and log read/unread stats - FIXED: Use status field
		const unreadNotifications = notifications.filter(n => n.status === "unread");
		const readNotifications = notifications.filter(n => n.status === "read");
		
		console.log(`📊 Notification Statistics:`, {
			total: notifications.length,
			unread: unreadNotifications.length,
			read: readNotifications.length,
		});

		// Log details of unread notifications
		if (unreadNotifications.length > 0) {
			console.log(`🔴 Unread notifications:`, unreadNotifications.map(n => ({
				id: n.id,
				type: n.type,
				title: n.title?.substring(0, 30) + '...',
				createdAt: n.createdAt,
				status: n.status // Changed from read to status
			})));
		}

		// Log details of read notifications
		if (readNotifications.length > 0) {
			console.log(`✅ Read notifications:`, readNotifications.map(n => ({
				id: n.id,
				type: n.type,
				title: n.title?.substring(0, 30) + '...',
				readAt: n.readAt,
				status: n.status // Changed from read to status
			})));
		}

		return NextResponse.json({ 
			notifications,
			debug: {
				total: notifications.length,
				unread: unreadNotifications.length,
				read: readNotifications.length,
				timestamp: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error("❌ Detailed error in notifications API:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : undefined,
			code: (error as any)?.code,
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

		console.log(`📝 Creating new notification:`, {
			type,
			userId,
			title: title?.substring(0, 50) + '...',
			timestamp: new Date().toISOString()
		});

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
			status: "unread", // Changed from read: false to status: "unread"
			responded: false,
			createdAt: new Date(),
			read: false
		};

		const docRef = await adminDb
			.collection("notifications")
			.add(notificationData);

		console.log(`✅ Created notification with ID: ${docRef.id}`);

		return NextResponse.json({
			success: true,
			id: docRef.id,
			notification: { id: docRef.id, ...notificationData },
		});
	} catch (error) {
		console.error("❌ Error creating notification:", error);
		return NextResponse.json(
			{ error: "Failed to create notification" },
			{ status: 500 }
		);
	}
}

