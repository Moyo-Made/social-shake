import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-03-31.basil",
});

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const accountId = searchParams.get("accountId");

		if (!accountId) {
			return NextResponse.json(
				{ error: "Account ID is required" },
				{ status: 400 }
			);
		}

		// Fetch balance from Stripe Connect account
		const balance = await stripe.balance.retrieve({
			stripeAccount: accountId,
		});

		console.log("Raw balance data:", JSON.stringify(balance, null, 2));

		// Fixed calculations section of your code:

		// Calculate current balances
		const availableBalance = balance.available.reduce(
			(sum, item) => sum + item.amount,
			0
		);
		const pendingBalance = balance.pending.reduce(
			(sum, item) => sum + item.amount,
			0
		);
		const instantAvailable =
			balance.instant_available?.reduce((sum, item) => sum + item.amount, 0) ||
			0;

		// Fetch ALL balance transactions
		const allBalanceTransactions = await stripe.balanceTransactions.list(
			{
				limit: 100,
			},
			{
				stripeAccount: accountId,
			}
		);


		const totalEarningsAvailable = allBalanceTransactions.data
			.filter(
				(txn) =>
					(txn.type === "payment" || txn.type === "charge") &&
					txn.status === "available" &&
					txn.net > 0
			)
			.reduce((sum, txn) => sum + txn.net, 0);

		const totalEarningsPending = allBalanceTransactions.data
			.filter(
				(txn) =>
					(txn.type === "payment" || txn.type === "charge") &&
					txn.status === "pending" &&
					txn.net > 0
			)
			.reduce((sum, txn) => sum + txn.net, 0);

		const totalEarnings = totalEarningsAvailable + totalEarningsPending;

		
		const pendingPayouts = availableBalance;

		// PROCESSING PAYMENTS = Pending balance (payments still being processed)
		const processingPayments = pendingBalance;

		// Total payouts already sent to bank
		const totalPayouts = allBalanceTransactions.data
			.filter((txn) => txn.type === "payout" && txn.status === "available")
			.reduce((sum, txn) => sum + Math.abs(txn.net), 0);

		return NextResponse.json({
			// Current balances
			availableBalance: (availableBalance / 100).toFixed(2), // Money ready to payout
			processingPayments: (processingPayments / 100).toFixed(2),
			pendingPayouts: (pendingPayouts / 100).toFixed(2), 
			instantAvailable: (instantAvailable / 100).toFixed(2),

			// Lifetime totals
			totalEarnings: (totalEarnings / 100).toFixed(2), 
			totalPayouts: (totalPayouts / 100).toFixed(2), // Money already sent to bank

			// Breakdown
			totalEarningsAvailable: (totalEarningsAvailable / 100).toFixed(2),
			totalEarningsPending: (totalEarningsPending / 100).toFixed(2),

			currency:
				balance.available[0]?.currency || balance.pending[0]?.currency || "aud",

			// Recent activity
			recentCharges: [], 
			recentPayouts: [],
		});
	} catch (error) {
		console.error("Error fetching balance:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch balance data",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
