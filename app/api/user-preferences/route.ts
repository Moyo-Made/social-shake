import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// GET handler to retrieve user preferences
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user preferences from Firestore
    const docRef = adminDb.collection("userPreferences").doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: true, exists: false, data: null },
        { status: 200 }
      );
    }

    const data = doc.data();

    return NextResponse.json({
      success: true,
      exists: true,
      data: data,
    });
  } catch (error) {
    console.error("Error retrieving user preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve user preferences",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST handler for saving user preferences
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { userId, projectRequirements, creatorPricing } = requestData;

    // Validate request
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Format the preferences data
    const preferencesData = {
      userId,
      projectRequirements: projectRequirements || {},
      creatorPricing: creatorPricing || {},
      lastUpdated: new Date().toISOString(),
    };

    // Save to Firestore
    await adminDb.collection("userPreferences").doc(userId).set(preferencesData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Preferences saved successfully",
      data: preferencesData,
    });
  } catch (error) {
    console.error("Error saving user preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to save preferences",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}