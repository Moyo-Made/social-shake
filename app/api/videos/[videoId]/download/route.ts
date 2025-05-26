import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, adminAuth } from '@/config/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization token provided');
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;
    console.log('User authenticated:', userId);

    // Verify user has purchased this video
    const purchaseQuery = await adminDb
      .collection('purchases')
      .where('userId', '==', userId)
      .where('videoId', '==', videoId)
      .where('status', '==', 'completed')
      .get();

    if (purchaseQuery.empty) {
      console.error('Video not purchased or access denied for user:', userId, 'video:', videoId);
      return NextResponse.json({ error: 'Video not purchased or access denied' }, { status: 403 });
    }

    console.log('Purchase verified for user:', userId);

    // Get video details
    const videoDoc = await adminDb.collection('videos').doc(videoId).get();
    
    if (!videoDoc.exists) {
      console.error('Video not found:', videoId);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoData = videoDoc.data();
    console.log('Video data retrieved:', { videoPath: videoData?.videoPath });

    if (!videoData?.videoPath) {
      console.error('Video path not found in video data');
      return NextResponse.json({ error: 'Video file path not found' }, { status: 404 });
    }

    // Generate signed URL for download (Firebase Storage)
    const bucket = adminStorage.bucket();
    const file = bucket.file(videoData.videoPath);

    // Check if file exists
    const [fileExists] = await file.exists();
    if (!fileExists) {
      console.error('Video file does not exist in storage:', videoData.videoPath);
      return NextResponse.json({ error: 'Video file not found in storage' }, { status: 404 });
    }

    console.log('File exists in storage, generating signed URL');

    // Generate signed URL for download
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 3600000, // 1 hour
      responseDisposition: `attachment; filename="${videoData.fileName || 'video.mp4'}"`,
    });

    console.log('Signed URL generated successfully');

    // Update download count
    try {
      const purchaseId = purchaseQuery.docs[0].id;
      const currentDownloads = purchaseQuery.docs[0].data().downloadCount || 0;
      
      await adminDb.collection('purchases').doc(purchaseId).update({
        downloadCount: currentDownloads + 1,
        lastDownloadAt: new Date().toISOString(),
      });
      
      console.log('Download count updated');
    } catch (updateError) {
      console.error('Failed to update download count:', updateError);
      // Don't fail the download if we can't update the count
    }

    // Return the signed URL instead of redirecting
    // This allows the frontend to handle the download properly
    return NextResponse.json({ 
      downloadUrl: signedUrl,
      fileName: videoData.fileName || 'video.mp4'
    });

  } catch (error) {
    console.error('Download error:', error);
    
    // Handle specific Firebase Auth errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Download failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}