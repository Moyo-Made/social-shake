import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import Stripe from "stripe";

// This function is copied from your contest API to maintain consistency
async function processThumbnail(
  thumbnail: string | null,
  contestId: string,
  userId: string,
  existingThumbnail?: string | null
): Promise<string | null> {
  // If no new thumbnail is provided, return the existing thumbnail
  if (!thumbnail) {
    return existingThumbnail || null;
  }

  try {
    // Handle base64 or existing URL
    if (typeof thumbnail === "string") {
      if (thumbnail.startsWith("data:")) {
        // Convert base64 to file upload
        const imageBuffer = Buffer.from(
          thumbnail.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );

        const bucket = adminStorage.bucket();
        const timestamp = Date.now();
        const filePath = `contest-images/${userId}/${contestId}/${timestamp}.jpg`;
        const file = bucket.file(filePath);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        await file.makePublic();
        return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } else {
        // If it's already a valid URL, use it directly
        return thumbnail;
      }
    }
    return existingThumbnail || null;
  } catch (error) {
    console.error("Error processing thumbnail:", error);
    return existingThumbnail || null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("payment_id");
    const sessionId = url.searchParams.get("session_id");

    if (!paymentId || !sessionId) {
      return NextResponse.json(
        { error: "Payment ID and Session ID are required" },
        { status: 400 }
      );
    }

    // Verify the payment with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-03-31.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 400 }
      );
    }

    // Check if this payment has already been processed to prevent duplicates
    const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
    
    if (paymentDoc.exists && paymentDoc.data()?.status === "completed") {
      return NextResponse.json(
        { error: "Payment has already been processed", contestId: paymentDoc.data()?.contestId },
        { status: 409 }
      );
    }

    // Get stored form data from Firestore
    const paymentRecord = await adminDb.collection("payments").doc(paymentId).get();
    
    if (!paymentRecord.exists) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    const paymentData = paymentRecord.data();
    const formData = paymentData?.formData;
    const userId = paymentData?.userId;

    if (!formData || !userId) {
      return NextResponse.json(
        { error: "Form data or user ID not found in payment record" },
        { status: 404 }
      );
    }

    // Generate a unique contestId
    const contestId = `contest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Process the thumbnail
    const thumbnailUrl = await processThumbnail(
      formData.basic.thumbnail,
      contestId,
      userId
    );

    // Format dates
    const startDate = formData.prizeTimeline.startDate
      ? new Date(formData.prizeTimeline.startDate).toISOString()
      : null;
    const endDate = formData.prizeTimeline.endDate
      ? new Date(formData.prizeTimeline.endDate).toISOString()
      : null;

    // Create the complete contest data object
    const contestData = {
      userId,
      contestId,
      basic: {
        ...formData.basic,
        thumbnail: thumbnailUrl,
      },
      requirements: formData.requirements,
      prizeTimeline: {
        ...formData.prizeTimeline,
        startDate,
        endDate,
      },
      contestType: formData.contestType,
      incentives: formData.incentives,
      status: "active",
      participants: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentId: paymentId,
      stripeSessionId: sessionId,
      paymentAmount: formData.prizeTimeline.totalBudget,
    };

    // Save to Firestore
    await adminDb.collection("contests").doc(contestId).set(contestData);

    // Update payment record status
    await adminDb.collection("payments").doc(paymentId).update({
      status: "completed",
      contestId: contestId,
      completedAt: new Date().toISOString()
    });

    // Clear any drafts
    await adminDb.collection("contestDrafts").doc(userId).delete();

    return NextResponse.json({
      success: true,
      message: "Contest created successfully after payment",
      data: {
        contestId,
      },
    });
  } catch (error) {
    console.error("Error processing payment success:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment success",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}