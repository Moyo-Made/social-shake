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
    // Query the contest_submissions collection to check if the user has joined
    const submissionsRef = adminDb.collection('contest_submissions');
    const query = submissionsRef
      .where('userId', '==', userId)
      .where('contestId', '==', contestId)
      .limit(1);

    const snapshot = await query.get();
    const hasJoined = !snapshot.empty;

    return NextResponse.json({ hasJoined });
  } catch (error) {
    console.error('Error checking if user joined contest:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}