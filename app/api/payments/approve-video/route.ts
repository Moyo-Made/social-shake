/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	let action: string | undefined;

	try {
		const {
			paymentId,
			action: actionFromRequest,
			reason,
			deliverableId, // NEW: specific deliverable to approve
			approveAll = false, // NEW: flag to approve all deliverables in the order
		} = await request.json();

		action = actionFromRequest;

		if (!paymentId || !action) {
			return NextResponse.json(
				{ error: "Payment ID and action are required" },
				{ status: 400 }
			);
		}

		if (!["approve", "reject"].includes(action)) {
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
			return NextResponse.json({ error: "Payment not found" }, { status: 404 });
		}

		const paymentData = paymentDoc.data();

		if (!paymentData?.escrowPayment) {
			return NextResponse.json(
				{
					error:
						"This payment is not eligible for approval (not an escrow payment)",
				},
				{ status: 400 }
			);
		}

		if (paymentData.status !== "pending_capture") {
			return NextResponse.json(
				{
					error: `Payment cannot be ${action}ed. Current status: ${paymentData.status}`,
				},
				{ status: 400 }
			);
		}

		// Helper function to get approver ID with fallback
		const getApproverId = () => {
			return paymentData.brandId || paymentData.user_id || "system";
		};

		// NEW: Update deliverable approval status in the database
		if (action === "approve" && deliverableId) {
			try {
				// Find and update the specific deliverable
				const deliverableRef = adminDb
					.collection("deliverables")
					.doc(deliverableId);
				const deliverableDoc = await deliverableRef.get();

				if (deliverableDoc.exists) {
					await deliverableRef.update({
						approval_status: "approved",
						approved_at: new Date().toISOString(),
						approved_by: getApproverId(),
						updated_at: new Date().toISOString(),
					});
					console.log(`Updated deliverable ${deliverableId} approval status`);
				}
			} catch (error) {
				console.warn("Could not update deliverable approval status:", error);
			}
		}

		// NEW: Handle approving all deliverables in an order
		if (action === "approve" && approveAll && paymentData.orderId) {
			try {
				// Get all deliverables for this order
				const deliverablesSnapshot = await adminDb
					.collection("deliverables")
					.where("order_id", "==", paymentData.orderId)
					.get();

				// Update all deliverables to approved
				const batch = adminDb.batch();
				deliverablesSnapshot.docs.forEach((doc) => {
					batch.update(doc.ref, {
						approval_status: "approved",
						approved_at: new Date().toISOString(),
						approved_by: getApproverId(),
						updated_at: new Date().toISOString(),
					});
				});

				await batch.commit();
				console.log(
					`Updated ${deliverablesSnapshot.size} deliverables to approved`
				);
			} catch (error) {
				console.warn(
					"Could not update all deliverables approval status:",
					error
				);
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

		if (action === "approve") {
			try {
				// Capture the payment in Stripe - this releases the funds to the creator
				const capturedPaymentIntent = await stripe.paymentIntents.capture(
					stripePaymentIntentId
				);

				console.log(`Payment captured successfully: ${stripePaymentIntentId}`);

				// Update payment status
				updatedPaymentData = {
					...updatedPaymentData,
					status: "completed",
					escrowStatus: "released",
					approvedAt: new Date().toISOString(),
					stripeStatus: capturedPaymentIntent.status,
					// NEW: Add approval details
					approvalDetails: {
						deliverableId: deliverableId || null,
						approveAll: approveAll,
						approvedBy: getApproverId(),
						approvedAt: new Date().toISOString(),
					},
				};

				updatedCollectionData = {
					...updatedCollectionData,
					status: "completed",
					escrowStatus: "released",
					approvedAt: new Date().toISOString(),
				};
			} catch (stripeError) {
				console.error("Error capturing payment in Stripe:", stripeError);
				return NextResponse.json(
					{ error: "Failed to capture payment in Stripe" },
					{ status: 500 }
				);
			}
		} else if (action === "reject") {
			try {
				// Cancel the payment intent in Stripe - this releases the hold and refunds the customer
				const canceledPaymentIntent = await stripe.paymentIntents.cancel(
					stripePaymentIntentId
				);

				console.log(`Payment canceled successfully: ${stripePaymentIntentId}`);

				// NEW: Update deliverable rejection status
				if (deliverableId) {
					try {
						const deliverableRef = adminDb
							.collection("deliverables")
							.doc(deliverableId);
						const deliverableDoc = await deliverableRef.get();

						if (deliverableDoc.exists) {
							await deliverableRef.update({
								approval_status: "needs_revision",
								rejected_at: new Date().toISOString(),
								rejected_by: getApproverId(),
								rejection_reason: reason || "Revision requested by brand",
								updated_at: new Date().toISOString(),
							});
						}
					} catch (error) {
						console.warn(
							"Could not update deliverable rejection status:",
							error
						);
					}
				}

				// Update payment status
				updatedPaymentData = {
					...updatedPaymentData,
					status: "rejected",
					escrowStatus: "refunded",
					rejectedAt: new Date().toISOString(),
					rejectionReason: reason || "Payment rejected by brand",
					stripeStatus: canceledPaymentIntent.status,
				};

				updatedCollectionData = {
					...updatedCollectionData,
					status: "rejected",
					escrowStatus: "refunded",
					rejectedAt: new Date().toISOString(),
					rejectionReason: reason || "Payment rejected by brand",
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
		let collectionName = "";

		switch (paymentType) {
			case "order_escrow":
				collectionName = "order_payments";
				break;
			case "submission_approval":
				collectionName = "submission_payments";
				break;
			case "video":
				collectionName = "video_purchases";
				break;
			case "project":
				collectionName = "project_payments";
				break;
			case "contest":
				collectionName = "contest_payments";
				break;
		}

		if (collectionName) {
			try {
				// Enhanced update for order_payments collection
				if (collectionName === "order_payments") {
					const orderPaymentUpdate = {
						...updatedCollectionData,
						// Ensure these fields are set for the delivered orders API to work
						escrowStatus: action === "approve" ? "released" : "refunded",
						status: action === "approve" ? "completed" : "rejected",
						orderId: paymentData.orderId, // Ensure orderId is present
						approvedAt: action === "approve" ? new Date().toISOString() : null,
						rejectedAt: action === "reject" ? new Date().toISOString() : null,
						// Add approval tracking
						approvalDetails:
							action === "approve"
								? {
										deliverableId: deliverableId || null,
										approveAll: approveAll,
										approvedBy: getApproverId(),
										approvedAt: new Date().toISOString(),
									}
								: null,
					};

					await adminDb
						.collection(collectionName)
						.doc(paymentId)
						.update(orderPaymentUpdate);

					console.log(
						`Updated ${collectionName} with escrow status: ${orderPaymentUpdate.escrowStatus}`
					);
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
		if (paymentType === "submission_approval" && paymentData.submissionId) {
			try {
				const submissionUpdate: any = {
					paymentStatus: action === "approve" ? "paid" : "rejected",
					updatedAt: new Date().toISOString(),
				};

				if (action === "approve") {
					submissionUpdate.approvedAt = new Date().toISOString();
					submissionUpdate.status = "approved_and_paid";
				} else {
					submissionUpdate.rejectedAt = new Date().toISOString();
					submissionUpdate.rejectionReason =
						reason || "Payment rejected by brand";
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
					updated_at: new Date().toISOString(),
				};

				if (action === "approve") {
					orderUpdate.status = "approved";
					orderUpdate.approved_at = new Date().toISOString();
					orderUpdate.payment_status = "completed";
					orderUpdate.escrow_status = "released";
				} else {
					orderUpdate.status = "payment_rejected";
					orderUpdate.rejected_at = new Date().toISOString();
					orderUpdate.payment_status = "rejected";
					orderUpdate.escrow_status = "refunded";
					orderUpdate.rejection_reason = reason || "Payment rejected by brand";
				}

				await adminDb
					.collection("orders")
					.doc(paymentData.orderId)
					.update(orderUpdate);

				console.log(
					`Updated order ${paymentData.orderId} status to: ${orderUpdate.status}`
				);
			} catch (error) {
				console.warn("Could not update order status:", error);
			}
		}

		// TODO: Send notifications to creator and brand
		// You might want to trigger email notifications here

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
			orderId: paymentData.orderId || null,
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
