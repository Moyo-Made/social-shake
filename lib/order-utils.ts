import { adminDb } from "@/config/firebase-admin";

// Helper function to fetch order by internal ID (enhanced)
export async function getOrderByInternalId(internalId: string) {
	try {
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		const ordersQuery = await adminDb
			.collection("orders")
			.where("id", "==", internalId)
			.limit(1)
			.get();

		if (ordersQuery.empty) {
			return { success: false, error: "Order not found" };
		}

		const orderDoc = ordersQuery.docs[0];
		const orderData = orderDoc.data();

		return {
			success: true,
			order: {
				documentId: orderDoc.id,
				id: orderData?.id || orderDoc.id,
				...orderData,
			},
		};
	} catch (error) {
		console.error("Error fetching order by internal ID:", error);
		return {
			success: false,
			error: "Failed to fetch order",
			details: error instanceof Error ? error.message : String(error),
		};
	}
}
