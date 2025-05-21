import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/config/firebase-admin";

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
}

interface ContestData {
  contestId: string;
  basic: ContestBasic;
  prizeTimeline: PrizeTimeline;
  payoutsProcessed: boolean;
  payouts: Payout[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    if (!adminDb) {
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }
    
    // Fetch all contests with pagination
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
        payouts: []
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