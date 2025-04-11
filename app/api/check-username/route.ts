import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    console.log('Checking username availability:', username);

    // Validate input
    if (!username) {
      console.warn('No username provided in request');
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    // Query Firestore to check if the username exists
    // Using a case-insensitive search since usernames are typically stored lowercase
    const usernameQuery = adminDb
      .collection("creatorProfiles")
      .where("username", "==", username.toLowerCase());
    
    const querySnapshot = await usernameQuery.get();

    const exists = !querySnapshot.empty;
    console.log(`Username "${username}" exists: ${exists}`);

    return NextResponse.json(
      { 
        exists,
        available: !exists 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { 
        error: "Failed to check username availability",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}