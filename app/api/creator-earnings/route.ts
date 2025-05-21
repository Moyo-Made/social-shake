import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Initialize earnings data
    const earningsData: {
      totalEarnings: number;
      pendingPayout: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedPayouts: { id: string; [key: string]: any }[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendingPayouts: { id: string; [key: string]: any }[];
    } = {
      totalEarnings: 0,
      pendingPayout: 0,
      // Adding detailed breakdowns for potential future UI enhancements
      completedPayouts: [],
      pendingPayouts: []
    };

    // Get all completed payouts for this creator
    const completedPayoutsSnapshot = await adminDb
      .collection("payouts")
      .where("userId", "==", userId)
      .where("status", "==", "completed")
      .get();

    // Sum up completed payouts
    completedPayoutsSnapshot.forEach((doc) => {
      const payoutData = doc.data();
      earningsData.totalEarnings += payoutData.amount;
      earningsData.completedPayouts.push({
        id: doc.id,
        ...payoutData
      });
    });

    // Get all pending payouts for this creator
    const pendingPayoutsSnapshot = await adminDb
      .collection("payouts")
      .where("userId", "==", userId)
      .where("status", "in", ["pending", "failed"])
      .get();

    // Sum up pending payouts
    pendingPayoutsSnapshot.forEach((doc) => {
      const payoutData = doc.data();
      earningsData.pendingPayout += payoutData.amount;
      earningsData.pendingPayouts.push({
        id: doc.id,
        ...payoutData
      });
    });

    // We also need to check contest applications to find potential earnings
    // from contests that have ended but haven't processed payouts yet
    const contestApplicationsSnapshot = await adminDb
      .collection("contest_applications")
      .where("userId", "==", userId)
      .where("status", "==", "approved")
      .get();

    // For each approved contest application, check if contest has ended but payouts not processed
    const potentialEarningsPromises = contestApplicationsSnapshot.docs.map(async (doc) => {
      const applicationData = doc.data();
      const contestId = applicationData.contestId;
      
      // Get contest data
      const contestDoc = await adminDb
        .collection("contests")
        .doc(contestId)
        .get();
      
      const contestData = contestDoc.data();
      if (!contestData) return 0;
      
      // Check if contest has ended but payouts not processed
      const now = new Date();
      const endDate = new Date(contestData.prizeTimeline.endDate);
      
      if (now >= endDate && !contestData.payoutsProcessed) {
        // Contest has ended but payouts not processed
        // We need to estimate potential earnings
        
        // Get all participants to determine position
        const participantsSnapshot = await adminDb
          .collection("contest_applications")
          .where("contestId", "==", contestId)
          .where("status", "==", "approved")
          .get();
        
        const participants = [];
        
        // For each participant, get their metrics
        for (const participantDoc of participantsSnapshot.docs) {
          const participantData = participantDoc.data();
          
          // Get creator data
          const creatorDoc = await adminDb
            .collection("creators")
            .doc(participantData.userId)
            .get();
          
          const creatorData = creatorDoc.data();
          if (!creatorData) continue;
          
          // Calculate metrics
          const metrics = {
            views:
              creatorData.tiktokMetrics?.views ||
              creatorData.creatorProfileData?.tiktokMetrics?.views ||
              creatorData.tiktokData?.tiktokAverageViews ||
              0,
            likes:
              creatorData.tiktokMetrics?.likes ||
              creatorData.creatorProfileData?.tiktokMetrics?.likes ||
              0,
            comments:
              creatorData.tiktokMetrics?.comments ||
              creatorData.creatorProfileData?.tiktokMetrics?.comments ||
              0,
          };
          
          participants.push({
            userId: participantData.userId,
            metrics: metrics
          });
        }
        
        // Sort participants by views (descending)
        participants.sort((a, b) => b.metrics.views - a.metrics.views);
        
        // Find position of current user
        const position = participants.findIndex(p => p.userId === userId) + 1;
        
        // Check if user is in winning positions
        if (position > 0 && position <= contestData.prizeTimeline.winnerCount) {
          // Find the prize amount for this position
          const prizeInfo = contestData.prizeTimeline.positions.find(
            (p: { position: number; }) => p.position === position
          );
          
          if (prizeInfo) {
            // Convert percentage to amount
            const potentialAmount = Math.floor(
              (contestData.prizeTimeline.totalBudget * prizeInfo.percentage) / 100
            );
            
            // Add to pending payout
            earningsData.pendingPayout += potentialAmount;
            
            // Add to pending payouts list
            earningsData.pendingPayouts.push({
              id: `potential-${contestId}`,
              contestId,
              position,
              amount: potentialAmount,
              status: "pending",
              note: "Contest ended, payouts not processed yet",
              estimatedPosition: true
            });
            
            return potentialAmount;
          }
        }
      }
      
      return 0;
    });
    
    await Promise.all(potentialEarningsPromises);

    return NextResponse.json({
      success: true,
      data: earningsData
    });
  } catch (error) {
    console.error("Error fetching creator earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch creator earnings" },
      { status: 500 }
    );
  }
}