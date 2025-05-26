import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";

// GET video by ID
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { videoId } = params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Get video document
    const videoDoc = await adminDb.collection("videos").doc(videoId).get();
    
    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();

    return NextResponse.json({ 
      success: true,
      video: {
        id: videoId,
        ...videoData
      }
    });

  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// UPDATE video
export async function PUT(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { videoId } = params;
    const updates = await request.json();
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Update video document
    const videoRef = adminDb.collection("videos").doc(videoId);
    await videoRef.update(updates);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

// DELETE video
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { videoId } = params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Get video data first to get file URLs
    const videoDoc = await adminDb.collection("videos").doc(videoId).get();
    
    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();
    
    // Delete files from storage
    if (videoData?.videoUrl) {
      try {
        const videoFileName = videoData.videoUrl.split('/').pop();
        if (videoFileName) {
          await adminStorage.bucket().file(`videos/${videoFileName}`).delete();
        }
      } catch (error) {
        console.error("Error deleting video file:", error);
      }
    }

    if (videoData?.thumbnailUrl) {
      try {
        const thumbnailFileName = videoData.thumbnailUrl.split('/').pop();
        if (thumbnailFileName) {
          await adminStorage.bucket().file(`thumbnails/${thumbnailFileName}`).delete();
        }
      } catch (error) {
        console.error("Error deleting thumbnail file:", error);
      }
    }

    // Delete document from Firestore
    await adminDb.collection("videos").doc(videoId).delete();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";