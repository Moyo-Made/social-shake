import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const body = await request.json();
		const {
			orderId,
			userId,
			approvalStatus, // "approved", "revision_requested"
			feedback,
			revisionNotes,
		} = body;

		console.log("Received order approval data:", {
			orderId,
			userId,
			approvalStatus,
			hasFeedback: !!feedback,
		});

		// Validate required fields
		if (!orderId || !userId || !approvalStatus) {
			return NextResponse.json(
				{ error: "Missing required fields: orderId, userId, or approvalStatus" },
				{ status: 400 }
			);
		}

		// Validate approval status
		if (!["approved", "revision_requested"].includes(approvalStatus)) {
			return NextResponse.json(
				{ error: "Invalid approval status. Must be 'approved' or 'revision_requested'" },
				{ status: 400 }
			);
		}

		// Verify the user exists in Auth system
		if (!adminAuth) {
			throw new Error("Firebase admin auth is not initialized");
		}
		
		try {
			await adminAuth.getUser(userId);
		} catch (error) {
			console.error("Error verifying user:", error);
			return NextResponse.json(
				{
					error: "Invalid user ID. Please sign in again.",
					details: error instanceof Error ? error.message : String(error)
				},
				{ status: 401 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Get the order
		const orderDoc = await adminDb.collection("orders").doc(orderId).get();
		if (!orderDoc.exists) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 }
			);
		}

		const orderData = orderDoc.data();

		// Verify user owns this order
		if (orderData?.user_id !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized: You don't have permission to approve this order" },
				{ status: 403 }
			);
		}

		// Check if order is in correct status for approval
		if (orderData?.status !== "pending_approval" && orderData?.status !== "submitted") {
			return NextResponse.json(
				{ error: "Order is not in a state that can be approved. Current status: " + orderData?.status },
				{ status: 400 }
			);
		}

		// Prepare update data
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {
			status: approvalStatus === "approved" ? "approved" : "revision_requested",
			updated_at: FieldValue.serverTimestamp(),
			approval_timestamp: FieldValue.serverTimestamp(),
		};

		// Add feedback if provided
		if (feedback) {
			updateData.feedback = feedback;
		}

		// Add revision notes if status is revision_requested
		if (approvalStatus === "revision_requested" && revisionNotes) {
			updateData.revision_notes = revisionNotes;
		}

		// Add approval history entry
		const historyEntry = {
			action: approvalStatus,
			timestamp: FieldValue.serverTimestamp(),
			user_id: userId,
			...(feedback && { feedback }),
			...(revisionNotes && { revision_notes: revisionNotes }),
		};

		updateData.approval_history = FieldValue.arrayUnion(historyEntry);

		// Update the order
		await adminDb.collection("orders").doc(orderId).update(updateData);

		// Create notification for relevant parties (optional)
		const notificationData = {
			type: "order_" + approvalStatus,
			order_id: orderId,
			user_id: userId,
			message: approvalStatus === "approved" 
				? "Your order has been approved and is being processed."
				: "Your order requires revisions. Please check the feedback and resubmit.",
			created_at: FieldValue.serverTimestamp(),
			read: false,
		};

		try {
			await adminDb.collection("notifications").add(notificationData);
		} catch (notificationError) {
			console.error("Failed to create notification:", notificationError);
			// Don't fail the entire request if notification fails
		}

		// Prepare response data
		const responseData = {
			message: approvalStatus === "approved" 
				? "Order approved successfully" 
				: "Order sent back for revisions",
			orderId,
			newStatus: updateData.status,
			timestamp: new Date().toISOString(),
		};

		console.log("Order approval processed successfully:", {
			orderId,
			newStatus: updateData.status,
			userId,
		});

		return NextResponse.json(responseData, { status: 200 });

	} catch (error) {
		console.error("Error processing order approval:", error);
		
		return NextResponse.json(
			{
				error: "Internal server error while processing order approval",
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}