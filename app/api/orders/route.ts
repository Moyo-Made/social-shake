/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Helper function to remove undefined values
const removeUndefined = (
	obj: { [s: string]: unknown } | ArrayLike<unknown>
) => {
	return Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined)
	);
};

// Helper function to check subscription access
const checkSubscriptionAccess = async (userId: string) => {
	try {
	  const subscriptionDoc = await adminDb!.collection("subscriptions")
		.where("userId", "==", userId)
		.limit(1)
		.get();
  
	  if (subscriptionDoc.empty) {
		return { hasAccess: false, message: "No active subscription found" };
	  }
  
	  const subscriptionData = subscriptionDoc.docs[0].data();
	  const status = subscriptionData.status;
	  
	  // Allow access for active subscriptions or valid trials
	  const hasValidTrial = status === 'trialing' && 
		subscriptionData.trialEnd && 
		new Date(subscriptionData.trialEnd) > new Date();
  
	  if (status === 'active' || hasValidTrial) {
		return { hasAccess: true };
	  }
  
	  // Custom messages for different states
	  const statusMessages = {
		'past_due': 'Please update your payment method to create new orders',
		'canceled': 'Your subscription has been canceled. Please reactivate to create orders',
		'trialing': 'Your free trial has ended. Please upgrade to continue',
		'incomplete': 'Please complete your subscription setup',
		'unpaid': 'Payment failed. Please update your payment method'
	  };
  
	  return { 
		hasAccess: false, 
		message: statusMessages[status as keyof typeof statusMessages] || 'Subscription required to create orders'
	  };
	} catch (error) {
	  console.error('Error checking subscription:', error);
	  return { hasAccess: false, message: "Unable to verify subscription status" };
	}
  };

// POST endpoint - Create Draft Order (minimal required fields only)
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			userId,
			creatorId,
			packageType,
			videoCount,
			totalPrice,
			paymentType = "direct",
			applicationFeeAmount,
			metadata,
		} = body;

		// Stringent validation for required fields only
		if (!userId || typeof userId !== "string" || userId.trim() === "") {
			return NextResponse.json(
				{
					error: "Missing or invalid userId",
					details: "User ID must be a non-empty string",
				},
				{ status: 400 }
			);
		}

		if (!creatorId || !packageType || !videoCount || !totalPrice) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: creatorId, packageType, videoCount, or totalPrice",
				},
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
					details: error instanceof Error ? error.message : String(error),
				},
				{ status: 401 }
			);
		}

		// Verify creator exists
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		const creatorDoc = await adminDb
			.collection("creatorProfiles")
			.doc(creatorId)
			.get();

		if (!creatorDoc.exists) {
			return NextResponse.json({ error: "Creator not found" }, { status: 404 });
		}

		const subscriptionCheck = await checkSubscriptionAccess(userId);
