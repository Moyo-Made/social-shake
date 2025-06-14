/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import * as admin from "firebase-admin";

// GET handler - Fetch individual project details
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    // FIXED: Await params before destructuring
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching project details for ID: ${projectId}`);

    // Get project document
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { 
          error: "Project not found", 
          exists: false 
        },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Increment view count (optional - only if you want to track views)
    try {
      await projectRef.update({
        "metrics.views": admin.firestore.FieldValue.increment(1),
        lastViewed: new Date().toISOString(),
      });
    } catch (viewError) {
      console.error("Error updating view count:", viewError);
      // Don't fail the request if view tracking fails
    }

    // Optionally, you can enhance the response with additional data
    // For example, get brand information
    let brandInfo = null;
    if (projectData?.userId) {
      try {
        const brandSnapshot = await adminDb
          .collection("brandProfiles")
          .where("userId", "==", projectData.userId)
          .limit(1)
          .get();

        if (!brandSnapshot.empty) {
          const brandData = brandSnapshot.docs[0].data();
          brandInfo = {
            companyName: brandData.companyName,
            brandName: brandData.brandName,
            logo: brandData.logo,
            website: brandData.website,
          };
        }
      } catch (brandError) {
        console.error("Error fetching brand info:", brandError);
        // Continue without brand info
      }
    }

    // Get application count for this project (if needed)
    let applicationCount = 0;
    try {
      const applicationsSnapshot = await adminDb
        .collection("applications")
        .where("projectId", "==", projectId)
        .get();
      applicationCount = applicationsSnapshot.size;
    } catch (appError) {
      console.error("Error getting application count:", appError);
    }

    const responseData = {
      ...projectData,
      brandInfo,
      metrics: {
        ...projectData?.metrics,
        applications: applicationCount,
      },
    };

    return NextResponse.json({
      success: true,
      exists: true,
      data: responseData,
    });

  } catch (error) {
    console.error("GET project details error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to retrieve project details",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PUT handler - Update individual project
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    // FIXED: Await params before destructuring
    const { projectId } = await params;
    const requestData = await request.json();
    const { userId, ...updateData } = requestData;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    console.log(`Updating project: ${projectId}`);

    // Verify project exists and user has permission
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const existingProject = projectDoc.data();
    
    // Check authorization
    if (existingProject?.userId !== userId && userId !== "admin") {
      return NextResponse.json(
        { error: "Not authorized to update this project" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    // Remove any undefined values
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });

    // Update project
    await projectRef.update(updatedData);

    // Get updated project data
    const updatedDoc = await projectRef.get();
    const updatedProject = updatedDoc.data();

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });

  } catch (error) {
    console.error("PUT project error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to update project",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete individual project
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    // FIXED: Await params before destructuring
    const { projectId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`Deleting project: ${projectId}`);

    // Verify project exists and user has permission
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const existingProject = projectDoc.data();
    
    // Check authorization
    if (existingProject?.userId !== userId && userId !== "admin") {
      return NextResponse.json(
        { error: "Not authorized to delete this project" },
        { status: 403 }
      );
    }

    // Optional: Clean up related data
    try {
      // Delete applications for this project
      const applicationsSnapshot = await adminDb
        .collection("applications")
        .where("projectId", "==", projectId)
        .get();

      const batch = adminDb.batch();
      applicationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete notifications for this project
      const notificationsSnapshot = await adminDb
        .collection("notifications")
        .where("projectId", "==", projectId)
        .get();

      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log("Cleaned up related project data");
    } catch (cleanupError) {
      console.error("Error cleaning up related data:", cleanupError);
      // Continue with project deletion even if cleanup fails
    }

    // Delete the project
    await projectRef.delete();

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
      projectId,
    });

  } catch (error) {
    console.error("DELETE project error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to delete project",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PATCH handler - Partial updates (e.g., status changes, metrics updates)
export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    // FIXED: Await params before destructuring
    const { projectId } = await params;
    const requestData = await request.json();
    const { userId, action, ...patchData } = requestData;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    console.log(`Patching project: ${projectId}, action: ${action}`);

    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const existingProject = projectDoc.data();

    // Handle different patch actions
    switch (action) {
      case "updateStatus":
        if (existingProject?.userId !== userId && userId !== "admin") {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 }
          );
        }
        await projectRef.update({
          status: patchData.status,
          updatedAt: new Date().toISOString(),
        });
        break;

      case "incrementMetric":
        const { metric, value = 1 } = patchData;
        if (!metric) {
          return NextResponse.json(
            { error: "Metric name is required" },
            { status: 400 }
          );
        }
        await projectRef.update({
          [`metrics.${metric}`]: admin.firestore.FieldValue.increment(value),
          updatedAt: new Date().toISOString(),
        });
        break;

      case "updateApplication":
        // For updating application-related fields
        await projectRef.update({
          applicationStatus: patchData.applicationStatus,
          updatedAt: new Date().toISOString(),
        });
        break;

      default:
        // Generic patch
        if (existingProject?.userId !== userId && userId !== "admin") {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 }
          );
        }
        await projectRef.update({
          ...patchData,
          updatedAt: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      action,
    });

  } catch (error) {
    console.error("PATCH project error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to patch project",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}