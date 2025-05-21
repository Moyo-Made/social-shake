import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

// Helper function to format transaction objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatTransaction = (data: any) => {
	const status =
		data.status === "completed"
			? "Withdrawn"
			: data.status === "pending"
				? "Processing"
				: "Processed";

	let paymentMethod = null;
	if (data.paymentDetails) {
		paymentMethod = {
			type: data.paymentDetails.type || "bank",
			name: data.paymentDetails.name || "Bank Account",
			maskedAccount: data.paymentDetails.maskedAccount || "",
		};
	}

	return {
		id: data.id,
		transactionDate: new Date(data.createdAt || Date.now()).toLocaleDateString(
			"en-US",
			{
				month: "long",
				day: "numeric",
				year: "numeric",
			}
		),
		description:
			data.description ||
			`${data.type?.charAt(0).toUpperCase() + data.type?.slice(1) || "Transaction"}`,
		amount: data.amount ? (data.amount / 100).toFixed(2) : "0.00", // Convert cents to dollars
		status: status,
		type: data.type || "payment",
		userId: data.userId,
		createdAt: data.createdAt || new Date().toISOString(),
		lastUpdated: data.updatedAt || data.createdAt || new Date().toISOString(),
		isDefault: false,
		paymentMethod: paymentMethod,
		projectName: data.projectName || null,
		brand: data.brand || null,
		processingTime:
			data.type === "withdrawal" ? "1-3 business days" : "5-7 business days",
		processingStartedAt: data.createdAt || new Date().toISOString(),
		stripeTransferId: data.stripeTransferId || null,
	};
};

// Helper function to get available balance
async function getAvailableBalance(userId: string) {
	try {
		// Implement your balance calculation logic here
		const creatorDoc = await adminDb.collection("creators").doc(userId).get();
		const creatorData = creatorDoc.data();
		return creatorData?.availableBalance || 0;
	} catch (error) {
		console.error("Error getting available balance:", error);
		return 0;
	}
}

