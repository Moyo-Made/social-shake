import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Missing required userId parameter' },
      { status: 400 }
    );
  }
  
  try {
    // 1. Query the project_applications collection to get all projects user has applied to
    const applicationsRef = adminDb.collection('project_applications');
    const applicationsQuery = applicationsRef
      .where('userId', '==', userId)
      .where('status', '==', 'approved') // Only get approved applications
      .limit(5); // Limit to 5 projects for performance
    
    const applicationsSnapshot = await applicationsQuery.get();
    
    if (applicationsSnapshot.empty) {
      return NextResponse.json({ 
        success: true,
        data: [] 
      });
    }
    
    // 2. Process each application to get project details and submission stats
    const userProjects = await Promise.all(applicationsSnapshot.docs.map(async (appDoc) => {
      const applicationData = appDoc.data();
      const projectId = applicationData.projectId;
      
      // Get project details
      const projectDoc = await adminDb.collection('projects').doc(projectId).get();
      if (!projectDoc.exists) {
        return null; // Skip if project doesn't exist
      }
      
      const projectData = projectDoc.data();
      
      // Get submissions for this project from the user
      const submissionsRef = adminDb.collection('project_submissions');
      const submissionsQuery = submissionsRef
        .where('userId', '==', userId)
        .where('projectId', '==', projectId);
      
      const submissionsSnapshot = await submissionsQuery.get();
      
      // Count approved submissions
      const approvedSubmissions = submissionsSnapshot.docs.filter(
        doc => doc.data().status === 'approved'
      ).length;
      
      // Get total required videos from project data
      // Assuming there's a field like totalVideosRequired or similar
      const totalVideosRequired = projectData?.creatorPricing.creator.totalVideos || 
                                 (projectData?.videoRequirements?.count) || 0; // Default to 3 if not specified
      
      return {
        projectId,
        projectName: projectData?.projectDetails.projectName || projectData?.basic?.projectName || "",
        approvedVideos: approvedSubmissions,
        totalVideos: totalVideosRequired,
        completionPercentage: (approvedSubmissions / totalVideosRequired) * 100
      };
    }));
    
    // Filter out null values and return the result
    const validProjects = userProjects.filter(project => project !== null);
    
    return NextResponse.json({
      success: true,
      data: validProjects
    });
    
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}