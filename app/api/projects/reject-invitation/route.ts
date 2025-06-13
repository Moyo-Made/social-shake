import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { userId, notificationId, projectId } = body;

    console.log("Received project rejection data:", {
      userId,
      notificationId,
      projectId,
      hasData: !!body,
    });

    // Stringent validation for userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json(
        { 
          error: "Missing or invalid userId",
          details: "User ID must be a non-empty string"
        },
        { status: 400 }
      );
    }

    // Validate other required fields
    if (!notificationId || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the user exists in Auth system
    if (!adminAuth) {
      throw new Error("Firebase admin auth is not initialized");
    }
    try {
      await adminAuth.getUser(userId);
    } catch (error) {
      console.error("Error verifying user:", error);
      return NextResponse.json(
        {
          error: "Invalid user ID. Please sign in again.",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 401 }
      );
    }

    // Verify the notification exists and belongs to the user
    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }
    const notificationRef = adminDb.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to this notification" },
        { status: 403 }
      );
    }

    if (notificationData?.responded) {
      return NextResponse.json(
        { error: "You have already responded to this invitation" },
        { status: 400 }
      );
    }

    // Get project details
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Update the notification to mark as responded
    await notificationRef.update({
      responded: true,
      response: "rejected",
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create notification for the project owner (brand)
    if (projectData?.createdBy) {
      await adminDb.collection("notifications").add({
        userId: projectData.userId,
        message: `A creator has declined your project invitation for: ${projectData?.title || projectId}`,
        status: "unread",
        type: "invitation_rejected",
        createdAt: FieldValue.serverTimestamp(),
        relatedTo: "project",
        projectId,
      });
    }

    // Create confirmation notification for the creator
    await adminDb.collection("notifications").add({
      userId: userId.trim(),
      message: `You've declined the project invitation for: ${projectData?.title || projectId}.`,
      status: "unread",
      type: "invitation_response_confirmation",
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: "project",
      projectId,
    });

    return NextResponse.json({
      success: true,
      message: "Project invitation declined successfully.",
    });
  } catch (error) {
    console.error("Error rejecting project invitation:", error);
    return NextResponse.json(
      {
        error: "Failed to reject project invitation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}