import { NextRequest, NextResponse } from "next/server";
import {  adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
	request: NextRequest,
	/* eslint-disable @typescript-eslint/no-explicit-any */
	{ params }: any
) {
	try {
		const { orderId } = params;
		
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

		// Update order status to approved/in_progress
		await orderRef.update({
			status: "in_progress",
			updated_at: FieldValue.serverTimestamp(),
		});

		// Create milestone
		const milestoneData = {
			order_id: orderId,
			milestone_type: "order_approved",
			status: "completed",
			description: "Order approved by creator",
			completed_at: FieldValue.serverTimestamp(),
			created_at: FieldValue.serverTimestamp(),
		};
		await adminDb.collection("project_milestones").add(milestoneData);

		// Send notification to the user
		await adminDb.collection("notifications").add({
			userId: orderData?.user_id,
			message: `Great news! Your order #${orderId} has been approved and work will begin soon.`,
			status: "unread",
			type: "order_approved",
			createdAt: FieldValue.serverTimestamp(),
			relatedTo: "order",
			orderId,
		});

		return NextResponse.json({
			success: true,
			message: "Order approved successfully",
			orderId,
			status: "in_progress",
		});
	} catch (error) {
		console.error("Error approving order:", error);
		return NextResponse.json(
			{
				error: "Failed to approve order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}