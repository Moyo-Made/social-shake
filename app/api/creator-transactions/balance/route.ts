import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

// Helper function to calculate available balance from Firebase
async function getFirebaseBalance(userId: string) {
  // Get all completed payouts (contest winnings)
  const payoutsSnapshot = await adminDb
    .collection("payouts")
    .where("userId", "==", userId)
    .where("status", "==", "completed")
    .get();
  
  // Calculate total payouts
  let totalPayouts = 0;
  payoutsSnapshot.forEach(doc => {
    const data = doc.data();
    totalPayouts += data.amount || 0;
  });
  
  // Get all withdrawals
  const withdrawalsSnapshot = await adminDb
    .collection("withdrawals")
    .where("userId", "==", userId)
    .get();
  
  // Calculate total withdrawals
  let totalWithdrawals = 0;
  withdrawalsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === "completed" || data.status === "pending") {
      totalWithdrawals += data.amount || 0;
    }
  });
  
  // Calculate processing payments (pending payouts)
  const pendingPayoutsSnapshot = await adminDb
    .collection("payouts")
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .get();
  
  let processingPayments = 0;
  pendingPayoutsSnapshot.forEach(doc => {
    const data = doc.data();
    processingPayments += data.amount || 0;
  });
  
  // Calculate available balance
  const availableBalance = totalPayouts - totalWithdrawals;
  
  return {
    availableBalance,
    processingPayments,
    totalEarnings: totalPayouts
  };
}

// Helper function to get Stripe Connect balance and transactions
async function getStripeConnectData(stripeAccountId: string) {
  try {
    const [balance, charges, payouts, transfers] = await Promise.all([
      stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
      stripe.charges.list(
        { limit: 20 }, // Get more recent charges
        { stripeAccount: stripeAccountId }
      ),
      stripe.payouts.list(
        { limit: 20 }, // Get more recent payouts
        { stripeAccount: stripeAccountId }
      ),
      stripe.transfers.list(
        { limit: 20 }, // Get recent transfers
        { stripeAccount: stripeAccountId }
      ),
    ]);

    return {
      balance: {
        available: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        connectReserved: (balance.connect_reserved ?? []).reduce(
          (sum, bal) => sum + bal.amount,
          0
        ) / 100,
      },
      recentCharges: charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        date: new Date(charge.created * 1000).toISOString(),
        status: charge.status,
        description: charge.description || 'Contest payment',
        currency: charge.currency.toUpperCase(),
      })),
      recentPayouts: payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount / 100,
        date: new Date(payout.created * 1000).toISOString(),
        status: payout.status,
        description: payout.description || 'Payout to bank account',
        currency: payout.currency.toUpperCase(),
        arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      })),
      recentTransfers: transfers.data.map((transfer) => ({
        id: transfer.id,
        amount: transfer.amount / 100,
        date: new Date(transfer.created * 1000).toISOString(),
        status: transfer.reversed ? 'reversed' : 'completed',
        description: transfer.description || 'Transfer',
        currency: transfer.currency.toUpperCase(),
      })),
    };
  } catch (error) {
    console.error("Error fetching Stripe Connect data:", error);
    return {
      balance: {
        available: 0,
        pending: 0,
        connectReserved: 0,
      },
      recentCharges: [],
      recentPayouts: [],
      recentTransfers: [],
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeStripeData = searchParams.get("includeStripe") === "true";
    const reconcileData = searchParams.get("reconcile") === "true";
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required. Please provide it in the query parameters." },
        { status: 400 }
      );
    }
    
    // Get Firebase balance data
    const firebaseBalanceData = await getFirebaseBalance(userId);
    
    // Initialize response object
    const responseData = {
      // Convert cents to dollars and format with commas
      availableBalance: (firebaseBalanceData.availableBalance / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      processingPayments: (firebaseBalanceData.processingPayments / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      totalEarnings: (firebaseBalanceData.totalEarnings / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      // Raw values for calculations
      raw: {
        availableBalance: firebaseBalanceData.availableBalance / 100,
        processingPayments: firebaseBalanceData.processingPayments / 100,
        totalEarnings: firebaseBalanceData.totalEarnings / 100,
        stripeAvailable: 0, // Initialize with a default value
        stripePending: 0,   // Initialize with a default value
        stripeReserved: 0,  // Initialize with a default value
      },
      source: "firebase",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stripeData: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reconciledData: null as any,
      lastUpdated: new Date().toISOString(),
    };
    
    // Get Stripe Connect data if requested
    if (includeStripeData) {
      // Get creator's Stripe account ID
      const creatorDoc = await adminDb.collection("creators").doc(userId).get();
      const creatorData = creatorDoc.data();
      const stripeAccountId = creatorData?.stripeAccountId || creatorData?.stripeConnectId;
      
      if (stripeAccountId) {
        const stripeData = await getStripeConnectData(stripeAccountId);
        
        responseData.stripeData = {
          ...stripeData,
          // Calculate additional metrics
          metrics: {
            totalAvailableInStripe: stripeData.balance.available,
            totalPendingInStripe: stripeData.balance.pending,
            totalReservedInStripe: stripeData.balance.connectReserved,
            recentChargesCount: stripeData.recentCharges.length,
            recentPayoutsCount: stripeData.recentPayouts.length,
            recentTransfersCount: stripeData.recentTransfers.length,
            // Calculate total from recent successful charges
            recentChargesTotal: stripeData.recentCharges
              .filter(charge => charge.status === 'succeeded')
              .reduce((sum, charge) => sum + charge.amount, 0),
            // Calculate total from recent completed payouts
            recentPayoutsTotal: stripeData.recentPayouts
              .filter(payout => payout.status === 'paid')
              .reduce((sum, payout) => sum + payout.amount, 0),
          },
          accountId: stripeAccountId,
          dataFetchedAt: new Date().toISOString(),
        };
        
        // Add Stripe balance to the main balance if available
        responseData.raw.stripeAvailable = stripeData.balance.available;
        responseData.raw.stripePending = stripeData.balance.pending;
        responseData.raw.stripeReserved = stripeData.balance.connectReserved;
        
        // Format Stripe balances
        responseData.stripeData.formattedBalance = {
          available: stripeData.balance.available.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          pending: stripeData.balance.pending.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          reserved: stripeData.balance.connectReserved.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
        };
        
        // Reconcile data if requested
        if (reconcileData) {
          const reconciledBalance = {
            // Use Stripe available balance as the source of truth for available funds
            availableBalance: stripeData.balance.available,
            // Combine Firebase processing + Stripe pending
            processingPayments: (firebaseBalanceData.processingPayments / 100) + stripeData.balance.pending,
            // Use Firebase total earnings as it tracks contest winnings
            totalEarnings: firebaseBalanceData.totalEarnings / 100,
            // Additional reconciliation data
            discrepancy: {
              availableBalanceDiff: stripeData.balance.available - (firebaseBalanceData.availableBalance / 100),
              processingPaymentsDiff: stripeData.balance.pending - (firebaseBalanceData.processingPayments / 100),
            }
          };
          
          responseData.reconciledData = {
            availableBalance: reconciledBalance.availableBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            processingPayments: reconciledBalance.processingPayments.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            totalEarnings: reconciledBalance.totalEarnings.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            raw: reconciledBalance,
            source: "stripe_firebase_reconciled",
            reconciledAt: new Date().toISOString(),
          };
          
          // Update main response to use reconciled data
          responseData.source = "reconciled";
        }
        
      } else {
        responseData.stripeData = {
          error: "No Stripe Connect account found for this user",
          hasStripeAccount: false,
        };
      }
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch balance",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}