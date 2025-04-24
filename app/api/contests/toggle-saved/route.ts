import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(request: NextRequest) {
  const { userId, contestId, currentSavedState, interestId } = await request.json();
  
  if (!userId || !contestId) {
    return NextResponse.json(
      { message: 'Missing required parameters' },
      { status: 400 }
    );
  }
  
  try {
    const interestsRef = adminDb.collection('contest_interests');
    
    // If currently saved, remove the interest
    if (currentSavedState && interestId) {
      await interestsRef.doc(interestId).delete();
      return NextResponse.json({ isSaved: false, message: 'Contest unsaved successfully' });
    } 
    // If not saved, add a new interest
    else {
      const newInterest = {
        userId,
        contestId,
        status: 'interested',
        createdAt: new Date().toISOString()
      };
      
      const docRef = await interestsRef.add(newInterest);
      return NextResponse.json({ 
        isSaved: true, 
        interestId: docRef.id,
        message: 'Contest saved successfully' 
      });
    }
  } catch (error) {
    console.error('Error toggling contest saved status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}