import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Test Firebase connection
    try {
      await adminDb.collection('purchases').limit(1).get();
      console.log('Firebase connection successful');
    } catch (firebaseError) {
      console.error('Firebase connection error:', firebaseError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Query purchases collection for this user using Admin SDK methods
    const querySnapshot = await adminDb
      .collection('purchases')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .orderBy('purchasedAt', 'desc')
      .get(); // Use .get() for Admin SDK, not getDocs()

    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      purchases,
      count: purchases.length
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching user purchases:', error);
    
    // Handle specific Firestore errors
    if (error?.code === 'failed-precondition') {
      return NextResponse.json({
        error: 'Database index required. Please create a composite index for userId, status, and purchasedAt fields.',
        indexUrl: error?.message?.match(/https:\/\/[^\s]+/)?.[0] || null
      }, { status: 400 });
    }

    if (error?.code === 'permission-denied') {
      return NextResponse.json({
        error: 'Database permission denied. Check Firebase rules.'
      }, { status: 403 });
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch purchases',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}