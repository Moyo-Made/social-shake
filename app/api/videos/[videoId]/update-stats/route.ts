import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { videoId } = params;
    const { action } = await request.json();

    const videoRef = adminDb.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoData = videoDoc.data();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    switch (action) {
      case 'purchase':
        updateData.purchases = (videoData?.purchases || 0) + 1;
        break;
      case 'view':
        updateData.views = (videoData?.views || 0) + 1;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await videoRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `Video ${action} count updated`
    });

  } catch (error) {
    console.error('Error updating video stats:', error);
    return NextResponse.json({ error: 'Failed to update video stats' }, { status: 500 });
  }
}