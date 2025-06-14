import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { notificationId, projectId, userId } = body;

    console.log("Received project acceptance data:", {
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

    // Create the application document with "approved" status (accepted invitation)
    const applicationData = {
      userId: userId.trim(),
      projectId,
      reason: "Accepted project invitation",
      productOwnership: "have", // Default for invited creators
      deliveryTime: "flexible", // Default for invited creators
      canShip: true,
      status: "approved", // Direct status since it's an accepted invitation
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      invitationAccepted: true,
    };

    // Create the application document 
    const applicationRef = adminDb.collection("project_applications").doc();
    await applicationRef.set(applicationData);

    // Update the notification to mark as responded and project applicants count
    await Promise.all([
      notificationRef.update({
        responded: true,
        response: "accepted",
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      projectRef.update({
        applicantsCount: FieldValue.increment(1),
      })
    ]);

    // Send notifications to both brand and creator
    await Promise.all([
      // Notification for brand (project owner)
      adminDb.collection("notifications").add({
        userId: projectData?.userId,
        message: `Great news! A creator has accepted your project invitation for "${projectData?.title || projectId}". They will now begin working on your content.`,
        status: "unread",
        type: "invitation_accepted",
        createdAt: FieldValue.serverTimestamp(),
        relatedTo: "project",
        projectId,
        applicationId: applicationRef.id,
      }),
      // Notification for creator (confirmation)
      adminDb.collection("notifications").add({
        userId: userId.trim(),
        message: `You've successfully accepted the project invitation for "${projectData?.title || projectId}". You can now start working on the project.`,
        status: "unread",
        type: "invitation_accepted_creator",
        createdAt: FieldValue.serverTimestamp(),
        relatedTo: "project",
        projectId,
        applicationId: applicationRef.id,
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Project invitation accepted successfully!",
      applicationId: applicationRef.id,
    });
  } catch (error) {
    console.error("Error accepting project invitation:", error);
    return NextResponse.json(
      {
        error: "Failed to accept project invitation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}