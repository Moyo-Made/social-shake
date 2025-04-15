import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// Use the correct type structure for App Router
export async function GET(
  request: NextRequest,
  context: { params: { userId: string } }
) {
  try {
    const userId = context.params.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Get brand profile from userId
    const brandRef = adminDb.collection("brandProfiles").doc(userId);
    const brandDoc = await brandRef.get();
    
    if (!brandDoc.exists) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }
    
    const brandData = brandDoc.data();
    
    // Make sure status field exists
    if (brandData && (!brandData.status || 
        !['pending', 'approved', 'rejected', 'suspended', 'info_requested'].includes(brandData.status))) {
      brandData.status = 'pending';
    }
    
    // Return the brand data with correct id
    return NextResponse.json({ 
      brand: {
        id: userId,
        userId: userId,
        ...brandData
      } 
    });
  } catch (error) {
    console.error("Error fetching brand details:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch brand details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}