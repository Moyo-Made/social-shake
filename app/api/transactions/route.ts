import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from 'stripe';

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

// Initialize Firestore and Stripe
const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

// Set the default page size
const DEFAULT_PAGE_SIZE = 10;

/**
 * GET handler for fetching transactions with pagination and accurate Stripe totals
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL to extract query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    // Ensure we have a user ID
    if (!userId) {
      throw new Error("Unauthorized: No user ID provided");
    }
    
    // Verify the token matches the requested userId (uncomment if needed)
    /*
    if (authHeader) {
      const decodedToken = await verifyAuthToken(authHeader);
      if (decodedToken.uid !== userId) {
        throw new Error("Unauthorized: Token does not match requested user ID");
      }
    }
    */

    // Get pagination parameters with defaults
    const pageSize = parseInt(
      url.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
      10
    );
    
    // Validate pageSize parameter
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
      return NextResponse.json(
        { error: "Invalid pageSize parameter (must be between 1 and 50)" },
        { status: 400 }
      );
    }
    
    // Set up the base query
    let query = db.collection("payments")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(pageSize + 1); // Fetch one extra to determine if there are more results
    
    // Handle cursor-based pagination
    const cursor = url.searchParams.get("cursor");
    if (cursor) {
      try {
        const docId = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorDoc = await db.collection("payments").doc(docId).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      } catch (error) {
        console.error("Invalid cursor format:", error);
        return NextResponse.json(
          { error: "Invalid cursor format" },
          { status: 400 }
        );
      }
    }
    
    // Execute the query
    const snapshot = await query.get();
    
    // Process results
    interface Transaction {
      id: string;
      transactionDate: string;
      description: string;
      amount: string;
      type: string;
      status: string;
      paymentDate: string;
      projectCompleted: string;
      actions: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawData: any;
      error?: string;
    }

    const transactions: Transaction[] = [];
    let lastDoc = null;
    let hasMore = false;
    
    // If we got more documents than the requested pageSize, there are more results
    if (snapshot.size > pageSize) {
      hasMore = true;
      // Only process up to pageSize documents
      snapshot.docs.slice(0, pageSize).forEach(doc => {
        const data = doc.data();
        transactions.push(formatTransaction(doc.id, data));
      });
      // The last document is our new cursor position
      lastDoc = snapshot.docs[pageSize - 1];
    } else {
      // Process all results
      snapshot.forEach(doc => {
        const data = doc.data();
        transactions.push(formatTransaction(doc.id, data));
      });
      // If we have any documents, the last one is our new cursor position
      if (snapshot.size > 0) {
        lastDoc = snapshot.docs[snapshot.size - 1];
      }
    }
    
    // Create the next cursor
    let nextCursor = null;
    if (hasMore && lastDoc) {
      // Just use the document ID as cursor
      nextCursor = Buffer.from(lastDoc.id).toString('base64');
    }
    
    // Get total count in a separate query for pagination metadata
    const countQuery = await db.collection("payments")
      .where("userId", "==", userId)
      .count()
      .get();
    
    const totalCount = countQuery.data().count;
    
    // Calculate accurate totals from Stripe
    const stripeTotals = await calculateStripeBasedTotals(userId, transactions);
    
    // Return the formatted response
    return NextResponse.json({
      transactions,
      totals: stripeTotals,
      pagination: {
        pageSize,
        hasMore,
        cursor: nextCursor,
        totalCount,
      }
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
 * Calculate accurate transaction totals using Stripe data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calculateStripeBasedTotals(userId: string, transactions: any[]) {
  try {
    // Get user data to find Stripe customer ID
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    let totalSpendFromStripe = 0;
    let pendingPaymentsFromStripe = 0;
    let totalProcessedFromStripe = 0;
    let allStripePayments: Stripe.PaymentIntent[] = [];

    if (stripeCustomerId) {
      try {
        // Fetch all payment intents for this customer
        const paymentIntentsResponse = await stripe.paymentIntents.list({
          customer: stripeCustomerId,
          limit: 100, // Adjust as needed
        });

        allStripePayments = paymentIntentsResponse.data;

        // Calculate totals based on Stripe payment status
        allStripePayments.forEach(pi => {
          const amount = pi.amount / 100; // Convert from cents
          
          if (pi.status === 'succeeded') {
            totalProcessedFromStripe += amount;
            totalSpendFromStripe += amount;
          } else if (pi.status === 'processing' || pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
            pendingPaymentsFromStripe += amount;
          }
          // Note: cancelled, requires_payment_method, etc. are not counted
        });

      } catch (stripeError) {
        console.error("Stripe API Error:", stripeError);
        // Fall back to Firestore calculation if Stripe fails
        return calculateFirestoreBasedTotals(transactions);
      }
    } else {
      // Try alternative methods if no Stripe customer ID
      try {
        // Option 1: Search by metadata
        const paymentIntentsResponse = await stripe.paymentIntents.list({
          limit: 100,
        });
        
        const userPayments = paymentIntentsResponse.data.filter(pi => 
          pi.metadata?.userId === userId || pi.metadata?.user_id === userId
        );
        
        if (userPayments.length > 0) {
          userPayments.forEach(pi => {
            const amount = pi.amount / 100;
            
            if (pi.status === 'succeeded') {
              totalProcessedFromStripe += amount;
              totalSpendFromStripe += amount;
            } else if (pi.status === 'processing' || pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
              pendingPaymentsFromStripe += amount;
            }
          });
        } else if (userData?.email) {
          // Option 2: Search by email
          const customers = await stripe.customers.list({
            email: userData.email,
            limit: 10,
          });
          
          if (customers.data.length > 0) {
            const customer = customers.data[0];
            const customerPayments = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            });
            
            customerPayments.data.forEach(pi => {
              const amount = pi.amount / 100;
              
              if (pi.status === 'succeeded') {
                totalProcessedFromStripe += amount;
                totalSpendFromStripe += amount;
              } else if (pi.status === 'processing' || pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
                pendingPaymentsFromStripe += amount;
              }
            });
          }
        }
      } catch (error) {
        console.error("Alternative Stripe search failed:", error);
        // Fall back to Firestore calculation
        return calculateFirestoreBasedTotals(transactions);
      }
    }

    // If we couldn't get any Stripe data, fall back to Firestore
    if (totalSpendFromStripe === 0 && pendingPaymentsFromStripe === 0) {
      return calculateFirestoreBasedTotals(transactions);
    }

    // Format and return Stripe-based totals
    return {
      totalSpend: totalSpendFromStripe.toLocaleString(),
      pendingPayments: pendingPaymentsFromStripe.toLocaleString(),
      totalProcessed: totalProcessedFromStripe.toLocaleString(),
      dataSource: 'stripe', // Indicate source of data
      stripePaymentsCount: allStripePayments.length,
    };

  } catch (error) {
    console.error("Error calculating Stripe totals:", error);
    // Fall back to Firestore calculation
    return calculateFirestoreBasedTotals(transactions);
  }
}

