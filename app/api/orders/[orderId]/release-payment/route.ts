import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Helper function to send notifications
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendNotification = async (userId: string, notification: any) => {
	await adminDb.collection("notifications").add({
		...notification,
		userId,
		createdAt: new Date().toISOString(),
	});
};

export async function POST(
	request: NextRequest,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{ params }: any
) {
	try {
		const { orderId } = params;
		const { approvalType } = await request.json(); // 'full' or 'partial'
		
		// Verify the order exists and is ready for payment release
		const orderDoc = await adminDb.collection('orders').doc(orderId).get();
		
		if (!orderDoc.exists) {
			return NextResponse.json(
				{ error: 'Order not found' },
				{ status: 404 }
			);
		}

		const orderData = orderDoc.data();
		
		if (orderData?.status !== 'completed' && orderData?.status !== 'approved') {
			return NextResponse.json(
				{ error: 'Order must be completed or approved before releasing payment' },
				{ status: 400 }
			);
		}

		// Get the payment record
		const paymentQuery = await adminDb.collection('payments')
			.where('orderId', '==', orderId)
			.where('status', '==', 'held_in_escrow')
			.limit(1)
			.get();

		if (paymentQuery.empty) {
			return NextResponse.json(
				{ error: 'No escrow payment found for this order' },
				{ status: 404 }
			);
		}

		const paymentDoc = paymentQuery.docs[0];
		const paymentData = paymentDoc.data();

		// Get creator's Stripe account ID
		const creatorDoc = await adminDb.collection('users').doc(paymentData.creatorId).get();
		const creatorData = creatorDoc.data();
		
		if (!creatorData?.stripeAccountId) {
			return NextResponse.json(
				{ error: 'Creator Stripe account not found' },
				{ status: 400 }
			);
		}

		// Calculate amounts
		const totalAmount = paymentData.amount;
		// const platformFee = Math.round(totalAmount * 0.05 * 100); // 5% platform fee
		const creatorAmount = Math.round(totalAmount * 100)

		// Create transfer to creator
		const transfer = await stripe.transfers.create({
			amount: creatorAmount,
			currency: 'usd',
			destination: creatorData?.stripeAccountId,
			metadata: {
				orderId: orderId,
				paymentId: paymentData.paymentId,
				releaseType: approvalType,
			},
		});

		// Update payment status
		await paymentDoc.ref.update({
			status: 'released_to_creator',
			releasedAt: new Date().toISOString(),
			transferId: transfer.id,
			creatorAmount: creatorAmount / 100,
			// platformFee: platformFee / 100,
		});

		// Update order status
		await adminDb.collection('orders').doc(orderId).update({
			paymentStatus: 'released',
			paymentReleasedAt: new Date().toISOString(),
		});

		// Notify creator
		await sendNotification(paymentData.creatorId, {
			type: 'payment_released',
			orderId: orderId,
			amount: creatorAmount / 100,
			message: `Payment of $${(creatorAmount / 100).toFixed(2)} has been released to your account!`,
		});

		return NextResponse.json({
			success: true,
			transferId: transfer.id,
			amount: creatorAmount / 100,
			message: 'Payment released successfully',
		});

	} catch (error) {
		console.error('Error releasing escrow payment:', error);
		return NextResponse.json(
			{ 
				error: 'Failed to release payment',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}