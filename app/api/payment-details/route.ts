import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const paymentId = searchParams.get("payment_id");

		if (!paymentId) {
			return NextResponse.json(
				{ error: "Payment ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}

		// Get payment record
		const paymentDoc = await adminDb
			.collection("payments")
			.doc(paymentId)
			.get();

		if (!paymentDoc.exists) {
			return NextResponse.json(
				{ error: "Payment record not found" },
				{ status: 404 }
			);
		}

		const paymentData = paymentDoc.data();

		return NextResponse.json({
			success: true,
			data: {
				paymentId: paymentDoc.id,
				amount: paymentData?.amount,
				paymentType: paymentData?.paymentType,
				paymentName: paymentData?.paymentName,
				videoTitle: paymentData?.videoTitle,
				videoId: paymentData?.videoId,
				creatorId: paymentData?.creatorId,
				creatorEmail: paymentData?.creatorEmail,
				userId: paymentData?.userId,
				userEmail: paymentData?.userEmail,
				status: paymentData?.status,
				stripeSessionId: paymentData?.stripeSessionId,
				createdAt: paymentData?.createdAt,
				updatedAt: paymentData?.updatedAt,
			},
		});
	} catch (error) {
		console.error("Error fetching payment details:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch payment details",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}