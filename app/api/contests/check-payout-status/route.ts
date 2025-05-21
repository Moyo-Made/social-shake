import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

// Define TypeScript interfaces
interface Position {
  place: number;
  amount: number;
}

interface PrizeTimeline {
  endDate: string | null;
  startDate: string | null;
  winnerCount: number;
  totalBudget: number;
  positions: Position[];
}

interface ContestBasic {
  contestName: string;
  thumbnail: string | null;
}

interface Payout {
  userId: string;
  amount: number;
  place: number;
  processedAt: string;
  status: string;
  creatorName?: string;
  username?: string;
  payoutId?: string;
  payoutStatus?: string;
  payoutFailureReason?: string | null;
}

interface ContestData {
  contestId: string;
  basic: ContestBasic;
  prizeTimeline: PrizeTimeline;
  payoutsProcessed: boolean;
  payouts: Payout[];
  payoutStatus?: string;
}

// GET handler to fetch all contest payout statuses
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get("contestId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    if (!adminDb) {
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    // If specific contestId is provided, check that contest's payout status
    if (contestId) {
      return await checkContestPayoutStatus(contestId);
    }
    
    // Otherwise fetch all contests with payout information
    const query = adminDb.collection('contests')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);
      
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ contests: [] }, { status: 200 });
    }
    
    // Process each contest to get relevant payout information
    const contests: ContestData[] = [];
    
    for (const doc of snapshot.docs) {
      const contestData = doc.data();
      
      // Get basic contest data
      const contestInfo: ContestData = {
        contestId: doc.id,
        basic: {
          contestName: contestData.basic?.contestName || 'Untitled Contest',
          thumbnail: contestData.basic?.thumbnail || null
        },      
        prizeTimeline: {
          endDate: contestData.prizeTimeline?.endDate || null,
          startDate: contestData.prizeTimeline?.startDate || null,
          winnerCount: contestData.prizeTimeline?.winnerCount || 0,
          totalBudget: contestData.prizeTimeline?.totalBudget || 0,
          positions: contestData.prizeTimeline?.positions || []
        },
        payoutsProcessed: contestData.payoutsProcessed || false,
        payouts: [],
        payoutStatus: contestData.payoutStatus || "not_started"
      };
      
      // If payouts have been processed, get the payout details
      if (contestData.payoutsProcessed && contestData.payouts) {
        contestInfo.payouts = contestData.payouts;
        
        // For each payout, try to get creator details to make the UI more helpful
        for (let i = 0; i < contestInfo.payouts.length; i++) {
          const payout = contestInfo.payouts[i];
          
          try {
            // Get creator information
            const creatorRef = adminDb.collection('creators').where('userId', '==', payout.userId).limit(1);
            const creatorSnapshot = await creatorRef.get();
            
            if (!creatorSnapshot.empty) {
              const creatorData = creatorSnapshot.docs[0].data();
              contestInfo.payouts[i].creatorName = `${creatorData.firstName || ''} ${creatorData.lastName || ''}`.trim();
              contestInfo.payouts[i].username = creatorData.username || creatorData.creatorProfileData?.tiktokUsername;
            }
          } catch (error) {
            console.error(`Error fetching creator data for user ${payout.userId}:`, error);
          }
        }
      }
      
      contests.push(contestInfo);
    }
    
    // Get total count for pagination info
    const countQuery = adminDb.collection("contests");
    const totalSnapshot = await countQuery.count().get();
    const total = totalSnapshot.data().count;
    
    return NextResponse.json({
      contests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error("Error fetching contests payouts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch contest payouts";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST handler to check a specific contest's payout status
export async function POST(request: NextRequest) {
  try {
    const { contestId } = await request.json();

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 }
      );
    }

    return await checkContestPayoutStatus(contestId);
    
  } catch (error) {
    console.error("Error checking payout status:", error);
    return NextResponse.json(
      { error: "Failed to check payout status" },
      { status: 500 }
    );
  }
}

// Helper function to check a specific contest's payout status
async function checkContestPayoutStatus(contestId: string): Promise<NextResponse> {
  // Get contest data
  const contestRef = adminDb.collection("contests").doc(contestId);
  const contestDoc = await contestRef.get();

  if (!contestDoc.exists) {
    return NextResponse.json(
      { error: "Contest not found" },
      { status: 404 }
    );
  }

  const contestData = contestDoc.data();
  
  // Check if contest is finished
  if (contestData?.status !== "completed") {
    return NextResponse.json(
      { error: "Contest is not completed yet" },
      { status: 400 }
    );
  }

  // Get winners from leaderboard who already have payouts initiated
  const winnersQuery = await adminDb
    .collection("contestLeaderboard")
    .where("contestId", "==", contestId)
    .where("payoutId", "!=", null)
    .get();

  const payoutUpdates = [];

  // Process each winner with an existing payout
  for (const winnerDoc of winnersQuery.docs) {
    const winnerData = winnerDoc.data();
    
    // Skip if there's no payout ID
    if (!winnerData.payoutId) continue;
    
    try {
      // Check the status of the payout in Stripe
      const payoutResponse = await stripe.transfers.retrieve(winnerData.payoutId);
      const payout = payoutResponse as Stripe.Transfer;
      
      let payoutStatus = winnerData.payoutStatus;
      let failureReason = winnerData.payoutFailureReason;
      
      // Update status based on Stripe response
      if (payout.object === "transfer" && payout.destination_payment === "paid") {
        payoutStatus = "paid";
        failureReason = null;
      } else if (payout.object === "transfer" && payout.destination_payment === null) {
        payoutStatus = "failed";
        failureReason = "Payment failed";
      } else if (payout.object === "transfer" && payout.destination_payment === null) {
        payoutStatus = "processing";
      }
      
      // Update the leaderboard entry with the latest status
      if (payoutStatus !== winnerData.payoutStatus) {
        await winnerDoc.ref.update({
          payoutStatus,
          payoutFailureReason: failureReason,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        payoutUpdates.push({
          userId: winnerData.userId,
          status: payoutStatus,
          failureReason,
        });
      } else {
        payoutUpdates.push({
          userId: winnerData.userId,
          status: winnerData.payoutStatus,
          failureReason: winnerData.payoutFailureReason,
        });
      }
    } catch (err) {
      console.error(`Error checking payout for ${winnerData.userId}:`, err);
      
      payoutUpdates.push({
        userId: winnerData.userId,
        status: "failed",
        failureReason: "Error checking payout status",
      });
    }
  }

  // Update overall contest payout status
  const allPaid = payoutUpdates.every(update => update.status === "paid");
  const anyFailed = payoutUpdates.some(update => update.status === "failed");
  
  let contestPayoutStatus = contestData.payoutStatus;
  
  if (payoutUpdates.length > 0) {
    if (allPaid) {
      contestPayoutStatus = "completed";
    } else if (anyFailed) {
      contestPayoutStatus = "partially_completed";
    } else {
      contestPayoutStatus = "processing";
    }
    
    // Update contest document if status changed
    if (contestPayoutStatus !== contestData.payoutStatus) {
      await contestRef.update({
        payoutStatus: contestPayoutStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return NextResponse.json({
    success: true,
    payouts: payoutUpdates,
    contestPayoutStatus,
  });
}