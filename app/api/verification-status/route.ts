import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Get verification document from Firestore
    const verificationRef = adminDb.collection("creator_verifications").doc(userId);
    const verificationDoc = await verificationRef.get();

    if (!verificationDoc.exists) {
      return NextResponse.json(
        { error: "Verification record not found" },
        { status: 404 }
      );
    }

    const data = verificationDoc.data();
    
    return NextResponse.json({
      status: data?.status || "pending",
      rejectionReason: data?.rejectionReason || null,
      infoRequest: data?.infoRequest || null,
      suspensionReason: data?.suspensionReason || null,
      updatedAt: data?.updatedAt || null,
      createdAt: data?.createdAt || null
    });

  } catch (error) {
    console.error("Error fetching verification status:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}