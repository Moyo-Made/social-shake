import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

/**
 * Endpoint to check payout eligibility for contest winners
 * This can be used before processing payouts to identify issues
 */
export async function POST(request: NextRequest) {
	try {
		const { contestId } = await request.json();

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

		// Process participants
		const participants = [];
		for (const doc of leaderboardSnapshot.docs) {
			const participantData = doc.data();

			// Get creator data for each participant
			const creatorDoc = await adminDb
				.collection("creators")
				.doc(participantData.userId)
				.get();
			const creatorData = creatorDoc.data();

			let displayName = "";
			if (creatorData) {
				// Try to get the display name from the creator profile
				// Make sure we have a valid email before querying
				const email = participantData.email || creatorData.email;

				if (email) {
					try {
						const profileDoc = await adminDb
							.collection("creatorProfiles")
							.doc(email)
							.get();

						const profileData = profileDoc.data();
						console.log("Profile Data:", profileData);

						if (profileData && profileData.displayUsername) {
							displayName = profileData.displayUsername;
						} else if(profileData && profileData.username){
							displayName = profileData.username
						}else if (profileData && profileData.creatorProfileData.creator) {
							displayName = profileData.creatorProfileData.creator;
						}

					} catch (profileError) {
						console.error("Error fetching creator profile:", profileError);
					}
				}
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

				// Check Stripe account status
				let stripeAccountStatus = "not_connected";
				let stripeAccountDetails = null;
				let stripeAccountId = null;

				// Support both field naming conventions
				if (creatorData.stripeConnectId) {
					stripeAccountId = creatorData.stripeConnectId;
				} else if (creatorData.stripeAccountId) {
					stripeAccountId = creatorData.stripeAccountId;
				}

				if (stripeAccountId) {
					// Always verify with Stripe directly for the most accurate status
					try {
						const account = await stripe.accounts.retrieve(stripeAccountId);

						if (account.charges_enabled && account.payouts_enabled) {
							stripeAccountStatus = "ready";
							stripeAccountDetails = {
								chargesEnabled: account.charges_enabled,
								payoutsEnabled: account.payouts_enabled,
								detailsSubmitted: account.details_submitted,
								defaultCurrency: account.default_currency,
							};

							// Update the database with latest status if needed
							if (
								creatorData.stripeOnboardingStatus !== "complete" ||
								creatorData.stripeOnboardingComplete !== true
							) {
								await adminDb
									.collection("creators")
									.doc(participantData.userId)
									.set(
										{
											stripeOnboardingStatus: "complete",
											stripeOnboardingComplete: true,
											stripeAccountDetails: {
												...stripeAccountDetails,
												lastUpdated: new Date().toISOString(),
											},
											updatedAt: new Date().toISOString(),
										},
										{ merge: true }
									);
							}
						} else {
							stripeAccountStatus = "incomplete";
							stripeAccountDetails = {
								chargesEnabled: account.charges_enabled,
								payoutsEnabled: account.payouts_enabled,
								detailsSubmitted: account.details_submitted,
							};

							// Update the database with latest status if needed
							if (
								creatorData.stripeOnboardingStatus === "complete" ||
								creatorData.stripeOnboardingComplete === true
							) {
								await adminDb
									.collection("creators")
									.doc(participantData.userId)
									.set(
										{
											stripeOnboardingStatus: "pending",
											stripeOnboardingComplete: false,
											stripeAccountDetails: {
												...stripeAccountDetails,
												lastUpdated: new Date().toISOString(),
											},
											updatedAt: new Date().toISOString(),
										},
										{ merge: true }
									);
							}
						}
					} catch (error) {
						console.error("Error verifying Stripe account:", error);
						stripeAccountStatus = "error";
						stripeAccountDetails = {
							error: "Failed to verify account",
							details: error instanceof Error ? error.message : String(error),
						};
					}
				} else {
					stripeAccountStatus = "not_connected";
				}

				// Use the verified status for the participant data
				participants.push({
					userId: participantData.userId,
					applicationId: doc.id,
					email: creatorData.email || "Not available",
					displayName: displayName,
					metrics: metrics,
					stripeConnectId: stripeAccountId, // Use the unified ID
					stripeOnboardingStatus:
						creatorData.stripeOnboardingStatus ||
						(creatorData.stripeOnboardingComplete ? "complete" : "pending") ||
						"not_started",
					stripeAccountStatus,
					stripeAccountDetails,
					payoutEligible: stripeAccountStatus === "ready",
				});
			}
		}

		// Sort participants by views (descending)
		participants.sort((a, b) => b.metrics.views - a.metrics.views);

		// Determine potential winners based on contestData.prizeTimeline.winnerCount
		const potentialWinners = participants.slice(
			0,
			contestData.prizeTimeline.winnerCount
		);

		// Calculate eligibility status
		let readyCount = 0;
		let pendingCount = 0;
		let notConnectedCount = 0;
		let errorCount = 0;

		potentialWinners.forEach((winner) => {
			switch (winner.stripeAccountStatus) {
				case "ready":
					readyCount++;
					break;
				case "pending":
					pendingCount++;
					break;
				case "not_connected":
					notConnectedCount++;
					break;
				case "error":
				case "incomplete":
					errorCount++;
					break;
			}
		});

		return NextResponse.json({
			success: true,
			contestId,
			contestName: contestData.basic.contestName,
			totalParticipants: participants.length,
			potentialWinners: potentialWinners.map((winner, index) => ({
				userId: winner.userId,
				position: index + 1, // Add position based on index
				displayName: winner.displayName,
				email: winner.email,
				metrics: winner.metrics,
				stripeAccountStatus: winner.stripeAccountStatus,
				payoutEligible: winner.payoutEligible,
			})),
			summary: {
				totalPotentialWinners: potentialWinners.length,
				readyForPayout: readyCount,
				pendingOnboarding: pendingCount,
				notConnected: notConnectedCount,
				errors: errorCount,
			},
		});
	} catch (error) {
		console.error("Error checking payout eligibility:", error);
		return NextResponse.json(
			{
				error: "Failed to check payout eligibility",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
