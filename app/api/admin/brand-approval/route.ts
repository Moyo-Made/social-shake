import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { BrandStatus } from "@/types/user";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { brandEmail, userId, action, message } = data;
    
    // Validate required fields
    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action are required" }, { status: 400 });
    }

	if (!brandEmail || !action) {
		return NextResponse.json({ error: "Brand email and action are required" }, { status: 400 });
	  }
    
    // Check if action is valid
    if (!["approve", "reject", "request_info", "suspend"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    // Get brand profile
    const brandsSnapshot = await adminDb.collection("brandProfiles")
    .where("userId", "==", userId)
    .limit(1)
    .get();
  
  if (brandsSnapshot.empty) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }
  
  const brandDoc = brandsSnapshot.docs[0];
  const brandRef = brandDoc.ref;
    
    if (!brandDoc.exists) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }
    
    // Update brand status based on action
    interface UpdateData {
      status?: BrandStatus;
      updatedAt: string;
      rejectionReason?: string;
      requestedInfo?: string;
    }

    const updateData: UpdateData = {
      updatedAt: new Date().toISOString()
    };
    
    let notificationMessage = "";
    
    switch (action) {
      case "approve":
        updateData.status = BrandStatus.APPROVED;
        notificationMessage = "Your brand profile has been approved! You can now create projects and contests.";
        break;
      case "reject":
        updateData.status = BrandStatus.REJECTED;
        updateData.rejectionReason = message || "Your profile does not meet our requirements.";
        notificationMessage = `Your brand profile has been rejected. Reason: ${message || "Your profile does not meet our requirements."}`;
        break;
      case "request_info":
        updateData.status = BrandStatus.INFO_REQUESTED;
        updateData.requestedInfo = message || "Please provide additional information about your brand.";
        notificationMessage = `We need more information about your brand: ${message || "Please provide additional information about your brand."}`;
        break;
      case "suspend":
        updateData.status = BrandStatus.REJECTED; // You can add a SUSPENDED status if needed
        updateData.rejectionReason = message || "Your account has been suspended.";
        notificationMessage = `Your brand account has been suspended. Reason: ${message || "Your account has been suspended."}`;
        break;
    }
    
    // Update brand profile
    await brandRef.update(updateData as FirebaseFirestore.UpdateData<typeof updateData>);
    
    // Create notification for the brand
    await adminDb.collection("notifications").add({
      recipientEmail: brandEmail,
      message: notificationMessage,
      status: "unread",
      type: "status_update",
      createdAt: new Date().toISOString(),
      relatedTo: "brand_profile"
    });
    
    return NextResponse.json({
      success: true,
      message: `Brand profile successfully ${action}d`,
      data: { brandEmail, action, updatedStatus: updateData.status }
    });
  } catch (error) {
    console.error("Error in brand approval process:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process brand approval";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Endpoint to get all brand profiles with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("brandProfiles");
    
    // Add status filter if provided
    if (status && Object.values(BrandStatus).includes(status as BrandStatus)) {
      query = query.where("status", "==", status);
    }
    
    // Add sorting and pagination
    query = query.orderBy("createdAt", "desc").limit(limit).offset(offset);
    
    const snapshot = await query.get();
    
    // Transform the data
    const brands = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get total count for pagination info
    const countQuery = status 
      ? adminDb.collection("brandProfiles").where("status", "==", status)
      : adminDb.collection("brandProfiles");
    
    const totalSnapshot = await countQuery.count().get();
    const total = totalSnapshot.data().count;
    
    return NextResponse.json({
      brands,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching brand profiles:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch brand profiles";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}