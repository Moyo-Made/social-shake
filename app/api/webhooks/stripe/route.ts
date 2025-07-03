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
	error?: string,
	userAgent?: string // Add user agent tracking
) => {
	try {
		await adminDb.collection("webhook_events").add({
			eventId: event.id,
			type: event.type,
			status,
			error: error || null,
			userAgent: userAgent || null, // Track if request came from Safari
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
	const subscription = event.data.object as StripeSubscriptionWithPeriods;

	const userId = subscription.metadata?.userId;
	if (!userId) {
		console.error("No userId in subscription metadata");
		return;
	}

	try {
		// Get subscription amount from Stripe
		let subscriptionAmount = 0;
		let planName = "";

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
			currency: subscription.items.data[0]?.price.currency || "usd",
			interval:
				subscription.items.data[0]?.price.recurring?.interval || "month",
			intervalCount:
				subscription.items.data[0]?.price.recurring?.interval_count || 1,
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
	} catch (error) {
		console.error("Error handling subscription created:", error);
		throw error;
	}
}

// Handle customer.subscription.updated event
async function handleSubscriptionUpdated(event: Stripe.Event) {
	const subscription = event.data.object as StripeSubscriptionWithPeriods;

	const userId = subscription.metadata?.userId;
	if (!userId) {
		console.error("No userId in subscription metadata");
		return;
	}

	try {
		// Update subscription record in database
		const subscriptionQuery = await adminDb
			.collection("subscriptions")
			.where("stripeSubscriptionId", "==", subscription.id)
			.limit(1)
			.get();

		if (!subscriptionQuery.empty) {
			const subscriptionDoc = subscriptionQuery.docs[0];

			// Prepare update data
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const updateData: any = {
				status: subscription.status,
				currentPeriodStart: new Date(
					subscription.current_period_start * 1000
				).toISOString(),
				currentPeriodEnd: new Date(
					subscription.current_period_end * 1000
				).toISOString(),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				updatedAt: new Date().toISOString(),
			};

			// Handle trial fields
			if (subscription.trial_start && subscription.trial_end) {
				updateData.trialStart = new Date(
					subscription.trial_start * 1000
				).toISOString();
				updateData.trialEnd = new Date(
					subscription.trial_end * 1000
				).toISOString();
			} else {
				// Clear trial fields if no longer in trial
				updateData.trialStart = null;
				updateData.trialEnd = null;
			}

			await subscriptionDoc.ref.update(updateData);
		} else {
			console.error(`No subscription record found for ${subscription.id}`);
		}

		// Update user record
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const userUpdateData: any = {
			subscriptionStatus: subscription.status,
			subscriptionTrial: subscription.status === "trialing",
			updatedAt: new Date().toISOString(),
		};

		// Update trial end date in user record
		if (subscription.trial_end) {
			userUpdateData.trialEndDate = new Date(
				subscription.trial_end * 1000
			).toISOString();
		} else {
			userUpdateData.trialEndDate = null;
		}

		await adminDb.collection("users").doc(userId).update(userUpdateData);

		// Send notification for important status changes
		if (subscription.status === "active") {
			await sendNotification(userId, {
				type: "subscription_activated",
				message: "Your Social Shake Pro subscription is now active!",
			});
		} else if (subscription.status === "canceled") {
			await sendNotification(userId, {
				type: "subscription_canceled",
				message: "Your Social Shake Pro subscription has been canceled.",
			});
		} else if (subscription.status === "past_due") {
			await sendNotification(userId, {
				type: "subscription_past_due",
				message:
					"Your subscription payment is past due. Please update your payment method.",
			});
		}
	} catch (error) {
		console.error("Error handling subscription updated:", error);
		throw error;
	}
}

// Handle customer.subscription.trial_will_end (3 days before trial ends)
async function handleTrialWillEnd(event: Stripe.Event) {
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
	} catch (error) {
		console.error("Error handling trial will end:", error);
	}
}

// Handle invoice.payment_succeeded (when trial ends and first payment is charged)
async function handleSubscriptionPaymentSucceeded(event: Stripe.Event) {
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
				console.warn(
					`Amount mismatch for subscription ${subscription.id}. Expected: ${expectedAmount}, Actual: ${actualAmount}`
				);
			}

			// IMPORTANT: Always update status to match Stripe subscription status
			await subscriptionDoc.ref.update({
				status: subscription.status, // This should be "active" now
				lastPaymentDate: new Date().toISOString(),
				lastPaymentAmount: invoice.amount_paid / 100,
				lastPaymentAmountMatches: expectedAmount === actualAmount,
				nextPaymentDate: new Date(
					subscription.current_period_end * 1000
				).toISOString(),
				// Update period dates as well
				currentPeriodStart: new Date(
					subscription.current_period_start * 1000
				).toISOString(),
				currentPeriodEnd: new Date(
					subscription.current_period_end * 1000
				).toISOString(),
				// Clear trial fields since trial is over
				trialStart: null,
				trialEnd: null,
				updatedAt: new Date().toISOString(),
			});
		} else {
			console.error(
				`No subscription record found for Stripe subscription ${subscription.id}`
			);
		}

		// Update user record
		await adminDb.collection("users").doc(userId).update({
			subscriptionStatus: subscription.status, // Should be "active"
			subscriptionTrial: false, // Trial is over
			lastPaymentDate: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// Send payment confirmation
		await sendNotification(userId, {
			type: "subscription_payment_succeeded",
			message: `Payment of $${(invoice.amount_paid / 100).toFixed(2)} processed successfully. Your Social Shake Pro subscription is now active!`,
		});
	} catch (error) {
		console.error("Error handling subscription payment succeeded:", error);
		throw error;
	}
}

// Handle invoice.payment_failed (when payment fails)
async function handleSubscriptionPaymentFailed(event: Stripe.Event) {
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
	} catch (error) {
		console.error("Error handling subscription payment failed:", error);
	}
}

