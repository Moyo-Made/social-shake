import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    
    // Get creator profile from userId
    const creatorRef = adminDb.collection("creatorProfiles").doc(userId);
    const creatorDoc = await creatorRef.get();
    
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }
    
    const creatorData = creatorDoc.data();
    
    // Make sure status field exists
    if (creatorData && (!creatorData.status || 
        !['pending', 'approved', 'rejected', 'suspended', 'info_requested'].includes(creatorData.status))) {
      creatorData.status = 'pending';
    }
    
    // Return the creator data with correct id
    return NextResponse.json({ 
      creator: {
        id: userId,
        userId: userId,
        ...creatorData
      } 
    });
  } catch (error) {
    console.error("Error fetching creator details:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch creator details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}