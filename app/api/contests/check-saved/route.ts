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
    // Query the contest_interests collection to check if the user has saved this contest
    const interestsRef = adminDb.collection('contest_interests');
    const query = interestsRef
      .where('userId', '==', userId)
      .where('contestId', '==', contestId)
      .limit(1);
    
    const snapshot = await query.get();
    const isSaved = !snapshot.empty;
    
    // If saved, return the document ID for easy toggling later
    const interestId = isSaved ? snapshot.docs[0].id : null;
    
    return NextResponse.json({ isSaved, interestId });
  } catch (error) {
    console.error('Error checking if user saved contest:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}