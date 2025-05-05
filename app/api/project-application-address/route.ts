
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return data;
  
  const result = { ...data };
  
  // Convert timestamp fields to ISO strings
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[key] = convertTimestampsToISO(value as Record<string, unknown>);
    }
  }
  
  return result;
}

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

// Helper function to check if user has access to project
async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  try {
    // Check if user is the project owner
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) return false;
    
    const projectData = projectDoc.data();
    
    // If user is the owner or has admin role
    if (projectData?.userId === userId) return true;
    
    // Check if user is an admin
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.isAdmin === true;
  } catch (error) {
    console.error("Error checking project access:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const applicationId = url.searchParams.get('applicationId');
    
    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }
    
    // Get the current user ID
    const currentUserId = await getCurrentUserId(request);
    
    // Get the application details
    const applicationDoc = await adminDb.collection("project_applications").doc(applicationId).get();
    
    if (!applicationDoc.exists) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }
    
    const applicationData = applicationDoc.data();
    const projectId = applicationData?.projectId;
    const applicantUserId = applicationData?.userId;
    
    // Check if the current user has access to the project
    const hasAccess = await canAccessProject(currentUserId, projectId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to access this application's shipping address" },
        { status: 403 }
      );
    }
    
    // Fetch the shipping address for the applicant
    const addressesSnapshot = await adminDb
      .collection("shipping_addresses")
      .where("userId", "==", applicantUserId)
      .where("isDefault", "==", true)
      .limit(1)
      .get();
    
    // If no default address found, try to get any address
    if (addressesSnapshot.empty) {
      const anyAddressSnapshot = await adminDb
        .collection("shipping_addresses")
        .where("userId", "==", applicantUserId)
        .limit(1)
        .get();
        
      if (anyAddressSnapshot.empty) {
        return NextResponse.json(
          { error: "No shipping address found for this applicant" },
          { status: 404 }
        );
      }
      
      const addressDoc = anyAddressSnapshot.docs[0];
      return NextResponse.json({
        id: addressDoc.id,
        ...convertTimestampsToISO(addressDoc.data() || null)
      });
    }
    
    // Return the default address
    const addressDoc = addressesSnapshot.docs[0];
    return NextResponse.json({
      id: addressDoc.id,
      ...convertTimestampsToISO(addressDoc.data() || null)
    });
    
  } catch (error) {
    console.error("Error fetching application shipping address:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch shipping address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}