import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

// GET - Fetch saved creators for a user
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const limit = searchParams.get("limit");
		const offset = searchParams.get("offset");

		if (!userId) {
			return NextResponse.json(
				{ error: "Missing required query parameter: userId" },
				{ status: 400 }
			);
		}

		let query = adminDb
			.collection("users")
			.doc(userId)
			.collection("savedCreators")
			.orderBy("savedAt", "desc"); // Most recent first

		// Add pagination if provided
		if (limit) {
			query = query.limit(parseInt(limit));
		}
		if (offset) {
			query = query.offset(parseInt(offset));
		}

		const snapshot = await query.get();

		const savedCreators = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			savedCreators.push({
				id: doc.id,
				creatorId: data.creatorId,
				savedAt: data.savedAt?.toDate?.() || data.savedAt,
				// Add any additional metadata you might have
				...data.metadata,
			});
		}

		return NextResponse.json({
			success: true,
			data: savedCreators,
			count: savedCreators.length,
			pagination: {
				limit: limit ? parseInt(limit) : null,
				offset: offset ? parseInt(offset) : null,
			},
		});
	} catch (error) {
		console.error("Error fetching saved creators:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch saved creators",
				details:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 500 }
		);
	}
}

// POST - Save a creator
export async function POST(request: NextRequest) {
	try {
		const { creatorId, userId, action, metadata } = await request.json();

		// Validate required fields
		if (!creatorId || !userId) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields: creatorId and userId",
				},
				{ status: 400 }
			);
		}

		// Default action to 'save' if not provided
		const actionType = action || "save";

		if (actionType === "save") {
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
						success: false,
						error: "Creator already saved",
						message: "Use action: 'remove' to remove or DELETE method",
					},
					{ status: 409 }
				);
			}

			const savedCreatorData = {
				creatorId,
				savedAt: new Date(),
				...(metadata && { metadata }), // Optional metadata
			};

			// Save the creator
			await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.set(savedCreatorData);

			return NextResponse.json(
				{
					success: true,
					message: "Creator saved successfully",
					data: savedCreatorData,
				},
				{ status: 201 }
			);
		} else if (actionType === "remove") {
			// Check if creator exists in saved list
			const existingDoc = await adminDb
				.collection("users")
				.doc(userId)
				.collection("savedCreators")
				.doc(creatorId)
				.get();

			if (!existingDoc.exists) {
				return NextResponse.json(
					{
						success: false,
						error: "Creator not found in saved list",
					},
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
				{
					success: false,
					error: "Invalid action",
					message: "Use 'save' or 'remove'",
				},
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error("Error managing saved creator:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to manage saved creator",
				details:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 500 }
		);
	}
}

// DELETE - Remove a saved creator
export async function DELETE(request: NextRequest) {
	try {
		const { creatorId, userId } = await request.json();

		// Validate required fields
		if (!creatorId || !userId) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields: creatorId and userId",
				},
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
				{
					success: false,
					error: "Creator not found in saved list",
				},
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
				success: false,
				error: "Failed to remove saved creator",
				details:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 500 }
		);
	}
}
