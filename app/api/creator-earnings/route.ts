/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	try {
		// Get userId from query parameters
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const includeStripeData = searchParams.get("includeStripe") === "true";

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
			completedPayouts: Array<{ id: string; [key: string]: any }>;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			pendingPayouts: Array<{ id: string; [key: string]: any }>;
			stripeData?: {
				availableBalance: string;
				processingPayments: string;
				totalEarnings: string;
				balanceCurrency: string;
				recentCharges: Array<{
					id: string;
					amount: number;
					currency: string;
					date: string;
					status: string;
				}>;
				recentPayouts: Array<{
					id: string;
					amount: number;
					currency: string;
					date: string;
					status: string;
				}>;
			};
			lastUpdated: string;
		} = {
			totalEarnings: 0,
			pendingPayout: 0,
			completedPayouts: [],
			pendingPayouts: [],
			lastUpdated: new Date().toISOString(),
		};

		// Get creator's Stripe account ID
		let stripeAccountId: string | null = null;
		const creatorDoc = await adminDb.collection("creators").doc(userId).get();
		const creatorData = creatorDoc.data();
		stripeAccountId = creatorData?.stripeAccountId || null;

		// If we have Stripe data and it's requested, use Stripe as primary source
		if (includeStripeData && stripeAccountId) {
			try {
				// Get Stripe transactions for calculations
				const transactionsResponse = await fetch(
					`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/transactions?accountId=${stripeAccountId}&limit=100`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);

				if (transactionsResponse.ok) {
					const transactionsData = await transactionsResponse.json();
					const transactions = transactionsData.transactions || [];

					// Debug: Log the transaction structure
					console.log("Transaction data structure:", JSON.stringify(transactionsData, null, 2));
					console.log("First transaction:", transactions[0]);

					// Separate payments and payouts from Stripe
					// More flexible filtering to match your actual data structure
					const stripePayments = transactions.filter((t: any) => {
						// Check for different possible field names and values
						const isPayment = t.type === 'charge' || t.type === 'payment' || t.type === 'Payment';
						const isSucceeded = t.status === 'succeeded' || t.status === 'Succeeded';
						return isPayment && isSucceeded;
					});
					
					const stripePayouts = transactions.filter((t: any) => {
						// Check for different possible field names and values
						const isPayout = t.type === 'payout' || t.type === 'Payout';
						const isPaid = t.status === 'paid' || t.status === 'Paid';
						return isPayout && isPaid;
					});

					// Debug: Log filtered results
					console.log("Filtered payments:", stripePayments.length);
					console.log("Filtered payouts:", stripePayouts.length);

					// Calculate totals from Stripe data with more robust parsing
					const totalStripeEarnings = stripePayments.reduce((sum: number, payment: any) => {
						// Try different possible amount field formats
						let amount = 0;
						if (payment.amount) {
							if (typeof payment.amount === 'string') {
								// Remove currency symbols and parse
								amount = parseFloat(payment.amount.replace(/[A$£€¥,\s]/g, '')) || 0;
							} else if (typeof payment.amount === 'number') {
								amount = payment.amount;
							}
						}
						return sum + amount;
					}, 0);

					const totalStripePaidOut = stripePayouts.reduce((sum: number, payout: any) => {
						// Try different possible amount field formats
						let amount = 0;
						if (payout.amount) {
							if (typeof payout.amount === 'string') {
								// Remove currency symbols and parse
								amount = parseFloat(payout.amount.replace(/[A$£€¥,\s]/g, '')) || 0;
							} else if (typeof payout.amount === 'number') {
								amount = payout.amount;
							}
						}
						return sum + Math.abs(amount); // Payouts are typically negative, so we use absolute value
					}, 0);

					console.log("Calculated totals - Earnings:", totalStripeEarnings, "Paid out:", totalStripePaidOut);

					// If we didn't get any transactions but have balance data, use that
					if (stripePayments.length === 0 && stripePayouts.length === 0) {
						console.log("No transactions found, using balance data as primary source");
						
						// Get balance data from your existing endpoint
						const balanceResponse = await fetch(
							`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/balance?accountId=${stripeAccountId}`,
							{
								method: 'GET',
								headers: {
									'Content-Type': 'application/json',
								},
							}
						);
					
						if (balanceResponse.ok) {
							const balanceData = await balanceResponse.json();
							
							// Your balance endpoint already calculates these correctly!
							const availableBalance = parseFloat(balanceData.availableBalance || '0');
							const processingPayments = parseFloat(balanceData.processingPayments || '0');
							const totalEarningsFromStripe = parseFloat(balanceData.totalEarnings || '0');
							
							// THIS IS THE KEY FIX:
							// Use the totalEarnings from your balance endpoint (calculated from balance transactions)
							earningsData.totalEarnings = totalEarningsFromStripe;
							
							// Pending payout is only what's available to withdraw
							earningsData.pendingPayout = availableBalance + processingPayments;
							
							// Create a summary entry for pending payouts
							if (availableBalance + processingPayments > 0) {
								earningsData.pendingPayouts.push({
									id: "stripe-balance-summary",
									payoutId: "balance-summary",
									amount: availableBalance + processingPayments,
									currency: balanceData.currency || "AUD",
									date: new Date().toISOString(),
									status: "available",
									source: "stripe",
									type: "balance_summary",
									note: `Available: $${availableBalance.toFixed(2)}, Processing: $${processingPayments.toFixed(2)}`
								});
							}
							
							console.log("Using balance data - Total earnings:", totalEarningsFromStripe, "Available for payout:", availableBalance + processingPayments);
						}
					} else {
						// Use transaction-based calculations
						earningsData.totalEarnings = totalStripeEarnings;
						earningsData.pendingPayout = totalStripeEarnings - totalStripePaidOut;

						// Format completed payouts (actual bank transfers)
						earningsData.completedPayouts = stripePayouts.map((payout: any) => ({
							id: payout.id,
							payoutId: payout.id,
							amount: Math.abs(parseFloat(payout.amount?.toString().replace(/[A$£€¥,\s]/g, '') || '0')),
							currency: payout.currency || "AUD",
							date: payout.date,
							status: "completed",
							paymentMethod: "stripe",
							source: "stripe",
							type: "bank_transfer"
						}));

						// Format pending earnings (individual payments not yet withdrawn)
						const unpaidPayments = stripePayments.slice(0, 10);
						earningsData.pendingPayouts = unpaidPayments.map((payment: any) => ({
							id: payment.id,
							payoutId: payment.id,
							amount: parseFloat(payment.amount?.toString().replace(/[A$£€¥,\s]/g, '') || '0'),
							currency: payment.currency || "AUD",
							date: payment.date,
							status: "pending",
							source: "stripe",
							type: "earnings",
							note: "Available for withdrawal"
						}));
					}

					// Get balance data for additional context (if not already fetched)
					let balanceData = null;
					if (stripePayments.length > 0 || stripePayouts.length > 0) {
						const balanceResponse = await fetch(
							`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/balance?accountId=${stripeAccountId}`,
							{
								method: 'GET',
								headers: {
									'Content-Type': 'application/json',
								},
							}
						);

						if (balanceResponse.ok) {
							balanceData = await balanceResponse.json();
						}
					}

					// Add Stripe data for reference
					earningsData.stripeData = {
						availableBalance: balanceData?.availableBalance || `${earningsData.pendingPayout.toFixed(2)}`,
						processingPayments: balanceData?.processingPayments || "0",
						totalEarnings: `${earningsData.totalEarnings.toFixed(2)}`,
						balanceCurrency: balanceData?.currency || "AUD",
						recentCharges: stripePayments.slice(0, 5).map((charge: any) => ({
							id: charge.id || 'unknown',
							amount: parseFloat(charge.amount?.toString().replace(/[A$£€¥,\s]/g, '') || '0'),
							currency: charge.currency || "AUD",
							date: charge.date || new Date().toISOString(),
							status: charge.status || 'unknown',
						})),
						recentPayouts: stripePayouts.slice(0, 5).map((payout: any) => ({
							id: payout.id || 'unknown',
							amount: Math.abs(parseFloat(payout.amount?.toString().replace(/[A$£€¥,\s]/g, '') || '0')),
							currency: payout.currency || "AUD",
							date: payout.date || new Date().toISOString(),
							status: payout.status || 'unknown',
						})),
					};

				} else {
					console.error("Error fetching Stripe transactions");
					// Fall back to internal system
					await processInternalPayouts();
				}

			} catch (stripeError) {
				console.error("Error processing Stripe data:", stripeError);
				// Fall back to internal system
				await processInternalPayouts();
			}
		} else {
			// Use internal payout system when Stripe is not available
			await processInternalPayouts();
		}

		// Always add contest-related pending earnings from internal system
		await addContestEarnings();

		// Helper function to process internal payouts
		async function processInternalPayouts() {
			// Get all completed payouts for this creator
			const completedPayoutsSnapshot = await adminDb
				.collection("payouts")
				.where("userId", "==", userId)
				.where("status", "==", "completed")
				.orderBy("createdAt", "desc")
				.get();

			// Sum up completed payouts and format data
			completedPayoutsSnapshot.forEach((doc) => {
				const payoutData = doc.data();
				earningsData.totalEarnings += payoutData.amount;
				earningsData.completedPayouts.push({
					id: doc.id,
					payoutId: payoutData.stripePayoutId || doc.id,
					amount: payoutData.amount,
					currency: payoutData.currency || "USD",
					date: payoutData.createdAt?.toDate?.()?.toISOString() || payoutData.createdAt,
					status: payoutData.status,
					contestId: payoutData.contestId,
					projectId: payoutData.projectId,
					position: payoutData.position,
					paymentMethod: payoutData.paymentMethod || "stripe",
					source: "internal",
					...payoutData,
				});
			});

			// Get all pending payouts for this creator
			const pendingPayoutsSnapshot = await adminDb
				.collection("payouts")
				.where("userId", "==", userId)
				.where("status", "in", ["pending", "processing", "failed"])
				.orderBy("createdAt", "desc")
				.get();

			// Sum up pending payouts
			pendingPayoutsSnapshot.forEach((doc) => {
				const payoutData = doc.data();
				earningsData.pendingPayout += payoutData.amount;
				earningsData.pendingPayouts.push({
					id: doc.id,
					payoutId: payoutData.stripePayoutId || doc.id,
					amount: payoutData.amount,
					currency: payoutData.currency || "USD",
					date: payoutData.createdAt?.toDate?.()?.toISOString() || payoutData.createdAt,
					status: payoutData.status,
					contestId: payoutData.contestId,
					projectId: payoutData.projectId,
					position: payoutData.position,
					failureReason: payoutData.failureReason,
					estimatedProcessingDate: payoutData.estimatedProcessingDate,
					source: "internal",
					...payoutData,
				});
			});
		}

		// Helper function to add contest earnings (always run this)
		async function addContestEarnings() {
			const contestApplicationsSnapshot = await adminDb
				.collection("contest_applications")
				.where("userId", "==", userId)
				.where("status", "==", "approved")
				.get();

			// Process potential earnings from ended contests
			const potentialEarningsPromises = contestApplicationsSnapshot.docs.map(
				async (doc) => {
					const applicationData = doc.data();
					const contestId = applicationData.contestId;

					// Check if we already have a payout record for this contest
					const existingPayoutQuery = await adminDb
						.collection("payouts")
						.where("userId", "==", userId)
						.where("contestId", "==", contestId)
						.get();

					if (!existingPayoutQuery.empty) {
						return 0; // Already have payout record
					}

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
								metrics: metrics,
							});
						}

						// Sort participants by views (descending)
						participants.sort((a, b) => b.metrics.views - a.metrics.views);

						// Find position of current user
						const position =
							participants.findIndex((p) => p.userId === userId) + 1;

						// Check if user is in winning positions
						if (
							position > 0 &&
							position <= contestData.prizeTimeline.winnerCount
						) {
							// Find the prize amount for this position
							const prizeInfo = contestData.prizeTimeline.positions.find(
								(p: { position: number }) => p.position === position
							);

							if (prizeInfo) {
								// Convert percentage to amount
								const potentialAmount = Math.floor(
									(contestData.prizeTimeline.totalBudget * prizeInfo.percentage) /
										100
								);

								// Add to pending payout
								earningsData.pendingPayout += potentialAmount;

								// Add to pending payouts list
								earningsData.pendingPayouts.push({
									id: `contest-${contestId}`,
									contestId,
									position,
									amount: potentialAmount,
									currency: "USD", // Contest prizes are typically in USD
									status: "pending_processing",
									note: "Contest ended, payouts being processed",
									estimatedPosition: true,
									date: new Date().toISOString(),
									source: "contest",
									estimatedProcessingDate: new Date(
										Date.now() + 7 * 24 * 60 * 60 * 1000
									).toISOString(), // 7 days from now
								});

								return potentialAmount;
							}
						}
					}

					return 0;
				}
			);

			await Promise.all(potentialEarningsPromises);
		}

		// Calculate additional metrics
		const totalTransactions =
			earningsData.completedPayouts.length + earningsData.pendingPayouts.length;
		const averageEarningsPerTransaction =
			earningsData.completedPayouts.length > 0
				? earningsData.totalEarnings / earningsData.completedPayouts.length
				: 0;

		// Get this month's earnings
		const thisMonth = new Date();
		const thisMonthStart = new Date(
			thisMonth.getFullYear(),
			thisMonth.getMonth(),
			1
		);
		const thisMonthEarnings = earningsData.completedPayouts
			.filter((payout) => new Date(payout.date) >= thisMonthStart)
			.reduce((sum, payout) => sum + payout.amount, 0);

		return NextResponse.json({
			success: true,
			data: {
				...earningsData,
				// Additional calculated metrics
				metrics: {
					totalTransactions,
					averageEarningsPerTransaction:
						Math.round(averageEarningsPerTransaction * 100) / 100,
					thisMonthEarnings,
					hasStripeAccount: !!stripeAccountId,
					dataIncludesStripe: includeStripeData && !!stripeAccountId,
					// Add currency information
					primaryCurrency: earningsData.stripeData?.balanceCurrency || "USD",
					// Indicate data source
					primaryDataSource: includeStripeData && !!stripeAccountId ? "stripe" : "internal",
				},
			},
		});
	} catch (error) {
		console.error("Error fetching creator earnings:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch creator earnings",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}