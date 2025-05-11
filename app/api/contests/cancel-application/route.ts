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
      if (!adminAuth) {
        throw new Error("Firebase admin is not initialized");
      }
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;
      
      const { contestId } = await request.json();
      
      if (!contestId) {
        return NextResponse.json({ message: "Contest ID is required" }, { status: 400 });
      }
      
      // Query the contest_applications collection to check if the user has applied
      if (!adminDb) {
        throw new Error("Firebase admin database is not initialized");
      }
      const applicationsRef = adminDb.collection('contest_applications');
      const query = applicationsRef
        .where('userId', '==', userId)
        .where('contestId', '==', contestId)
        .limit(1);
      
      const querySnapshot = await query.get();
      
      if (querySnapshot.empty) {
        return NextResponse.json({ 
          message: "Application not found",
          details: `No application found for user ${userId} and contest ${contestId}`
        }, { status: 404 });
      }
      
      // Get the document reference and delete it
      const applicationDoc = querySnapshot.docs[0];
      await applicationDoc.ref.delete();
      
      // Update contest stats if needed
      const contestRef = adminDb.collection("contests").doc(contestId);
      const contestSnap = await contestRef.get();
      
      if (contestSnap.exists) {
        const contestData = contestSnap.data();
        const updatedApplicantCount = Math.max(0, (contestData?.applicantCount || 0) - 1);
        
        await contestRef.update({
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