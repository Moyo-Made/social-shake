import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
	try {
		const { amount, paymentId, contestTitle, userEmail, userId, projectTitle } =
			await request.json();

		if (!amount || !paymentId || !userEmail) {
			return NextResponse.json(
				{ error: "Amount, payment ID, and user email are required" },
				{ status: 400 }
			);
		}

		// Verify that the payment record exists
		if (!adminDb) {
			return NextResponse.json(
				{ error: "Database connection is not initialized" },
				{ status: 500 }
			);
		}
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

        // Determine if this is a contest or project
        const isContest = Boolean(contestTitle);
        const type = isContest ? "contest" : "project";
        const name = contestTitle || projectTitle || "Payment";

		// Create a Stripe checkout session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: isContest ? contestTitle : projectTitle || "Payment",
							description: isContest
								? `Payment for contest: ${contestTitle}`
								: `Payment for project: ${projectTitle}`,
						},
						unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
					},
					quantity: 1,
				},
			],
			mode: "payment",
			payment_intent_data: {
				capture_method: "manual", // This enables the manual capture
                metadata: {
                    paymentId,
                    userId,
                    type, // "contest" or "project"
                    name, // The actual title
                    description: isContest
                        ? `Payment for contest: ${contestTitle}`
                        : `Payment for project: ${projectTitle}`,
                }
			},
			// Make sure to include the type parameter in the success URL
			success_url: `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment-success?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&type=${type}`,
			cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/brand/${type}/new?canceled=true`,
			customer_email: userEmail,
			metadata: { // Duplicate metadata at the session level for redundancy
				paymentId,
				userId,
				type, // "contest" or "project"
				name, // The actual title
                description: isContest
                    ? `Payment for contest: ${contestTitle}`
                    : `Payment for project: ${projectTitle}`,
			},
		});

		// Update payment record with sessionId
		await adminDb.collection("payments").doc(paymentId).update({
			stripeSessionId: session.id,
			updatedAt: new Date().toISOString(),
            // Also save the type in our own database
            paymentType: type,
            paymentName: name
		});

		return NextResponse.json({
			success: true,
			sessionId: session.id,
		});
	} catch (error) {
		console.error("Error creating checkout session:", error);
		return NextResponse.json(
			{
				error: "Failed to create checkout session",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}