// Handle customer.subscription.deleted (when subscription is canceled)
async function handleSubscriptionDeleted(event: Stripe.Event) {
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
	} catch (error) {
		console.error("Error handling subscription deleted:", error);
	}
}

export async function POST(request: NextRequest) {
	const userAgent = request.headers.get("user-agent") || "";
	const isSafariRequest = userAgent.includes("Safari") && !userAgent.includes("Chrome");
	
	try {
		const body = await request.text();
		const sig = request.headers.get("stripe-signature");

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
			event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", {
				error: err instanceof Error ? err.message : err,
				userAgent,
				isSafariRequest
			});

			return NextResponse.json(
				{ error: "Webhook signature verification failed" },
				{ status: 400 }
			);
		}

		// Check for idempotency
		const alreadyProcessed = await isEventProcessed(event.id);
		if (alreadyProcessed) {
			return NextResponse.json({ received: true });
		}

		// ADD: Log Safari-specific events
		// if (isSafariRequest) {
		// 	console.log("Processing Safari webhook event:", {
		// 		type: event.type,
		// 		id: event.id,
		// 		userAgent
		// 	});
		// }

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

				case "customer.subscription.updated":
					await handleSubscriptionUpdated(event);
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
			}

			// Mark event as processed for idempotency
			await markEventAsProcessed(event.id, event.type);
			await logWebhookEvent(event, "processed", undefined, userAgent);

			return NextResponse.json({ received: true });
		} catch (processingError) {
			console.error(`Error processing ${event.type}:`, {
				error: processingError,
				userAgent,
				isSafariRequest
			});

			await logWebhookEvent(
				event,
				"failed",
				processingError instanceof Error ? processingError.message : "Unknown error",
				userAgent
			);

			return NextResponse.json(
				{ error: "Event processing failed" },
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in webhook handler:", {
			error,
			userAgent,
			isSafariRequest
		});
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 }
		);
	}
}

// Handle checkout session completed
async function handleCheckoutCompleted(event: Stripe.Event) {
	const session = event.data.object as Stripe.Checkout.Session;

	if (session.payment_status !== "paid") {
		console.log("Payment not completed, status:", session.payment_status);
		return;
	}

	// ADD: Enhanced metadata validation for Safari
	const contestId = session.metadata?.contestId;
	const paymentType = session.metadata?.paymentType;
	const orderId = session.metadata?.orderId;
	const videoId = session.metadata?.videoId;
	const submissionId = session.metadata?.submissionId;

	// ADD: Log metadata for debugging Safari issues
	// console.log("Processing checkout completion:", {
	// 	sessionId: session.id,
	// 	paymentType,
	// 	contestId,
	// 	orderId,
	// 	videoId,
	// 	submissionId,
	// 	customerEmail: session.customer_email,
	// 	paymentStatus: session.payment_status
	// });

	try {
		await new Promise(resolve => setTimeout(resolve, 100));

		// Handle different payment types with enhanced error handling
		if (contestId) {
			await handleContestPayment(session, contestId);
		} else if (paymentType === "order_escrow" && orderId) {
			await handleOrderEscrowPayment(session, orderId);
		} else if (paymentType === "video" && videoId) {
			await handleVideoEscrowPayment(session, videoId);
		} else if (paymentType === "submission_approval" && submissionId) {
			await handleSubmissionApprovalPayment(session, submissionId);
		} else {
			console.error("Unknown payment type or missing metadata:", {
				paymentType,
				metadata: session.metadata
			});
		}
	} catch (error) {
		console.error("Error processing checkout session:", error);
	
		console.error("Session details:", {
			id: session.id,
			payment_status: session.payment_status,
			metadata: session.metadata
		});
		throw error;
	}
}

