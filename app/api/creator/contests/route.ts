import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Get draft contests separately if needed
    const isDraftRequest = url.searchParams.get("status") === "draft";
    
    if (isDraftRequest) {
      // Fetch from contestDrafts collection
      const draftDoc = await adminDb
        .collection("contestDrafts")
        .doc(userId)
        .get();
      
      if (!draftDoc.exists) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            hasMore: false,
            lastDocId: null,
            count: 0
          }
        });
      }
      
      const draftData = draftDoc.data();
      if (!draftData || draftData.submitted === true) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            hasMore: false,
            lastDocId: null,
            count: 0
          }
        });
      }
      
      // Format draft as a contest for UI consistency
      const formattedDraft = {
        ...draftData,
        contestId: `draft_${userId}`,
        status: "draft",
        createdAt: draftData.lastUpdated || new Date().toISOString()
      };
      
      return NextResponse.json({
        success: true,
        data: [formattedDraft],
        pagination: {
          hasMore: false,
          lastDocId: null,
          count: 1
        }
      });
    }
    
    // Regular contests query
    // Pagination parameters
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const startAfter = url.searchParams.get("startAfter");
    const statusFilter = url.searchParams.get("status") || "all";
    
    // Build the query
    let query = adminDb.collection("contests").where("userId", "==", userId);
    
    // Apply status filter if not "all"
    if (statusFilter && statusFilter !== "all") {
      query = query.where("status", "==", statusFilter);
    }
    
    // Add sorting by creation date
    query = query.orderBy("createdAt", "desc");
    
    // Add pagination starting point if provided
    if (startAfter) {
      const startAfterDoc = await adminDb.collection("contests").doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    // Apply limit
    query = query.limit(limit);
    
    // Execute query
    const snapshot = await query.get();
    
    // Process results
    const contests = [];
    let lastDocId = null;
    
    for (const doc of snapshot.docs) {
      const contestData = doc.data();
      contests.push({
        id: doc.id,
        ...contestData
      });
      lastDocId = doc.id;
    }
    
    // Return results with pagination info
    return NextResponse.json({
      success: true,
      data: contests,
      pagination: {
        hasMore: contests.length === limit,
        lastDocId: lastDocId,
        count: contests.length
      }
    });
  } catch (error) {
    console.error("Error retrieving creator contests:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve contests",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}