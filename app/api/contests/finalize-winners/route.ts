import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { contestId } = await request.json();

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 }
      );
    }

    // Get the contest document
    const contestDoc = await adminDb.collection("contests").doc(contestId).get();
    
    if (!contestDoc.exists) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    const contestData = contestDoc.data();

    // Check if contest has ended
    const endDate = new Date(contestData?.prizeTimeline.endDate);
    const now = new Date();
    
    if (now < endDate) {
      return NextResponse.json(
        { error: "Contest has not ended yet" },
        { status: 400 }
      );
    }

    // Check if winners have already been selected
    if (contestData?.winnersSelected) {
      return NextResponse.json(
        { error: "Winners have already been selected for this contest" },
        { status: 400 }
      );
    }

    // Get approved applications for this contest
    const applicationsSnapshot = await adminDb
      .collection("contest-applications")
      .where("contestId", "==", contestId)
      .where("status", "==", "approved")
      .get();

    if (applicationsSnapshot.empty) {
      return NextResponse.json(
        { error: "No approved applications found for this contest" },
        { status: 400 }
      );
    }

    // Prepare the applications data
    const applications = [];
    for (const doc of applicationsSnapshot.docs) {
      const appData = doc.data();
      
      // Get creator data to access metrics and user information
      const creatorDoc = await adminDb
        .collection("creators")
        .doc(appData.userId)
        .get();
      
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data();
        
        // Determine metrics based on contest criteria
        const criteria = contestData?.prizeTimeline?.criteria || "views";
        let metricValue = 0;
        
        // Get metrics from the appropriate source based on your data structure
        if (creatorData?.tiktokMetrics) {
          metricValue = creatorData.tiktokMetrics[criteria] || 0;
        } else if (creatorData?.creatorProfileData?.tiktokMetrics) {
          metricValue = creatorData.creatorProfileData.tiktokMetrics[criteria] || 0;
        }
        
        applications.push({
          applicationId: doc.id,
          userId: appData.userId,
          postUrl: appData.postUrl,
          metricValue: metricValue,
          stripeConnectId: creatorData?.stripeConnectId,
          stripeOnboardingStatus: creatorData?.stripeOnboardingStatus
        });
      }
    }
    
    // Sort applications by metric value (descending)
    applications.sort((a, b) => b.metricValue - a.metricValue);
    
    // Determine winners based on winnerCount
    const winnerCount = contestData?.prizeTimeline.winnerCount || 3;
    const positions = contestData?.prizeTimeline.positions || [];
    
    // Only take up to winnerCount
    const winners = applications.slice(0, winnerCount).map((app, index) => {
      return {
        ...app,
        position: index + 1,
        prizeAmount: positions[index] || 0,
      };
    });
    
    // Update contest with winners
    await adminDb.collection("contests").doc(contestId).update({
      winnersSelected: true,
      winnersSelectedAt: new Date().toISOString(),
      winners: winners.map(w => ({
        userId: w.userId,
        applicationId: w.applicationId,
        position: w.position,
        prizeAmount: w.prizeAmount,
        metricValue: w.metricValue,
        payoutStatus: w.stripeOnboardingStatus === "complete" ? "pending" : "awaiting_account_setup"
      }))
    });

    // Create payouts for eligible winners (those with complete Stripe onboarding)
    const payouts = [];
    
    for (const winner of winners) {
      // Skip if the winner doesn't have a complete Stripe account
      if (winner.stripeOnboardingStatus !== "complete" || !winner.stripeConnectId) {
        continue;
      }
      
      // Create a payout record
      const payoutRef = adminDb.collection("payouts").doc();
      
      const payoutData = {
        id: payoutRef.id,
        contestId,
        userId: winner.userId,
        applicationId: winner.applicationId,
        position: winner.position,
        amount: winner.prizeAmount,
        stripeConnectId: winner.stripeConnectId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      
      await payoutRef.set(payoutData);
      payouts.push(payoutData);
    }
    
    return NextResponse.json({
      success: true,
      winners,
      payouts
    });
  } catch (error) {
    console.error("Error finalizing contest winners:", error);
    return NextResponse.json(
      {
        error: "Failed to finalize contest winners",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}