import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// CREATE notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      creatorId,
      brandId,
      videoId,
      amount,
      paymentId,
      message,
      contestId,
      submissionId,
      userId
    } = body;

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Create notification document
    const notificationData = {
      type,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      // Add optional fields if they exist
      ...(creatorId && { creatorId }),
      ...(brandId && { brandId }),
      ...(videoId && { videoId }),
      ...(amount && { amount }),
      ...(paymentId && { paymentId }),
      ...(contestId && { contestId }),
      ...(submissionId && { submissionId }),
      ...(userId && { userId })
    };

    // Add notification to Firestore
    const notificationRef = await adminDb.collection("notifications").add(notificationData);

    return NextResponse.json({ 
      success: true,
      notificationId: notificationRef.id,
      notification: {
        id: notificationRef.id,
        ...notificationData
      }
    });

  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// GET notifications for a user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const creatorId = url.searchParams.get('creatorId');
    const brandId = url.searchParams.get('brandId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    // At least one user identifier is required
    if (!userId && !creatorId && !brandId) {
      return NextResponse.json(
        { error: "At least one user identifier (userId, creatorId, or brandId) is required" },
        { status: 400 }
      );
    }

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("notifications");

    // Build query based on provided parameters
    if (userId) {
      query = query.where("userId", "==", userId);
    } else if (creatorId) {
      query = query.where("creatorId", "==", creatorId);
    } else if (brandId) {
      query = query.where("brandId", "==", brandId);
    }

    // Filter for unread notifications if requested
    if (unreadOnly) {
      query = query.where("read", "==", false);
    }

    // Order by creation date (newest first) and limit results
    query = query.orderBy("createdAt", "desc").limit(limit);

    const snapshot = await query.get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";