/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from 'stripe';
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: NextRequest) {
	let action: string | undefined;

	try {
		const { 
			paymentId, 
			action: actionFromRequest, 
			reason,
			deliverableId, // NEW: specific deliverable to approve
			approveAll = false // NEW: flag to approve all deliverables in the order
		} = await request.json();
		
		action = actionFromRequest;

		if (!paymentId || !action) {
			return NextResponse.json(
				{ error: "Payment ID and action are required" },
				{ status: 400 }
			);
		}

		if (!['approve', 'reject'].includes(action)) {
			return NextResponse.json(
				{ error: "Action must be 'approve' or 'reject'" },
				{ status: 400 }
			);
		}

		// Get the payment record
		const paymentDoc = await adminDb
			.collection("payments")
			.doc(paymentId)
			.get();

		if (!paymentDoc.exists) {
			return NextResponse.json(
				{ error: "Payment not found" },
				{ status: 404 }
			);
		}

		const paymentData = paymentDoc.data();
		
		if (!paymentData?.escrowPayment) {
			return NextResponse.json(
				{ error: "This payment is not eligible for approval (not an escrow payment)" },
				{ status: 400 }
			);
		}

		if (paymentData.status !== 'pending_capture') {
			return NextResponse.json(
				{ error: `Payment cannot be ${action}ed. Current status: ${paymentData.status}` },
				{ status: 400 }
			);
		}

		// Helper function to get approver ID with fallback
		const getApproverId = () => {
			return paymentData.brandId || paymentData.user_id || 'system';
		};

		// NEW: Update deliverable approval status in the database
		if (action === 'approve' && deliverableId) {
			try {
				// Find and update the specific deliverable
				const deliverableRef = adminDb.collection("deliverables").doc(deliverableId);
				const deliverableDoc = await deliverableRef.get();
				
				if (deliverableDoc.exists) {
					await deliverableRef.update({
						approval_status: 'approved',
						approved_at: new Date().toISOString(),
						approved_by: getApproverId(),
						updated_at: new Date().toISOString()
					});
					console.log(`Updated deliverable ${deliverableId} approval status`);
				}
			} catch (error) {
				console.warn("Could not update deliverable approval status:", error);
			}
		}

		// NEW: Handle approving all deliverables in an order
		if (action === 'approve' && approveAll && paymentData.orderId) {
			try {
				// Get all deliverables for this order
				const deliverablesSnapshot = await adminDb
					.collection("deliverables")
					.where("order_id", "==", paymentData.orderId)
					.get();

				// Update all deliverables to approved
				const batch = adminDb.batch();
				deliverablesSnapshot.docs.forEach(doc => {
					batch.update(doc.ref, {
						approval_status: 'approved',
						approved_at: new Date().toISOString(),
						approved_by: getApproverId(),
						updated_at: new Date().toISOString()
					});
				});
				
				await batch.commit();
				console.log(`Updated ${deliverablesSnapshot.size} deliverables to approved`);
			} catch (error) {
				console.warn("Could not update all deliverables approval status:", error);
			}
		}

		const stripePaymentIntentId = paymentData.stripePaymentIntentId;
		
		if (!stripePaymentIntentId) {
			return NextResponse.json(
				{ error: "No Stripe PaymentIntent found for this payment" },
				{ status: 400 }
			);
		}

		let updatedPaymentData: any = {
			updatedAt: new Date().toISOString(),
			processedAt: new Date().toISOString(),
		};

		let updatedCollectionData: any = {
			updatedAt: new Date().toISOString(),
			processedAt: new Date().toISOString(),
		};

		if (action === 'approve') {
			try {
				// Capture the payment in Stripe - this releases the funds to the creator
				const capturedPaymentIntent = await stripe.paymentIntents.capture(
					stripePaymentIntentId
				);

				console.log(`Payment captured successfully: ${stripePaymentIntentId}`);

				// Update payment status
				updatedPaymentData = {
					...updatedPaymentData,
					status: 'completed',
					escrowStatus: 'released',
					approvedAt: new Date().toISOString(),
					stripeStatus: capturedPaymentIntent.status,
					// NEW: Add approval details
					approvalDetails: {
						deliverableId: deliverableId || null,
						approveAll: approveAll,
						approvedBy: getApproverId(),
						approvedAt: new Date().toISOString()
					}
				};

				updatedCollectionData = {
					...updatedCollectionData,
					status: 'completed',
					escrowStatus: 'released',
					approvedAt: new Date().toISOString(),
				};

			} catch (stripeError) {
				console.error("Error capturing payment in Stripe:", stripeError);
				return NextResponse.json(
					{ error: "Failed to capture payment in Stripe" },
					{ status: 500 }
				);
			}
		} else if (action === 'reject') {
			try {
				// Cancel the payment intent in Stripe - this releases the hold and refunds the customer
				const canceledPaymentIntent = await stripe.paymentIntents.cancel(
					stripePaymentIntentId
				);

				console.log(`Payment canceled successfully: ${stripePaymentIntentId}`);

				// NEW: Update deliverable rejection status
				if (deliverableId) {
					try {
						const deliverableRef = adminDb.collection("deliverables").doc(deliverableId);
						const deliverableDoc = await deliverableRef.get();
						
						if (deliverableDoc.exists) {
							await deliverableRef.update({
								approval_status: 'needs_revision',
								rejected_at: new Date().toISOString(),
								rejected_by: getApproverId(),
								rejection_reason: reason || 'Revision requested by brand',
								updated_at: new Date().toISOString()
							});
						}
					} catch (error) {
						console.warn("Could not update deliverable rejection status:", error);
					}
				}

				// Update payment status
				updatedPaymentData = {
					...updatedPaymentData,
					status: 'rejected',
					escrowStatus: 'refunded',
					rejectedAt: new Date().toISOString(),
					rejectionReason: reason || 'Payment rejected by brand',
					stripeStatus: canceledPaymentIntent.status,
				};

				updatedCollectionData = {
					...updatedCollectionData,
					status: 'rejected',
					escrowStatus: 'refunded',
					rejectedAt: new Date().toISOString(),
					rejectionReason: reason || 'Payment rejected by brand',
				};

			} catch (stripeError) {
				console.error("Error canceling payment in Stripe:", stripeError);
				return NextResponse.json(
					{ error: "Failed to cancel payment in Stripe" },
					{ status: 500 }
				);
			}
		}

		// Update the main payment record
		await adminDb
			.collection("payments")
			.doc(paymentId)
			.update(updatedPaymentData);

		// Update the specific collection record based on payment type
		const paymentType = paymentData.paymentType;
		let collectionName = '';
		
		switch (paymentType) {
			case 'order_escrow':
				collectionName = 'order_payments';
				break;
			case 'submission_approval':
				collectionName = 'submission_payments';
				break;
			case 'video':
				collectionName = 'video_purchases';
				break;
			case 'project':
				collectionName = 'project_payments';
				break;
			case 'contest':
				collectionName = 'contest_payments';
				break;
		}

		if (collectionName) {
			try {
				// Enhanced update for order_payments collection
				if (collectionName === 'order_payments') {
					const orderPaymentUpdate = {
						...updatedCollectionData,
						// Ensure these fields are set for the delivered orders API to work
						escrowStatus: action === 'approve' ? 'released' : 'refunded',
						status: action === 'approve' ? 'completed' : 'rejected',
						orderId: paymentData.orderId, // Ensure orderId is present
						approvedAt: action === 'approve' ? new Date().toISOString() : null,
						rejectedAt: action === 'reject' ? new Date().toISOString() : null,
						// Add approval tracking
						approvalDetails: action === 'approve' ? {
							deliverableId: deliverableId || null,
							approveAll: approveAll,
							approvedBy: getApproverId(),
							approvedAt: new Date().toISOString()
						} : null
					};

					await adminDb
						.collection(collectionName)
						.doc(paymentId)
						.update(orderPaymentUpdate);
					
					console.log(`Updated ${collectionName} with escrow status: ${orderPaymentUpdate.escrowStatus}`);
				} else {
					// Standard update for other collection types
					await adminDb
						.collection(collectionName)
						.doc(paymentId)
						.update(updatedCollectionData);
				}
			} catch (error) {
				console.warn(`Could not update ${collectionName} collection:`, error);
				// Don't fail the entire request if collection update fails
			}
		}

		// If this is a submission approval, also update the submission status
		if (paymentType === 'submission_approval' && paymentData.submissionId) {
			try {
				const submissionUpdate: any = {
					paymentStatus: action === 'approve' ? 'paid' : 'rejected',
					updatedAt: new Date().toISOString(),
				};

				if (action === 'approve') {
					submissionUpdate.approvedAt = new Date().toISOString();
					submissionUpdate.status = 'approved_and_paid';
				} else {
					submissionUpdate.rejectedAt = new Date().toISOString();
					submissionUpdate.rejectionReason = reason || 'Payment rejected by brand';
				}

				await adminDb
					.collection("project_submissions")
					.doc(paymentData.submissionId)
					.update(submissionUpdate);
			} catch (error) {
				console.warn("Could not update submission status:", error);
			}
		}

		// Enhanced order status update for order-related payments
		if (paymentData.orderId) {
			try {
				const orderUpdate: any = {
					updated_at: new Date().toISOString()
				};

				if (action === 'approve') {
					orderUpdate.status = 'approved';
					orderUpdate.approved_at = new Date().toISOString();
					orderUpdate.payment_status = 'completed';
					orderUpdate.escrow_status = 'released';
				} else {
					orderUpdate.status = 'payment_rejected';
					orderUpdate.rejected_at = new Date().toISOString();
					orderUpdate.payment_status = 'rejected';
					orderUpdate.escrow_status = 'refunded';
					orderUpdate.rejection_reason = reason || 'Payment rejected by brand';
				}

				await adminDb
					.collection("orders")
					.doc(paymentData.orderId)
					.update(orderUpdate);

				console.log(`Updated order ${paymentData.orderId} status to: ${orderUpdate.status}`);
			} catch (error) {
				console.warn("Could not update order status:", error);
			}
		}

		// Send notifications to creator and brand
		try {
			await sendNotifications(paymentData, action, deliverableId, approveAll, reason);
		} catch (error) {
			console.warn("Could not send notifications:", error);
		}

		return NextResponse.json({
			success: true,
			message: `Payment ${action}ed successfully`,
			paymentId,
			action,
			status: updatedPaymentData.status,
			escrowStatus: updatedPaymentData.escrowStatus,
			processedAt: updatedPaymentData.processedAt,
			// NEW: Return approval details
			approvalDetails: updatedPaymentData.approvalDetails || null,
			deliverableId: deliverableId || null,
			approveAll: approveAll || false,
			orderId: paymentData.orderId || null
		});

	} catch (error) {
		console.error(`Error ${action}ing payment:`, error);
		return NextResponse.json(
			{
				success: false,
				error: `Failed to ${action} payment`,
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to send notifications
async function sendNotifications(
	paymentData: any, 
	action: string, 
	deliverableId: string | null, 
	approveAll: boolean, 
	reason?: string
) {
	try {
		// Get creator and brand information
		let creatorInfo = null;

		// Get creator info from the payment data
		if (paymentData.creatorId) {
			try {
				const creatorDoc = await adminDb.collection("users").doc(paymentData.creatorId).get();
				if (creatorDoc.exists) {
					creatorInfo = creatorDoc.data();
				}
			} catch (error) {
				console.warn("Could not fetch creator info:", error);
			}
		}

		// Get brand info from the payment data
		if (paymentData.brandId) {
			try {
				const brandDoc = await adminDb.collection("users").doc(paymentData.brandId).get();
				if (brandDoc.exists) {
					// brandInfo is fetched but not used, removing assignment
					brandDoc.data();
				}
			} catch (error) {
				console.warn("Could not fetch brand info:", error);
			}
		}

		// Prepare notification data
		const baseNotificationData = {
			status: "unread",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "payment",
			orderId: paymentData.orderId || null,
			paymentId: paymentData.id || null,
			deliverableId: deliverableId || null,
		};

		if (action === 'approve') {
			// Notify Creator - Payment approved
			if (paymentData.creatorId) {
				const creatorMessage = approveAll 
					? `Great news! Your brand has approved all deliverables for order #${paymentData.orderId}. Payment has been released.`
					: deliverableId 
						? `Great news! Your brand has approved your deliverable for order #${paymentData.orderId}. Payment has been released.`
						: `Great news! Your brand has approved your work for order #${paymentData.orderId}. Payment has been released.`;

				await adminDb.collection("notifications").add({
					...baseNotificationData,
					userId: paymentData.creatorId,
					message: creatorMessage,
					type: "payment_approved",
				});
			}

			// Notify Brand - Confirmation of approval
			if (paymentData.brandId) {
				const brandMessage = approveAll 
					? `You have successfully approved all deliverables for order #${paymentData.orderId}. Payment has been released to ${creatorInfo?.name || 'the creator'}.`
					: deliverableId 
						? `You have successfully approved the deliverable for order #${paymentData.orderId}. Payment has been released to ${creatorInfo?.name || 'the creator'}.`
						: `You have successfully approved the work for order #${paymentData.orderId}. Payment has been released to ${creatorInfo?.name || 'the creator'}.`;

				await adminDb.collection("notifications").add({
					...baseNotificationData,
					userId: paymentData.brandId,
					message: brandMessage,
					type: "payment_approval_confirmed",
				});
			}

		} else if (action === 'reject') {
			// Notify Creator - Payment rejected
			if (paymentData.creatorId) {
				const creatorMessage = deliverableId 
					? `Your brand has requested revisions for your deliverable in order #${paymentData.orderId}. ${reason ? `Reason: ${reason}` : 'Please check the order details for more information.'}`
					: `Your brand has requested revisions for order #${paymentData.orderId}. ${reason ? `Reason: ${reason}` : 'Please check the order details for more information.'}`;

				await adminDb.collection("notifications").add({
					...baseNotificationData,
					userId: paymentData.creatorId,
					message: creatorMessage,
					type: "payment_rejected",
				});
			}

			// Notify Brand - Confirmation of rejection
			if (paymentData.brandId) {
				const brandMessage = deliverableId 
					? `You have requested revisions for the deliverable in order #${paymentData.orderId}. ${creatorInfo?.name || 'The creator'} has been notified.`
					: `You have requested revisions for order #${paymentData.orderId}. ${creatorInfo?.name || 'The creator'} has been notified.`;

				await adminDb.collection("notifications").add({
					...baseNotificationData,
					userId: paymentData.brandId,
					message: brandMessage,
					type: "payment_rejection_confirmed",
				});
			}
		}

		console.log(`Notifications sent for ${action} action on payment ${paymentData.id}`);

	} catch (error) {
		console.error("Error in sendNotifications:", error);
		throw error;
	}
}

// GET endpoint - Retrieve deliverables for an order OR check processing status
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { orderId } = resolvedParams;

    const { searchParams } = new URL(request.url);
    const processingId = searchParams.get('processingId');
    const checkStatus = searchParams.get('status');

    // If requesting processing status
    if (checkStatus === 'true' && processingId) {
      const processingDoc = await adminDb
        .collection("deliverable_processing")
        .doc(processingId)
        .get();
      
      if (!processingDoc.exists) {
        return NextResponse.json(
          { error: "Processing record not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        processing: processingDoc.data()
      });
    }

    // Enhanced validation for orderId
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching deliverables for order ID:", orderId);

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Verify order exists first (same logic as before)
    let orderDoc: any = null;
    let orderData: any = null;

    // Try internal ID first
    if (orderId.startsWith('order_')) {
      const ordersQuery = await adminDb
        .collection("orders")
        .where("id", "==", orderId)
        .limit(1)
        .get();

      if (!ordersQuery.empty) {
        orderDoc = ordersQuery.docs[0];
        orderData = orderDoc.data();
      }
    } else {
      // Try document ID
      orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (orderDoc.exists) {
        orderData = orderDoc.data();
      }
    }

    // If still not found, try the other method
    if (!orderDoc || !orderDoc.exists) {
      if (orderId.startsWith('order_')) {
        orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (orderDoc.exists) {
          orderData = orderDoc.data();
        }
      } else {
        const ordersQuery = await adminDb
          .collection("orders")
          .where("id", "==", orderId)
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderData = orderDoc.data();
        }
      }
    }

    if (!orderDoc || !orderDoc.exists || !orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Get deliverables for this order
    const deliverableOrderId = orderData.id || orderDoc.id;
    const deliverablesQuery = await adminDb
      .collection("deliverables")
      .where("order_id", "==", deliverableOrderId)
      .orderBy("created_at", "desc")
      .get();

    const deliverables = deliverablesQuery.docs.map(doc => ({
      firestore_id: doc.id,
      ...doc.data()
    }));

    // Also get any ongoing processing records for this order
    const processingQuery = await adminDb
      .collection("deliverable_processing")
      .where("orderId", "==", deliverableOrderId)
      .where("status", "in", ["uploading", "processing"])
      .get();

    const ongoingUploads = processingQuery.docs.map(doc => ({
      processing_id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      deliverables: deliverables,
      ongoingUploads: ongoingUploads,
      count: deliverables.length,
      ongoingCount: ongoingUploads.length,
    });

  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch deliverables",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}