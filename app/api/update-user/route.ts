import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, firstName, lastName } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Update the user document
    await adminDb.collection("users").doc(userId).update({
      firstName,
      lastName,
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: "User data updated successfully"
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to update user data";
      
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}