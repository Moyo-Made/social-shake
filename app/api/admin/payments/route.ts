/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp, Query, CollectionReference } from "firebase-admin/firestore";

// TypeScript type definitions
type Record = {
  [key: string]: any;
};

// Helper function to convert Firestore timestamps to ISO strings
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

// Helper function to determine payment type and description
function generatePaymentTypeAndDescription(paymentData: Record): { type: string, description: string } {
  // Default values
  let type = "Project";
  let description = "Project Payment";
  
  // Determine type based on payment data
  if (paymentData.paymentType) {
    // If we have an explicit payment type, use it (capitalize first letter)
    type = paymentData.paymentType.charAt(0).toUpperCase() + paymentData.paymentType.slice(1);
  } else if (paymentData.contestId) {
    // If it has a contestId, it's a contest payment
    type = "Contest";
  } else if (paymentData.projectId) {
    // If it has a projectId, ensure it's marked as a project payment
    type = "Project";
  }
  
  // Generate description based on available data
  if (paymentData.paymentName) {
    // If we have a specific payment name, use it in the description
    description = `${type} Payment: ${paymentData.paymentName}`;
  } else if (paymentData.contestTitle) {
    // If we have a contest title, use it in the description
    description = `Contest Payment: ${paymentData.contestTitle}`;
  } else if (paymentData.projectTitle) {
    // If we have a project title, use it in the description
    description = `Project Payment: ${paymentData.projectTitle}`;
  } else if (type === "Contest") {
    // Generic contest description
    description = "Contest Payment";
  }
  
  return { type, description };
}

export async function GET(request: NextRequest) {
  try {
    console.time('payments-fetch'); // Performance timing start
    
    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Build the query
    const paymentsRef: CollectionReference = adminDb.collection("payments");
    let queryRef: Query = paymentsRef;
    
    // Filter by status if provided
    if (status) {
      queryRef = queryRef.where("status", "==", status);
    }
    
    // Order by creation date, newest first
    queryRef = queryRef.orderBy("createdAt", "desc");
    
    // OPTIMIZATION 1: Run count query and data query in parallel
    const [countPromise, paymentsPromise] = await Promise.all([
      // Get total count (for pagination info)
      queryRef.count().get(),
      // Get paginated payments
      queryRef.limit(limit).offset(offset).get()
    ]);
    
    const totalCount = countPromise.data().count;
    const paymentDocs = paymentsPromise.docs;
    
    // OPTIMIZATION 2: Collect IDs for batch fetching while processing payment data
    const contestIds = new Set<string>();
    const projectIds = new Set<string>();
    const paymentDataArray: Record[] = [];
    
    // Build an array of payment data while collecting IDs
    paymentDocs.forEach(doc => {
      const data = doc.data();
      if (data.contestId) contestIds.add(data.contestId);
      if (data.projectId) projectIds.add(data.projectId);
      
      paymentDataArray.push({
        id: doc.id,
        ...convertTimestampsToISO(data)
      });
    });
    
    // OPTIMIZATION 3: Batch fetching related data and calculating totals in parallel
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
        adminDb.collection("contests").where("__name__", "in", batch).get()
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
        adminDb.collection("projects").where("__name__", "in", batch).get()
      );
      promises.push(Promise.all(projectPromises));
    } else {
      promises.push(Promise.resolve([]));
    }
    
    // OPTIMIZATION 4: Calculate totals using aggregation queries instead of fetching all documents
    const totalsPromises = [
      // Total amount (filtered by status if provided)
      status
        ? adminDb.collection("payments").where("status", "==", status).get()
        : adminDb.collection("payments").get(),
      // Pending amount
      adminDb.collection("payments").where("status", "==", "pending_capture").get(),
      // Processed amount
      adminDb.collection("payments").where("status", "==", "completed").get()
    ];
    
    promises.push(Promise.all(totalsPromises));
    
    // Wait for all parallel operations to complete
    const [contestBatchesResults, projectBatchesResults, totalResults] = await Promise.all(promises);
    
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
    
    // Calculate totals from aggregation queries
    let totalAmount = 0;
    let pendingAmount = 0;
    let processedAmount = 0;
    
    if (Array.isArray(totalResults) && totalResults.length === 3) {
      // Process total amount
      totalResults[0].forEach(doc => {
        totalAmount += doc.data().amount || 0;
      });
      
      // Process pending amount
      totalResults[1].forEach(doc => {
        pendingAmount += doc.data().amount || 0;
      });
      
      // Process processed amount
      totalResults[2].forEach(doc => {
        processedAmount += doc.data().amount || 0;
      });
    }
    
    // Enhance payment data with related information and generate types/descriptions
    const payments = paymentDataArray.map(paymentData => {
      // Add contest title if available
      if (paymentData.contestId) {
        paymentData.contestTitle = contestMap.get(paymentData.contestId) || null;
      }
      
      // Add project title if available
      if (paymentData.projectId) {
        paymentData.projectTitle = projectMap.get(paymentData.projectId) || null;
      }
      
      // Generate proper type and description for this payment
      const { type, description } = generatePaymentTypeAndDescription(paymentData);
      
      return {
        ...paymentData,
        type,        // Add explicitly determined type
        description, // Add proper description
      };
    });
    
    // Pagination metadata
    const paginationMeta = {
      totalItems: totalCount,
      itemsPerPage: limit,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    };
    
    // Payment totals
    const paymentTotals = {
      totalAmount: totalAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      processedAmount: processedAmount.toFixed(2)
    };
    
    console.timeEnd('payments-fetch'); // Performance timing end
    
    return NextResponse.json({
      payments,
      pagination: paginationMeta,
      totals: paymentTotals
    });
    
  } catch (error) {
    console.error("Error fetching payments:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch payments",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}