/**
 * Fallback: Calculate transaction totals from Firestore data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateFirestoreBasedTotals(transactions: any[]) {
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
    dataSource: 'firestore', // Indicate source of data
  };
}

/**
 * Format a payment document into the expected transaction format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTransaction(id: string, payment: any) {
  try {
    // Parse dates
    const createdAt = payment.createdAt 
      ? (typeof payment.createdAt === 'string' ? new Date(payment.createdAt) : payment.createdAt.toDate())
      : new Date();
      
    const processedAt = payment.processedAt 
      ? (typeof payment.processedAt === 'string' ? new Date(payment.processedAt) : payment.processedAt.toDate()) 
      : null;
    
    // Format dates
    const transactionDate = createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const paymentDate = processedAt
      ? processedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Pending";
    
    // Determine status
    let status;
    if (payment.status === "completed") {
      status = "Processed";
    } else if (payment.status === "pending") {
      status = "Pending";
    } else if (payment.status === "refunded") {
      status = "Refunded";
    } else {
      status = payment.status || "Unknown";
    }
    
    // Get amount from the appropriate field (checking all possible field names)
    let amountValue = 0;
    if (typeof payment.amount60 === 'number') {
      amountValue = payment.amount60;
    } else if (typeof payment.amount === 'number') {
      amountValue = payment.amount;
    }
    
    // Format amount (assuming it's stored in cents in your database)
    const amount = (amountValue).toLocaleString();
    
    // Determine type
    let type = "Project";
    if (payment.paymentType) {
      // Capitalize first letter
      type = payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1);
    }
    
    // If it's a contest, override the type
    if (payment.contestType || payment.contestName) {
      type = "Contest";
    }
    
    // Create description
    let description;
    if (payment.paymentName) {
      description = `${type} Payment: ${payment.paymentName}`;
    } else if (payment.contestName) {
      description = `${type} Payment: ${payment.contestName}`;
    } else {
      description = `${type} Payment`;
    }
    
    return {
      id,
      transactionDate,
      description,
      amount,
      type,
      status,
      paymentDate,
      projectCompleted: paymentDate, // Using payment date as completion date or override with a specific field if available
      actions: "View Transaction",
      rawData: payment, // Include the raw data for debugging
    };
  } catch (error) {
    console.error(`Error formatting transaction ${id}:`, error);
    // Return a fallback object with basic information
    return {
      id,
      transactionDate: new Date().toLocaleDateString(),
      description: "Transaction (Error Formatting)",
      amount: "0",
      type: "Unknown",
      status: "Unknown",
      paymentDate: "Unknown",
      projectCompleted: "Unknown",
      actions: "View Transaction",
      rawData: payment,
      error: "Error formatting transaction"
    };
  }
}