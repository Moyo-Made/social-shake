/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

// PATCH endpoint - Start work on an order
export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { orderId } = resolvedParams;

    // Enhanced validation for orderId
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, work_started_at, creatorId } = body;

    // Validate required fields
    if (!status || !work_started_at) {
      return NextResponse.json(
        { error: "Status and work_started_at are required" },
        { status: 400 }
      );
    }

    console.log("Starting work for order ID:", orderId);

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    let orderDoc: any = null;
    let orderData: any = null;
    let isInternalIdQuery = false;

    // Try internal ID first (since your JSON data uses internal IDs)
    if (orderId.startsWith('order_')) {
      console.log("Querying by internal ID:", orderId);
      const ordersQuery = await adminDb
        .collection("orders")
        .where("id", "==", orderId)
        .limit(1)
        .get();

      if (!ordersQuery.empty) {
        orderDoc = ordersQuery.docs[0];
        orderData = orderDoc.data();
        isInternalIdQuery = true;
        console.log("Order found by internal ID");
      }
    } else {
      // Try document ID if it doesn't look like an internal ID
      console.log("Querying by document ID:", orderId);
      orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (orderDoc.exists) {
        orderData = orderDoc.data();
      }
    }

    // If still not found, try the other method
    if (!orderDoc || !orderDoc.exists) {
      if (isInternalIdQuery) {
        console.log("Internal ID failed, trying document ID...");
        orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (orderDoc.exists) {
          orderData = orderDoc.data();
          isInternalIdQuery = false;
        }
      } else {
        console.log("Document ID failed, trying internal ID...");
        const ordersQuery = await adminDb
          .collection("orders")
          .where("id", "==", orderId)
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderData = orderDoc.data();
          isInternalIdQuery = true;
        }
      }
    }

    if (!orderDoc || !orderDoc.exists || !orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify creator has access to this order
    const normalizedOrderData = {
      user_id: orderData.user_id || orderData.userId,
      creator_id: orderData.creator_id || orderData.creatorId,
      status: orderData.status,
      brand_name: orderData.brand_name || orderData.brandName,
      brand_email: orderData.brand_email || orderData.brandEmail,
      package_type: orderData.package_type || orderData.packageType,
      video_count: orderData.video_count || orderData.videoCount,
      total_price: orderData.total_price || orderData.totalPrice,
    };

    if (creatorId && normalizedOrderData.creator_id !== creatorId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only start work on your assigned orders" },
        { status: 403 }
      );
    }

    // Check if order is in a valid state to start work
    const validStatuses = ['pending', 'confirmed', 'in_progress'];
    if (!validStatuses.includes(normalizedOrderData.status)) {
      return NextResponse.json(
        { 
          error: `Cannot start work on order with status: ${normalizedOrderData.status}`,
          currentStatus: normalizedOrderData.status
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {
      status: status,
      work_started_at: work_started_at,
      updated_at: new Date().toISOString(),
    };

    // Update the order document
    await orderDoc.ref.update(updateData);

    // Get brand information for notification
    let brandData = null;
    if (normalizedOrderData.user_id) {
      try {
        const userRecord = await adminAuth.getUser(normalizedOrderData.user_id);
        brandData = {
          brandName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown Brand',
          brandEmail: userRecord.email,
          userId: normalizedOrderData.user_id,
        };
      } catch (error) {
        console.error("Error fetching brand data:", error);
        brandData = {
          brandName: normalizedOrderData.brand_name || 'Unknown Brand',
          brandEmail: normalizedOrderData.brand_email || '',
          userId: normalizedOrderData.user_id,
        };
      }
    }

    // Get creator information
    let creatorInfo = null;
    if (normalizedOrderData.creator_id) {
      try {
        const creatorDoc = await adminDb
          .collection("creators")
          .doc(normalizedOrderData.creator_id)
          .get();
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data();
          creatorInfo = {
            id: creatorDoc.id,
            name: creatorData?.name || "Creator",
            email: creatorData?.email || "",
          };
        }
      } catch (error) {
        console.warn("Error fetching creator info:", error);
        creatorInfo = {
          id: normalizedOrderData.creator_id,
          name: "Creator",
          email: "",
        };
      }
    }

    // Create notification for the brand

if (brandData && brandData.userId) {
	try {
	  await adminDb.collection("notifications").add({
		userId: brandData.userId,
		message: `${creatorInfo?.name || 'Your creator'} has started working on your order #${orderData.id || orderDoc.id}.`,
		status: "unread",
		type: "work_started",
		createdAt: FieldValue.serverTimestamp(),
		relatedTo: "order",
		orderId: orderData.id || orderDoc.id,
	  });
      } catch (error) {
        console.error("Error creating notification:", error);
        // Don't fail the entire operation if notification fails
      }
    }

    // Create a milestone for work started
    try {
      const milestoneData = {
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: orderData.id || orderDoc.id,
        type: "work_started",
        title: "Work Started",
        description: `${creatorInfo?.name || 'Creator'} has started working on this order`,
        status: "completed",
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        creator_id: normalizedOrderData.creator_id,
        metadata: {
          work_started_at: work_started_at,
          previous_status: normalizedOrderData.status,
          new_status: status,
        }
      };

      await adminDb.collection("project_milestones").add(milestoneData);
      console.log("Milestone created for work started");
    } catch (error) {
      console.error("Error creating milestone:", error);
      // Don't fail the entire operation if milestone creation fails
    }

    // Return success response with updated order data
    const updatedOrderData = {
      ...orderData,
      ...updateData,
      documentId: orderDoc.id,
    };

    return NextResponse.json({
      success: true,
      message: "Work started successfully and brand has been notified",
      order: updatedOrderData,
      notification: brandData ? "Brand notified successfully" : "No brand notification sent",
    });

  } catch (error) {
    console.error("Error starting work on order:", error);
    return NextResponse.json(
      {
        error: "Failed to start work on order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}