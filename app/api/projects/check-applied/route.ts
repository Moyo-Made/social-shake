import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const projectId = url.searchParams.get('projectId');
  
  if (!userId || !projectId) {
    return NextResponse.json(
      { message: 'Missing required parameters' },
      { status: 400 }
    );
  }
  
  try {
    // Query the project_applications collection to check if the user has applied
    const applicationsRef = adminDb.collection('project_applications');
    const query = applicationsRef
      .where('userId', '==', userId)
      .where('projectId', '==', projectId)
      .limit(1);
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ hasApplied: false });
    }
    
    // User has applied, get the application data and status
    const applicationDoc = snapshot.docs[0];
    const applicationData = applicationDoc.data();
    
    return NextResponse.json({
      hasApplied: true,
      applicationStatus: applicationData.status || 'pending',
      applicationId: applicationDoc.id
    });
  } catch (error) {
    console.error('Error checking if user applied for project:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}