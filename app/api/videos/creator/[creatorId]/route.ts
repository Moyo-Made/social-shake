import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    
    // Make sure you're using the correct parameter name
    const creatorId = params.creatorId;
    
    console.log(`Fetching videos for creatorId: ${creatorId}, status: ${status}`);
    
    if (!creatorId) {
      return NextResponse.json(
        { error: "Creator ID is required" },
        { status: 400 }
      );
    }

    // Build query using Firebase Admin SDK
    const query = adminDb.collection("videos")
      .where("createdBy", "==", creatorId)
      .where("status", "==", status)
      .orderBy("uploadedAt", "desc");

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`No videos found for creatorId: ${creatorId}`);
      return NextResponse.json({ videos: [] });
    }

    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as {
        licenseType?: string;
        status?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uploadedAt?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
      }),
      // Ensure timestamps are serializable
      uploadedAt: doc.data().uploadedAt?.toDate().toISOString() || null
    }));

    console.log(`Found ${videos.length} videos for creatorId: ${creatorId}`);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch videos', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";