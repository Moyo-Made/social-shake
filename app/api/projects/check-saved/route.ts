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
	// Query the project_interests collection to check if the user has saved this project
	const interestsRef = adminDb.collection('project_interests');
	const query = interestsRef
	  .where('userId', '==', userId)
	  .where('projectId', '==', projectId)
	  .limit(1);
	
	const snapshot = await query.get();
	const isSaved = !snapshot.empty;
	
	// If saved, return the document ID for easy toggling later
	const interestId = isSaved ? snapshot.docs[0].id : null;
	
	return NextResponse.json({ isSaved, interestId });
  } catch (error) {
	console.error('Error checking if user saved project:', error);
	return NextResponse.json(
	  { message: 'Internal server error' },
	  { status: 500 }
	);
  }
}