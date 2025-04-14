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
	  
	  // Make sure status field exists and is properly formatted as BrandStatus
	  // If it doesn't exist in the database, default to 'pending'
	  if (brandData && (!brandData.status || 
		  !['pending', 'approved', 'rejected', 'suspended', 'info_requested'].includes(brandData.status))) {
		brandData.status = 'pending';
	  }
	  
	  // Return the brand data with correct id and userId
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