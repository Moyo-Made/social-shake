import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

interface Application {
  id: string;
  [key: string]: unknown; // To account for dynamic fields in the application data
}

export async function GET(request: NextRequest) {
  // Get the userId from the URL search params
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { success: false, message: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Query the contest_applications collection for entries matching the userId
    const applicationsRef = collection(db, 'contest_applications');
    const applicationsQuery = query(applicationsRef, where('userId', '==', userId));
    const applicationsSnapshot = await getDocs(applicationsQuery);

    // Convert the query snapshot to an array of application objects
    const applications: Application[] = [];
    applicationsSnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return NextResponse.json({
      success: true,
      data: applications
    });
  } catch (error: unknown) {
    console.error('Error fetching creator applications:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch applications',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}