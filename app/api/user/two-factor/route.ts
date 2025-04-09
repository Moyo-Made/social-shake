import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function PUT(request: NextRequest) {
  try {
    const { email, twoFactorMethod } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate 2FA method
    const validMethods = ['email', 'app', null];
    if (!validMethods.includes(twoFactorMethod)) {
      return NextResponse.json(
        { error: "Invalid two-factor authentication method" },
        { status: 400 }
      );
    }

    // Get user from Firestore
    const userRef = adminDb.collection("brandProfiles").doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update 2FA settings
    await userRef.update({
      twoFactorMethod,
      updatedAt: new Date().toISOString()
    });

    // If setting up authenticator app, generate and return a secret
    let response = {
      success: true,
      message: "Two-factor authentication settings updated successfully"
    };

    if (twoFactorMethod === 'app') {
      // In a real application, you would generate a secret key and QR code here
      // For demonstration purposes, we're skipping this step
      response = {
        ...response,
        // message would include instructions to set up the authenticator app
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating two-factor settings:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to update two-factor settings",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}