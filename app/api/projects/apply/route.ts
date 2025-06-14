import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Helper function to get the current user ID from the request
async function getCurrentUserId(request: NextRequest): Promise<string> {
  const auth = getAuth();
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization token');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    throw new Error('Unauthorized access');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user ID from the token
    const userId = await getCurrentUserId(request);
    
    // Parse the request body
    const body = await request.json();
    const {
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

    // Validate other required fields
    if (!projectId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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
      userId,
      projectId,
      reason,
      productOwnership,
      deliveryTime,
      ...(productOwnership === "need" && shippingAddress ? { shippingAddress } : {}),
      canShip: productOwnership === "need" ? !!canShip : true,
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

    // Send notifications using Promise.all for better performance
    const notificationPromises = [
      // Notification for the applicant
      adminDb.collection("notifications").add({
        userId,
        message: "Your application has been submitted for review. We'll notify you once it's approved.",
        status: "unread",
        type: "project_application",
        createdAt: FieldValue.serverTimestamp(),
        relatedTo: "project",
        projectId,
        applicationId: applicationRef.id,
      })
    ];

    // Add notification for project owner if they exist
    if (projectData?.userId) {
      notificationPromises.push(
        adminDb.collection("notifications").add({
          userId: projectData.userId,
          message: `New application received for project: ${projectData?.title || projectId}`,
          status: "unread",
          type: "new_application",
          createdAt: FieldValue.serverTimestamp(),
          relatedTo: "project",
          projectId,
          applicationId: applicationRef.id,
        })
      );
    }

    // Execute all notifications concurrently
    await Promise.all(notificationPromises);

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully. It will be reviewed by the project owner.",
      applicationId: applicationRef.id,
    });
  } catch (error) {
    console.error("Error submitting project application:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to submit application",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}