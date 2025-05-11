import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    console.log('Checking email availability:', email);

    // Validate input
    if (!email) {
      console.warn('No email provided in request');
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Query Firestore to check if the email exists
    if (!adminDb) {
      console.error("Firebase admin database is not initialized");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    const emailQuery = adminDb
      .collection("brandProfiles")
      .where("email", "==", email.toLowerCase());
    
    const querySnapshot = await emailQuery.get();

    const exists = !querySnapshot.empty;
    console.log(`Email "${email}" exists: ${exists}`);

    return NextResponse.json(
      { 
        exists,
        available: !exists 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking email availability:", error);
    return NextResponse.json(
      { 
        error: "Failed to check email availability",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}