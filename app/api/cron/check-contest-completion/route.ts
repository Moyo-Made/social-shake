// app/api/cron/check-contest-completion/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

/**
 * This endpoint checks for contests that have ended and marks them as completed
 * It should be triggered by a cron job (e.g., daily)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is being called by a cron job
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStr = now.toISOString();

    // Find contests that have ended but not yet marked as completed
    const contestsSnapshot = await adminDb
      .collection("contests")
      .where("status", "==", "active")
      .where("prizeTimeline.endDate", "<=", todayStr)
      .get();

    if (contestsSnapshot.empty) {
      return NextResponse.json({
        message: "No contests ready for completion",
        processedCount: 0,
      });
    }

    const processedContests = [];
    const failedContests = [];

    // Process each contest
    for (const doc of contestsSnapshot.docs) {
      try {
        const contestId = doc.id;
        const contestData = doc.data();

        // Mark contest as completed
        await adminDb.collection("contests").doc(contestId).update({
          status: "completed",
          completedAt: todayStr,
          updatedAt: todayStr,
          payoutStatus: "not_started",
        });

        processedContests.push({
          contestId,
          name: contestData.basic?.contestName || "Unknown Contest",
        });

        // Trigger the finalize-payouts endpoint
        try {
          const finalizeResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/contests/finalize-payouts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ contestId }),
            }
          );

          if (!finalizeResponse.ok) {
            const errorData = await finalizeResponse.json();
            console.error(
              `Failed to finalize payouts for contest ${contestId}:`,
              errorData
            );
          }
        } catch (finalizeError) {
          console.error(
            `Error triggering finalize payouts for contest ${contestId}:`,
            finalizeError
          );
        }
      } catch (error) {
        console.error(`Error processing contest ${doc.id}:`, error);
        failedContests.push({
          contestId: doc.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedContests.length,
      failedCount: failedContests.length,
      processedContests,
      failedContests,
    });
  } catch (error) {
    console.error("Error checking contest completion:", error);
    return NextResponse.json(
      {
        error: "Failed to check contest completion",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}