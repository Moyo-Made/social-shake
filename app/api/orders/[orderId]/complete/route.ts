import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(
	request: NextRequest,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{ params }: any
) {
	try {
		const { orderId } = params;
		const { completedBy, completionNotes } = await request.json();

		// Update order status
		await adminDb.collection('orders').doc(orderId).update({
			status: 'completed',
			completedAt: new Date().toISOString(),
			completedBy: completedBy,
			completionNotes: completionNotes || '',
		});

		// Automatically release payment after order completion
		// You can add a delay or require manual approval here
		setTimeout(async () => {
			try {
				await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/release-payment`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						approvalType: 'full'
					}),
				});
			} catch (error) {
				console.error('Error auto-releasing payment:', error);
			}
		}, 5000); // 5 second delay before auto-release

		return NextResponse.json({
			success: true,
			message: 'Order completed successfully',
		});
	} catch (error) {
		console.error('Error completing order:', error);
		return NextResponse.json(
			{
				error: 'Failed to complete order',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}