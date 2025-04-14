import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    // Check if user is requesting their own data or is an admin
    if (decodedToken.email !== email && !decodedToken.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get brand profile
    const brandRef = adminDb.collection("brandProfiles").doc(email);
    const brandDoc = await brandRef.get();

    if (!brandDoc.exists) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }

    const brandData = brandDoc.data();

    // Get unread notifications
    const notificationsQuery = adminDb.collection("notifications")
      .where("recipientEmail", "==", email)
      .where("status", "==", "unread")
      .orderBy("createdAt", "desc")
      .limit(10);

    const notificationsSnapshot = await notificationsQuery.get();
    
    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      status: brandData?.status,
      notifications,
      brandProfile: {
        companyName: brandData?.companyName,
        logoUrl: brandData?.logoUrl,
        status: brandData?.status,
        rejectionReason: brandData?.rejectionReason,
        requestedInfo: brandData?.requestedInfo,
        // Include any other relevant fields
      }
    });
  } catch (error) {
    console.error("Error fetching brand status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch brand status";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { notificationIds } = data;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "Notification IDs are required" }, { status: 400 });
    }

    // Update each notification
    const batch = adminDb.batch();
    
    for (const id of notificationIds) {
      const notificationRef = adminDb.collection("notifications").doc(id);
      batch.update(notificationRef, { status: "read" });
    }
    
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
      data: { updatedCount: notificationIds.length }
    });
  } catch (error) {
    console.error("Error updating notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update notifications";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}