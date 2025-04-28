import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(request: NextRequest) {
  const { userId, projectId, currentSavedState, interestId } = await request.json();
  
  if (!userId || !projectId) {
	return NextResponse.json(
	  { message: 'Missing required parameters' },
	  { status: 400 }
	);
  }
  
  try {
	const interestsRef = adminDb.collection('project_interests');
	
	// If currently saved, remove the interest
	if (currentSavedState && interestId) {
	  await interestsRef.doc(interestId).delete();
	  return NextResponse.json({ isSaved: false, message: 'Project unsaved successfully' });
	} 
	// If not saved, add a new interest
	else {
	  const newInterest = {
		userId,
		projectId,
		status: 'interested',
		createdAt: new Date().toISOString()
	  };
	  
	  const docRef = await interestsRef.add(newInterest);
	  return NextResponse.json({ 
		isSaved: true, 
		interestId: docRef.id,
		message: 'Project saved successfully' 
	  });
	}
  } catch (error) {
	console.error('Error toggling project saved status:', error);
	return NextResponse.json(
	  { message: 'Internal server error' },
	  { status: 500 }
	);
  }
}