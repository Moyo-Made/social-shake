import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    
    // If no userId is provided, return error
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // If no ID but we have userId, try to find by userId alone
    if (!id) {
      console.log(`Searching for verification by userId: ${userId}`);
      
      const verificationSnapshot = await adminDb.collection("creator_verifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc") // Optional: get the most recent one
        .limit(1)
        .get();
      
      if (verificationSnapshot.empty) {
        console.log(`No verification found for userId: ${userId}`);
        return NextResponse.json(
          { error: "Verification not found" },
          { status: 404 }
        );
      }
      
      const doc = verificationSnapshot.docs[0];
      console.log(`Found verification by userId: ${doc.id}`);
      
      const data = doc.data();
      // Make sure we extract all URL fields explicitly to include in response
      return NextResponse.json({
        id: doc.id,
        ...data,
        profilePictureUrl: data.profilePictureUrl || null,
        verificationVideoUrl: data.verificationVideoUrl || null,
        verifiableIDUrl: data.verifiableIDUrl || null
      });
    }
    
    // Original implementation for when id is provided
    console.log(`Fetching verification with ID: ${id}`);
    const verificationRef = adminDb.collection("creator_verifications").doc(id);
    const docSnap = await verificationRef.get();
    
    if (!docSnap.exists) {
      console.log(`Verification with ID ${id} not found`);
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }
    
    const verificationData = docSnap.data();
    
    // Security check: Make sure the user can only access their own verification data
    if (verificationData?.userId !== userId) {
      console.log(`Unauthorized access attempt: ${userId} tried to access verification belonging to ${verificationData?.userId}`);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Make sure we extract all URL fields explicitly to include in response
    return NextResponse.json({
      id: docSnap.id,
      ...verificationData,
    });
  } catch (error) {
    console.error("Error fetching verification:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch verification",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic"; 
export const runtime = "nodejs";