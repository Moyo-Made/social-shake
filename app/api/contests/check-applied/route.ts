import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const contestId = url.searchParams.get('contestId');
  
  if (!userId || !contestId) {
    return NextResponse.json(
      { message: 'Missing required parameters' },
      { status: 400 }
    );
  }
  
  try {
    // Query the contest_applications collection to check if the user has applied
    const applicationsRef = adminDb.collection('contest_applications');
    const query = applicationsRef
      .where('userId', '==', userId)
      .where('contestId', '==', contestId)
      .limit(1);
    
    const snapshot = await query.get();
    const hasApplied = !snapshot.empty;
    
    return NextResponse.json({ hasApplied });
  } catch (error) {
    console.error('Error checking if user applied for contest:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}