// api/videos/[videoId]/increment-purchase/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    // Handle both Next.js 14 and 15+ parameter handling
    let videoId: string;
    
    try {
      const resolvedParams = await params;
      videoId = resolvedParams.videoId;
    } catch {
      // Fallback for older Next.js versions
      const syncParams = params as unknown as { videoId: string };
      videoId = syncParams.videoId;
    }
    
    console.log('=== INCREMENT PURCHASE DEBUG ===');
    console.log('Video ID from params:', videoId);
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    
    // Validate videoId
    if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
      console.error('Invalid video ID:', videoId);
      return NextResponse.json(
        { success: false, error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const trimmedVideoId = videoId.trim();
    console.log('Trimmed video ID:', trimmedVideoId);

    // Test Firebase connection
    try {
      await adminDb.collection('videos').limit(1).get();
      console.log('Firebase connection successful');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (firebaseError: any) {
      console.error('Firebase connection error:', firebaseError);
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Get video document reference
    const videoRef = adminDb.collection('videos').doc(trimmedVideoId);
    console.log('Video reference path:', videoRef.path);
    
    // Check if video exists
    console.log('Fetching video document...');
    const videoDoc = await videoRef.get();
    
    if (!videoDoc.exists) {
      console.error('Video not found:', trimmedVideoId);
      console.log('Checking if video exists in collection...');
      
      // Debug: List some videos to see if collection exists
      try {
        const videosSnapshot = await adminDb.collection('videos').limit(5).get();
        console.log('Videos collection size:', videosSnapshot.size);
        console.log('Sample video IDs:', videosSnapshot.docs.map(doc => doc.id));
      } catch (listError) {
        console.error('Error listing videos:', listError);
      }
      
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Get current data
    const videoData = videoDoc.data();
    console.log('Video data keys:', Object.keys(videoData || {}));
    
    const currentPurchases = videoData?.purchases || 0;
    const newPurchaseCount = currentPurchases + 1;
    
    console.log('Current purchases:', currentPurchases);
    console.log('New purchase count:', newPurchaseCount);
    
    // Update video purchase count
    const updateData = {
      purchases: newPurchaseCount,
      updatedAt: new Date().toISOString()
    };
    
    console.log('Updating video with data:', updateData);
    
    await videoRef.update(updateData);
    
    console.log('Purchase count updated successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Purchase count updated successfully',
      data: {
        videoId: trimmedVideoId,
        previousCount: currentPurchases,
        newCount: newPurchaseCount,
        updatedAt: updateData.updatedAt
      }
    });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('=== INCREMENT PURCHASE ERROR ===');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error stack:', error?.stack);
    
    // Handle specific Firebase errors
    if (error?.code === 'permission-denied') {
      console.error('Firebase permission denied - check security rules');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database permission denied. Check Firebase security rules.' 
        },
        { status: 403 }
      );
    }
    
    if (error?.code === 'not-found') {
      return NextResponse.json(
        { success: false, error: 'Video document not found' },
        { status: 404 }
      );
    }
    
    if (error?.code === 'unavailable') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database temporarily unavailable. Please try again.' 
        },
        { status: 503 }
      );
    }

    if (error?.code === 'unauthenticated') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database authentication failed. Check Firebase config.' 
        },
        { status: 401 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update purchase count',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Also export other HTTP methods to ensure proper routing
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to increment purchase count.' },
    { status: 405 }
  );
}