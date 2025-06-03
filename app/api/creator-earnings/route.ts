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

		// Get creator's Stripe account ID if we need Stripe data
		let stripeAccountId: string | null = null;
		if (includeStripeData) {
			const creatorDoc = await adminDb.collection("creators").doc(userId).get();
			const creatorData = creatorDoc.data();
			stripeAccountId = creatorData?.stripeAccountId || null;
		}

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
				currency: payoutData.currency || "USD", // Include currency info
				date:
					payoutData.createdAt?.toDate?.()?.toISOString() ||
					payoutData.createdAt,
				status: payoutData.status,
				contestId: payoutData.contestId,
				projectId: payoutData.projectId,
				position: payoutData.position,
				paymentMethod: payoutData.paymentMethod || "stripe",
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
				currency: payoutData.currency || "USD", // Include currency info
				date:
					payoutData.createdAt?.toDate?.()?.toISOString() ||
					payoutData.createdAt,
				status: payoutData.status,
				contestId: payoutData.contestId,
				projectId: payoutData.projectId,
				position: payoutData.position,
				failureReason: payoutData.failureReason,
				estimatedProcessingDate: payoutData.estimatedProcessingDate,
				...payoutData,
			});
		});

		// ... (keep existing contest applications logic)
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
								id: `potential-${contestId}`,
								contestId,
								position,
								amount: potentialAmount,
								currency: "USD", // Contest prizes are typically in USD
								status: "pending_processing",
								note: "Contest ended, payouts being processed",
								estimatedPosition: true,
								date: new Date().toISOString(),
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

		// If Stripe data is requested and we have a Stripe account ID, use the dedicated balance API
		if (includeStripeData && stripeAccountId) {
			try {
				// Use the same balance API that your transactions component uses
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
					
					// Also get recent transactions for additional context
					const transactionsResponse = await fetch(
						`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/transactions?accountId=${stripeAccountId}&limit=10`,
						{
							method: 'GET',
							headers: {
								'Content-Type': 'application/json',
							},
						}
					);

					let recentCharges = [];
					let recentPayouts = [];

					if (transactionsResponse.ok) {
						const transactionsData = await transactionsResponse.json();
						
						// Filter transactions by type
						recentCharges = transactionsData.transactions
							?.filter((t: { type: string }) => t.type === 'charge' || t.type === 'payment')
							?.slice(0, 5) || [];
						
						recentPayouts = transactionsData.transactions
							?.filter((t: { type: string }) => t.type === 'payout')
							?.slice(0, 5) || [];
					}

					earningsData.stripeData = {
						availableBalance: balanceData.availableBalance || "0",
						processingPayments: balanceData.processingPayments || "0", 
						totalEarnings: balanceData.totalEarnings || "0",
						balanceCurrency: balanceData.currency || "USD",
						recentCharges: recentCharges.map((charge: { id: string; amount: string; currency: string; date: string; status: string }) => ({
							id: charge.id,
							amount: parseFloat(charge.amount.replace('$', '')) || 0,
							currency: charge.currency || "USD",
							date: charge.date,
							status: charge.status,
						})),
						recentPayouts: recentPayouts.map((payout: { id: string; amount: string; currency: string; date: string; status: string }) => ({
							id: payout.id,
							amount: parseFloat(payout.amount.replace('$', '')) || 0,
							currency: payout.currency || "USD", 
							date: payout.date,
							status: payout.status,
						})),
					};
				} else {
					console.error("Error fetching Stripe balance data");
					// Fallback to empty data
					earningsData.stripeData = {
						availableBalance: "0",
						processingPayments: "0",
						totalEarnings: "0",
						balanceCurrency: "USD",
						recentCharges: [],
						recentPayouts: [],
					};
				}
			} catch (stripeError) {
				console.error("Error fetching Stripe data:", stripeError);
				// Fallback to empty data instead of failing
				earningsData.stripeData = {
					availableBalance: "0",
					processingPayments: "0", 
					totalEarnings: "0",
					balanceCurrency: "USD",
					recentCharges: [],
					recentPayouts: [],
				};
			}
		}

		// Calculate additional metrics
		const totalTransactions =
			earningsData.completedPayouts.length + earningsData.pendingPayouts.length;
		const averageEarningsPerTransaction =
			totalTransactions > 0
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