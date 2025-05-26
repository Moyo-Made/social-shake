import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Increment view count
    const videoRef = adminDb.collection("videos").doc(videoId);
    
    await videoRef.update({
      views: FieldValue.increment(1)
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";