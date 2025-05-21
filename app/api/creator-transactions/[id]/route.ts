import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Helper function to format transaction data consistently
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTransaction(data: any) {
  return {
    id: data.id,
    type: data.type,
    amount: (data.amount / 100).toFixed(2),
    status: data.status,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()).toISOString(),
    description: data.description || (data.type === "withdrawal" ? "Withdrawal" : "Payment"),
    projectName: data.projectName || "",
    brand: data.brand || "",
  };
}

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split("Bearer ")[1];
    
    // Verify the token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken.uid) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const transactionId = params.id;
    
    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }
    
    // Check if it's a payout (contest payment)
    const payoutDoc = await adminDb.collection("payouts").doc(transactionId).get();
    
    if (payoutDoc.exists) {
      const payoutData = payoutDoc.data();
      
      // Verify this belongs to the authenticated user
      if (payoutData?.userId !== userId) {
        return NextResponse.json(
          { error: "Not authorized to view this transaction" },
          { status: 403 }
        );
      }
      
      // Get contest details if contestId exists
      let contestData = null;
      if (payoutData?.contestId) {
        const contestDoc = await adminDb
          .collection("contests")
          .doc(payoutData.contestId)
          .get();
        contestData = contestDoc.data();
      }
      
      // Get Stripe transfer details
      let stripeTransfer = null;
      if (payoutData?.stripeTransferId) {
        try {
          stripeTransfer = await stripe.transfers.retrieve(payoutData.stripeTransferId);
        } catch (error) {
          console.error("Error fetching Stripe transfer:", error);
        }
      }
      
      const formattedTransaction = formatTransaction({
        id: payoutDoc.id,
        ...payoutData,
        projectName: contestData?.basic?.contestName || "",
        brand: contestData?.basic?.brandName || "",
        description: `Payment for ${contestData?.basic?.contestName || "Contest"}`,
        type: "payment"
      });
      
      return NextResponse.json({
        transaction: {
          ...formattedTransaction,
          contestDetails: contestData ? {
            contestName: contestData.basic?.contestName,
            brandName: contestData.basic?.brandName,
            description: contestData.basic?.description,
            position: payoutData.position,
            totalWinners: contestData.prizeTimeline?.winnerCount,
          } : null,
          stripeDetails: stripeTransfer ? {
            created: new Date(stripeTransfer.created * 1000).toISOString(),
            amount: (stripeTransfer.amount / 100).toFixed(2),
            currency: stripeTransfer.currency.toUpperCase(),
            status: stripeTransfer.reversed ? "reversed" : "completed",
          } : null
        }
      });
    }
    
    // If not a payout, check if it's a withdrawal
    const withdrawalDoc = await adminDb.collection("withdrawals").doc(transactionId).get();
    
    if (withdrawalDoc.exists) {
      const withdrawalData = withdrawalDoc.data();
      
      // Verify this belongs to the authenticated user
      if (withdrawalData?.userId !== userId) {
        return NextResponse.json(
          { error: "Not authorized to view this transaction" },
          { status: 403 }
        );
      }
      
      // Get Stripe transfer details
      let stripeTransfer = null;
      if (withdrawalData?.stripeTransferId) {
        try {
          stripeTransfer = await stripe.transfers.retrieve(withdrawalData.stripeTransferId);
        } catch (error) {
          console.error("Error fetching Stripe transfer:", error);
        }
      }
      
      const formattedTransaction = formatTransaction({
        id: withdrawalDoc.id,
        ...withdrawalData,
        type: "withdrawal"
      });
      
      return NextResponse.json({
        transaction: {
          ...formattedTransaction,
          stripeDetails: stripeTransfer ? {
            created: new Date(stripeTransfer.created * 1000).toISOString(),
            amount: (stripeTransfer.amount / 100).toFixed(2),
            currency: stripeTransfer.currency.toUpperCase(),
            status: stripeTransfer.reversed ? "reversed" : "completed",
            estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          } : null
        }
      });
    }
    
    // If transaction not found in either collection
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction details" },
      { status: 500 }
    );
  }
}