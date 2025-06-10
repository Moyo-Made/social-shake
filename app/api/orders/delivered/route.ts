import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET endpoint - Retrieve delivered orders for a brand with their deliverables and payment information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Validate required userId parameter
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    console.log("Fetching delivered orders for user:", userId);

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Query orders where user_id matches and status is "delivered" OR "revision_requested"
    const ordersQuery = await adminDb
      .collection("orders")
      .where("user_id", "==", userId)
      .where("status", "in", ["delivered", "revision_requested"])
      .orderBy("created_at", "desc")
      .get();

    if (ordersQuery.empty) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0
      });
    }

    // Process each order and fetch its deliverables and payment information
    const ordersWithDeliverables = await Promise.all(
      ordersQuery.docs.map(async (orderDoc) => {
        const orderData = orderDoc.data();
        
        // Normalize order data to handle different field naming conventions
        const normalizedOrderData = {
          firestore_id: orderDoc.id,
          id: orderData.id || orderDoc.id,
          user_id: orderData.user_id || orderData.userId,
          creator_id: orderData.creator_id || orderData.creatorId,
          status: orderData.status,
          approval_status: orderData.approval_status || orderData.approvalStatus || "pending",
          brand_name: orderData.brand_name || orderData.brandName,
          brand_email: orderData.brand_email || orderData.brandEmail,
          package_type: orderData.package_type || orderData.packageType,
          video_count: orderData.video_count || orderData.videoCount,
          total_price: orderData.total_price || orderData.totalPrice,
          created_at: orderData.created_at || orderData.createdAt,
          updated_at: orderData.updated_at || orderData.updatedAt,
          payment_id: orderData.payment_id || orderData.paymentId,
          // Include revision-related fields
          revision_requested_at: orderData.revision_requested_at || orderData.revisionRequestedAt,
          revision_reason: orderData.revision_reason || orderData.revisionReason,
          revision_notes: orderData.revision_notes || orderData.revisionNotes,
          ...orderData
        };

        // Check payment escrow status from order_payments collection
        let paymentEscrowData = null;
        try {
          const paymentDoc = await adminDb
            .collection("order_payments")
            .where("orderId", "==", normalizedOrderData.id)
            .get();
          
          if (!paymentDoc.empty) {
            paymentEscrowData = paymentDoc.docs[0].data();
          }
        } catch (error) {
          console.warn(`Error fetching payment escrow data for order ${normalizedOrderData.id}:`, error);
        }

        // Fetch deliverables for this order (include revision_requested deliverables)
        const deliverableOrderId = normalizedOrderData.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let deliverables: any[] = [];
        
        try {
          const deliverablesQuery = await adminDb
            .collection("deliverables")
            .where("order_id", "==", deliverableOrderId)
            .orderBy("created_at", "desc")
            .get();

          // Get ALL deliverables first
          const allDeliverables = deliverablesQuery.docs.map(doc => {
            const deliverableData = doc.data();
            let approvalStatus = deliverableData.approval_status || deliverableData.approvalStatus || "pending";
            
            // Override approval status based on escrow status
            if (paymentEscrowData && 
                paymentEscrowData.escrowStatus === "released" && 
                paymentEscrowData.status === "completed") {
              approvalStatus = "approved";
            }
            
            return {
              firestore_id: doc.id,
              approval_status: approvalStatus,
              escrow_auto_approved: paymentEscrowData?.escrowStatus === "released" && paymentEscrowData?.status === "completed",
              video_id: deliverableData.video_id || deliverableData.videoId || null, // Ensure video_id is included
              created_at: deliverableData.created_at || deliverableData.createdAt || null, // Ensure created_at is included
              // Include revision-related fields
              revision_requested_at: deliverableData.revision_requested_at || deliverableData.revisionRequestedAt,
              revision_reason: deliverableData.revision_reason || deliverableData.revisionReason,
              revision_notes: deliverableData.revision_notes || deliverableData.revisionNotes,
              revision_count: deliverableData.revision_count || deliverableData.revisionCount || 0,
              revision_history: deliverableData.revision_history || deliverableData.revisionHistory || [],
              ...deliverableData
            };
          });

          // Group by video_id and keep only the latest (most recent created_at) for each video_id
          const latestDeliverablesMap = new Map();
          
          allDeliverables.forEach(deliverable => {
            const videoId = deliverable.video_id;
            const createdAt = new Date(deliverable.created_at);
            
            if (!latestDeliverablesMap.has(videoId) || 
                createdAt > new Date(latestDeliverablesMap.get(videoId).created_at)) {
              latestDeliverablesMap.set(videoId, deliverable);
            }
          });

          // Convert map back to array and sort by video_id
          deliverables = Array.from(latestDeliverablesMap.values())
            .sort((a, b) => a.video_id - b.video_id);

        } catch (error) {
          console.error(`Error fetching deliverables for order ${deliverableOrderId}:`, error);
          // Continue processing other orders even if one fails
          deliverables = [];
        }

        // Fetch payment information if payment_id exists
        let paymentInfo = null;
        if (normalizedOrderData.payment_id) {
          try {
            const paymentDoc = await adminDb
              .collection("payments")
              .doc(normalizedOrderData.payment_id)
              .get();
            
            if (paymentDoc.exists) {
              const paymentData = paymentDoc.data();
              paymentInfo = {
                firestore_id: paymentDoc.id,
                id: paymentData?.id || paymentDoc.id,
                payment_id: paymentData?.payment_id || paymentData?.paymentId,
                amount: paymentData?.amount,
                currency: paymentData?.currency || "USD",
                status: paymentData?.status,
                payment_method: paymentData?.payment_method || paymentData?.paymentMethod,
                transaction_id: paymentData?.transaction_id || paymentData?.transactionId,
                stripe_payment_intent_id: paymentData?.stripe_payment_intent_id || paymentData?.stripePaymentIntentId,
                paid_at: paymentData?.paid_at || paymentData?.paidAt,
                created_at: paymentData?.created_at || paymentData?.createdAt,
                updated_at: paymentData?.updated_at || paymentData?.updatedAt,
                // Include revision-related fields
                revisionRequestedAt: paymentData?.revisionRequestedAt,
                revisionReason: paymentData?.revisionReason,
                revisionNotes: paymentData?.revisionNotes,
                revisionDetails: paymentData?.revisionDetails,
                // Include other payment fields you might need
                ...paymentData
              };
            }
          } catch (error) {
            console.warn(`Error fetching payment info for order ${deliverableOrderId}:`, error);
          }
        }

        // Alternative: Try to find payment by order_id if payment_id is not directly stored in order
        if (!paymentInfo && normalizedOrderData.id) {
          try {
            const paymentQuery = await adminDb
              .collection("payments")
              .where("order_id", "==", normalizedOrderData.id)
              .limit(1)
              .get();
            
            if (!paymentQuery.empty) {
              const paymentDoc = paymentQuery.docs[0];
              const paymentData = paymentDoc.data();
              paymentInfo = {
                firestore_id: paymentDoc.id,
                id: paymentData?.id || paymentDoc.id,
                payment_id: paymentData?.payment_id || paymentData?.paymentId,
                amount: paymentData?.amount,
                currency: paymentData?.currency || "USD",
                status: paymentData?.status,
                payment_method: paymentData?.payment_method || paymentData?.paymentMethod,
                transaction_id: paymentData?.transaction_id || paymentData?.transactionId,
                stripe_payment_intent_id: paymentData?.stripe_payment_intent_id || paymentData?.stripePaymentIntentId,
                paid_at: paymentData?.paid_at || paymentData?.paidAt,
                created_at: paymentData?.created_at || paymentData?.createdAt,
                updated_at: paymentData?.updated_at || paymentData?.updatedAt,
                // Include revision-related fields
                revisionRequestedAt: paymentData?.revisionRequestedAt,
                revisionReason: paymentData?.revisionReason,
                revisionNotes: paymentData?.revisionNotes,
                revisionDetails: paymentData?.revisionDetails,
                // Include other payment fields you might need
                ...paymentData
              };
            }
          } catch (error) {
            console.warn(`Error fetching payment by order_id for order ${deliverableOrderId}:`, error);
          }
        }

        // Fetch creator information if available
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
                profile_image: creatorData?.profile_image || creatorData?.profileImage || "",
                // Include other creator fields you might need
                ...creatorData
              };
            }
          } catch (error) {
            console.warn(`Error fetching creator info for order ${deliverableOrderId}:`, error);
          }
        }

        // Calculate approval summary for deliverables (now includes revision_requested)
        const approvalSummary = {
          total_deliverables: deliverables.length,
          approved_count: deliverables.filter(d => d.approval_status === "approved").length,
          pending_count: deliverables.filter(d => d.approval_status === "pending").length,
          rejected_count: deliverables.filter(d => d.approval_status === "rejected").length,
          revision_requested_count: deliverables.filter(d => d.approval_status === "revision_requested").length,
          all_approved: deliverables.length > 0 && deliverables.every(d => d.approval_status === "approved"),
          has_pending: deliverables.some(d => d.approval_status === "pending"),
          has_rejected: deliverables.some(d => d.approval_status === "rejected"),
          has_revision_requested: deliverables.some(d => d.approval_status === "revision_requested"),
          auto_approved_count: deliverables.filter(d => d.escrow_auto_approved).length
        };

        return {
          ...normalizedOrderData,
          deliverables,
          deliverables_count: deliverables.length,
          creator: creatorInfo,
          payment: paymentInfo,
          escrow_payment: paymentEscrowData ? {
            escrow_status: paymentEscrowData.escrowStatus,
            payment_status: paymentEscrowData.status,
            is_auto_approved: paymentEscrowData.escrowStatus === "released" && paymentEscrowData.status === "completed"
          } : null,
          approval_summary: approvalSummary,
          // Add some computed fields that might be useful for the UI
          has_deliverables: deliverables.length > 0,
          has_payment_info: paymentInfo !== null,
          has_escrow_info: paymentEscrowData !== null,
          latest_deliverable_date: deliverables.length > 0 
            ? deliverables[0].created_at 
            : null,
          payment_status: paymentInfo?.status || "unknown",
          is_escrow_released: paymentEscrowData?.escrowStatus === "released" && paymentEscrowData?.status === "completed",
          // New revision-related computed fields
          has_revisions_requested: approvalSummary.has_revision_requested,
          is_revision_requested_order: normalizedOrderData.status === "revision_requested"
        };
      })
    );

    // Sort by latest deliverable date or order creation date
    const sortedOrders = ordersWithDeliverables.sort((a, b) => {
      const dateA = new Date(a.latest_deliverable_date || a.created_at || 0);
      const dateB = new Date(b.latest_deliverable_date || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate metadata including approval statistics (now includes revision_requested)
    const metadata = {
      total_deliverables: sortedOrders.reduce((sum, order) => sum + order.deliverables_count, 0),
      orders_with_deliverables: sortedOrders.filter(order => order.has_deliverables).length,
      orders_with_payment_info: sortedOrders.filter(order => order.has_payment_info).length,
      orders_with_escrow_info: sortedOrders.filter(order => order.has_escrow_info).length,
      orders_with_released_escrow: sortedOrders.filter(order => order.is_escrow_released).length,
      orders_with_revisions_requested: sortedOrders.filter(order => order.has_revisions_requested).length,
      revision_requested_orders: sortedOrders.filter(order => order.is_revision_requested_order).length,
      total_paid_amount: sortedOrders.reduce((sum, order) => sum + (order.payment?.amount || 0), 0),
      approval_statistics: {
        orders_fully_approved: sortedOrders.filter(order => order.approval_summary.all_approved).length,
        orders_with_pending: sortedOrders.filter(order => order.approval_summary.has_pending).length,
        orders_with_rejected: sortedOrders.filter(order => order.approval_summary.has_rejected).length,
        orders_with_revisions_requested: sortedOrders.filter(order => order.approval_summary.has_revision_requested).length,
        total_approved_deliverables: sortedOrders.reduce((sum, order) => sum + order.approval_summary.approved_count, 0),
        total_pending_deliverables: sortedOrders.reduce((sum, order) => sum + order.approval_summary.pending_count, 0),
        total_rejected_deliverables: sortedOrders.reduce((sum, order) => sum + order.approval_summary.rejected_count, 0),
        total_revision_requested_deliverables: sortedOrders.reduce((sum, order) => sum + order.approval_summary.revision_requested_count, 0),
        total_auto_approved_deliverables: sortedOrders.reduce((sum, order) => sum + order.approval_summary.auto_approved_count, 0)
      }
    };

    return NextResponse.json({
      success: true,
      orders: sortedOrders,
      count: sortedOrders.length,
      metadata
    });

  } catch (error) {
    console.error("Error fetching delivered orders:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch delivered orders",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}