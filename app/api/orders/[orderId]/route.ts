/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// Helper function to get creator orders
async function getCreatorOrders(creatorId: string) {
	try {
		const ordersQuery = await adminDb
			.collection("orders")
			.where("creator_id", "==", creatorId)
			.orderBy("created_at", "desc")
			.get();

		const orders = ordersQuery.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		return NextResponse.json({
			success: true,
			orders: orders,
		});
	} catch (error) {
		console.error("Error fetching creator orders:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch creator orders",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// GET endpoint - Fetch Order by ID with enhanced query support
export async function GET(
	request: NextRequest,
	{ params }: any
) {
	try {
		// Await params if it's a Promise (Next.js 15+)
		const resolvedParams = await Promise.resolve(params);
		const { orderId } = resolvedParams;

		// Get query parameters from URL
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const creatorId = searchParams.get("creatorId");

		// Handle creator orders query
		if (creatorId && !orderId) {
			return await getCreatorOrders(creatorId);
		}

		// Enhanced validation for orderId
		if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
			return NextResponse.json(
				{ error: "Order ID is required" },
				{ status: 400 }
			);
		}

		console.log("Fetching order with ID:", orderId);

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		let orderDoc: any = null;
		let orderData: any = null;
		let isInternalIdQuery = false;

		// Try internal ID first (since your JSON data uses internal IDs)
		if (orderId.startsWith("order_")) {
			console.log("Querying by internal ID:", orderId);
			const ordersQuery = await adminDb
				.collection("orders")
				.where("id", "==", orderId)
				.limit(1)
				.get();

			if (!ordersQuery.empty) {
				orderDoc = ordersQuery.docs[0];
				orderData = orderDoc.data();
				isInternalIdQuery = true;
				console.log("Order found by internal ID");
			}
		} else {
			// Try document ID if it doesn't look like an internal ID
			console.log("Querying by document ID:", orderId);
			orderDoc = await adminDb.collection("orders").doc(orderId).get();
			if (orderDoc.exists) {
				orderData = orderDoc.data();
			}
		}

		// If still not found, try the other method
		if (!orderDoc || !orderDoc.exists) {
			if (isInternalIdQuery) {
				console.log("Internal ID failed, trying document ID...");
				orderDoc = await adminDb.collection("orders").doc(orderId).get();
				if (orderDoc.exists) {
					orderData = orderDoc.data();
					isInternalIdQuery = false;
				}
			} else {
				console.log("Document ID failed, trying internal ID...");
				const ordersQuery = await adminDb
					.collection("orders")
					.where("id", "==", orderId)
					.limit(1)
					.get();

				if (!ordersQuery.empty) {
					orderDoc = ordersQuery.docs[0];
					orderData = orderDoc.data();
					isInternalIdQuery = true;
				}
			}
		}

		if (!orderDoc || !orderDoc.exists || !orderData) {
			return NextResponse.json({ error: "Order not found" }, { status: 404 });
		}

		// Normalize field names (handle both camelCase and snake_case)
		const normalizedOrderData = {
			id: orderData.id || orderDoc.id,
			user_id: orderData.user_id || orderData.userId,
			creator_id: orderData.creator_id || orderData.creatorId,
			brand_name: orderData.brand_name || orderData.brandName,
			brand_email: orderData.brand_email || orderData.brandEmail,
			package_type: orderData.package_type || orderData.packageType,
			video_count: orderData.video_count || orderData.videoCount,
			total_price: orderData.total_price || orderData.totalPrice,
			script_choice: orderData.script_choice || orderData.scriptChoice,
			status: orderData.status,
			created_at: orderData.created_at || orderData.createdAt,
			updated_at: orderData.updated_at || orderData.updatedAt,
			deadline: orderData.deadline,
			payment_type: orderData.payment_type || orderData.paymentType,
			escrow_status: orderData.escrow_status || orderData.escrowStatus,
			payment_intent_id:
				orderData.payment_intent_id || orderData.paymentIntentId,
			creator_connect_account_id:
				orderData.creator_connect_account_id ||
				orderData.creatorConnectAccountId,
			metadata: orderData.metadata,
			scriptFormData: orderData.scriptFormData,
			projectBriefData: orderData.projectBriefData,
			// Add revision-related fields
			revision_details: orderData.revision_details || null,
			revision_count: orderData.revision_count || 0,
		};

		// Verify user has access to this order
		if (
			userId &&
			normalizedOrderData.user_id !== userId &&
			normalizedOrderData.creator_id !== userId
		) {
			return NextResponse.json(
				{ error: "Unauthorized access to order" },
				{ status: 403 }
			);
		}

		// Get subcollections with proper error handling - ADD DELIVERABLES FETCH
		const [
			requirementsSnap,
			projectBriefSnap,
			scriptsSnap,
			milestonesSnap,
			deliverablesSnap,
		] = await Promise.all([
			orderDoc.ref
				.collection("order_requirements")
				.get()
				.catch((err: any) => {
					console.warn(
						`Error fetching requirements for order ${orderId}:`,
						err
					);
					return { docs: [] };
				}),
			orderDoc.ref
				.collection("order_project_brief")
				.get()
				.catch((err: any) => {
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
				.catch((err: any) => {
					console.warn(`Error fetching scripts for order ${orderId}:`, err);
					return { docs: [] };
				}),
			adminDb
				.collection("project_milestones")
				.where("order_id", "==", normalizedOrderData.id)
				.orderBy("created_at", "desc")
				.get()
				.catch((err: any) => {
					console.warn(`Error fetching milestones for order ${orderId}:`, err);
					return { docs: [] };
				}),
			// NEW: Fetch deliverables for revision status
			adminDb
				.collection("deliverables")
				.where("order_id", "==", normalizedOrderData.id)
				.orderBy("created_at", "desc")
				.get()
				.catch((err: any) => {
					console.warn(
						`Error fetching deliverables for order ${orderId}:`,
						err
					);
					return { docs: [] };
				}),
		]);

		// Process subcollections data
		const requirementsData =
			requirementsSnap.docs.length > 0 ? requirementsSnap.docs[0].data() : null;

		const projectBriefData =
			projectBriefSnap.docs.length > 0
				? projectBriefSnap.docs[0].data()?.brief
				: null;

		const scripts = scriptsSnap.docs.map((doc: any) => ({
			id: doc.id,
			...(doc.data() as any),
		}));

		const milestones = milestonesSnap.docs.map((doc: any) => ({
			id: doc.id,
			...doc.data(),
		}));

		// NEW: Process deliverables data
		const deliverables = deliverablesSnap.docs.map((doc: any) => ({
			id: doc.id,
			...doc.data(),
		}));

		// Check if any deliverables need revision
		const hasRevisionRequests = deliverables.some(
			(deliverable: any) => deliverable.approval_status === "revision_requested"
		);

		// Fetch brand info
		let brandData = null;
		if (normalizedOrderData.user_id) {
			try {
				// First, try to get brand info from brandProfiles collection
        const brandProfileQuery = await adminDb
        .collection("brandProfiles")
        .where("userId", "==", normalizedOrderData.user_id)
        .limit(1)
        .get();

				if (!brandProfileQuery.empty) {
          const brandInfo = brandProfileQuery.docs[0].data();
          brandData = {
            brandName: brandInfo?.brandName || 'Unknown Brand',
            brandEmail: brandInfo?.email,
          };
				} else {
					// Fallback to Firebase Auth user record
					const userRecord = await adminAuth.getUser(
						normalizedOrderData.user_id
					);

					// Try custom claims first (if you set brand names there)
					const customClaims = userRecord.customClaims;

					brandData = {
						brandName:
							customClaims?.brandName ||
							userRecord.displayName ||
							"Unknown Brand", // Remove email splitting fallback
						brandEmail: userRecord.email,
					};
				}
			} catch (error) {
				console.error("Error fetching brand data:", error);
				// Use order data as final fallback
				brandData = {
					brandName: normalizedOrderData.brand_name || "Unknown Brand",
					brandEmail: normalizedOrderData.brand_email || "",
				};
			}
		} else {
			// Use order data when no user_id is available
			brandData = {
				brandName: normalizedOrderData.brand_name || "Unknown Brand",
				brandEmail: normalizedOrderData.brand_email || "",
			};
		}

		// Fetch creator information
		let creatorInfo = null;
		if (normalizedOrderData.creator_id) {
			try {
				const creatorDoc = await adminDb
					.collection("creators")
					.doc(normalizedOrderData.creator_id)
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
		}

		// Handle scriptFormData - use existing data or build from subcollections
		let scriptFormData = normalizedOrderData.scriptFormData;
		if (!scriptFormData && (scripts.length > 0 || requirementsData)) {
			scriptFormData = {
				scripts: scripts.map((script: any) => ({
					title: script.title || "",
					script: script.content || script.script || "",
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

		// Handle projectBriefData - use existing data or from subcollections
		let finalProjectBriefData = normalizedOrderData.projectBriefData;
		if (!finalProjectBriefData && projectBriefData) {
			finalProjectBriefData = projectBriefData;
		}

		// **CRITICAL FIX: Transform to camelCase for frontend compatibility**
		const frontendCompatibleOrder = {
			// Main order data (camelCase for frontend)
			id: normalizedOrderData.id,
			documentId: orderDoc.id,
			userId: normalizedOrderData.user_id,
			creatorId: normalizedOrderData.creator_id,
			status: normalizedOrderData.status,
			packageType: normalizedOrderData.package_type,
			videoCount: normalizedOrderData.video_count,
			totalPrice: normalizedOrderData.total_price,
			scriptChoice: normalizedOrderData.script_choice,
			paymentIntentId: normalizedOrderData.payment_intent_id,
			paymentType: normalizedOrderData.payment_type,
			creatorConnectAccountId: normalizedOrderData.creator_connect_account_id,
			escrowStatus: normalizedOrderData.escrow_status,
			createdAt: normalizedOrderData.created_at,
			updatedAt: normalizedOrderData.updated_at,
			deadline: normalizedOrderData.deadline,
			metadata: normalizedOrderData.metadata,

			// NEW: Revision-related data
			revisionDetails: normalizedOrderData.revision_details,
			revisionCount: normalizedOrderData.revision_count,
			hasRevisionRequests: hasRevisionRequests,

			// Brand info (camelCase)
			brandName: brandData?.brandName,
			brandEmail: brandData?.brandEmail,

			// Additional data
			milestones: milestones,
			deliverables: deliverables, // NEW: Include deliverables in response
			creatorName: creatorInfo?.name || "",
			selectedCreator: creatorInfo || {
				id: normalizedOrderData.creator_id,
				name: "",
				email: "",
			},
			selectedPackage: {
				type: normalizedOrderData.package_type,
				videoCount: normalizedOrderData.video_count,
			},

			// Form data
			scriptFormData: scriptFormData,
			projectBriefData: finalProjectBriefData,

			// Keep snake_case versions for backward compatibility if needed
			user_id: normalizedOrderData.user_id,
			creator_id: normalizedOrderData.creator_id,
			package_type: normalizedOrderData.package_type,
			video_count: normalizedOrderData.video_count,
			total_price: normalizedOrderData.total_price,
			script_choice: normalizedOrderData.script_choice,
			brand_name: normalizedOrderData.brand_name,
			brand_email: normalizedOrderData.brand_email,
			created_at: normalizedOrderData.created_at,
			updated_at: normalizedOrderData.updated_at,
		};

		return NextResponse.json({
			success: true,
			order: frontendCompatibleOrder,
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch order",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

