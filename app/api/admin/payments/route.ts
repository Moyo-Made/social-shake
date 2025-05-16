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

// Helper function to determine payment type and generate description
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
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    // Build the query
    const paymentsRef: CollectionReference = adminDb.collection("payments");
    let queryRef: Query = paymentsRef;
    
    // Filter by status if provided
    if (status) {
      queryRef = queryRef.where("status", "==", status);
    }
    
    // Order by creation date, newest first
    queryRef = queryRef.orderBy("createdAt", "desc").limit(limit);
    
    // OPTIMIZATION: Get all payments data in a single query
    const snapshot = await queryRef.get();
    
    // OPTIMIZATION: Batch fetch related contests and projects to reduce individual queries
    const paymentDocs = snapshot.docs;
    const contestIds = new Set<string>();
    const projectIds = new Set<string>();
    
    // First pass: collect all contest and project IDs needed
    paymentDocs.forEach(doc => {
      const data = doc.data();
      if (data.contestId) contestIds.add(data.contestId);
      if (data.projectId) projectIds.add(data.projectId);
    });
    
    // OPTIMIZATION: Fetch contests and projects in batch
    const [contestDocs, projectDocs] = await Promise.all([
      contestIds.size > 0 
        ? adminDb.collection("contests").where("__name__", "in", Array.from(contestIds)).get()
        : { docs: [] },
      projectIds.size > 0
        ? adminDb.collection("projects").where("__name__", "in", Array.from(projectIds)).get()
        : { docs: [] }
    ]);
    
    // Create lookup maps for fast access
    const contestMap = new Map();
    const projectMap = new Map();
    
    if ('forEach' in contestDocs) {
      contestDocs.forEach(doc => {
        const contestData = doc.data();
        contestMap.set(doc.id, contestData.title || null);
      });
    }
    if ('forEach' in projectDocs) {
      projectDocs.forEach(doc => {
        const projectData = doc.data();
        projectMap.set(doc.id, projectData.title || null);
      });
    }
    
    // Process the payments with the lookup maps
    const payments = paymentDocs.map(doc => {
      const paymentData = convertTimestampsToISO(doc.data());
      
      // Add contest title if available
      if (paymentData && paymentData.contestId) {
        paymentData.contestTitle = contestMap.get(paymentData.contestId) || null;
      }
      
      // Add project title if available
      if (paymentData && paymentData.projectId) {
        paymentData.projectTitle = projectMap.get(paymentData.projectId) || null;
      }
      
      // Generate proper type and description for this payment
      const { type, description } = paymentData 
        ? generatePaymentTypeAndDescription(paymentData) 
        : { type: "Unknown", description: "Unknown Payment" };
      
      return {
        id: doc.id,
        ...paymentData,
        type,        // Add explicitly determined type
        description, // Add proper description
      };
    });
    
    console.timeEnd('payments-fetch'); // Performance timing end
    return NextResponse.json(payments);
    
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