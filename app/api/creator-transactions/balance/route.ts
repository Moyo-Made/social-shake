import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// Helper function to calculate available balance
async function getAvailableBalance(userId: string) {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required. Please provide it in the query parameters." },
        { status: 400 }
      );
    }
    
    const balanceData = await getAvailableBalance(userId);
    
    return NextResponse.json({
      // Convert cents to dollars and format with commas
      availableBalance: (balanceData.availableBalance / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      processingPayments: (balanceData.processingPayments / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      totalEarnings: (balanceData.totalEarnings / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}