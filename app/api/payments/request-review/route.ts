/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Helper function to remove undefined values from an object
const removeUndefinedFields = (obj: any): any => {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => removeUndefinedFields(item));
	}

	if (typeof obj === "object" && !(obj instanceof Date)) {
		const cleaned: any = {};
		for (const [key, value] of Object.entries(obj)) {
			if (value !== undefined) {
				cleaned[key] = removeUndefinedFields(value);
			}
		}
		return cleaned;
	}

	return obj;
};

export async function POST(request: NextRequest) {
	let action: string | undefined;

	try {
		const {
			paymentId,
			action: actionFromRequest,
			reason,
			deliverableId, // Specific deliverable to request revision for
			revisionNotes, // Detailed feedback for the creator
			requestAllRevisions = false, // Flag to request revisions for all deliverables in the order
		} = await request.json();

		action = actionFromRequest;

		if (!paymentId || !action) {
			return NextResponse.json(
				{ error: "Payment ID and action are required" },
				{ status: 400 }
			);
		}

		if (action !== "request_review") {
			return NextResponse.json(
				{ error: "Action must be 'request_review'" },
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
						"This payment is not eligible for review requests (not an escrow payment)",
				},
				{ status: 400 }
			);
		}

		if (paymentData.status !== "pending_capture") {
			return NextResponse.json(
				{
					error: `Cannot request review for this payment. Current status: ${paymentData.status}`,
				},
				{ status: 400 }
			);
		}

		// Update specific deliverable revision status in the database
		if (deliverableId) {
			try {
				const deliverableRef = adminDb
					.collection("deliverables")
					.doc(deliverableId);
				const deliverableDoc = await deliverableRef.get();

				if (!deliverableDoc.exists) {
					return NextResponse.json(
						{ error: `Deliverable ${deliverableId} not found` },
						{ status: 404 }
					);
				}

				const currentDeliverable = deliverableDoc.data();
				const revisionCount = (currentDeliverable?.revision_count || 0) + 1;

				// Create the revision history entry and clean it first
				const revisionHistoryEntry = removeUndefinedFields({
					requested_at: new Date().toISOString(),
					requested_by: paymentData.brandId || paymentData.user_id,
					reason: reason || "Revision requested by brand",
					notes: revisionNotes || "",
					revision_number: revisionCount,
				});

				const updateData = {
					approval_status: "revision_requested",
					revision_requested_at: new Date().toISOString(),
					revision_requested_by: paymentData.brandId || paymentData.user_id,
					revision_reason: reason || "Revision requested by brand",
					revision_notes: revisionNotes || "",
					revision_count: revisionCount,
					updated_at: new Date().toISOString(),
					revision_history: FieldValue.arrayUnion(revisionHistoryEntry),
				};

				// Remove undefined fields from the main update data
				const cleanUpdateData = removeUndefinedFields(updateData);

				console.log(
					"Clean update data:",
					JSON.stringify(cleanUpdateData, null, 2)
				);

				await deliverableRef.update(cleanUpdateData);
				console.log(
					`Successfully updated deliverable ${deliverableId} to revision_requested status`
				);
			} catch (error) {
				console.error("Failed to update deliverable revision status:", error);
				return NextResponse.json(
					{
						error: "Failed to update deliverable status",
						details: error instanceof Error ? error.message : String(error),
						deliverableId,
					},
					{ status: 500 }
				);
			}
		}

		// Handle requesting revisions for all deliverables in an order
		if (requestAllRevisions && paymentData.orderId) {
			try {
				const deliverablesSnapshot = await adminDb
					.collection("deliverables")
					.where("order_id", "==", paymentData.orderId)
					.get();

				const batch = adminDb.batch();

				deliverablesSnapshot.docs.forEach((doc) => {
					const currentData = doc.data();
					const revisionCount = (currentData?.revision_count || 0) + 1;

					// Create and clean the revision history entry
					const revisionHistoryEntry = removeUndefinedFields({
						requested_at: new Date().toISOString(),
						requested_by: paymentData.brandId || paymentData.user_id,
						reason: reason || "Revision requested by brand",
						notes: revisionNotes || "",
						revision_number: revisionCount,
					});

					const updateData = {
						approval_status: "revision_requested",
						revision_requested_at: new Date().toISOString(),
						revision_requested_by: paymentData.brandId || paymentData.user_id,
						revision_reason: reason || "Revision requested by brand",
						revision_notes: revisionNotes || "",
						revision_count: revisionCount,
						updated_at: new Date().toISOString(),
						revision_history: FieldValue.arrayUnion(revisionHistoryEntry),
					};

					// Clean the update data
					const cleanUpdateData = removeUndefinedFields(updateData);
					batch.update(doc.ref, cleanUpdateData);
				});

				await batch.commit();
				console.log(
					`Updated ${deliverablesSnapshot.size} deliverables to revision_requested`
				);
			} catch (error) {
				console.warn(
					"Could not update all deliverables revision status:",
					error
				);
				return NextResponse.json(
					{ error: "Failed to update deliverables status" },
					{ status: 500 }
				);
			}
		}

		// Note: We don't touch the Stripe PaymentIntent here since the payment remains in escrow
		// The funds stay held until the creator submits revisions and gets approved/rejected

		const updatedPaymentData = removeUndefinedFields({
			updatedAt: new Date().toISOString(),
			status: "revision_requested",
			escrowStatus: "held",
			revisionRequestedAt: new Date().toISOString(),
			revisionReason: reason || "Revision requested by brand",
			revisionNotes: revisionNotes || "",
			revisionDetails: removeUndefinedFields({
				deliverableId: deliverableId || null,
				requestAllRevisions: requestAllRevisions,
				requestedBy: paymentData.brandId || paymentData.user_id,
				requestedAt: new Date().toISOString(),
				reason: reason || "Revision requested by brand",
				notes: revisionNotes || "",
			}),
		});

		const updatedCollectionData = removeUndefinedFields({
			updatedAt: new Date().toISOString(),
			status: "revision_requested",
			escrowStatus: "held",
			revisionRequestedAt: new Date().toISOString(),
			revisionReason: reason || "Revision requested by brand",
			revisionNotes: revisionNotes || "",
		});

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
						escrowStatus: "held",
						status: "revision_requested",
						orderId: paymentData.orderId,
						revisionRequestedAt: new Date().toISOString(),
						// Add revision tracking
						revisionDetails: {
							deliverableId: deliverableId || null,
							requestAllRevisions: requestAllRevisions,
							requestedBy: paymentData.brandId || paymentData.user_id,
							requestedAt: new Date().toISOString(),
							reason: reason || "Revision requested by brand",
							notes: revisionNotes || "",
						},
					};

					await adminDb
						.collection(collectionName)
						.doc(paymentId)
						.update(orderPaymentUpdate);

					console.log(`Updated ${collectionName} with revision request status`);
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
					paymentStatus: "revision_requested",
					status: "revision_requested",
					revisionRequestedAt: new Date().toISOString(),
					revisionReason: reason || "Revision requested by brand",
					revisionNotes: revisionNotes || "",
					updatedAt: new Date().toISOString(),
				};

				await adminDb
					.collection("project_submissions")
					.doc(paymentData.submissionId)
					.update(submissionUpdate);
			} catch (error) {
				console.warn("Could not update submission status:", error);
			}
		}

		// Update order status for order-related payments
		if (paymentData.orderId) {
			try {
				const orderUpdate: any = {
					status: "revision_requested",
					revision_requested_at: new Date().toISOString(),
					payment_status: "revision_requested",
					escrow_status: "held",
					revision_reason: reason || "Revision requested by brand",
					revision_notes: revisionNotes || "",
					updated_at: new Date().toISOString(),
				};

				await adminDb
					.collection("orders")
					.doc(paymentData.orderId)
					.update(orderUpdate);

				console.log(
					`Updated order ${paymentData.orderId} status to: revision_requested`
				);
			} catch (error) {
				console.warn("Could not update order status:", error);
			}
		}

		// TODO: Send notifications to creator about revision request
		// You might want to trigger email/push notifications here

		return NextResponse.json({
			success: true,
			message: "Revision requested successfully",
			paymentId,
			action: "request_review",
			status: updatedPaymentData.status,
			escrowStatus: updatedPaymentData.escrowStatus,
			revisionRequestedAt: updatedPaymentData.revisionRequestedAt,
			revisionDetails: updatedPaymentData.revisionDetails,
			deliverableId: deliverableId || null,
			requestAllRevisions: requestAllRevisions || false,
			orderId: paymentData.orderId || null,
			revisionReason: reason || "Revision requested by brand",
			revisionNotes: revisionNotes || "",
		});
	} catch (error) {
		console.error(`Error requesting revision:`, error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to request revision",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
