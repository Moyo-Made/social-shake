import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const { payoutId } = await request.json();

		if (!payoutId) {
			return NextResponse.json(
				{ error: "Payout ID is required" },
				{ status: 400 }
			);
		}

		// Get the payout document
		const payoutDoc = await adminDb.collection("payouts").doc(payoutId).get();

		if (!payoutDoc.exists) {
			return NextResponse.json({ error: "Payout not found" }, { status: 404 });
		}

		const payoutData = payoutDoc.data();

		// Make sure it's not already processed
		if (payoutData?.status !== "pending") {
			return NextResponse.json(
				{
					error: `Payout cannot be processed. Current status: ${payoutData?.status}`,
				},
				{ status: 400 }
			);
		}

		// Determine payout type
		const payoutType = payoutData.type || "contest"; // Default to contest for backward compatibility

		if (payoutType === "video") {
			// Get video purchase data instead of contest data
			const purchaseDoc = await adminDb.collection("videoPurchases").doc(payoutData.purchaseId).get();
			const purchaseData = purchaseDoc.data();

			// Make sure the video purchase payment has been processed
			if (!purchaseData?.paymentStatus || purchaseData?.paymentStatus !== "succeeded") {
				return NextResponse.json(
					{ error: "Video purchase payment has not been processed yet" },
					{ status: 400 }
				);
			}

			// Get the payment record for the video purchase
			const paymentsSnapshot = await adminDb
				.collection("payments")
				.where("purchaseId", "==", payoutData.purchaseId)
				.where("status", "==", "succeeded")
				.get();

			if (paymentsSnapshot.empty) {
				return NextResponse.json(
					{ error: "No successful payment found for this video purchase" },
					{ status: 400 }
				);
			}

			// Get the payment intent ID
			const paymentData = paymentsSnapshot.docs[0].data();
			const paymentIntentId = paymentData.stripePaymentIntentId;

			if (!paymentIntentId) {
				return NextResponse.json(
					{ error: "No payment intent ID found" },
					{ status: 400 }
				);
			}

			// Calculate the platform fee for video sales (potentially different rate)
			const platformFeePercentage = 0.05; // 5% platform fee for video sales (vs 10% for contests)
			const amount = payoutData.amount;
			const platformFee = Math.round(amount * platformFeePercentage);
			const creatorAmount = amount - platformFee;

			// Create a transfer to the creator's connected account
			const transfer = await stripe.transfers.create({
				amount: creatorAmount,
				currency: "usd",
				destination: payoutData.stripeConnectId,
				transfer_group: payoutData.purchaseId, // Group transfers by purchase
				metadata: {
					payoutId: payoutId,
					purchaseId: payoutData.purchaseId,
					videoId: payoutData.videoId,
					userId: payoutData.userId,
					creatorId: payoutData.creatorId,
					originalAmount: amount,
					platformFee: platformFee,
					type: "video_sale"
				}
			});

			// Update the payout document
			await adminDb.collection("payouts").doc(payoutId).update({
				status: "completed",
				stripeTransferId: transfer.id,
				platformFee: platformFee,
				creatorAmount: creatorAmount,
				processedAt: new Date().toISOString()
			});

			// Update the video purchase status
			await adminDb.collection("videoPurchases").doc(payoutData.purchaseId).update({
				creatorPayoutStatus: "completed",
				creatorPayoutProcessedAt: new Date().toISOString()
			});

			return NextResponse.json({
				success: true,
				transfer: transfer.id,
				amount: creatorAmount,
				type: "video"
			});

		} else {
			// EXISTING CONTEST LOGIC
			// Get contest data to ensure funds are available
			const contestDoc = await adminDb
				.collection("contests")
				.doc(payoutData.contestId)
				.get();
			const contestData = contestDoc.data();

			// Make sure the contest payment has been processed
			if (!contestData?.paymentStatus || contestData?.paymentStatus !== "paid") {
				return NextResponse.json(
					{ error: "Contest payment has not been processed yet" },
					{ status: 400 }
				);
			}

			// Get the payment record for the contest
			const paymentsSnapshot = await adminDb
				.collection("payments")
				.where("contestId", "==", payoutData.contestId)
				.where("status", "==", "succeeded")
				.get();

			if (paymentsSnapshot.empty) {
				return NextResponse.json(
					{ error: "No successful payment found for this contest" },
					{ status: 400 }
				);
			}

			// Get the payment intent ID
			const paymentData = paymentsSnapshot.docs[0].data();
			const paymentIntentId = paymentData.stripePaymentIntentId;

			if (!paymentIntentId) {
				return NextResponse.json(
					{ error: "No payment intent ID found" },
					{ status: 400 }
				);
			}

			// Calculate the platform fee (you can adjust this as needed)
			const platformFeePercentage = 0.1; // 10% platform fee
			const amount = payoutData.amount;
			const platformFee = Math.round(amount * platformFeePercentage);
			const creatorAmount = amount - platformFee;

			// Create a transfer to the creator's connected account
			const transfer = await stripe.transfers.create({
				amount: creatorAmount, // Amount in cents after platform fee
				currency: "usd",
				destination: payoutData.stripeConnectId,
				transfer_group: payoutData.contestId, // Group transfers by contest
				metadata: {
					payoutId: payoutId,
					contestId: payoutData.contestId,
					userId: payoutData.userId,
					position: payoutData.position,
					originalAmount: amount,
					platformFee: platformFee,
				},
			});

			// Update the payout document
			await adminDb.collection("payouts").doc(payoutId).update({
				status: "completed",
				stripeTransferId: transfer.id,
				platformFee: platformFee,
				creatorAmount: creatorAmount,
				processedAt: new Date().toISOString(),
			});

			// Update the winner status in the contest
			const contestWinners = contestData.winners || [];
			const updatedWinners = contestWinners.map(
				(winner: {
					userId: string;
					position: number;
					payoutStatus?: string;
					payoutProcessedAt?: string;
				}) => {
					if (
						winner.userId === payoutData.userId &&
						winner.position === payoutData.position
					) {
						return {
							...winner,
							payoutStatus: "completed",
							payoutProcessedAt: new Date().toISOString(),
						};
					}
					return winner;
				}
			);

			await adminDb.collection("contests").doc(payoutData.contestId).update({
				winners: updatedWinners,
			});

			return NextResponse.json({
				success: true,
				transfer: transfer.id,
				amount: creatorAmount,
			});
		}
	} catch (error) {
		console.error("Error processing payout:", error);
		return NextResponse.json(
			{
				error: "Failed to process payout",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}