// GET endpoint to retrieve transactions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameters using the same approach as the brand endpoint
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required. Please provide it in the query parameters." },
        { status: 400 }
      );
    }
    
    // Keep the rest of your existing code for limit, page, startAfter
    const limit = parseInt(searchParams.get("limit") || "50");
    // const page = parseInt(searchParams.get("page") || "1");
    const startAfter = searchParams.get("startAfter");

		// Create empty arrays to store results
		const payouts = [];
		const withdrawals = [];

		try {
			// Get payouts (contest winnings)
			let payoutsQuery = adminDb
				.collection("payouts")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc");

			if (startAfter) {
				const startAfterDoc = await adminDb
					.collection("payouts")
					.doc(startAfter)
					.get();
				if (startAfterDoc.exists) {
					payoutsQuery = payoutsQuery.startAfter(startAfterDoc);
				}
			}

			payoutsQuery = payoutsQuery.limit(limit);
			const payoutsSnapshot = await payoutsQuery.get();

			// Process payout data
			for (const doc of payoutsSnapshot.docs) {
			
				const data = {
					id: doc.id,
					projectName: "",
					brand: "",
					description: "",
          	// eslint-disable-next-line @typescript-eslint/no-explicit-any
					...(doc.data() as { contestId?: string; [key: string]: any }),
				};

				// Get contest details if contestId exists
				if (data.contestId) {
					try {
						const contestDoc = await adminDb
							.collection("contests")
							.doc(data.contestId)
							.get();
						const contestData = contestDoc.data();

						if (contestData) {
							data.projectName = contestData.basic?.contestName || "";
							data.brand = contestData.basic?.brandName || "";
							data.description = `Payment for ${contestData.basic?.contestName}`;
						}
					} catch (contestError) {
						console.error(
							`Error fetching contest details for ${data.contestId}:`,
							contestError
						);
						// Continue without contest details if it fails
					}
				}

				payouts.push({
					...formatTransaction(data),
					type: "payment",
				});
			}
		} catch (payoutsError) {
			console.error("Error fetching payouts:", payoutsError);
			// Continue with empty payouts array
		}

		try {
			// Get withdrawals
			let withdrawalsQuery = adminDb
				.collection("withdrawals")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc");

			if (startAfter) {
				const startAfterDoc = await adminDb
					.collection("withdrawals")
					.doc(startAfter)
					.get();
				if (startAfterDoc.exists) {
					withdrawalsQuery = withdrawalsQuery.startAfter(startAfterDoc);
				}
			}

			withdrawalsQuery = withdrawalsQuery.limit(limit);
			const withdrawalsSnapshot = await withdrawalsQuery.get();

			// Process withdrawal data
			for (const doc of withdrawalsSnapshot.docs) {
				const data = { id: doc.id, ...doc.data() };
				withdrawals.push({
					...formatTransaction(data),
					type: "withdrawal",
				});
			}
		} catch (withdrawalsError) {
			console.error("Error fetching withdrawals:", withdrawalsError);
			// Continue with empty withdrawals array
		}

		// Combine and sort by date (newest first)
		const transactions = [...payouts, ...withdrawals].sort((a, b) => {
			const dateA = new Date(a.createdAt || 0).getTime();
			const dateB = new Date(b.createdAt || 0).getTime();
			return dateB - dateA;
		});

		return NextResponse.json({
			transactions: transactions.slice(0, limit),
			hasMore: payouts.length + withdrawals.length > limit,
			lastId:
				transactions.length > 0
					? transactions[transactions.length - 1].id
					: null,
		});
	} catch (error) {
		console.error("Error fetching transactions:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch transactions",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// POST endpoint to create a withdrawal request

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      
      // Get userId from query parameters first, fallback to body
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId") || body.userId;
      
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required. Please provide it in the query parameters or request body." },
          { status: 400 }
        );
      }
      
      const amount = body?.amount;
      const paymentMethod = body?.paymentMethod;

		if (!amount || amount <= 0) {
			return NextResponse.json(
				{ error: "Valid withdrawal amount is required" },
				{ status: 400 }
			);
		}

		if (!paymentMethod) {
			return NextResponse.json(
				{ error: "Payment method is required" },
				{ status: 400 }
			);
		}

		// Get creator data to check if they can withdraw
		const creatorDoc = await adminDb.collection("creators").doc(userId).get();
		const creatorData = creatorDoc.data();

		if (!creatorData) {
			return NextResponse.json(
				{ error: "Creator profile not found" },
				{ status: 404 }
			);
		}

		// Check if they have completed Stripe onboarding
		if (
			!creatorData.stripeConnectId ||
			creatorData.stripeOnboardingStatus !== "complete"
		) {
			return NextResponse.json(
				{ error: "Stripe account setup incomplete" },
				{ status: 400 }
			);
		}

		// Get available balance
		const availableBalance = await getAvailableBalance(userId);

		if (amount > availableBalance) {
			return NextResponse.json(
				{ error: "Insufficient balance for withdrawal" },
				{ status: 400 }
			);
		}

		// Create withdrawal record in database
		const withdrawalData = {
			userId,
			amount: Math.floor(amount * 100), // Convert to cents
			status: "pending",
			type: "withdrawal",
			paymentDetails: {
				type: paymentMethod.type || "bank",
				name: paymentMethod.name || "Bank Account",
				maskedAccount: paymentMethod.maskedAccount || "",
			},
			description: `Withdrawal to ${paymentMethod.name || "Bank Account"}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const withdrawalRef = await adminDb
			.collection("withdrawals")
			.add(withdrawalData);

		// Schedule the actual Stripe transfer (could be done by a background job in production)
		try {
			if (!process.env.STRIPE_SECRET_KEY) {
				throw new Error("Stripe secret key is not configured");
			}

			const transfer = await stripe.transfers.create({
				amount: Math.floor(amount * 100), // Convert to cents
				currency: "usd",
				destination: creatorData.stripeConnectId,
				metadata: {
					userId,
					withdrawalId: withdrawalRef.id,
				},
				description: `Withdrawal requested on ${new Date().toLocaleDateString()}`,
			});

			// Update the withdrawal record with Stripe transfer ID
			await withdrawalRef.update({
				stripeTransferId: transfer.id,
				status: "completed",
				updatedAt: new Date().toISOString(),
			});

			// Get the updated withdrawal record
			const updatedWithdrawal = await withdrawalRef.get();
			const withdrawalWithId = {
				id: updatedWithdrawal.id,
				...updatedWithdrawal.data(),
			};

			return NextResponse.json({
				success: true,
				transaction: formatTransaction(withdrawalWithId),
			});
		} catch (stripeError) {
			console.error("Stripe transfer error:", stripeError);

			// If Stripe transfer fails, update status to failed
			await withdrawalRef.update({
				status: "failed",
				error:
					stripeError instanceof Error
						? stripeError.message
						: "Transfer failed",
				updatedAt: new Date().toISOString(),
			});

			return NextResponse.json(
				{
					error: "Failed to process Stripe transfer",
					details:
						stripeError instanceof Error
							? stripeError.message
							: "Unknown error",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error processing withdrawal:", error);
		return NextResponse.json(
			{
				error: "Failed to process withdrawal",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

