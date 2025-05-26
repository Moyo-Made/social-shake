import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, Query, CollectionReference } from "firebase-admin/firestore";

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

// Initialize Firestore
const db = getFirestore();

// TypeScript type definitions
type Record = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * Helper function to convert Firestore timestamps to ISO strings
 */
function convertTimestampsToISO(data: Record | null) {
  if (!data) return data;
  
  const result: Record = { ...data };
  
  // Convert timestamp fields to ISO strings
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[key] = convertTimestampsToISO(value);
    }
  }
  
  return result;
}

/**
 * GET handler for fetching ALL transactions (no server-side pagination)
 */
export async function GET(request: NextRequest) {
  try {
    console.time('transactions-fetch');
    
    // Get the URL to extract query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    // Set up the base query
    const paymentsRef: CollectionReference = db.collection("payments");
    let queryRef: Query = paymentsRef;
    
    // Filter by userId if provided
    if (userId) {
      queryRef = queryRef.where("userId", "==", userId);
    }
    
    // Order by creation date, newest first
    queryRef = queryRef.orderBy("createdAt", "desc");
    
    // Fetch ALL payments at once
    const snapshot = await queryRef.get();
    
    // Collect IDs for batch fetching while processing payment data
    const contestIds = new Set<string>();
    const projectIds = new Set<string>();
    
    // Process all results
    const paymentDataArray: Record[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.contestId) contestIds.add(data.contestId);
      if (data.projectId) projectIds.add(data.projectId);
      
      paymentDataArray.push({
        id: doc.id,
        ...convertTimestampsToISO(data)
      });
    });
    
    // Batch fetching related data in parallel
    const promises = [];
    
    // Only add contest fetch promise if we have contest IDs
    if (contestIds.size > 0) {
      const contestIdsArray = Array.from(contestIds);
      const contestBatches = [];
      
      for (let i = 0; i < contestIdsArray.length; i += 10) {
        const batch = contestIdsArray.slice(i, i + 10);
        contestBatches.push(batch);
      }
      
      const contestPromises = contestBatches.map(batch => 
        db.collection("contests").where("__name__", "in", batch).get()
      );
      promises.push(Promise.all(contestPromises));
    } else {
      promises.push(Promise.resolve([]));
    }
    
    // Only add project fetch promise if we have project IDs
    if (projectIds.size > 0) {
      const projectIdsArray = Array.from(projectIds);
      const projectBatches = [];
      
      for (let i = 0; i < projectIdsArray.length; i += 10) {
        const batch = projectIdsArray.slice(i, i + 10);
        projectBatches.push(batch);
      }
      
      const projectPromises = projectBatches.map(batch => 
        db.collection("projects").where("__name__", "in", batch).get()
      );
      promises.push(Promise.all(projectPromises));
    } else {
      promises.push(Promise.resolve([]));
    }
    
    // Wait for all parallel operations to complete
    const [contestBatchesResults, projectBatchesResults] = await Promise.all(promises);
    
    // Process contest results
    const contestMap = new Map();
    if (Array.isArray(contestBatchesResults)) {
      contestBatchesResults.forEach(batchSnapshot => {
        if (batchSnapshot && typeof batchSnapshot.forEach === 'function') {
          batchSnapshot.forEach(doc => {
            const contestData = doc.data();
            contestMap.set(doc.id, contestData.title || null);
          });
        }
      });
    }
    
    // Process project results
    const projectMap = new Map();
    if (Array.isArray(projectBatchesResults)) {
      projectBatchesResults.forEach(batchSnapshot => {
        if (batchSnapshot && typeof batchSnapshot.forEach === 'function') {
          batchSnapshot.forEach(doc => {
            const projectData = doc.data();
            projectMap.set(doc.id, projectData.title || null);
          });
        }
      });
    }
    
    // Format transactions with the enhanced data
    const transactions = paymentDataArray.map(paymentData => {
      try {
        // Add contest title if available
        if (paymentData.contestId) {
          paymentData.contestTitle = contestMap.get(paymentData.contestId) || null;
        }
        
        // Add project title if available
        if (paymentData.projectId) {
          paymentData.projectTitle = projectMap.get(paymentData.projectId) || null;
        }
        
        // Parse dates (already converted to ISO strings by convertTimestampsToISO)
        const createdAt = paymentData.createdAt ? new Date(paymentData.createdAt) : new Date();
        const processedAt = paymentData.processedAt ? new Date(paymentData.processedAt) : null;
        
        // Format dates for display
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
        
        // Determine status for display
        let status;
        if (paymentData.status === "completed" || paymentData.status === "succeeded") {
          status = "Processed";
        } else if (paymentData.status === "pending" || paymentData.status === "pending_capture") {
          status = "Pending";
        } else if (paymentData.status === "refunded") {
          status = "Refunded";
        } else {
          status = paymentData.status || "Unknown";
        }
        
        // Get amount from the appropriate field
        let amountValue = 0;
        if (typeof paymentData.amount60 === 'number') {
          amountValue = paymentData.amount60;
        } else if (typeof paymentData.amount === 'number') {
          amountValue = paymentData.amount;
        }
        
        // Format amount (assuming it's stored in cents)
        const amount = (amountValue).toLocaleString();
        
        // Determine payment type
        let type = "Project";
        if (paymentData.paymentType) {
          // Capitalize first letter
          type = paymentData.paymentType.charAt(0).toUpperCase() + paymentData.paymentType.slice(1);
        } else if (paymentData.contestId || paymentData.contestTitle) {
          type = "Contest";
        } else if (paymentData.projectId || paymentData.projectTitle) {
          type = "Project";
        }
        
        // Create description
        let description;
        if (paymentData.paymentName) {
          description = `${type} Payment: ${paymentData.paymentName}`;
        } else if (paymentData.contestTitle) {
          description = `Contest Payment: ${paymentData.contestTitle}`;
        } else if (paymentData.projectTitle) {
          description = `Project Payment: ${paymentData.projectTitle}`;
        } else {
          description = `${type} Payment`;
        }
        
        return {
          id: paymentData.id,
          transactionDate,
          description,
          amount,
          type,
          status,
          paymentDate,
          projectCompleted: paymentDate,
          brandEmail: paymentData.brandEmail || null,
          actions: "View Transaction",
          rawData: paymentData,
        };
      } catch (error) {
        console.error(`Error formatting transaction ${paymentData.id}:`, error);
        return {
          id: paymentData.id,
          transactionDate: new Date().toLocaleDateString(),
          description: "Transaction (Error Formatting)",
          amount: "0",
          type: "Unknown",
          status: "Unknown",
          paymentDate: "Unknown",
          projectCompleted: "Unknown",
          actions: "View Transaction",
          rawData: paymentData,
          error: "Error formatting transaction"
        };
      }
    });
    
    // Calculate transaction totals for ALL transactions
    const totals = calculateTransactionTotals(transactions);
    
    console.timeEnd('transactions-fetch');
    
    // Return ALL transactions - let frontend handle pagination and filtering
    return NextResponse.json({
      transactions,
      totals,
      totalCount: transactions.length,
      metadata: {
        contestsCount: contestIds.size,
        projectsCount: projectIds.size
      }
    });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching transactions:", error);

    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * Calculate transaction totals
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateTransactionTotals(transactions: any[]) {
  let totalSpend = 0;
  let pendingPayments = 0;
  let totalProcessed = 0;

  transactions.forEach((transaction) => {
    try {
      const amount = parseFloat(transaction.amount.replace(/,/g, ""));

      if (!isNaN(amount)) {
        if (transaction.status === "Pending") {
          pendingPayments += amount;
        } else if (transaction.status === "Processed") {
          totalProcessed += amount;
          totalSpend += amount;
        }
      }
    } catch (error) {
      console.error("Error calculating transaction total:", error);
    }
  });

  return {
    totalSpend: totalSpend.toLocaleString(),
    pendingPayments: pendingPayments.toLocaleString(),
    totalProcessed: totalProcessed.toLocaleString(),
  };
}