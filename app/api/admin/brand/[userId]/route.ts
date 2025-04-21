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
    
    // Get brand profile from userId
    const brandRef = adminDb.collection("brandProfiles").doc(userId);
    const brandDoc = await brandRef.get();
    
    if (!brandDoc.exists) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }
    
    const brandData = brandDoc.data();
    
    // Ensure all required fields exist
    if (!brandData) {
      return NextResponse.json({ error: "Brand data is empty" }, { status: 404 });
    }
    
    // Ensure status field exists
    if (!brandData.status || 
        !['pending', 'approved', 'rejected', 'suspended', 'info_requested'].includes(brandData.status)) {
      brandData.status = 'pending';
    }
    
    // Structure the response to match what your component expects
    const brand = {
      userId: userId,
      email: brandData.email || '',
      brandName: brandData.brandName || '',
      logoUrl: brandData.logoUrl || '',
      address: brandData.address || '',
      phoneNumber: brandData.phoneNumber || '',
      website: brandData.website || '',
      status: brandData.status,
      socialMedia: brandData.socialMedia || {
        instagram: '',
        facebook: '',
        twitter: '',
        youtube: ''
      },
      createdAt: brandData.createdAt || new Date().toISOString()
    };
    
    // Return the brand data
    return NextResponse.json({ brand });
  } catch (error) {
    console.error("Error fetching brand details:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch brand details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}