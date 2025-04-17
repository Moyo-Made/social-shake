import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";

// Handle session creation for signup process
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, firstName, lastName, password, userType, timestamp } = data;

    // Basic validation
    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email already exists in Auth
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use", message: "This email address is already registered." },
          { status: 409 }
        );
      }
    } catch (error) {
      // Error means user doesn't exist, which is what we want
    if ((error as { code?: string }).code !== "auth/user-not-found") {
		console.error("Error checking existing user:", error);
		return NextResponse.json(
		  { error: "Internal server error" },
		  { status: 500 }
		);
	  }
    }

    // Create a session ID
    const sessionId = uuidv4();
    
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store the signup session data
    await adminDb.collection("signupSessions").doc(sessionId).set({
      email,
      firstName,
      lastName,
      hashedPassword,
      userType,
      createdAt: timestamp,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
      completed: false
    });

    // Set a secure HTTP-only cookie with the session ID
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Signup session created successfully",
        firstName,
        lastName,
        email,
        userType
      },
      { status: 201 }
    );

    // Set cookie - secure in production, HTTP only for security
    response.cookies.set({
      name: "signup_session",
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour in seconds
      path: "/",
      sameSite: "strict"
    });

    return response;
  } catch (error) {
    console.error("Error creating signup session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create signup session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Retrieve session information (for the complete-profile page)
export async function GET(request: NextRequest) {
  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get("signup_session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "No active signup session" },
        { status: 401 }
      );
    }

    // Get session data
    const sessionDoc = await adminDb.collection("signupSessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();

    // Check if session has expired
    if (new Date(sessionData?.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    // Don't return the hashed password
    if (!sessionData) {
      return NextResponse.json(
        { error: "Session data is undefined" },
        { status: 500 }
      );
    }

    const safeData = sessionData || {};

    return NextResponse.json(safeData);
  } catch (error) {
    console.error("Error retrieving signup session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to retrieve signup session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}