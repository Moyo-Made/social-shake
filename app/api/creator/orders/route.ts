// app/api/creator/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const creatorId = searchParams.get('creatorId');
		const status = searchParams.get('status'); // Optional filter

		if (!creatorId) {
			return NextResponse.json(
				{ error: "Creator ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Build query
		let query = adminDb.collection("orders").where("creator_id", "==", creatorId);
		
		if (status) {
			query = query.where("status", "==", status);
		}

		// Get orders ordered by creation date (newest first)
		const ordersSnapshot = await query.orderBy("created_at", "desc").get();

		if (ordersSnapshot.empty) {
			return NextResponse.json({
				success: true,
				orders: [],
				message: "No orders found for this creator"
			});
		}

		// Transform orders to match your OrderData interface
		const orders = await Promise.all(
			ordersSnapshot.docs.map(async (orderDoc) => {
				const orderData = orderDoc.data();
				const orderId = orderDoc.id;

				// Get subcollections for each order
				const [requirementsSnap, projectBriefSnap, scriptsSnap, brandDoc] = await Promise.all([
					orderDoc.ref.collection("order_requirements").doc("main").get(),
					orderDoc.ref.collection("order_project_brief").doc("main").get(),
					orderDoc.ref.collection("order_scripts").get(),
					adminDb.collection("users").doc(orderData.user_id).get()
				]);

				// Get brand information
				const brandData = brandDoc.exists ? brandDoc.data() : {};

				// Transform requirements
				const requirementsData = requirementsSnap.exists ? requirementsSnap.data() : {};

				// Transform project brief
				const projectBriefData = projectBriefSnap.exists ? projectBriefSnap.data()?.brief : {};

				// Transform scripts
				const scriptsData = scriptsSnap.docs.map(doc => {
					const script = doc.data();
					return {
						id: doc.id,
						title: script.title || `Script ${script.script_number}`,
						content: script.content || "",
						duration: script.duration || "",
						notes: script.notes || ""
					};
				});

				// Map your database fields to the OrderData interface
				return {
					id: orderId,
					brandName: brandData?.name || brandData?.displayName || "Unknown Brand",
					brandEmail: brandData?.email || "",
					packageType: orderData.package_type,
					videoCount: orderData.video_count,
					totalPrice: orderData.total_price,
					scriptChoice: orderData.script_choice === "brand_provided" ? "brand-written" : "creator-written",
					status: mapOrderStatus(orderData.status),
					createdAt: orderData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
					deadline: calculateDeadline(orderData.created_at, orderData.package_type),
					
					// Script data
					scriptFormData: {
						scripts: scriptsData,
						generalRequirements: {
							tone: requirementsData?.requirements?.find((r: { type: string; value: string }) => r.type === 'tone')?.value || "",
							style: requirementsData?.requirements?.find((r: { type: string; value: string }) => r.type === 'style')?.value || "",
							callToAction: requirementsData?.requirements?.find((r: { type: string; value: string }) => r.type === 'cta')?.value || "",
							keyMessages: requirementsData?.requirements?.filter((r: { type: string; value: string }) => r.type === 'key_message')?.map((r: { type: string; value: string }) => r.value) || []
						},
						videoSpecs: {
							format: projectBriefData?.videoSpecs?.format || "MP4",
							duration: projectBriefData?.videoSpecs?.duration || "",
							orientation: projectBriefData?.videoSpecs?.orientation || "",
							quality: projectBriefData?.videoSpecs?.quality || "1080p"
						}
					},
					
					// Project brief data
					projectBriefData: {
						projectOverview: {
							campaignName: projectBriefData?.projectOverview?.campaignName || "",
							objective: projectBriefData?.projectOverview?.objective || "",
							targetAudience: projectBriefData?.projectOverview?.targetAudience || "",
							keyMessage: projectBriefData?.projectOverview?.keyMessage || ""
						},
						contentRequirements: {
							mustInclude: projectBriefData?.contentRequirements?.mustInclude || [],
							avoid: projectBriefData?.contentRequirements?.avoid || [],
							tone: projectBriefData?.contentRequirements?.tone || "",
							style: projectBriefData?.contentRequirements?.style || ""
						},
						brandGuidelines: {
							colors: projectBriefData?.brandGuidelines?.colors || [],
							fonts: projectBriefData?.brandGuidelines?.fonts || [],
							logo: projectBriefData?.brandGuidelines?.logo || "",
							brandVoice: projectBriefData?.brandGuidelines?.brandVoice || ""
						},
						videoSpecs: {
							format: projectBriefData?.videoSpecs?.format || "",
							duration: projectBriefData?.videoSpecs?.duration || "",
							resolution: projectBriefData?.videoSpecs?.resolution || "",
							deliveryFormat: projectBriefData?.videoSpecs?.deliveryFormat || ""
						},
						examples: {
							referenceVideos: projectBriefData?.examples?.referenceVideos || [],
							competitorExamples: projectBriefData?.examples?.competitorExamples || [],
							stylePreferences: projectBriefData?.examples?.stylePreferences || ""
						},
						timeline: {
							deliveryDate: projectBriefData?.timeline?.deliveryDate || "",
							milestones: projectBriefData?.timeline?.milestones || []
						}
					}
				};
			})
		);

		return NextResponse.json({
			success: true,
			orders,
			total: orders.length
		});

	} catch (error) {
		console.error("Error fetching creator orders:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch orders",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to map database status to component status
function mapOrderStatus(dbStatus: string): "pending" | "accepted" | "in-progress" | "delivered" | "completed" | "rejected" {
	switch (dbStatus) {
		case "draft":
		case "payment_pending":
			return "pending";
		case "payment_confirmed":
			return "accepted";
		case "in_progress":
			return "in-progress";
		case "delivered":
			return "delivered";
		case "approved":
		case "completed":
			return "completed";
		case "rejected":
		case "cancelled":
			return "rejected";
		default:
			return "pending";
	}
}

// Helper function to calculate deadline based on package type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateDeadline(createdAt: any, packageType: string): string {
	const creationDate = createdAt?.toDate?.() || new Date();
	const deadline = new Date(creationDate);
	
	// Add days based on package type
	switch (packageType) {
		case "one":
			deadline.setDate(deadline.getDate() + 7); // 1 week
			break;
		case "three":
			deadline.setDate(deadline.getDate() + 14); // 2 weeks
			break;
		case "five":
			deadline.setDate(deadline.getDate() + 21); // 3 weeks
			break;
		case "bulk":
			deadline.setDate(deadline.getDate() + 30); // 1 month
			break;
		default:
			deadline.setDate(deadline.getDate() + 14); // Default 2 weeks
	}
	
	return deadline.toISOString();
}