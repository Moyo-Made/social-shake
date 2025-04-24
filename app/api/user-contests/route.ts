import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user-contests
export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const userId = url.searchParams.get('userId');
	
	if (!userId) {
	  return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
	}
	
	try {
	  // Get all contests the user has applied to
	  const appliedContests = await getAppliedContests(userId);
	  
	  // Get all contests the user has joined
	  const joinedContests = await getJoinedContests(userId);
	  
	  // Get all contests the user has marked as interested
	  const interestedContests = await getInterestedContests(userId);
	  
	  // Create a map to track unique contests
	  const contestMap = new Map();
	  
	  // Process applied contests
	  for (const item of appliedContests) {
		const contestId = item.contestId;
		const contestData = await getContestDetails(contestId);
		if (contestData) {
		  contestMap.set(contestId, {
			...contestData,
			status: item.status, // 'pending', 'approved', 'rejected'
			applicationId: item.id
		  });
		}
	  }
	  
	  // Process joined contests
	  for (const item of joinedContests) {
		const contestId = item.contestId;
		const contestData = await getContestDetails(contestId);
		if (contestData) {
		  // Check if contest is completed
		  const isCompleted = isContestEnded(contestData);
		  contestMap.set(contestId, {
			...contestData,
			status: isCompleted ? 'completed' : 'joined',
			joinedAt: item.createdAt
		  });
		}
	  }
	  
	  // Process interested contests (only if not already in map)
	  for (const item of interestedContests) {
		const contestId = item.id;
		if (!contestMap.has(contestId)) {
		  const contestData = await getContestDetails(contestId);
		  if (contestData) {
			contestMap.set(contestId, {
			  ...contestData,
			  status: 'interested',
			  interestId: item.id
			});
		  }
		}
	  }
	  
	  // Convert map to array
	  const userContests = Array.from(contestMap.values());
	  
	  return NextResponse.json({ contests: userContests });
	} catch (error) {
	  console.error('Error fetching user contests:', error);
	  return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
  }
  
  // Helper functions
  async function getAppliedContests(userId: string) {
	const applicationsRef = adminDb.collection('contest_applications');
	const snapshot = await applicationsRef.where('userId', '==', userId).get();
	return snapshot.docs.map(doc => ({ id: doc.id, contestId: doc.data().contestId, status: doc.data().status, ...doc.data() }));
  }
  
  async function getJoinedContests(userId: string) {
	const submissionsRef = adminDb.collection('contest_submissions');
	const snapshot = await submissionsRef.where('userId', '==', userId).get();
	return snapshot.docs.map(doc => ({ id: doc.id, contestId: doc.data().contestId || '', createdAt: doc.data().createdAt, ...doc.data() }));
  }
  
  async function getInterestedContests(userId: string) {
	const interestsRef = adminDb.collection('contest_interests');
	const snapshot = await interestsRef.where('userId', '==', userId).get();
	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  async function getContestDetails(contestId: string) {
	const contestRef = adminDb.collection('contests').doc(contestId);
	const doc = await contestRef.get();
	if (!doc.exists) return null;
	return { id: doc.id, ...doc.data() };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function isContestEnded(contest: { id?: string; endDate?: any; }) {
	const endDate = new Date(contest.endDate);
	const now = new Date();
	return endDate < now;
  }