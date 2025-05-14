import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

// Update the POST handler in your disconnect.ts file with these changes:

export async function POST(req: NextRequest) {
  try {
    // Parse the request body to get the userId
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required userId" },
        { status: 400 }
      );
    }

    // Check if the user exists and has a connected TikTok account
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    
    // Get the user email to update creatorProfile
    const userEmail = userData?.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Delete the TikTok profile document if it exists
    try {
      const tiktokProfileDoc = await adminDb.collection("tiktokProfiles").doc(userId).get();

      if (tiktokProfileDoc.exists) {
        await adminDb.collection("tiktokProfiles").doc(userId).delete();
        console.log(`Deleted TikTok profile document for user: ${userId}`);
      }
    } catch (error) {
      console.error(`Error deleting TikTok profile document for user ${userId}:`, error);
      // Continue with user document update even if profile deletion fails
    }

    // Update the user document to remove ALL TikTok-related fields
    const updateData: Record<string, string | boolean | FieldValue | object | undefined> = {
      tiktokConnected: false,
      tiktokId: FieldValue.delete(),
      tiktokUsername: FieldValue.delete(),
      tiktokAvatarUrl: FieldValue.delete(),
      tiktokAccessToken: FieldValue.delete(),
      tiktokRefreshToken: FieldValue.delete(),
      tiktokTokenExpiry: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Also check if we need to update the profileData object
    if (userData?.profileData) {
      // Create a new version of profileData without TikTok fields
      const profileData = { ...userData.profileData };

      // Remove any TikTok fields from the profileData object
      delete profileData.tiktokConnected;
      delete profileData.tiktokId;
      delete profileData.tiktokUsername;
      delete profileData.tiktokAvatarUrl;

      // Add the cleaned profileData to our update
      updateData.profileData = profileData;
    }

    await adminDb.collection("users").doc(userId).update(updateData);

    // IMPORTANT: Update the creator profile using the email as document ID (not userId)
    try {
      const creatorProfileDoc = await adminDb.collection("creatorProfiles").doc(userEmail).get();
      
      if (creatorProfileDoc.exists) {
        // Use FieldValue.delete() to properly remove fields
        await adminDb.collection("creatorProfiles").doc(userEmail).update({
          tiktokConnected: false,
          tiktokId: FieldValue.delete(),
          tiktokUsername: FieldValue.delete(), 
          tiktokDisplayName: FieldValue.delete(),
          tiktokAvatarUrl: FieldValue.delete(),
          tiktokProfileLink: FieldValue.delete(),
          tiktokMetrics: FieldValue.delete(),
          tiktokFollowerCount: FieldValue.delete(),
          tiktokEngagementRate: FieldValue.delete(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`Updated creator profile for user email: ${userEmail}`);
      } else {
        console.log(`Creator profile not found for email: ${userEmail}`);
      }
    } catch (error) {
      console.error(`Error updating creator profile for user ${userId}:`, error);
      // Continue even if creator profile update fails
    }

    console.log(`Successfully disconnected TikTok account for user: ${userId}`);

    return NextResponse.json(
      { 
        success: true, 
        message: "TikTok account disconnected successfully" 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error disconnecting TikTok account:", error);

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { error: `Failed to disconnect TikTok account: ${errorMessage}` },
      { status: 500 }
    );
  }
}