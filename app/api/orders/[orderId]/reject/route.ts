import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(
	request: NextRequest,
	/* eslint-disable @typescript-eslint/no-explicit-any */
	{ params }: any
) {
	try {
		const { orderId } = params;
		const body = await request.json();
		const { reason } = body; // Optional rejection reason
		
		if (!orderId) {
			return NextResponse.json(
				{ error: "Order ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Get the order
		const orderRef = adminDb.collection("orders").doc(orderId);
		const orderDoc = await orderRef.get();

		if (!orderDoc.exists) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 }
			);
		}

		const orderData = orderDoc.data();

		// Check if there's an associated escrow payment to refund
		let refundProcessed = false;
		let refundDetails = null;

		try {
			// Find the payment associated with this order
			const paymentsSnapshot = await adminDb
				.collection("payments")
				.where("orderId", "==", orderId)
				.where("escrowPayment", "==", true)
				.where("status", "==", "pending_capture")
				.get();

			if (!paymentsSnapshot.empty) {
				const paymentDoc = paymentsSnapshot.docs[0];
				const paymentData = paymentDoc.data();
				const paymentId = paymentDoc.id;
				const stripePaymentIntentId = paymentData.stripePaymentIntentId;

				if (stripePaymentIntentId) {
					// Cancel the payment intent in Stripe - this releases the hold and refunds the customer
					const canceledPaymentIntent = await stripe.paymentIntents.cancel(
						stripePaymentIntentId
					);

					console.log(`Payment canceled successfully for order rejection: ${stripePaymentIntentId}`);

					// Update the payment record
					const paymentUpdate = {
						status: 'rejected',
						escrowStatus: 'refunded',
						rejectedAt: new Date().toISOString(),
						rejectionReason: reason || 'Order rejected by creator',
						stripeStatus: canceledPaymentIntent.status,
						updatedAt: new Date().toISOString(),
						processedAt: new Date().toISOString(),
					};

					await adminDb
						.collection("payments")
						.doc(paymentId)
						.update(paymentUpdate);

					// Update the order_payments collection if it exists
					try {
						await adminDb
							.collection("order_payments")
							.doc(paymentId)
							.update({
								...paymentUpdate,
								orderId: orderId,
								escrowStatus: 'refunded',
								status: 'rejected',
								rejectedAt: new Date().toISOString(),
							});
					} catch (error) {
						console.warn("Could not update order_payments collection:", error);
					}

					refundProcessed = true;
					refundDetails = {
						paymentId,
						stripePaymentIntentId,
						refundAmount: paymentData.amount,
						refundedAt: new Date().toISOString()
					};

					console.log(`Escrow refund processed for order ${orderId}`);
				}
			}
		} catch (error) {
			console.error("Error processing escrow refund:", error);
			// Don't fail the entire request if refund fails, but log it
		}

		// Update order status to rejected
		const orderUpdate: any = {
			status: "rejected",
			rejection_reason: reason || "Order rejected by creator",
			updated_at: FieldValue.serverTimestamp(),
			payment_status: refundProcessed ? "refunded" : orderData?.payment_status,
			escrow_status: refundProcessed ? "refunded" : orderData?.escrow_status,
		};

		if (refundProcessed) {
			orderUpdate.refunded_at = new Date().toISOString();
		}

		await orderRef.update(orderUpdate);

		// Create milestone
		const milestoneData = {
			order_id: orderId,
			milestone_type: "order_rejected",
			status: "completed",
			description: `Order rejected by creator${reason ? `: ${reason}` : ''}${refundProcessed ? '. Payment refunded to brand.' : ''}`,
			completed_at: FieldValue.serverTimestamp(),
			created_at: FieldValue.serverTimestamp(),
		};
		await adminDb.collection("project_milestones").add(milestoneData);

		// Send notification to the brand
		const notificationMessage = refundProcessed 
			? `Your order #${orderId} has been rejected by the creator and your payment has been refunded. ${reason ? `Reason: ${reason}` : ''}`
			: `Unfortunately, your order #${orderId} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact the creator for more details.'}`;

		await adminDb.collection("notifications").add({
			userId: orderData?.user_id,
			message: notificationMessage,
			status: "unread",
			type: "order_rejected",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "order",
			orderId,
		});

		// Optional: Send notification to creator confirming the rejection and refund
		if (refundProcessed && orderData?.creator_id) {
			await adminDb.collection("notifications").add({
				userId: orderData.creator_id,
				message: `You have rejected order #${orderId}. The payment has been refunded to the brand.`,
				status: "unread",
				type: "order_rejected_confirmation",
				createdAt: FieldValue.serverTimestamp(),
				relatedTo: "order",
				orderId,
			});
		}

		return NextResponse.json({
			success: true,
			message: "Order rejected successfully",
			orderId,
			status: "rejected",
			refundProcessed,
			refundDetails,
		});
	} catch (error) {
		console.error("Error rejecting order:", error);
		return NextResponse.json(
			{
				error: "Failed to reject order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}