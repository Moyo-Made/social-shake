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

// Set the default page size
const DEFAULT_PAGE_SIZE = 10;

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
 * GET handler for fetching transactions with pagination directly from Firestore
 */
export async function GET(request: NextRequest) {
  try {
    console.time('transactions-fetch'); // Performance timing start
    
    // Get the URL to extract query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get('status');
    
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
    const paymentsRef: CollectionReference = db.collection("payments");
    let queryRef: Query = paymentsRef;
    
    // Filter by userId if provided
    if (userId) {
      queryRef = queryRef.where("userId", "==", userId);
    }
    
    // Filter by status if provided
    if (status) {
      queryRef = queryRef.where("status", "==", status);
    }
    
    // Order by creation date, newest first
    queryRef = queryRef.orderBy("createdAt", "desc");
    
    // Handle cursor-based pagination
    const cursor = url.searchParams.get("cursor");
    if (cursor) {
      try {
        // The cursor should be a serialized object containing the timestamp and docId
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        
        // Get a reference to the document at the cursor position
        if (cursorData.timestamp && cursorData.docId) {
          const cursorTimestamp = new Date(cursorData.timestamp);
          
          // Find documents with timestamps equal to or older than the cursor
          queryRef = queryRef.startAfter(cursorTimestamp, cursorData.docId);
        }
      } catch (error) {
        console.error("Invalid cursor format:", error);
        return NextResponse.json(
          { error: "Invalid cursor format" },
          { status: 400 }
        );
      }
    }
    
    // OPTIMIZATION 1: Run count query and data query in parallel
    const [countPromise, paymentsPromise] = await Promise.all([
      // Get total count (for pagination info)
      queryRef.count().get(),
      // Get paginated payments (fetch one extra to determine if there are more results)
      queryRef.limit(pageSize + 1).get()
    ]);
    
    const totalCount = countPromise.data().count;
    const snapshot = paymentsPromise;
    
    // OPTIMIZATION 2: Collect IDs for batch fetching while processing payment data
    const contestIds = new Set<string>();
    const projectIds = new Set<string>();
    let hasMore = false;
    
    // Process results
    const paymentDataArray: Record[] = [];
    let lastDoc = null;
    
    // If we got more documents than the requested pageSize, there are more results
    if (snapshot.size > pageSize) {
      hasMore = true;
      // Only process up to pageSize documents
      snapshot.docs.slice(0, pageSize).forEach(doc => {
        const data = doc.data();
        if (data.contestId) contestIds.add(data.contestId);
        if (data.projectId) projectIds.add(data.projectId);
        
        paymentDataArray.push({
          id: doc.id,
          ...convertTimestampsToISO(data)
        });
      });
      // The last document is our new cursor position
      lastDoc = snapshot.docs[pageSize - 1];
    } else {
      // Process all results
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.contestId) contestIds.add(data.contestId);
        if (data.projectId) projectIds.add(data.projectId);
        
        paymentDataArray.push({
          id: doc.id,
          ...convertTimestampsToISO(data)
        });
      });
      // If we have any documents, the last one is our new cursor position
      if (snapshot.size > 0) {
        lastDoc = snapshot.docs[snapshot.size - 1];
      }
    }
    
    // Create the next cursor
    let nextCursor = null;
    if (hasMore && lastDoc) {
      const lastDocData = lastDoc.data();
      const cursorData = {
        timestamp: lastDocData.createdAt instanceof Timestamp 
          ? lastDocData.createdAt.toDate().toISOString() 
          : lastDocData.createdAt,
        docId: lastDoc.id
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }
    
    // OPTIMIZATION 3: Batch fetching related data in parallel
    const promises = [];
    
    // Only add contest fetch promise if we have contest IDs
    if (contestIds.size > 0) {
      // Split into batches of 10 (Firestore's 'in' query limit)
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
      // Split into batches of 10 (Firestore's 'in' query limit)
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
          projectCompleted: paymentDate, // Using payment date as completion date
          brandEmail: paymentData.brandEmail || null,
          actions: "View Transaction",
          rawData: paymentData, // Include the raw data for reference
        };
      } catch (error) {
        console.error(`Error formatting transaction ${paymentData.id}:`, error);
        // Return a fallback object with basic information
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
    
    // Calculate transaction totals
    const totals = calculateTransactionTotals(transactions);
    
    console.timeEnd('transactions-fetch'); // Performance timing end
    
    // Return the formatted response
    return NextResponse.json({
      transactions,
      totals,
      pagination: {
        pageSize,
        hasMore,
        cursor: nextCursor,
        totalCount,
      },
      metadata: {
        contestsCount: contestIds.size,
        projectsCount: projectIds.size
      }
    });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching transactions:", error);

    // Always return a proper JSON response, even for errors
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