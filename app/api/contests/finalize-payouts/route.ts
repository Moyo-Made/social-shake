import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

/**
 * This endpoint handles finalizing a contest and processing payouts to winners
 */
export async function POST(request: NextRequest) {
  try {
    const { contestId } = await request.json();

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 }
      );
    }

    // 1. Get contest details
    const contestDoc = await adminDb.collection("contests").doc(contestId).get();
    if (!contestDoc.exists) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    const contestData = contestDoc.data();
    if (!contestData) {
      return NextResponse.json(
        { error: "Contest data not found" },
        { status: 404 }
      );
    }

    // Check if contest is eligible for payout
    if (contestData.payoutStatus === "completed") {
      return NextResponse.json(
        { error: "Contest payouts have already been processed" },
        { status: 400 }
      );
    }

    if (contestData.status !== "completed") {
      return NextResponse.json(
        { error: "Contest must be completed before processing payouts" },
        { status: 400 }
      );
    }

    // 2. Determine the winners based on leaderboard
    // Get submissions for this contest, sorted by the criteria (likes, views, etc.)
    const submissionsSnapshot = await adminDb
      .collection("submissions")
      .where("contestId", "==", contestId)
      .orderBy(contestData.prizeTimeline.criteria, "desc")
      .limit(contestData.prizeTimeline.winnerCount)
      .get();

    if (submissionsSnapshot.empty) {
      return NextResponse.json(
        { error: "No submissions found for this contest" },
        { status: 400 }
      );
    }

    const winners = submissionsSnapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        userId: data.userId,
        submissionId: doc.id,
        position: index + 1, // 1-based index for position
        amount: contestData.prizeTimeline.positions[index] || 0,
      };
    });

    // 3. Create a payout record
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const totalAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);
    
    // Initialize winner payouts
    const winnerPayouts = [];
    
    // 4. Process each winner and prepare transfers
    for (const winner of winners) {
      // Get the user's Stripe Connect account
      const userDoc = await adminDb.collection("users").doc(winner.userId).get();
      if (!userDoc.exists) {
        console.error(`User ${winner.userId} not found for payout`);
        winnerPayouts.push({
          userId: winner.userId,
          position: winner.position,
          amount: winner.amount,
          status: "failed",
          errorMessage: "User not found",
        });
        continue;
      }
      
      const userData = userDoc.data();
      if (!userData?.stripeConnectAccountId) {
        console.error(`User ${winner.userId} has no Stripe Connect account`);
        winnerPayouts.push({
          userId: winner.userId,
          position: winner.position,
          amount: winner.amount,
          status: "failed",
          errorMessage: "No Stripe Connect account",
        });
        continue;
      }
      
      winnerPayouts.push({
        userId: winner.userId,
        position: winner.position,
        amount: winner.amount,
        stripeAccountId: userData.stripeConnectAccountId,
        status: "pending",
      });
    }
    
    // 5. Create the payout document
    const payoutData = {
      payoutId,
      contestId,
      contestName: contestData.basic.contestName,
      brandUserId: contestData.userId,
      status: "pending",
      totalAmount,
      createdAt: now,
      updatedAt: now,
      winnerPayouts,
    };
    
    await adminDb.collection("payouts").doc(payoutId).set(payoutData);
    
    // 6. Update contest with payout status
    await adminDb.collection("contests").doc(contestId).update({
      payoutStatus: "processing",
      payoutId,
      payoutProcessedAt: now,
    });
    
    return NextResponse.json({
      success: true,
      payoutId: payoutId,
      winners: winners.length,
      totalAmount,
    });
    
  } catch (error) {
    console.error("Error processing contest payouts:", error);
    return NextResponse.json(
      {
        error: "Failed to process contest payouts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}