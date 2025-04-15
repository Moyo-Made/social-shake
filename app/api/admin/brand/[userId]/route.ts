import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(
	request: NextRequest,
	{ params }: { params: { brandId: string } }
  ) {
	try {
	  const brandId = params.brandId;
	  
	  if (!brandId) {
		return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
	  }
	  
	  // Get brand profile from brandId
	  const brandRef = adminDb.collection("brandProfiles").doc(brandId);
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
	  
	  // Return the brand data with correct id
	  return NextResponse.json({ 
		brand: {
		  id: brandId,
		  userId: brandId, // Keeping this if needed for your app logic
		  ...brandData
		} 
	  });
	} catch (error) {
	  console.error("Error fetching brand details:", error);
	  const errorMessage = error instanceof Error ? error.message : "Failed to fetch brand details";
	  return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
  }