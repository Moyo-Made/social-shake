import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// GET - Fetch saved creators for a user
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return NextResponse.json(
				{ error: "Missing required query parameter: userId" },
				{ status: 400 }
			);
		}

		const snapshot = await adminDb
			.collection("users")
			.doc(userId)
			.collection("savedCreators")
			.get();

		const savedCreators = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			savedCreators.push({
				id: doc.id,
				creatorId: data.creatorId,
				savedAt: data.savedAt?.toDate?.() || data.savedAt,
			});
		}

		return NextResponse.json({
			success: true,
			data: savedCreators,
			count: savedCreators.length,
		});
	} catch (error) {
		console.error("Error fetching saved creators:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch saved creators",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// POST - Save a creator
export async function POST(request: NextRequest) {
	try {
		const { creatorId, userId, action } = await request.json();

		// Validate required fields
		if (!creatorId || !userId) {
			return NextResponse.json(
				{ error: "Missing required fields: creatorId and userId" },
				{ status: 400 }
			);
		}

		if (action === "save") {
			// Check if creator is already saved
			const existingDoc = await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.get();

			if (existingDoc.exists) {
				return NextResponse.json(
					{
						error: "Creator already saved. Use action: 'remove' to remove.",
					},
					{ status: 409 } // Conflict
				);
			}

			const savedCreatorData = {
				creatorId,
				savedAt: new Date(),
			};

			// Save the creator
			await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.set(savedCreatorData);

			return NextResponse.json({
				success: true,
				message: "Creator saved successfully",
				data: savedCreatorData,
			});
		} else if (action === "remove") {
			// Check if creator exists in saved list
			const existingDoc = await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.get();

			if (!existingDoc.exists) {
				return NextResponse.json(
					{ error: "Creator not found in saved list." },
					{ status: 404 }
				);
			}

			// Remove the saved creator
			await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.delete();

			return NextResponse.json({
				success: true,
				message: "Creator removed from saved list successfully",
			});
		} else {
			return NextResponse.json(
				{ error: "Invalid action. Use 'save' or 'remove'" },
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error("Error managing saved creator:", error);
		return NextResponse.json(
			{
				error: "Failed to manage saved creator",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// DELETE - Remove a saved creator (alternative method)
export async function DELETE(request: NextRequest) {
	try {
		const { creatorId, userId } = await request.json();

		// Validate required fields
		if (!creatorId || !userId) {
			return NextResponse.json(
				{ error: "Missing required fields: creatorId and userId" },
				{ status: 400 }
			);
		}

		// Check if creator exists in saved list
		const existingDoc = await adminDb
			.collection("users")
			.doc(userId)
			.collection("savedCreators")
			.doc(creatorId)
			.get();

		if (!existingDoc.exists) {
			return NextResponse.json(
				{ error: "Creator not found in saved list." },
				{ status: 404 }
			);
		}

		// Remove the saved creator
		await adminDb
			.collection("users")
			.doc(userId)
			.collection("savedCreators")
			.doc(creatorId)
			.delete();

		return NextResponse.json({
			success: true,
			message: "Creator removed from saved list successfully",
		});
	} catch (error) {
		console.error("Error removing saved creator:", error);
		return NextResponse.json(
			{
				error: "Failed to remove saved creator",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}