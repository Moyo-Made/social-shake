import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      userId,
      projectId,
      reason,
      productOwnership,
      deliveryTime,
      shippingAddress,
      canShip,
    } = body;

    console.log("Received project application data:", {
      userId,
      projectId,
      hasData: !!body,
    });

    // Validate userId
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
    if (!projectId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the user exists in Auth system
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

    // Check if this user has already applied to this project
    const existingApplicationQuery = await adminDb
      .collection("project_applications")
      .where("userId", "==", userId)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();

    if (!existingApplicationQuery.empty) {
      return NextResponse.json(
        { error: "You have already applied to this project" },
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

    // Check if the project is still open for applications
    const now = new Date();
    if (projectData?.endDate && new Date(projectData.endDate) < now) {
      return NextResponse.json(
        { error: "This project is no longer accepting applications" },
        { status: 400 }
      );
    }

    // Validate shipping address if product needs to be shipped
    if (productOwnership === "need" && !canShip) {
      return NextResponse.json(
        { error: "Cannot ship to the provided address" },
        { status: 400 }
      );
    }

    // Create the application document
    const applicationData = {
      userId: userId.trim(),
      projectId,
      reason,
      productOwnership,
      deliveryTime,
      shippingAddress: productOwnership === "need" ? shippingAddress : null,
      canShip: productOwnership === "need" ? canShip : true,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Create the application document
    const applicationRef = adminDb.collection("project_applications").doc();
    await applicationRef.set(applicationData);

    // Update project applicants count
    await projectRef.update({
      applicantsCount: FieldValue.increment(1),
    });

    // Create notification for the applicant
    await adminDb.collection("notifications").add({
      userId: userId.trim(),
      message: "Your application has been submitted for review. We'll notify you once it's approved.",
      status: "unread",
      type: "project_application",
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: "project",
      projectId,
    });

    // Create notification for the project owner
    if (projectData?.createdBy) {
      await adminDb.collection("notifications").add({
        userId: projectData.createdBy,
        message: `New application received for project: ${projectData?.title || projectId}`,
        status: "unread",
        type: "new_application",
        createdAt: FieldValue.serverTimestamp(),
        relatedTo: "project",
        projectId,
        applicationId: applicationRef.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully. It will be reviewed by the project owner.",
      applicationId: applicationRef.id,
    });
  } catch (error) {
    console.error("Error submitting project application:", error);
    return NextResponse.json(
      {
        error: "Failed to submit application",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}