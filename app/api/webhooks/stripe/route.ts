import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/config/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";



// Helper function to send notifications
export interface Notification {
	type: string;
	message: string;
	[key: string]: string | number | boolean | null | undefined;
}

export interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
	current_period_start: number;
	current_period_end: number;
	trial_start: number | null;
	trial_end: number | null;
	cancel_at_period_end: boolean;
}

interface StripeInvoiceWithSubscription extends Stripe.Invoice {
	subscription: string | null;
}

const sendNotification = async (userId: string, notification: Notification) => {
	await adminDb.collection("notifications").add({
		...notification,
		userId,
		createdAt: new Date().toISOString(),
	});
};

// Helper function to log webhook events
const logWebhookEvent = async (
	event: Stripe.Event,
	status: "processed" | "failed",
	error?: string
) => {
	try {
		await adminDb.collection("webhook_events").add({
			eventId: event.id,
			type: event.type,
			status,
			error: error || null,
			timestamp: new Date().toISOString(),
			data: {
				objectId: "id" in event.data.object ? event.data.object.id : null,
				livemode: event.livemode,
			},
		});
	} catch (logError) {
		console.error("Failed to log webhook event:", logError);
	}
};

// Helper function to check if event was already processed (idempotency)
const isEventProcessed = async (eventId: string): Promise<boolean> => {
	try {
		const existingEvent = await adminDb
			.collection("processed_webhooks")
			.doc(eventId)
			.get();
		return existingEvent.exists;
	} catch (error) {
		console.error("Error checking processed events:", error);
		return false;
	}
};

