import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-03-31.basil",
});

// Helper function to fetch all balance transactions with pagination
async function fetchAllBalanceTransactions(accountId: string) {
	const allTransactions: Stripe.BalanceTransaction[] = [];
	let hasMore = true;
	let startingAfter: string | undefined = undefined;

	while (hasMore) {
		const params: Stripe.BalanceTransactionListParams = {
			limit: 100, // Maximum per request
		};

		if (startingAfter) {
			params.starting_after = startingAfter;
		}

		const response = await stripe.balanceTransactions.list(
			params,
			{ stripeAccount: accountId }
		);

		allTransactions.push(...response.data);
		hasMore = response.has_more;
		
		if (hasMore && response.data.length > 0) {
			startingAfter = response.data[response.data.length - 1].id;
		}
	}

	return allTransactions;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const accountId = searchParams.get("accountId");
		const skipTransactionCalculation = searchParams.get("skipTransactions") === 'true';

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

		// Calculate current balances (in cents)
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

		// Basic response with current balances
		const basicResponse = {
			availableBalance: (availableBalance / 100).toFixed(2),
			processingPayments: (pendingBalance / 100).toFixed(2),
			instantAvailable: (instantAvailable / 100).toFixed(2),
			currency: balance.available[0]?.currency || 
					  balance.pending[0]?.currency || 
					  "usd",
			lastUpdated: new Date().toISOString(),
		};

		// If we want to skip heavy calculations (for quick balance checks)
		if (skipTransactionCalculation) {
			return NextResponse.json({
				...basicResponse,
				totalEarnings: "0.00", // Will be calculated separately
				totalPayouts: "0.00",
				breakdown: {
					totalEarningsAvailable: "0.00",
					totalEarningsPending: "0.00",
				},
				transactionCount: 0,
			});
		}

		// Fetch ALL balance transactions with pagination
		console.log("Fetching all balance transactions...");
		const allBalanceTransactions = await fetchAllBalanceTransactions(accountId);
		console.log(`Fetched ${allBalanceTransactions.length} total transactions`);

		// Calculate lifetime earnings from successful charges
		const totalEarningsAvailable = allBalanceTransactions
			.filter(
				(txn) =>
					(txn.type === "payment" || txn.type === "charge") &&
					txn.status === "available" &&
					txn.net > 0
			)
			.reduce((sum, txn) => sum + txn.net, 0);

		const totalEarningsPending = allBalanceTransactions
			.filter(
				(txn) =>
					(txn.type === "payment" || txn.type === "charge") &&
					txn.status === "pending" &&
					txn.net > 0
			)
			.reduce((sum, txn) => sum + txn.net, 0);

		const totalEarnings = totalEarningsAvailable + totalEarningsPending;

		// Calculate total payouts already sent to bank
		const totalPayouts = allBalanceTransactions
			.filter((txn) => txn.type === "payout" && txn.status === "available")
			.reduce((sum, txn) => sum + Math.abs(txn.net), 0);

		return NextResponse.json({
			...basicResponse,
			totalEarnings: (totalEarnings / 100).toFixed(2),
			totalPayouts: (totalPayouts / 100).toFixed(2),
			breakdown: {
				totalEarningsAvailable: (totalEarningsAvailable / 100).toFixed(2),
				totalEarningsPending: (totalEarningsPending / 100).toFixed(2),
			},
			transactionCount: allBalanceTransactions.length,
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