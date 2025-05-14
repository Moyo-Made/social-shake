import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setStateSession } from "@/utils/sessionStore";

export async function GET(req: NextRequest) {
  try {
    // Configuration
    const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

    if (!CLIENT_KEY || !REDIRECT_URI) {
      throw new Error("Missing required TikTok OAuth configuration");
    }

    // Get the user ID from the query parameter
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId) {
      throw new Error("Missing user_id parameter");
    }

    // Generate a random state for CSRF protection
    const csrfState = crypto.randomBytes(16).toString("hex");

    // Store the state in Firestore with the user ID
    await setStateSession(csrfState, userId); // Fixed by passing userId as parameter

    console.log(`Setting CSRF state in session: ${csrfState} for user: ${userId}`);

    const tiktokAuthUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    tiktokAuthUrl.searchParams.append("client_key", CLIENT_KEY);
    tiktokAuthUrl.searchParams.append("response_type", "code");
    // Request all available user profile information
    tiktokAuthUrl.searchParams.append("scope", "user.info.basic,user.info.profile,video.upload");
    tiktokAuthUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    tiktokAuthUrl.searchParams.append("state", csrfState);

    return NextResponse.redirect(tiktokAuthUrl.toString());
  } catch (error) {
    console.error("TikTok connection initialization error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const errorMessage = error instanceof Error ? error.message : "Failed to initialize TikTok connection";
    return NextResponse.redirect(
      `${baseUrl}/creator/dashboard?toast=error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}