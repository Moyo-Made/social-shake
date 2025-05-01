import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
	  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}
	
	const token = authHeader.split('Bearer ')[1];
	
	try {
	  const decodedToken = await adminAuth.verifyIdToken(token);
	  const userId = decodedToken.uid;
	  
	  const { projectId } = await request.json();
	  
	  if (!projectId) {
		return NextResponse.json({ message: "Project ID is required" }, { status: 400 });
	  }
	  
	  // Query the project_applications collection to check if the user has applied
	  const applicationsRef = adminDb.collection('project_applications');
	  const query = applicationsRef
		.where('userId', '==', userId)
		.where('projectId', '==', projectId)
		.limit(1);
	  
	  const querySnapshot = await query.get();
	  
	  if (querySnapshot.empty) {
		return NextResponse.json({ 
		  message: "Application not found",
		  details: `No application found for user ${userId} and project ${projectId}`
		}, { status: 404 });
	  }
	  
	  // Get the document reference and delete it
	  const applicationDoc = querySnapshot.docs[0];
	  await applicationDoc.ref.delete();
	  
	  // Update project stats if needed
	  const projectRef = adminDb.collection("projects").doc(projectId);
	  const projectSnap = await projectRef.get();
	  
	  if (projectSnap.exists) {
		const projectData = projectSnap.data();
		const updatedApplicantCount = Math.max(0, (projectData?.applicantCount || 0) - 1);
		
		await projectRef.update({
		  applicantCount: updatedApplicantCount
		});
	  }
	  
	  return NextResponse.json({ 
		message: "Application successfully canceled",
		applicationId: applicationDoc.id  // Include the ID for reference
	  }, { status: 200 });
	} catch (tokenError) {
	  console.error("Token verification failed:", tokenError);
	  return NextResponse.json({ message: "Invalid authentication token" }, { status: 401 });
	}
  } catch (error) {
	console.error("Error canceling application:", error);
	return NextResponse.json({ message: "Failed to cancel application" }, { status: 500 });
  }
}