// Helper function to mark event as processed
const markEventAsProcessed = async (eventId: string, eventType: string) => {
	try {
		await adminDb.collection("processed_webhooks").doc(eventId).set({
			eventType,
			processedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error marking event as processed:", error);
	}
};

// Helper function to handle failed payments
const handleFailedPayment = async (paymentIntent: Stripe.PaymentIntent) => {
	const paymentType = paymentIntent.metadata?.paymentType;

	switch (paymentType) {
		case "order_escrow":
			const orderId = paymentIntent.metadata.orderId;
			const customerId = paymentIntent.metadata.customerId;

			if (orderId) {
				await adminDb.collection("orders").doc(orderId).update({
					status: "payment_failed",
					paymentStatus: "failed",
					failedAt: new Date().toISOString(),
				});

				if (customerId) {
					await sendNotification(customerId, {
						type: "payment_failed",
						orderId: orderId,
						message:
							"Payment for your order failed. Please try again or use a different payment method.",
					});
				}
			}
			break;

		case "video":
			const videoPaymentId = paymentIntent.metadata.paymentId;
			const buyerId = paymentIntent.metadata.buyerId;

			if (videoPaymentId) {
				await adminDb.collection("video_purchases").doc(videoPaymentId).update({
					status: "payment_failed",
					platformPaymentStatus: "failed",
					failedAt: new Date().toISOString(),
				});

				// Also update the main payments collection
				await adminDb.collection("payments").doc(videoPaymentId).update({
					status: "failed",
					failedAt: new Date().toISOString(),
				});

				if (buyerId) {
					await sendNotification(buyerId, {
						type: "payment_failed",
						message: "Video purchase payment failed. Please try again.",
					});
				}
			}
			break;

		case "submission_approval":
			const submissionId = paymentIntent.metadata.submissionId;
			const projectId = paymentIntent.metadata.projectId;
			const creatorId = paymentIntent.metadata.creatorId;

			if (submissionId) {
				await adminDb
					.collection("project_submissions")
					.doc(submissionId)
					.update({
						status: "payment_failed",
						failedAt: new Date().toISOString(),
					});

				if (creatorId) {
					await sendNotification(creatorId, {
						type: "payment_failed",
						projectId: projectId,
						submissionId: submissionId,
						message:
							"Payment for submission approval failed. Please contact support.",
					});
				}
			}
			break;
	}
};

// Helper function to handle expired checkout sessions
const handleExpiredCheckout = async (session: Stripe.Checkout.Session) => {
	const contestId = session.metadata?.contestId;
	const paymentType = session.metadata?.paymentType;
	const paymentId = session.metadata?.paymentId;

	if (contestId) {
		// Check if temp contest still exists
		const tempContestDoc = await adminDb
			.collection("tempContests")
			.doc(contestId)
			.get();

		if (tempContestDoc.exists) {
			const tempContestData = tempContestDoc.data();

			// Notify contest creator about expiration
			if (tempContestData?.creatorId) {
				await sendNotification(tempContestData.creatorId, {
					type: "checkout_expired",
					contestId: contestId,
					message:
						"Your contest payment session expired. Please try creating the contest again.",
				});
			}

			console.log(`Checkout session expired for contest ${contestId}`);
		}
	}

	// Handle video payment expiration
	if (paymentType === "video" && paymentId) {
		await adminDb.collection("video_purchases").doc(paymentId).update({
			status: "checkout_expired",
			platformPaymentStatus: "expired",
			expiredAt: new Date().toISOString(),
		});

		await adminDb.collection("payments").doc(paymentId).update({
			status: "expired",
			expiredAt: new Date().toISOString(),
		});

		const buyerId = session.metadata?.buyerId;
		if (buyerId) {
			await sendNotification(buyerId, {
				type: "checkout_expired",
				message: "Your video purchase session expired. Please try again.",
			});
		}
	}
};

// Handle customer.subscription.created
async function handleSubscriptionCreated(event: Stripe.Event) {
	console.log("=== SUBSCRIPTION CREATED ===");
	const subscription = event.data.object as StripeSubscriptionWithPeriods;

	const userId = subscription.metadata?.userId;
	if (!userId) {
		console.error("No userId in subscription metadata");
		return;
	}

	try {
		// Get subscription amount from Stripe
		let subscriptionAmount = 0;
		let planName = '';
		
		if (subscription.items.data.length > 0) {
			const subscriptionItem = subscription.items.data[0];
			subscriptionAmount = subscriptionItem.price.unit_amount || 0;
			planName = subscriptionItem.price.nickname || subscriptionItem.price.id;
		}

		// Update subscription record in database
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("userId", "==", userId)
			.where("status", "==", "pending")
			.limit(1)
			.get();

		if (subscriptionQuery.empty) {
			console.error(`No pending subscription found for user ${userId}`);
			return;
		}

		const subscriptionDoc = subscriptionQuery.docs[0];
		await subscriptionDoc.ref.update({
			stripeSubscriptionId: subscription.id,
			status: subscription.status, // "trialing" during free trial
			// NEW: Store subscription amount and plan info
			subscriptionAmount: subscriptionAmount / 100, // Convert from cents to dollars
			subscriptionAmountCents: subscriptionAmount, // Keep cents version too
			planName: planName,
			currency: subscription.items.data[0]?.price.currency || 'usd',
			interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
			intervalCount: subscription.items.data[0]?.price.recurring?.interval_count || 1,
			// END NEW
			trialStart: subscription.trial_start
				? new Date(subscription.trial_start * 1000).toISOString()
				: null,
			trialEnd: subscription.trial_end
				? new Date(subscription.trial_end * 1000).toISOString()
				: null,
			currentPeriodStart: new Date(
				subscription.current_period_start * 1000
			).toISOString(),
			currentPeriodEnd: new Date(
				subscription.current_period_end * 1000
			).toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// Update user record (also store amount here for easy access)
		await adminDb
			.collection("users")
			.doc(userId)
			.update({
				subscriptionStatus: subscription.status,
				stripeSubscriptionId: subscription.id,
				subscriptionTrial: subscription.status === "trialing",
				// NEW: Store subscription amount in user record too
				subscriptionAmount: subscriptionAmount / 100,
				subscriptionPlan: planName,
				// END NEW
				trialEndDate: subscription.trial_end
					? new Date(subscription.trial_end * 1000).toISOString()
					: null,
				updatedAt: new Date().toISOString(),
			});

		// Send welcome notification (updated to include amount)
		await sendNotification(userId, {
			type: "subscription_trial_started",
			message:
				"Welcome to Social Shake Pro! Your 7-day free trial has started. You'll be charged $" +
				(subscriptionAmount / 100).toFixed(2) +
				" on " +
				(subscription.trial_end
					? new Date(subscription.trial_end * 1000).toLocaleDateString()
					: "trial end"),
		});

		console.log(`Subscription created for user ${userId}: ${subscription.id} - Amount: $${subscriptionAmount / 100}`);
	} catch (error) {
		console.error("Error handling subscription created:", error);
		throw error;
	}
}

// Handle customer.subscription.trial_will_end (3 days before trial ends)
async function handleTrialWillEnd(event: Stripe.Event) {
	console.log("=== TRIAL WILL END ===");
	const subscription = event.data.object as StripeSubscriptionWithPeriods;

	const userId = subscription.metadata?.userId;
	if (!userId) return;

	try {
		// Send reminder notification
		await sendNotification(userId, {
			type: "trial_ending_reminder",
			message:
				"Your Social Shake Pro trial ends in 3 days. Your card will be charged $99 unless you cancel.",
		});

		// Optional: Send email reminder (if you have email service set up)
		console.log(`Trial ending reminder sent to user ${userId}`);
	} catch (error) {
		console.error("Error handling trial will end:", error);
	}
}

// Handle invoice.payment_succeeded (when trial ends and first payment is charged)
async function handleSubscriptionPaymentSucceeded(event: Stripe.Event) {
	console.log("=== SUBSCRIPTION PAYMENT SUCCEEDED ===");
	const invoice = event.data.object as StripeInvoiceWithSubscription;

	if (!invoice.subscription) return;

	try {
		// Get the subscription
		const subscription = (await stripe.subscriptions.retrieve(
			invoice.subscription as string
		)) as unknown as StripeSubscriptionWithPeriods;
		const userId = subscription.metadata?.userId;

		if (!userId) return;

		// Update subscription record
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("stripeSubscriptionId", "==", subscription.id)
			.limit(1)
			.get();

		if (!subscriptionQuery.empty) {
			const subscriptionDoc = subscriptionQuery.docs[0];
			const subscriptionData = subscriptionDoc.data();
			
			// Verify the payment amount matches expected subscription amount
			const expectedAmount = subscriptionData.subscriptionAmountCents || 0;
			const actualAmount = invoice.amount_paid;
			
			if (expectedAmount !== actualAmount) {
				console.warn(`Amount mismatch for subscription ${subscription.id}. Expected: ${expectedAmount}, Actual: ${actualAmount}`);
			}
			
			await subscriptionDoc.ref.update({
				status: subscription.status, // Should be "active" now
				lastPaymentDate: new Date().toISOString(),
				lastPaymentAmount: invoice.amount_paid / 100,
				// NEW: Track if this payment amount matches subscription amount
				lastPaymentAmountMatches: expectedAmount === actualAmount,
				// END NEW
				nextPaymentDate: new Date(
					subscription.current_period_end * 1000
				).toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		// Update user record
		await adminDb.collection("users").doc(userId).update({
			subscriptionStatus: subscription.status,
			subscriptionTrial: false, // Trial is over
			lastPaymentDate: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// Send payment confirmation
		await sendNotification(userId, {
			type: "subscription_payment_succeeded",
			message: `Payment of $${(invoice.amount_paid / 100).toFixed(2)} processed successfully. Your Social Shake Pro subscription is now active!`,
		});

		console.log(
			`Subscription payment succeeded for user ${userId}: $${invoice.amount_paid / 100}`
		);
	} catch (error) {
		console.error("Error handling subscription payment succeeded:", error);
	}
}

// Handle invoice.payment_failed (when payment fails)
async function handleSubscriptionPaymentFailed(event: Stripe.Event) {
	console.log("=== SUBSCRIPTION PAYMENT FAILED ===");
	const invoice = event.data.object as StripeInvoiceWithSubscription;

	if (!invoice.subscription) return;

	try {
		const subscription = await stripe.subscriptions.retrieve(
			invoice.subscription as string
		);
		const userId = subscription.metadata?.userId;

		if (!userId) return;

		// Update subscription record
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("stripeSubscriptionId", "==", subscription.id)
			.limit(1)
			.get();

		if (!subscriptionQuery.empty) {
			const subscriptionDoc = subscriptionQuery.docs[0];
			await subscriptionDoc.ref.update({
				status: subscription.status, // Might be "past_due" or "unpaid"
				lastFailedPaymentDate: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		// Update user record
		await adminDb.collection("users").doc(userId).update({
			subscriptionStatus: subscription.status,
			updatedAt: new Date().toISOString(),
		});

		// Send payment failure notification
		await sendNotification(userId, {
			type: "subscription_payment_failed",
			message:
				"Your subscription payment failed. Please update your payment method to continue using Social Shake Pro.",
		});

		console.log(`Subscription payment failed for user ${userId}`);
	} catch (error) {
		console.error("Error handling subscription payment failed:", error);
	}
}

// Handle customer.subscription.deleted (when subscription is canceled)
async function handleSubscriptionDeleted(event: Stripe.Event) {
	console.log("=== SUBSCRIPTION DELETED ===");
	const subscription = event.data.object as Stripe.Subscription;

	const userId = subscription.metadata?.userId;
	if (!userId) return;

	try {
		// Update subscription record
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("stripeSubscriptionId", "==", subscription.id)
			.limit(1)
			.get();

		if (!subscriptionQuery.empty) {
			const subscriptionDoc = subscriptionQuery.docs[0];
			await subscriptionDoc.ref.update({
				status: "canceled",
				canceledAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		// Update user record
		await adminDb.collection("users").doc(userId).update({
			subscriptionStatus: "canceled",
			subscriptionTrial: false,
			updatedAt: new Date().toISOString(),
		});

		// Send cancellation confirmation
		await sendNotification(userId, {
			type: "subscription_canceled",
			message:
				"Your Social Shake Pro subscription has been canceled. You can resubscribe anytime!",
		});

		console.log(`Subscription canceled for user ${userId}`);
	} catch (error) {
		console.error("Error handling subscription deleted:", error);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get raw body as buffer - this is crucial for signature verification
		const body = await request.text();
		const sig = request.headers.get("stripe-signature");

		// Debug logging (remove in production)
		console.log("Webhook received:");
		console.log("- Body length:", body.length);
		console.log("- Signature header:", sig ? "present" : "missing");
		console.log("- Endpoint secret:", endpointSecret ? "present" : "missing");

		if (!sig) {
			console.error("No Stripe signature header found");
			return NextResponse.json(
				{ error: "No signature header" },
				{ status: 400 }
			);
		}

		if (!endpointSecret) {
			console.error("No webhook endpoint secret configured");
			return NextResponse.json(
				{ error: "Webhook secret not configured" },
				{ status: 500 }
			);
		}

		let event;

		try {
			// Stripe signature verification
			event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
			console.log(
				"Webhook signature verified successfully for event:",
				event.type
			);
		} catch (err) {
			console.error("Webhook signature verification failed:");
			console.error(
				"- Error message:",
				err instanceof Error ? err.message : err
			);
			console.error("- Body preview:", body.substring(0, 100) + "...");

			return NextResponse.json(
				{ error: "Webhook signature verification failed" },
				{ status: 400 }
			);
		}

		// Check for idempotency - prevent duplicate processing
		const alreadyProcessed = await isEventProcessed(event.id);
		if (alreadyProcessed) {
			console.log(`Event ${event.id} already processed, skipping`);
			return NextResponse.json({ received: true });
		}

		try {
			// Handle different event types
			switch (event.type) {
				case "checkout.session.completed":
					await handleCheckoutCompleted(event);
					break;

				case "checkout.session.expired":
					await handleCheckoutExpired(event);
					break;

				case "payment_intent.succeeded":
					await handlePaymentSucceeded(event);
					break;

				case "payment_intent.payment_failed":
				case "payment_intent.canceled":
					await handlePaymentFailed(event);
					break;

				case "customer.subscription.created":
					await handleSubscriptionCreated(event);
					break;

				case "customer.subscription.trial_will_end":
					await handleTrialWillEnd(event);
					break;

				case "invoice.payment_succeeded":
					await handleSubscriptionPaymentSucceeded(event);
					break;

				case "invoice.payment_failed":
					await handleSubscriptionPaymentFailed(event);
					break;

				case "customer.subscription.deleted":
					await handleSubscriptionDeleted(event);
					break;

				default:
					console.log(`Unhandled event type: ${event.type}`);
			}

			// Mark event as processed for idempotency
			await markEventAsProcessed(event.id, event.type);

			// Log successful processing
			await logWebhookEvent(event, "processed");

			return NextResponse.json({ received: true });
		} catch (processingError) {
			console.error(`Error processing ${event.type}:`, processingError);

			// Log failed processing
			await logWebhookEvent(
				event,
				"failed",
				processingError instanceof Error
					? processingError.message
					: "Unknown error"
			);

			// Don't mark as processed if it failed - allow retry
			return NextResponse.json(
				{ error: "Event processing failed" },
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in webhook handler:", error);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 }
		);
	}
}

// Handle checkout session completed
async function handleCheckoutCompleted(event: Stripe.Event) {
	console.log("=== CHECKOUT SESSION COMPLETED ===");
	const session = event.data.object as Stripe.Checkout.Session;

	console.log("Session details:", {
		id: session.id,
		payment_status: session.payment_status,
		mode: session.mode,
		amount_total: session.amount_total,
		metadata: session.metadata,
	});

	if (session.payment_status !== "paid") {
		console.log("Payment not completed, status:", session.payment_status);
		return;
	}

	// Determine payment type based on metadata
	const contestId = session.metadata?.contestId;
	const paymentType = session.metadata?.paymentType;
	const orderId = session.metadata?.orderId;
	const videoId = session.metadata?.videoId;
	const submissionId = session.metadata?.submissionId;

	console.log("Payment identifiers:", {
		contestId,
		paymentType,
		orderId,
		videoId,
		submissionId,
	});

	try {
		// Handle different payment types
		if (contestId) {
			// Contest payment
			await handleContestPayment(session, contestId);
		} else if (paymentType === "order_escrow" && orderId) {
			// Order escrow payment
			await handleOrderEscrowPayment(session, orderId);
		} else if (paymentType === "video" && videoId) {
			// Video payment - NEW ESCROW FLOW
			await handleVideoEscrowPayment(session, videoId);
		} else if (paymentType === "submission_approval" && submissionId) {
			// Submission approval payment
			await handleSubmissionApprovalPayment(session, submissionId);
		} else {
			console.log("Unknown payment type or missing identifiers");
			console.log("Available metadata:", session.metadata);
			// Don't throw error for unknown types, just log
		}

		console.log("Checkout session processed successfully");
	} catch (error) {
		console.error("Error processing checkout session:", error);
		throw error;
	}
}

// Separate handler for contest payments
async function handleContestPayment(
	session: Stripe.Checkout.Session,
	contestId: string
) {
	console.log("Processing contest payment for:", contestId);

	await adminDb.runTransaction(async (transaction) => {
		const tempContestRef = adminDb.collection("tempContests").doc(contestId);
		const tempContestDoc = await transaction.get(tempContestRef);

		if (!tempContestDoc.exists) {
			// Check if already processed
			const mainContestRef = adminDb.collection("contests").doc(contestId);
			const mainContestDoc = await transaction.get(mainContestRef);

			if (mainContestDoc.exists) {
				console.log("Contest already processed, skipping");
				return;
			}

			throw new Error(`Temporary contest not found: ${contestId}`);
		}

		const tempContestData = tempContestDoc.data();
		const finalContestRef = adminDb.collection("contests").doc(contestId);

		const finalContestData = {
			...tempContestData,
			status: "active",
			paymentId: session.id,
			paymentAmount: session.amount_total ? session.amount_total / 100 : null,
			paymentDate: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Remove temporary fields
		if ("expiresAt" in finalContestData) {
			delete finalContestData.expiresAt;
		}

		transaction.set(finalContestRef, finalContestData);
		transaction.delete(tempContestRef);
	});

	console.log(`Contest ${contestId} activated successfully`);
}

// Separate handler for order escrow payments
async function handleOrderEscrowPayment(
	session: Stripe.Checkout.Session,
	orderId: string
) {
	console.log("Processing order escrow payment for:", orderId);

	// Update order status
	await adminDb
		.collection("orders")
		.doc(orderId)
		.update({
			status: "active",
			paymentStatus: "paid_escrow",
			paidAt: new Date().toISOString(),
			checkoutSessionId: session.id,
			paymentAmount: session.amount_total ? session.amount_total / 100 : null,
		});

	console.log(`Order ${orderId} payment processed successfully`);
}

// NEW: Separate handler for video escrow payments
async function handleVideoEscrowPayment(
	session: Stripe.Checkout.Session,
	videoId: string
) {
	console.log("Processing video ESCROW payment for:", videoId);

	const buyerId = session.metadata?.buyerId;
	const brandId = session.metadata?.brandId || buyerId; // fallback for backward compatibility
	const creatorId = session.metadata?.creatorId;
	const paymentId = session.metadata?.paymentId;

	if (!paymentId) {
		console.error("PaymentId missing from session metadata");
		throw new Error("PaymentId required for video escrow payments");
	}

	await adminDb.runTransaction(async (transaction) => {
		// Update video purchase record
		const purchaseRef = adminDb.collection("video_purchases").doc(paymentId);
		const purchaseDoc = await transaction.get(purchaseRef);

		if (!purchaseDoc.exists) {
			throw new Error(`Video purchase record not found: ${paymentId}`);
		}

		// Update purchase record - payment received by platform, waiting for brand approval
		transaction.update(purchaseRef, {
			status: "paid_to_platform", // ESCROW STATUS
			platformPaymentStatus: "completed",
			platformPaymentDate: new Date().toISOString(),
			checkoutSessionId: session.id,
			paymentAmount: session.amount_total ? session.amount_total / 100 : null,
			updatedAt: new Date().toISOString(),
		});

		// Update main payment record
		const paymentRef = adminDb.collection("payments").doc(paymentId);
		transaction.update(paymentRef, {
			status: "paid_to_platform", // ESCROW STATUS
			paidAt: new Date().toISOString(),
			checkoutSessionId: session.id,
			updatedAt: new Date().toISOString(),
		});

		// Update video stats (optional)
		const videoRef = adminDb.collection("videos").doc(videoId);
		const videoDoc = await transaction.get(videoRef);

		if (videoDoc.exists) {
			const videoData = videoDoc.data();
			const currentPendingPurchases = videoData?.pendingPurchaseCount || 0;

			transaction.update(videoRef, {
				pendingPurchaseCount: currentPendingPurchases + 1,
				lastPendingPurchaseAt: new Date().toISOString(),
			});
		}
	});

	// Send notifications (outside transaction)
	if (brandId) {
		await sendNotification(brandId, {
			type: "video_payment_received",
			videoId: videoId,
			paymentId: paymentId,
			message:
				"Payment received! Please review and approve the video purchase to release payment to creator.",
		});
	}

	// Notify creator that payment is in escrow (optional)
	if (creatorId) {
		await sendNotification(creatorId, {
			type: "video_payment_pending",
			videoId: videoId,
			message:
				"A brand has paid for your video! Payment is being held and will be released once they approve the purchase.",
		});
	}

	console.log(
		`Video ${videoId} payment held in escrow successfully - awaiting brand approval`
	);
}

// Separate handler for submission approval payments
async function handleSubmissionApprovalPayment(
	session: Stripe.Checkout.Session,
	submissionId: string
) {
	console.log("Processing submission approval payment for:", submissionId);

	const projectId = session.metadata?.projectId;
	const creatorId = session.metadata?.creatorId;
	const paymentId = session.metadata?.paymentId;

	await adminDb.runTransaction(async (transaction) => {
		const submissionRef = adminDb
			.collection("project_submissions")
			.doc(submissionId);
		const submissionDoc = await transaction.get(submissionRef);

		if (!submissionDoc.exists) {
			throw new Error(`Submission not found: ${submissionId}`);
		}

		// Update submission status
		transaction.update(submissionRef, {
			status: "approved",
			approvedAt: new Date().toISOString(),
			paymentId: paymentId,
			checkoutSessionId: session.id,
			paymentAmount: session.amount_total ? session.amount_total / 100 : null,
			paidAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// If there's a payment record, update it too
		if (paymentId) {
			const paymentQuery = await adminDb
				.collection("payments")
				.where("paymentId", "==", paymentId)
				.limit(1)
				.get();

			if (!paymentQuery.empty) {
				const paymentDoc = paymentQuery.docs[0];
				transaction.update(paymentDoc.ref, {
					status: "completed",
					paidAt: new Date().toISOString(),
					checkoutSessionId: session.id,
				});
			}
		}
	});

	// Send notification to creator (outside transaction)
	if (creatorId) {
		await sendNotification(creatorId, {
			type: "submission_approved",
			projectId: projectId || "",
			submissionId: submissionId,
			message: "Your submission has been approved and payment processed!",
		});
	}

	console.log(`Submission ${submissionId} approved after payment`);
}

// Handle checkout session expired
async function handleCheckoutExpired(event: Stripe.Event) {
	const session = event.data.object as Stripe.Checkout.Session;
	await handleExpiredCheckout(session);
}

// Handle payment succeeded
async function handlePaymentSucceeded(event: Stripe.Event) {
	const paymentIntent = event.data.object as Stripe.PaymentIntent;
	const paymentType = paymentIntent.metadata?.paymentType;

	switch (paymentType) {
		case "order_escrow":
			await handleOrderEscrowSuccess(paymentIntent);
			break;
		case "video":
			await handleVideoEscrowSuccess(paymentIntent);
			break;
		case "submission_approval":
			await handleSubmissionApprovalSuccess(paymentIntent);
			break;
		default:
			console.log(`Unhandled payment type: ${paymentType}`);
	}
}

// Handle payment failed or canceled
async function handlePaymentFailed(event: Stripe.Event) {
	const paymentIntent = event.data.object as Stripe.PaymentIntent;
	await handleFailedPayment(paymentIntent);
	console.log(`Payment failed for intent: ${paymentIntent.id}`);
}

// Handle order escrow payment success
async function handleOrderEscrowSuccess(paymentIntent: Stripe.PaymentIntent) {
	const { orderId, creatorId } = paymentIntent.metadata;

	// Use transaction for consistency
	await adminDb.runTransaction(async (transaction) => {
		// Update payment status
		const paymentQuery = await adminDb
			.collection("payments")
			.where("paymentId", "==", paymentIntent.id)
			.limit(1)
			.get();

		if (!paymentQuery.empty) {
			const paymentDoc = paymentQuery.docs[0];
			transaction.update(paymentDoc.ref, {
				status: "held_in_escrow",
				paidAt: new Date().toISOString(),
			});
		}

		// Update order status
		const orderRef = adminDb.collection("orders").doc(orderId);
		transaction.update(orderRef, {
			status: "active",
			paymentStatus: "paid_escrow",
			paidAt: new Date().toISOString(),
		});
	});

	// Send notification (outside transaction)
	await sendNotification(creatorId, {
		type: "new_order",
		orderId: orderId,
		message:
			"You have a new order! Payment is held in escrow and will be released upon completion.",
	});

	console.log(`Order ${orderId} payment held in escrow successfully`);
}

// NEW: Handle video escrow payment success (from payment_intent.succeeded)
async function handleVideoEscrowSuccess(paymentIntent: Stripe.PaymentIntent) {
	const paymentId = paymentIntent.metadata.paymentId;
	const brandId =
		paymentIntent.metadata.brandId || paymentIntent.metadata.buyerId;
	// const creatorId = paymentIntent.metadata.creatorId;

	if (!paymentId) {
		console.log(
			"No paymentId in metadata, skipping video escrow success handling"
		);
		return;
	}

	await adminDb.collection("video_purchases").doc(paymentId).update({
		status: "paid_to_platform",
		platformPaymentStatus: "completed",
		platformPaymentDate: new Date().toISOString(),
		stripePaymentIntentId: paymentIntent.id,
	});

	await adminDb.collection("payments").doc(paymentId).update({
		status: "paid_to_platform",
		paidAt: new Date().toISOString(),
		stripePaymentIntentId: paymentIntent.id,
	});

	// Notify brand that payment is received and awaiting their approval
	if (brandId) {
		await sendNotification(brandId, {
			type: "video_payment_received",
			paymentId: paymentId,
			message:
				"Payment received! Please review and approve the video purchase to release payment to creator.",
		});
	}

	console.log(
		`Video payment ${paymentId} held in escrow - awaiting brand approval`
	);
}

// Handle submission approval success
async function handleSubmissionApprovalSuccess(
	paymentIntent: Stripe.PaymentIntent
) {
	const submissionId = paymentIntent.metadata.submissionId;
	const projectId = paymentIntent.metadata.projectId;
	const creatorId = paymentIntent.metadata.creatorId;

	if (submissionId && projectId) {
		await adminDb
			.collection("project_submissions")
			.doc(submissionId)
			.update({
				status: "approved",
				approvedAt: new Date().toISOString(),
				paymentId: paymentIntent.metadata.paymentId,
				paymentAmount: paymentIntent.amount / 100,
				paidAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

		// Notify creator
		await sendNotification(creatorId, {
			type: "submission_approved",
			projectId: projectId,
			submissionId: submissionId,
			message: "Your submission has been approved and payment processed!",
		});

		console.log(`Submission ${submissionId} approved after payment`);
	}
}
