import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching saved videos for userId: ${userId}`);
     
    // Query user's saved videos, ordered by save date (most recent first)
    const query = adminDb.collection("videoLibrary")
      .where("userId", "==", userId)
      .orderBy("savedAt", "desc");

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`No saved videos found for userId: ${userId}`);
      return NextResponse.json({ savedVideos: [] });
    }

    // Get all unique video IDs for batch fetch
    const videoIds = snapshot.docs.map(doc => doc.data().videoId);
    const uniqueVideoIds = [...new Set(videoIds)];

    // Batch fetch video data from videos collection
    const videoDataMap = new Map();
    
    // Firestore batch read limit is 500, so we need to chunk if we have more
    const chunkSize = 500;
    for (let i = 0; i < uniqueVideoIds.length; i += chunkSize) {
      const chunk = uniqueVideoIds.slice(i, i + chunkSize);
      const videoPromises = chunk.map(videoId => 
        adminDb.collection("videos").doc(videoId).get()
      );
      
      const videoDocs = await Promise.all(videoPromises);
      
      videoDocs.forEach((doc, index) => {
        if (doc.exists) {
          videoDataMap.set(chunk[index], doc.data());
        }
      });
    }

    // Enrich saved videos with data from the videos collection
    const enrichedVideos = snapshot.docs.map(doc => {
      const libraryData = doc.data();
      const videoData = videoDataMap.get(libraryData.videoId) || {};

      return {
        id: doc.id,
        videoId: libraryData.videoId,
        userId: libraryData.userId,
        creatorId: libraryData.creatorId,
        creatorName: libraryData.creatorName,
        savedAt: libraryData.savedAt?.toDate().toISOString() || null,
        // Video details from videos collection
        title: videoData.title || libraryData.title || "Untitled",
        description: videoData.description || "",
        thumbnailUrl: videoData.thumbnailUrl || libraryData.thumbnailUrl || null,
        videoUrl: videoData.videoUrl || null,
        tags: videoData.tags || [],
        licenseType: videoData.licenseType || null,
        price: videoData.price || null,
        views: videoData.views || 0,
        purchases: videoData.purchases || 0,
        status: videoData.status || "active",
        fileName: videoData.fileName || null,
        fileSize: videoData.fileSize || null,
        uploadedAt: videoData.uploadedAt?.toDate().toISOString() || null,
      };
    });

    console.log(`Found ${enrichedVideos.length} saved videos for userId: ${userId}`);
    return NextResponse.json({ savedVideos: enrichedVideos });

  } catch (error) {
    console.error("Error fetching saved videos:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch saved videos",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, userId, creatorId, creatorName } = body;

    if (!videoId || !userId || !creatorId || !creatorName) {
      return NextResponse.json(
        { error: "Missing required fields: videoId, userId, creatorId, creatorName" },
        { status: 400 }
      );
    }

    console.log(`Saving video to library - userId: ${userId}, videoId: ${videoId}`);

    // Check if video is already saved by this user
    const existingQuery = adminDb.collection("videoLibrary")
      .where("userId", "==", userId)
      .where("videoId", "==", videoId);

    const existingSnapshot = await existingQuery.get();
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "Video is already saved to your library" },
        { status: 409 }
      );
    }

    // Fetch video details from the videos collection
    const videoDoc = await adminDb.collection("videos").doc(videoId).get();
    
    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();

    // Save minimal data to library - we'll fetch the rest on GET
    const libraryData = {
      videoId,
      userId,
      creatorId,
      creatorName,
      // Store basic info for fallback
      title: videoData?.title || "Untitled",
      thumbnailUrl: videoData?.thumbnailUrl || null,
      savedAt: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection("videoLibrary").add(libraryData);
    
    console.log(`Video saved to library successfully with ID: ${docRef.id}`);
    
    return NextResponse.json({
      success: true,
      libraryId: docRef.id,
      message: "Video saved to library successfully"
    });

  } catch (error) {
    console.error("Error saving video to library:", error);
    return NextResponse.json(
      { 
        error: "Failed to save video to library",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const videoId = searchParams.get("videoId");
    
    if (!userId || !videoId) {
      return NextResponse.json(
        { error: "User ID and Video ID are required" },
        { status: 400 }
      );
    }

    console.log(`Removing video from library - userId: ${userId}, videoId: ${videoId}`);

    // Find and delete the saved video entry
    const query = adminDb.collection("videoLibrary")
      .where("userId", "==", userId)
      .where("videoId", "==", videoId);

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return NextResponse.json(
        { error: "Video not found in your library" },
        { status: 404 }
      );
    }

    // Delete all matching documents (should be only one)
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Video removed from library successfully`);
    
    return NextResponse.json({
      success: true,
      message: "Video removed from library successfully"
    });

  } catch (error) {
    console.error("Error removing video from library:", error);
    return NextResponse.json(
      { 
        error: "Failed to remove video from library",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";