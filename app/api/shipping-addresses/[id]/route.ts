import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { auth } from "firebase-admin";

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(
	data: Record<string, unknown> | null
): Record<string, unknown> | null {
	if (!data) return data;

	const result = { ...data };

	// Convert timestamp fields to ISO strings
	for (const [key, value] of Object.entries(result)) {
		if (value instanceof Timestamp) {
			result[key] = value.toDate().toISOString();
		} else if (value && typeof value === "object" && !Array.isArray(value)) {
			// Recursively convert nested objects
			result[key] = convertTimestampsToISO(value as Record<string, unknown>);
		}
	}

	return result;
}

// Helper function to get the current user ID from the request
async function getCurrentUserId(request: NextRequest): Promise<string> {
	try {
		// Get the authorization token from the request headers
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Missing or invalid authorization token");
		}

		const token = authHeader.split("Bearer ")[1];
		const decodedToken = await auth().verifyIdToken(token);
		return decodedToken.uid;
	} catch {
		throw new Error("Unauthorized access");
	}
}

// GET endpoint for fetching a specific shipping address
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const addressId = params.id;
		const userId = await getCurrentUserId(request);

		// Get the address document
		const addressDoc = await adminDb
			.collection("shipping_addresses")
			.doc(addressId)
			.get();

		if (!addressDoc.exists) {
			return NextResponse.json(
				{ error: "Shipping address not found" },
				{ status: 404 }
			);
		}

		// Check if the address belongs to the current user
		const addressData = addressDoc.data();
		if (addressData?.userId !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 403 }
			);
		}

		const responseData = {
			id: addressDoc.id,
			...convertTimestampsToISO(addressData || null),
		};

		return NextResponse.json(responseData);
	} catch (error) {
		console.error("Error fetching shipping address:", error);

		if (error instanceof Error && error.message === "Unauthorized access") {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{
				error: "Failed to fetch shipping address",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// PUT endpoint for updating a shipping address
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const addressId = params.id;
		const userId = await getCurrentUserId(request);

		// Get the address document
		const addressRef = adminDb.collection("shipping_addresses").doc(addressId);

		const addressDoc = await addressRef.get();

		if (!addressDoc.exists) {
			return NextResponse.json(
				{ error: "Shipping address not found" },
				{ status: 404 }
			);
		}

		// Check if the address belongs to the current user
		const addressData = addressDoc.data();
		if (addressData?.userId !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 403 }
			);
		}

		// Parse the request body
		const updateData = await request.json();

		// If the address is being set as default and wasn't default before
		if (updateData.isDefault === true && addressData?.isDefault !== true) {
			// Update all other addresses to not be default
			const batch = adminDb.batch();

			const otherAddresses = await adminDb
				.collection("shipping_addresses")
				.where("userId", "==", userId)
				.where("isDefault", "==", true)
				.get();

			otherAddresses.docs.forEach((doc) => {
				batch.update(doc.ref, { isDefault: false });
			});

			await batch.commit();
		}

		// Prepare update data with timestamp
		const finalUpdateData = {
			...updateData,
			updatedAt: FieldValue.serverTimestamp(),
		};

		// Update the address
		await addressRef.update(finalUpdateData);

		// Fetch the updated document to return
		const updatedDoc = await addressRef.get();
		const responseData = {
			id: updatedDoc.id,
			...convertTimestampsToISO(updatedDoc.data() || null),
		};

		return NextResponse.json(responseData);
	} catch (error) {
		console.error("Error updating shipping address:", error);

		if (error instanceof Error && error.message === "Unauthorized access") {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{
				error: "Failed to update shipping address",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// DELETE endpoint for removing a shipping address
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const addressId = params.id;
		const userId = await getCurrentUserId(request);

		// Get the address document
		const addressRef = adminDb.collection("shipping_addresses").doc(addressId);

		const addressDoc = await addressRef.get();

		if (!addressDoc.exists) {
			return NextResponse.json(
				{ error: "Shipping address not found" },
				{ status: 404 }
			);
		}

		// Check if the address belongs to the current user
		const addressData = addressDoc.data();
		if (addressData?.userId !== userId) {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 403 }
			);
		}

		// If this is the default address, we need to find another address to make default
		if (addressData?.isDefault === true) {
			const otherAddresses = await adminDb
				.collection("shipping_addresses")
				.where("userId", "==", userId)
				.where("id", "!=", addressId)
				.limit(1)
				.get();

			if (!otherAddresses.empty) {
				// Make another address the default
				await otherAddresses.docs[0].ref.update({ isDefault: true });
			}
		}

		// Delete the address
		await addressRef.delete();

		return NextResponse.json({
			success: true,
			message: "Shipping address deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting shipping address:", error);

		if (error instanceof Error && error.message === "Unauthorized access") {
			return NextResponse.json(
				{ error: "Unauthorized access" },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{
				error: "Failed to delete shipping address",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
