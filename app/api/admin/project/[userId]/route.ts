import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// GET project details by projectId
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const projectId = params.projectId;
    
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }
    
    // Get project details from projectId
    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const projectData = projectDoc.data();
    
    // Make sure status field exists
    if (projectData && (!projectData.status || 
        !['active', 'completed', 'pending', 'canceled'].includes(projectData.status))) {
      projectData.status = 'pending';
    }
    
    // Return the project data with correct id
    return NextResponse.json({ 
      project: {
        id: projectId,
        projectId: projectId,
        ...projectData
      } 
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch project details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}