// Separate handler for contest payments
async function handleContestPayment(
	session: Stripe.Checkout.Session,
	contestId: string
) {
	await adminDb.runTransaction(async (transaction) => {
		const tempContestRef = adminDb.collection("tempContests").doc(contestId);
		const tempContestDoc = await transaction.get(tempContestRef);

		if (!tempContestDoc.exists) {
			// Check if already processed
			const mainContestRef = adminDb.collection("contests").doc(contestId);
			const mainContestDoc = await transaction.get(mainContestRef);

			if (mainContestDoc.exists) {
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
}

// Separate handler for order escrow payments
async function handleOrderEscrowPayment(
	session: Stripe.Checkout.Session,
	orderId: string
) {
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
}

async function handleVideoEscrowPayment(
	session: Stripe.Checkout.Session,
	videoId: string
) {
	const buyerId = session.metadata?.buyerId;
	const brandId = session.metadata?.brandId || buyerId;
	const creatorId = session.metadata?.creatorId;
	const paymentId = session.metadata?.paymentId;

	// Enhanced validation for Safari
	if (!paymentId) {
		console.error("PaymentId missing from session metadata", {
			sessionId: session.id,
			metadata: session.metadata
		});
		throw new Error("PaymentId required for video escrow payments");
	}

	// Retry mechanism for Safari's slower processing
	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			await adminDb.runTransaction(async (transaction) => {
				// ADD: Small delay to prevent Safari race conditions
				await new Promise(resolve => setTimeout(resolve, 50));

				const purchaseRef = adminDb.collection("video_purchases").doc(paymentId);
				const purchaseDoc = await transaction.get(purchaseRef);

				if (!purchaseDoc.exists) {
					throw new Error(`Video purchase record not found: ${paymentId}`);
				}

				const updateData = {
					status: "paid_to_platform",
					platformPaymentStatus: "completed",
					platformPaymentDate: new Date().toISOString(),
					checkoutSessionId: session.id,
					paymentAmount: session.amount_total ? session.amount_total / 100 : null,
					updatedAt: new Date().toISOString(),
					// ADD: Safari-specific tracking
					processedFrom: "safari_compatible_webhook"
				};

				transaction.update(purchaseRef, updateData);

				// Update main payment record
				const paymentRef = adminDb.collection("payments").doc(paymentId);
				transaction.update(paymentRef, {
					status: "paid_to_platform",
					paidAt: new Date().toISOString(),
					checkoutSessionId: session.id,
					updatedAt: new Date().toISOString(),
				});

				// Update video stats
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

			// If we reach here, transaction succeeded
			break;
		} catch (error) {
			retryCount++;
			console.error(`Transaction attempt ${retryCount} failed:`, error);
			
			if (retryCount >= maxRetries) {
				throw error;
			}
			
			// Wait before retrying
			await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
		}
	}

	// Send notifications (outside transaction) with error handling
	try {
		if (brandId) {
			await sendNotification(brandId, {
				type: "video_payment_received",
				videoId: videoId,
				paymentId: paymentId,
				message: "Payment received! Please review and approve the video purchase to release payment to creator.",
			});
		}

		if (creatorId) {
			await sendNotification(creatorId, {
				type: "video_payment_pending",
				videoId: videoId,
				message: "A brand has paid for your video! Payment is being held and will be released once they approve the purchase.",
			});
		}
	} catch (notificationError) {
		console.error("Failed to send notifications:", notificationError);
		// Don't throw here - payment processing succeeded
	}
}

// Separate handler for submission approval payments
async function handleSubmissionApprovalPayment(
	session: Stripe.Checkout.Session,
	submissionId: string
) {
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
	}
}

// Handle payment failed or canceled
async function handlePaymentFailed(event: Stripe.Event) {
	const paymentIntent = event.data.object as Stripe.PaymentIntent;
	await handleFailedPayment(paymentIntent);
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
}

// NEW: Handle video escrow payment success (from payment_intent.succeeded)
async function handleVideoEscrowSuccess(paymentIntent: Stripe.PaymentIntent) {
	const paymentId = paymentIntent.metadata.paymentId;
	const brandId =
		paymentIntent.metadata.brandId || paymentIntent.metadata.buyerId;
	// const creatorId = paymentIntent.metadata.creatorId;

	if (!paymentId) {
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
	}
}
