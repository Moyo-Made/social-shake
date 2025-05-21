import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const { contestId, adminId } = await request.json();

		if (!contestId) {
			return NextResponse.json(
				{ error: "Contest ID is required" },
				{ status: 400 }
			);
		}

		// Get contest data
		const contestDoc = await adminDb
			.collection("contests")
			.doc(contestId)
			.get();
		const contestData = contestDoc.data();

		if (!contestData) {
			return NextResponse.json({ error: "Contest not found" }, { status: 404 });
		}

		// Check if contest has ended
		const now = new Date();
		const endDate = new Date(contestData.prizeTimeline.endDate);

		if (now < endDate) {
			return NextResponse.json(
				{ error: "Contest has not ended yet" },
				{ status: 400 }
			);
		}

		// Check if payouts have already been processed
		if (contestData.payoutsProcessed) {
			return NextResponse.json(
				{ error: "Payouts have already been processed for this contest" },
				{ status: 400 }
			);
		}

		// Get leaderboard data to determine winners
		const leaderboardSnapshot = await adminDb
			.collection("contest_applications")
			.where("contestId", "==", contestId)
			.where("status", "==", "approved")
			.get();

		if (leaderboardSnapshot.empty) {
			return NextResponse.json(
				{ error: "No approved participants found" },
				{ status: 400 }
			);
		}

		// Process and sort participants by views (or your ranking criteria)
		const participants = [];
		for (const doc of leaderboardSnapshot.docs) {
			const participantData = doc.data();

			// Get creator data for each participant
			const creatorDoc = await adminDb
				.collection("creators")
				.doc(participantData.userId)
				.get();
			const creatorData = creatorDoc.data();

			if (creatorData) {
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
					applicationId: doc.id,
					metrics: metrics,
					// Use stripeConnectId consistent with your creator onboarding endpoint
					stripeConnectId: creatorData.stripeConnectId,
					// Check onboarding status correctly
					stripeOnboardingComplete: creatorData.stripeOnboardingStatus === "complete",
				});
			}
		}

		// Sort participants by views (descending)
		participants.sort((a, b) => b.metrics.views - a.metrics.views);

		// Determine winners based on contestData.prizeTimeline.winnerCount
		const winners = participants.slice(
			0,
			contestData.prizeTimeline.winnerCount
		);

		// Calculate payout amounts based on positions in contestData.prizeTimeline.positions
		const payouts = [];
		let payoutSuccessCount = 0;

		for (let i = 0; i < winners.length; i++) {
			const winner = winners[i];
			const position = i + 1; // Position is 1-indexed

			// Find the prize amount for this position
			const prizeInfo = contestData.prizeTimeline.positions.find(
				(p: { position: number }) => p.position === position
			);

			if (!prizeInfo) continue;

			// Convert percentage to amount
			const amount = Math.floor(
				(contestData.prizeTimeline.totalBudget * prizeInfo.percentage) / 100
			);

			// Check if winner has completed Stripe onboarding
			if (!winner.stripeConnectId || !winner.stripeOnboardingComplete) {
				payouts.push({
					userId: winner.userId,
					position,
					amount,
					status: "pending",
					error: "Stripe account not ready",
				});
				continue;
			}

			try {
				// Create a transfer to the winner's Stripe account
				const transfer = await stripe.transfers.create({
					amount: amount * 100, // Convert to cents for Stripe
					currency: "usd",
					destination: winner.stripeConnectId,
					metadata: {
						contestId,
						userId: winner.userId,
						position,
					},
					description: `Prize for position #${position} in contest: ${contestData.basic.contestName}`,
				});

				payouts.push({
					userId: winner.userId,
					position,
					amount,
					status: "completed",
					stripeTransferId: transfer.id,
					timestamp: new Date().toISOString(),
				});

				payoutSuccessCount++;
			} catch (error) {
				console.error(
					`Error processing payout for user ${winner.userId}:`,
					error
				);

				payouts.push({
					userId: winner.userId,
					position,
					amount,
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Update contest with payout information
		await adminDb.collection("contests").doc(contestId).update({
			payouts: payouts,
			payoutsProcessed: true,
			payoutsProcessedAt: new Date().toISOString(),
			payoutsProcessedBy: adminId,
			payoutSuccessCount,
			payoutTotalCount: payouts.length,
		});

		// Create payout records for each winner
		for (const payout of payouts) {
			await adminDb.collection("payouts").add({
				contestId,
				userId: payout.userId,
				amount: payout.amount,
				position: payout.position,
				status: payout.status,
				stripeTransferId: payout.stripeTransferId || null,
				error: payout.error || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			payoutsProcessed: payouts.length,
			successfulPayouts: payoutSuccessCount,
			payouts: payouts,
		});
	} catch (error) {
		console.error("Error processing contest payouts:", error);
		return NextResponse.json(
			{ error: "Failed to process payouts" },
			{ status: 500 }
		);
	}
}