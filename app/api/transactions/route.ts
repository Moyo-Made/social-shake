import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import Stripe from "stripe";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
	initializeApp({
		credential: cert({
			projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
			clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
		}),
	});
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-03-31.basil", // Use the correct API version
});

// Set the default page size
const DEFAULT_PAGE_SIZE = 10;

/**
 * Helper function to verify Firebase authentication token
 */
async function verifyAuthToken(authHeader: string | null) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Unauthorized: Missing or invalid auth token");
	}

	const token = authHeader.split("Bearer ")[1];
	try {
		return await getAuth().verifyIdToken(token);
	} catch {
		throw new Error("Unauthorized: Invalid token");
	}
}

/**
 * GET handler for fetching transactions with pagination
 */
export async function GET(request: NextRequest) {
	try {
		// Get the URL to extract query parameters
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");

		// Get pagination parameters with defaults
		const page = parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = parseInt(
			url.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
			10
		);


		// Validate pagination parameters
		if (isNaN(page) || page < 1) {
			return NextResponse.json(
				{ error: "Invalid page parameter" },
				{ status: 400 }
			);
		}

		if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
			return NextResponse.json(
				{ error: "Invalid pageSize parameter (must be between 1 and 50)" },
				{ status: 400 }
			);
		}

		let uid;

		// If userId is provided in the query params, use it
		if (userId) {
			uid = userId;
		}
		// Otherwise try to verify via token
		else {
			// Verify authentication
			const authHeader = request.headers.get("authorization");
			const decodedToken = await verifyAuthToken(authHeader);
			uid = decodedToken.uid;
		}

		// Ensure we have a user ID one way or another
		if (!uid) {
			throw new Error("Unauthorized: No user ID provided");
		}

		// Calculate Stripe API pagination parameters
		const limit = pageSize;
		const startingAfter = page > 1 ? url.searchParams.get("cursor") : undefined;

		// Fetch payment intents with pagination
		const paymentIntents = await stripe.paymentIntents.list({
			limit,
			starting_after: startingAfter || undefined,
			// customer: stripeCustomerId, // In production, use customer ID
		});

		// Fetch charges with pagination
		const charges = await stripe.charges.list({
			limit,
			...(startingAfter ? { starting_after: startingAfter } : {}),
			// customer: stripeCustomerId, // In production, use customer ID
		});

		// Combine and format the data
		const combinedData = [
			...paymentIntents.data,
			...charges.data.filter(
				(charge) =>
					// Avoid duplicates by filtering out charges associated with payment intents already listed
					!paymentIntents.data.some((pi) => pi.latest_charge === charge.id)
			),
		];

		// Sort by created date (newest first)
		combinedData.sort((a, b) => b.created - a.created);

		// Apply pagination to the combined data
		const paginatedData = combinedData.slice(0, pageSize);

		// Format the transactions
		const transactions = await formatTransactionData(paginatedData);

		// Calculate pagination metadata
		const hasMore = paymentIntents.has_more || charges.has_more;

		// Store separate cursors for next page
		const lastPaymentIntent =
			paymentIntents.data.length > 0
				? paymentIntents.data[paymentIntents.data.length - 1].id
				: null;

		const lastCharge =
			charges.data.length > 0 ? charges.data[charges.data.length - 1].id : null;

		// Return paginated response with separate cursors
		return NextResponse.json({
			transactions,
			totals: calculateTransactionTotals(transactions),
			pagination: {
				page,
				pageSize,
				hasMore,
				piCursor: lastPaymentIntent,
				chargeCursor: lastCharge,
				totalCount: null, // Stripe doesn't provide a total count directly
			},
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		console.error("Error fetching transactions:", error);

		// Always return a proper JSON response, even for errors
		return NextResponse.json(
			{ error: error.message || "Failed to fetch transactions" },
			{ status: error.message.includes("Unauthorized") ? 401 : 500 }
		);
	}
}

/**
 * Format transaction data to match the expected format in the frontend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function formatTransactionData(stripeData: Array<any>) {
	const formattedTransactions = [];

	for (const item of stripeData) {
		try {
			// Determine if we're dealing with a PaymentIntent or Charge
			const isPaymentIntent = item.object === "payment_intent";

			let metadata = item.metadata || {};
			let chargeObject = null;

			// For PaymentIntents, check if we need to fetch the associated charge for metadata
			if (
				isPaymentIntent &&
				Object.keys(metadata).length === 0 &&
				item.latest_charge
			) {
				try {
					// Retrieve the associated charge to get its metadata
					chargeObject = await stripe.charges.retrieve(item.latest_charge);
					if (chargeObject && chargeObject.metadata) {
						metadata = chargeObject.metadata;
					}
				} catch (error) {
					console.error(
						`Error retrieving charge ${item.latest_charge}:`,
						error
					);
					// Continue with available data rather than failing
				}
			}

			// Determine transaction type from metadata or default to "Project"
			let type = "Project"; // Default value

			if (metadata.type) {
				// Capitalize the first letter of the type
				type = metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1);
			}

			// If we still don't have a type but have a name that contains "contest", use it
			if (
				type === "Project" &&
				metadata.name &&
				metadata.name.toLowerCase().includes("contest")
			) {
				type = "Contest";
			}

			// Determine status
			let status: string;
			if (isPaymentIntent) {
				switch (item.status) {
					case "succeeded":
						status = "Processed";
						break;
					case "processing":
					case "requires_action":
					case "requires_confirmation":
					case "requires_capture":
						status = "Pending";
						break;
					case "canceled":
						status = "Refunded";
						break;
					default:
						status = "Pending";
				}
			} else {
				// Charge
				if (item.refunded) {
					status = "Refunded";
				} else if (item.paid) {
					status = "Processed";
				} else {
					status = "Pending";
				}
			}

			// Safely format amount (Stripe amounts are in cents)
			const amount = item.amount
				? ((isPaymentIntent ? item.amount : item.amount) / 100).toLocaleString()
				: "0";

			// Safely format dates
			const created = new Date(item.created ? item.created * 1000 : Date.now());
			const transactionDate = created.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			// Get payment date (for processed payments)
			const paymentDate = status === "Processed" ? transactionDate : "Pending";

			// Project completion date - use metadata if available or default to transaction date
			const projectCompleted = metadata.projectCompleted || transactionDate;

			// Create a more descriptive description
			let description;
			if (metadata.name) {
				description = `${type} Payment: ${metadata.name}`;
			} else {
				description =
					metadata.description || item.description || `${type} Payment`;
			}

			formattedTransactions.push({
				id: isPaymentIntent ? item.id : item.id,
				transactionDate,
				description,
				amount,
				type,
				status,
				paymentDate,
				projectCompleted,
				actions: "View Transaction",
				rawData: {
					...item,
					chargeMetadata: chargeObject ? chargeObject.metadata : null, // Include charge metadata for debugging
				},
			});
		} catch (error) {
			console.error("Error formatting transaction:", error);
			// Skip this transaction instead of failing the entire operation
		}
	}

	return formattedTransactions;
}

/**
 * Calculate transaction totals
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateTransactionTotals(transactions: any[]) {
	// Initialize totals
	let totalSpend = 0;
	let pendingPayments = 0;
	let totalProcessed = 0;

	// Calculate totals
	transactions.forEach((transaction) => {
		try {
			// Parse the amount (remove commas and convert to number)
			const amount = parseFloat(transaction.amount.replace(/,/g, ""));

			if (!isNaN(amount)) {
				// Add to appropriate total based on status
				if (transaction.status === "Pending") {
					pendingPayments += amount;
				} else if (transaction.status === "Processed") {
					totalProcessed += amount;
					totalSpend += amount; // Add processed to total spend
				}
				// Note: Refunded amounts don't contribute to totals
			}
		} catch (error) {
			console.error("Error calculating transaction total:", error);
			// Skip this transaction in the total calculation
		}
	});

	// Format totals
	return {
		totalSpend: totalSpend.toLocaleString(),
		pendingPayments: pendingPayments.toLocaleString(),
		totalProcessed: totalProcessed.toLocaleString(),
	};
}
