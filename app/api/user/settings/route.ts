import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get user from Firestore
    const userRef = adminDb.collection("brandProfiles").doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    
    // Return only the necessary user settings
    // Make sure not to return sensitive information like password hashes
    const userSettings = {
      email: userData?.email,
      twoFactorMethod: userData?.twoFactorMethod || null,
      lastLogin: userData?.lastLogin || null,
      // Add other non-sensitive settings as needed
    };

    return NextResponse.json(userSettings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch user settings",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}