if (!subscriptionCheck.hasAccess) {
  return NextResponse.json(
    {
      error: "Subscription required",
      message: subscriptionCheck.message,
      errorCode: "SUBSCRIPTION_REQUIRED"
    },
    { status: 402 } // 402 Payment Required
  );
}

		const creatorData = creatorDoc.data();
		const stripeAccountId = creatorData?.stripeAccountId;

		// Handle Stripe account requirements based on payment type
		if (paymentType === "direct" && !stripeAccountId) {
			return NextResponse.json(
				{
					error:
						"Creator hasn't connected their Stripe account yet. Please ask them to connect their account before creating a direct payment order.",
					errorCode: "CREATOR_ACCOUNT_NOT_CONNECTED",
					creatorId: creatorId,
					paymentType: "direct",
				},
				{ status: 400 }
			);
		}

		let creatorAccountWarning = null;
		if (paymentType === "escrow" && !stripeAccountId) {
			creatorAccountWarning =
				"Creator hasn't connected their Stripe account yet. They'll need to connect it before funds can be released from escrow.";
		}

		// Generate order ID
		const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		// Create minimal draft order
		const orderData = removeUndefined({
			id: orderId,
			user_id: userId.trim(),
			creator_id: creatorId,
			status: "draft",
			package_type: packageType,
			video_count: parseInt(videoCount.toString()),
			total_price: parseFloat(totalPrice.toString()),
			script_choice: "brand_provided", // Default value
			payment_intent_id: null,
			payment_type: paymentType,
			creator_connect_account_id: stripeAccountId || null,
			transfer_id: null,
			application_fee_amount: applicationFeeAmount
				? parseFloat(applicationFeeAmount.toString())
				: null,
			escrow_status: paymentType === "escrow" ? "pending" : null,
			created_at: FieldValue.serverTimestamp(),
			updated_at: FieldValue.serverTimestamp(),
			metadata: metadata || {},
		});

		// Create the order document
		const orderRef = adminDb.collection("orders").doc(orderId);
		await orderRef.set(orderData);

		// Create initial milestone
		const milestoneData = {
			order_id: orderId,
			milestone_type: "order_created",
			status: "completed",
			description: `Draft order created with ${paymentType} payment type`,
			completed_at: FieldValue.serverTimestamp(),
			created_at: FieldValue.serverTimestamp(),
		};
		await adminDb.collection("project_milestones").add(milestoneData);

		return NextResponse.json({
			success: true,
			message: "Draft order created successfully",
			orderId,
			paymentType,
			orderData: {
				id: orderId,
				status: "draft",
				packageType,
				videoCount: parseInt(videoCount.toString()),
				totalPrice: parseFloat(totalPrice.toString()),
				paymentType,
				creatorConnectAccountId: stripeAccountId,
				escrowStatus: paymentType === "escrow" ? "pending" : null,
			},
			...(creatorAccountWarning && { warning: creatorAccountWarning }),
		});
	} catch (error) {
		console.error("Error creating draft order:", error);
		return NextResponse.json(
			{
				error: "Failed to create draft order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// PATCH endpoint - Update Order Sections
export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			orderId,
			userId,
			section, // 'scripts', 'requirements', 'project_brief', 'basic_info'
			data,
			action
		} = body;

		// Validate required fields
		if (!orderId || !section || !data) {
			return NextResponse.json(
				{ error: "Missing required fields: orderId, section, or data" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Handle brand acceptance
		if (action === 'accept_project') {
			return await handleBrandAcceptProject(orderId, userId);
		  }

		// Get and verify order exists
		const orderRef = adminDb.collection("orders").doc(orderId);
		const orderDoc = await orderRef.get();

		if (!orderDoc.exists) {
			return NextResponse.json({ error: "Order not found" }, { status: 404 });
		}

		const orderData = orderDoc.data();

		// Verify user has permission to update this order
		if (userId && orderData?.user_id !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized access to order" },
				{ status: 403 }
			);
		}

		// Handle different section updates
		switch (section) {
			case "scripts":
				await updateOrderScripts(orderRef, orderId, data);
				break;

			case "requirements":
				await updateOrderRequirements(orderRef, orderId, data);
				break;

			case "project_brief":
				await updateProjectBrief(orderRef, orderId, data);
				break;

			case "basic_info":
				await updateBasicOrderInfo(orderRef, data);
				break;

			default:
				return NextResponse.json(
					{ error: `Invalid section: ${section}` },
					{ status: 400 }
				);
		}

		// Update the main order's updated_at timestamp
		await orderRef.update({
			updated_at: FieldValue.serverTimestamp(),
		});

		// Create milestone for section update
		const milestoneData = {
			order_id: orderId,
			milestone_type: "order_updated",
			status: "completed",
			description: `Order ${section} updated`,
			completed_at: FieldValue.serverTimestamp(),
			created_at: FieldValue.serverTimestamp(),
		};
		await adminDb.collection("project_milestones").add(milestoneData);

		return NextResponse.json({
			success: true,
			message: `Order ${section} updated successfully`,
			orderId,
			section,
		});
	} catch (error) {
		console.error("Error updating order section:", error);
		return NextResponse.json(
			{
				error: "Failed to update order section",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to update order scripts
async function updateOrderScripts(
	orderRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
	orderId: string,
	scriptData: {
		scripts: {
			title?: string;
			script?: string;
			content?: string;
			notes?: string;
		}[];
	}
) {
	if (!scriptData.scripts || !Array.isArray(scriptData.scripts)) {
		throw new Error("Invalid script data format");
	}

	const batch = adminDb!.batch();

	// Clear existing scripts first
	const existingScripts = await orderRef.collection("order_scripts").get();

	existingScripts.docs.forEach(
		(
			doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
		) => {
			batch.delete(doc.ref);
		}
	);

	// Add new scripts
	scriptData.scripts.forEach(
		(
			script: {
				title?: string;
				script?: string;
				content?: string;
				notes?: string;
			},
			index: number
		) => {
			const scriptRef = orderRef
				.collection("order_scripts")
				.doc(`script_${index + 1}`);

			const scriptDocData = {
				order_id: orderId,
				script_number: index + 1,
				title: script.title || `Script ${index + 1}`,
				content: script.script || script.content || "",
				notes: script.notes || "",
				status: "pending",
				created_at: FieldValue.serverTimestamp(),
			};

			batch.set(scriptRef, scriptDocData);
		}
	);

	await batch.commit();
}

// Helper function to update order requirements
async function updateOrderRequirements(
	orderRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
	orderId: string,
	requirementsData: {
		generalRequirements?: {
			targetAudience?: string;
			brandVoice?: string;
			callToAction?: string;
			keyMessages?: string;
			stylePreferences?: string;
			additionalNotes?: string;
		};
		videoSpecs?: {
			duration?: string;
			format?: string;
			deliveryFormat?: string;
		};
	}
) {
	const requirementsDocData = {
		order_id: orderId,
		generalRequirements: {
			targetAudience:
				requirementsData.generalRequirements?.targetAudience || "",
			brandVoice: requirementsData.generalRequirements?.brandVoice || "",
			callToAction: requirementsData.generalRequirements?.callToAction || "",
			keyMessages: requirementsData.generalRequirements?.keyMessages || "",
			stylePreferences:
				requirementsData.generalRequirements?.stylePreferences || "",
			additionalNotes:
				requirementsData.generalRequirements?.additionalNotes || "",
		},
		videoSpecs: requirementsData.videoSpecs
			? {
					duration: requirementsData.videoSpecs.duration || "",
					format: requirementsData.videoSpecs.format || "",
					deliveryFormat: requirementsData.videoSpecs.deliveryFormat || "",
				}
			: {},
		updated_at: FieldValue.serverTimestamp(),
	};

	await orderRef
		.collection("order_requirements")
		.doc("main")
		.set(requirementsDocData, { merge: true });
}

// Helper function to update project brief
async function updateProjectBrief(
	orderRef: any,
	orderId: string,
	projectBriefData: any
) {
	const projectBriefDocData = {
		order_id: orderId,
		brief: {
			projectOverview: {
				projectGoal: projectBriefData.projectOverview?.projectGoal || "",
				targetAudience: projectBriefData.projectOverview?.targetAudience || "",
				keyMessages: projectBriefData.projectOverview?.keyMessages || "",
				brandBackground:
					projectBriefData.projectOverview?.brandBackground || "",
			},
			contentRequirements: {
				contentType: projectBriefData.contentRequirements?.contentType || "",
				toneAndStyle: projectBriefData.contentRequirements?.toneAndStyle || "",
				callToAction: projectBriefData.contentRequirements?.callToAction || "",
				mustInclude: projectBriefData.contentRequirements?.mustInclude || "",
				mustAvoid: projectBriefData.contentRequirements?.mustAvoid || "",
				competitorExamples:
					projectBriefData.contentRequirements?.competitorExamples || "",
			},
			brandGuidelines: {
				brandVoice: projectBriefData.brandGuidelines?.brandVoice || "",
				visualStyle: projectBriefData.brandGuidelines?.visualStyle || "",
				brandAssets: projectBriefData.brandGuidelines?.brandAssets || "",
				logoUsage: projectBriefData.brandGuidelines?.logoUsage || "",
				colorPreferences:
					projectBriefData.brandGuidelines?.colorPreferences || "",
			},
			videoSpecs: {
				duration: projectBriefData.videoSpecs?.duration || "",
				format: projectBriefData.videoSpecs?.format || "",
				deliveryFormat: projectBriefData.videoSpecs?.deliveryFormat || "",
				scriptApproval: projectBriefData.videoSpecs?.scriptApproval || "",
			},
			examples: {
				preferredVideos: projectBriefData.examples?.preferredVideos || "",
				styleReferences: projectBriefData.examples?.styleReferences || "",
				avoidExamples: projectBriefData.examples?.avoidExamples || "",
			},
			timeline: {
				scriptDeadline: projectBriefData.timeline?.scriptDeadline || "",
				revisionRounds: projectBriefData.timeline?.revisionRounds || "",
				finalDeadline: projectBriefData.timeline?.finalDeadline || "",
				urgency: projectBriefData.timeline?.urgency || "",
			},
		},
		updated_at: FieldValue.serverTimestamp(),
	};

	await orderRef
		.collection("order_project_brief")
		.doc("main")
		.set(projectBriefDocData, { merge: true });
}

// Helper function to update basic order info
async function updateBasicOrderInfo(orderRef: any, basicInfoData: any) {
	const updateData = removeUndefined({
		script_choice: basicInfoData.scriptChoice,
		package_type: basicInfoData.packageType,
		video_count: basicInfoData.videoCount
			? parseInt(basicInfoData.videoCount.toString())
			: undefined,
		total_price: basicInfoData.totalPrice
			? parseFloat(basicInfoData.totalPrice.toString())
			: undefined,
		updated_at: FieldValue.serverTimestamp(),
	});

	await orderRef.update(updateData);
}

async function handleBrandAcceptProject(orderId: string, userId: string) {
	try {
	  if (!adminDb) {
		throw new Error("Firebase admin database is not initialized");
	  }
  
	  // Get and verify order exists
	  const orderRef = adminDb.collection("orders").doc(orderId);
	  const orderDoc = await orderRef.get();
  
	  if (!orderDoc.exists) {
		return NextResponse.json({ error: "Order not found" }, { status: 404 });
	  }
  
	  const orderData = orderDoc.data();
  
	  // Verify user is the brand (order owner)
	  if (orderData?.user_id !== userId) {
		return NextResponse.json(
		  { error: "Only the brand can accept this project" },
		  { status: 403 }
		);
	  }
  
	  // Verify order is in the right state to be accepted
	  const acceptableStatuses = ['payment_confirmed', 'pending'];
	  if (!acceptableStatuses.includes(orderData?.status)) {
		return NextResponse.json(
		  { error: `Cannot accept project in status: ${orderData?.status}` },
		  { status: 400 }
		);
	  }
  
	  // Update order status to active/in-progress
	  await orderRef.update({
		status: "in_progress", // or "active" - choose your preferred status
		accepted_at: FieldValue.serverTimestamp(),
		updated_at: FieldValue.serverTimestamp(),
	  });
  
	  // Create milestone for project acceptance
	  const milestoneData = {
		order_id: orderId,
		milestone_type: "project_accepted",
		status: "completed",
		description: "Project accepted by brand and moved to active status",
		completed_at: FieldValue.serverTimestamp(),
		created_at: FieldValue.serverTimestamp(),
	  };
	  await adminDb.collection("project_milestones").add(milestoneData);
  
	  // Create notifications for both brand and creator
	  await Promise.all([
		// Notification for brand
		adminDb.collection("notifications").add({
		  userId: orderData?.user_id,
		  message: `You have successfully accepted project #${orderId}. The creator will now begin working on your videos.`,
		  status: "unread",
		  type: "project_accepted",
		  createdAt: FieldValue.serverTimestamp(),
		  relatedTo: "order",
		  orderId,
		}),
		// Notification for creator
		adminDb.collection("notifications").add({
		  userId: orderData?.creator_id,
		  message: `Great news! Your project #${orderId} has been accepted by the brand. You can now start working on the videos.`,
		  status: "unread",
		  type: "project_accepted_creator",
		  createdAt: FieldValue.serverTimestamp(),
		  relatedTo: "order",
		  orderId,
		})
	  ]);
  
	  return NextResponse.json({
		success: true,
		message: "Project accepted successfully",
		orderId,
		status: "in_progress",
		acceptedAt: new Date().toISOString(),
	  });
  
	} catch (error) {
	  console.error("Error accepting project:", error);
	  return NextResponse.json(
		{
		  error: "Failed to accept project",
		  details: error instanceof Error ? error.message : String(error),
		},
		{ status: 500 }
	  );
	}
  }

// PUT endpoint - Finalize Order (move from draft to ready for payment)
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { orderId, userId } = body;

		if (!orderId) {
			return NextResponse.json(
				{ error: "Missing required field: orderId" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Get and verify order exists
		const orderRef = adminDb.collection("orders").doc(orderId);
		const orderDoc = await orderRef.get();

		if (!orderDoc.exists) {
			return NextResponse.json({ error: "Order not found" }, { status: 404 });
		}

		const orderData = orderDoc.data();

		// Verify user has permission
		if (userId && orderData?.user_id !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized access to order" },
				{ status: 403 }
			);
		}

		// Update order status to ready for payment
		await orderRef.update({
			status: "payment_pending",
			updated_at: FieldValue.serverTimestamp(),
		});

		// Create milestone
		const milestoneData = {
			order_id: orderId,
			milestone_type: "order_finalized",
			status: "completed",
			description: "Order finalized and ready for payment",
			completed_at: FieldValue.serverTimestamp(),
			created_at: FieldValue.serverTimestamp(),
		};
		await adminDb.collection("project_milestones").add(milestoneData);

		const userMessage =
			orderData?.paymentType === "escrow"
				? `Your order #${orderId} has been sent and your payment is held securely in escrow until delivery is confirmed.`
				: `Your order #${orderId} has been sent and your payment is held securely in escrow until delivery is confirmed.`;

		const creatorMessage =
			orderData?.paymentType === "escrow"
				? `You have a new order! Payment is held in escrow and will be released upon completion of the order.`
				: `You have a new order! Payment is held in escrow and will be released upon completion of the order.`;

		await Promise.all([
			adminDb.collection("notifications").add({
				userId: orderData?.user_id,
				message: userMessage,
				status: "unread",
				type: "order_ready_for_payment",
				createdAt: FieldValue.serverTimestamp(),
				relatedTo: "order",
				orderId,
			}),
			adminDb.collection("notifications").add({
				userId: orderData?.creator_id,
				message: creatorMessage,
				status: "unread",
				type: "order_finalized",
				createdAt: FieldValue.serverTimestamp(),
				relatedTo: "order",
				orderId,
			}),
		]);

		return NextResponse.json({
			success: true,
			message: "Order finalized successfully",
			orderId,
			status: "payment_pending",
		});
	} catch (error) {
		console.error("Error finalizing order:", error);
		return NextResponse.json(
			{
				error: "Failed to finalize order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Keep your existing GET function unchanged
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const orderId = searchParams.get("orderId");
		const userId = searchParams.get("userId");
		const creatorId = searchParams.get("creatorId");

		// Handle different query types
		if (creatorId && !orderId) {
			// Fetch all orders for a specific creator
			return await getCreatorOrders(creatorId);
		}

		if (!orderId) {
			return NextResponse.json(
				{ error: "Order ID or Creator ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Get order document
		const orderDoc = await adminDb.collection("orders").doc(orderId).get();

		if (!orderDoc.exists) {
			return NextResponse.json({ error: "Order not found" }, { status: 404 });
		}

		const orderData = orderDoc.data();

		// Verify user has access to this order (either the buyer or the creator)
		if (
			userId &&
			orderData?.user_id !== userId &&
			orderData?.creator_id !== userId
		) {
			return NextResponse.json(
				{ error: "Unauthorized access to order" },
				{ status: 403 }
			);
		}

		// Get subcollections with proper error handling
		const [requirementsSnap, projectBriefSnap, scriptsSnap, milestonesSnap] =
			await Promise.all([
				orderDoc.ref
					.collection("order_requirements")
					.get()
					.catch((err) => {
						console.warn(
							`Error fetching requirements for order ${orderId}:`,
							err
						);
						return { docs: [] };
					}),
				orderDoc.ref
					.collection("order_project_brief")
					.get()
					.catch((err) => {
						console.warn(
							`Error fetching project brief for order ${orderId}:`,
							err
						);
						return { docs: [] };
					}),
				orderDoc.ref
					.collection("order_scripts")
					.orderBy("script_number", "asc")
					.get()
					.catch((err) => {
						console.warn(`Error fetching scripts for order ${orderId}:`, err);
						return { docs: [] };
					}),
				adminDb
					.collection("project_milestones")
					.where("order_id", "==", orderId)
					.orderBy("created_at", "desc")
					.get()
					.catch((err) => {
						console.warn(
							`Error fetching milestones for order ${orderId}:`,
							err
						);
						return { docs: [] };
					}),
			]);

		// Process requirements data
		const requirementsData =
			requirementsSnap.docs.length > 0 ? requirementsSnap.docs[0].data() : null;

		// Process project brief data
		const projectBriefData =
			projectBriefSnap.docs.length > 0
				? projectBriefSnap.docs[0].data()?.brief
				: null;

		// Process scripts data
		const scripts = scriptsSnap.docs.map((doc) => ({
			id: doc.id,
			...(doc.data() as any),
		}));

		// Process milestones data
		const milestones = milestonesSnap.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		// Fetch creator information
		let creatorInfo = null;
		try {
			const creatorDoc = await adminDb
				.collection("creatorProfiles")
				.doc(orderData?.creator_id)
				.get();
			if (creatorDoc.exists) {
				const creatorData = creatorDoc.data();
				creatorInfo = {
					id: creatorDoc.id,
					name: creatorData?.name || "",
					email: creatorData?.email || "",
				};
			}
		} catch (error) {
			console.warn("Error fetching creator info:", error);
		}

		// Build response data matching expected interface structure
		const responseData: any = {
			// Main order data
			id: orderData?.id,
			user_id: orderData?.user_id,
			creator_id: orderData?.creator_id,
			status: orderData?.status,
			package_type: orderData?.package_type,
			video_count: orderData?.video_count,
			total_price: orderData?.total_price,
			script_choice: orderData?.script_choice,
			payment_intent_id: orderData?.payment_intent_id,
			payment_type: orderData?.payment_type,
			creator_connect_account_id: orderData?.creator_connect_account_id,
			escrow_status: orderData?.escrow_status,
			created_at: orderData?.created_at,
			updated_at: orderData?.updated_at,
			metadata: orderData?.metadata,

			// Additional data
			milestones: milestones,
			creatorName: creatorInfo?.name || "",
			selectedCreator: creatorInfo || {
				id: orderData?.creator_id,
				name: "",
				email: "",
			},
			selectedPackage: {
				type: orderData?.package_type,
				videoCount: orderData?.video_count,
			},
		};

		// Only add scriptFormData if there's actual data
		if (scripts.length > 0 || requirementsData) {
			responseData.scriptFormData = {
				scripts: scripts.map((script) => ({
					title: script.title || "",
					script: script.content || "", // Map 'content' to 'script' field
					notes: script.notes || "",
				})),
				generalRequirements: {
					targetAudience:
						requirementsData?.generalRequirements?.targetAudience || "",
					brandVoice: requirementsData?.generalRequirements?.brandVoice || "",
					callToAction:
						requirementsData?.generalRequirements?.callToAction || "",
					keyMessages: requirementsData?.generalRequirements?.keyMessages || "",
					stylePreferences:
						requirementsData?.generalRequirements?.stylePreferences || "",
					additionalNotes:
						requirementsData?.generalRequirements?.additionalNotes || "",
				},
				videoSpecs: {
					duration: requirementsData?.videoSpecs?.duration || "",
					format: requirementsData?.videoSpecs?.format || "",
					deliveryFormat: requirementsData?.videoSpecs?.deliveryFormat || "",
				},
			};
		}

		// Only add projectBriefData if there's actual data
		if (projectBriefData) {
			responseData.projectBriefData = projectBriefData;
		}

		return NextResponse.json({
			success: true,
			order: responseData,
		});
	} catch (error) {
		console.error("Error retrieving order:", error);
		return NextResponse.json(
			{
				error: "Failed to retrieve order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Keep your existing getCreatorOrders function unchanged
async function getCreatorOrders(creatorId: string) {
	try {
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Get all orders for this creator
		const ordersQuery = await adminDb
			.collection("orders")
			.where("creator_id", "==", creatorId)
			.orderBy("created_at", "desc")
			.get();

		const orders = [];

		// Helper function to transform order data to frontend format

		const transformOrderForFrontend = (
			orderData: any,
			projectBrief: any,
			scripts: any[],
			requirements: any
		) => {
			// Handle Firestore timestamp
			const createdAtDate = orderData.created_at?._seconds
				? new Date(orderData.created_at._seconds * 1000).toISOString()
				: new Date().toISOString();

			// Map status from backend to frontend expected values
			const mapStatus = (backendStatus: string) => {
				const statusMap: Record<string, string> = {
					draft: "pending",
					payment_pending: "pending",
					payment_confirmed: "accepted",
					in_progress: "in-progress",
					delivered: "delivered",
					approved: "completed",
					completed: "completed",
					rejected: "rejected",
				};
				return statusMap[backendStatus] || "pending";
			};

			const response: any = {
				// Main order fields
				id: orderData.id,
				brandName: orderData.user_id, // You might want to fetch actual brand name later
				brandEmail: "", // Not available in current structure
				packageType: orderData.package_type,
				videoCount: orderData.video_count,
				totalPrice: orderData.total_price,
				scriptChoice: orderData.script_choice,
				status: mapStatus(orderData.status),
				createdAt: createdAtDate,
				deadline: projectBrief?.timeline?.finalDeadline || "",
				paymentType: orderData.payment_type || "direct",
				escrowStatus: orderData.escrow_status,
			};

			// Include scriptFormData if there are scripts, requirements, OR if there's a projectBrief
			if (scripts.length > 0 || requirements || projectBrief) {
				response.scriptFormData = {
					scripts: scripts.map((script, index) => ({
						title: script.title || `Script ${index + 1}`,
						script: script.content || "", // Map content to script field
						notes: script.notes || "",
					})),
					generalRequirements: {
						targetAudience:
							requirements?.generalRequirements?.targetAudience || "",
						brandVoice: requirements?.generalRequirements?.brandVoice || "",
						callToAction: requirements?.generalRequirements?.callToAction || "",
						keyMessages: requirements?.generalRequirements?.keyMessages || "",
						stylePreferences:
							requirements?.generalRequirements?.stylePreferences || "",
						additionalNotes:
							requirements?.generalRequirements?.additionalNotes || "",
					},
					videoSpecs: {
						duration:
							requirements?.videoSpecs?.duration ||
							projectBrief?.videoSpecs?.duration ||
							"",
						format:
							requirements?.videoSpecs?.format ||
							projectBrief?.videoSpecs?.format ||
							"",
						deliveryFormat:
							requirements?.videoSpecs?.deliveryFormat ||
							projectBrief?.videoSpecs?.deliveryFormat ||
							"",
					},
				};
			}

			// Only add projectBriefData if there's actual data
			if (projectBrief) {
				response.projectBriefData = projectBrief;
			}

			return response;
		};

		for (const orderDoc of ordersQuery.docs) {
			const orderData = orderDoc.data();

			// Get subcollections for each order
			const [requirementsSnap, projectBriefSnap, scriptsSnap] =
				await Promise.all([
					orderDoc.ref
						.collection("order_requirements")
						.get()
						.catch(() => ({ docs: [] })),
					orderDoc.ref
						.collection("order_project_brief")
						.get()
						.catch(() => ({ docs: [] })),
					orderDoc.ref
						.collection("order_scripts")
						.orderBy("script_number", "asc")
						.get()
						.catch(() => ({ docs: [] })),
				]);

			const requirements =
				requirementsSnap.docs.length > 0
					? requirementsSnap.docs[0].data()
					: null;
			const projectBrief =
				projectBriefSnap.docs.length > 0
					? projectBriefSnap.docs[0].data()?.brief
					: null;
			const scripts = scriptsSnap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// Transform and add to orders array
			orders.push(
				transformOrderForFrontend(
					orderData,
					projectBrief,
					scripts,
					requirements
				)
			);
		}

		return NextResponse.json({
			success: true,
			orders: orders,
		});
	} catch (error) {
		console.error("Error retrieving creator orders:", error);
		return NextResponse.json(
			{
				error: "Failed to retrieve creator orders",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
