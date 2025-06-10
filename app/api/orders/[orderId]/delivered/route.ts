/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

// PATCH endpoint - Mark order as delivered
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
    const { 
      creatorId, 
      delivery_message, 
      deliverable_ids = [] 
    } = body;

    // Validate required fields
    if (!creatorId) {
      return NextResponse.json(
        { error: "Creator ID is required" },
        { status: 400 }
      );
    }

    console.log("Marking order as delivered for order ID:", orderId);

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

    // Normalize order data
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

    // Verify creator has access to this order
    if (normalizedOrderData.creator_id !== creatorId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only mark your assigned orders as delivered" },
        { status: 403 }
      );
    }

    // Check if order is in a valid state to mark as delivered
    const validStatuses = ['in_progress', 'pending_review', 'revision_requested', 'active'];
    if (!validStatuses.includes(normalizedOrderData.status)) {
      return NextResponse.json(
        { 
          error: `Cannot mark order as delivered with status: ${normalizedOrderData.status}`,
          currentStatus: normalizedOrderData.status
        },
        { status: 400 }
      );
    }

    // Get deliverables for this order to include in notification
    const deliverableOrderId = orderData.id || orderDoc.id;
    const deliverablesQuery = await adminDb
      .collection("deliverables")
      .where("order_id", "==", deliverableOrderId)
      .orderBy("created_at", "desc")
      .get();

    const deliverables = deliverablesQuery.docs.map(doc => ({
      id: doc.data().id,
      video_id: doc.data().video_id,
      original_filename: doc.data().original_filename,
      file_url: doc.data().file_url,
      notes: doc.data().notes,
      created_at: doc.data().created_at
    }));

    // Prepare update data
    const deliveredAt = new Date().toISOString();
    const updateData = {
      status: "delivered",
      delivered_at: deliveredAt,
      updated_at: deliveredAt,
      delivery_message: delivery_message || "",
      deliverable_summary: {
        total_deliverables: deliverables.length,
        deliverable_ids: deliverable_ids,
        delivered_at: deliveredAt
      }
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

    // Create enhanced notification for the brand with view delivery action
    if (brandData && brandData.userId) {
      try {
        const notificationData = {
          userId: brandData.userId,
          message: `🎉 Great news! ${creatorInfo?.name || 'Your creator'} has completed and delivered your order #${orderData.id || orderDoc.id}. ${deliverables.length} video${deliverables.length !== 1 ? 's' : ''} ready for review!`,
          status: "unread",
          type: "order_delivered",
          createdAt: FieldValue.serverTimestamp(),
          relatedTo: "order",
          orderId: orderData.id || orderDoc.id,
          priority: "high",
          metadata: {
            deliverable_count: deliverables.length,
            delivered_at: deliveredAt,
            creator_name: creatorInfo?.name || 'Creator',
            delivery_message: delivery_message || "",
            deliverable_summary: deliverables.map(d => ({
              video_id: d.video_id,
              filename: d.original_filename,
              notes: d.notes
            }))
          },
          actionButton: {
            text: "View Delivery",
            type: "view_deliverables",
            url: `/orders/${orderData.id || orderDoc.id}/deliverables`,
            style: "primary"
          }
        };

        await adminDb.collection("notifications").add(notificationData);
        console.log("Enhanced delivery notification created with view button");
      } catch (error) {
        console.error("Error creating delivery notification:", error);
        // Don't fail the entire operation if notification fails
      }
    }

    // Create a milestone for order delivered
    try {
      const milestoneData = {
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: orderData.id || orderDoc.id,
        type: "order_delivered",
        title: "Order Delivered",
        description: `${creatorInfo?.name || 'Creator'} has marked this order as delivered with ${deliverables.length} deliverable${deliverables.length !== 1 ? 's' : ''}`,
        status: "content_submitted",
        created_at: deliveredAt,
        completed_at: deliveredAt,
        creator_id: normalizedOrderData.creator_id,
        metadata: {
          previous_status: normalizedOrderData.status,
          delivered_at: deliveredAt,
          deliverable_count: deliverables.length,
          delivery_message: delivery_message || "",
          deliverable_summary: deliverables.map(d => d.original_filename).join(", ")
        }
      };

      await adminDb.collection("project_milestones").add(milestoneData);
      console.log("Milestone created for order delivery");
    } catch (error) {
      console.error("Error creating milestone:", error);
      // Don't fail the entire operation if milestone creation fails
    }

    // Update deliverables status to delivered if specific IDs provided
    if (deliverable_ids.length > 0) {
      try {
        const batch = adminDb.batch();
        
        for (const deliverableId of deliverable_ids) {
          const deliverableQuery = await adminDb
            .collection("deliverables")
            .where("id", "==", deliverableId)
            .where("order_id", "==", deliverableOrderId)
            .limit(1)
            .get();

          if (!deliverableQuery.empty) {
            const deliverableDoc = deliverableQuery.docs[0];
            batch.update(deliverableDoc.ref, {
              status: "delivered",
              delivered_at: deliveredAt,
              updated_at: deliveredAt
            });
          }
        }

        await batch.commit();
        console.log("Updated deliverable statuses to delivered");
      } catch (error) {
        console.error("Error updating deliverable statuses:", error);
        // Continue without failing the main operation
      }
    }

    // Create activity log entry
    try {
      const activityData = {
        order_id: orderData.id || orderDoc.id,
        type: "order_delivered",
        actor_type: "creator",
        actor_id: creatorId,
        actor_name: creatorInfo?.name || "Creator",
        description: `Order marked as delivered with ${deliverables.length} deliverable${deliverables.length !== 1 ? 's' : ''}`,
        timestamp: deliveredAt,
        metadata: {
          previous_status: normalizedOrderData.status,
          new_status: "delivered",
          deliverable_count: deliverables.length,
          delivery_message: delivery_message || ""
        }
      };

      await adminDb.collection("order_activities").add(activityData);
      console.log("Activity log entry created for delivery");
    } catch (error) {
      console.error("Error creating activity log:", error);
      // Continue without failing
    }

    // Return success response with updated order data and delivery summary
    const updatedOrderData = {
      ...orderData,
      ...updateData,
      documentId: orderDoc.id,
    };

    return NextResponse.json({
      success: true,
      message: "Order marked as delivered successfully and brand has been notified",
      order: updatedOrderData,
      delivery_summary: {
        delivered_at: deliveredAt,
        deliverable_count: deliverables.length,
        deliverables: deliverables,
        notification_sent: brandData ? true : false,
        milestone_created: true
      },
      notification: brandData ? "Brand notified with view delivery button" : "No brand notification sent",
    });

  } catch (error) {
    console.error("Error marking order as delivered:", error);
    return NextResponse.json(
      {
        error: "Failed to mark order as delivered",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}