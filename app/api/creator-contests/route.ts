import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}

		// Step 1: Find applications that are either pending or approved
		const applicationsSnapshot = await adminDb
			.collection("contest_applications")
			.where("userId", "==", userId)
			.get();

		if (applicationsSnapshot.empty) {
			return NextResponse.json([]);
		}

		// Step 2: Extract contest IDs from applications
		const contestIds = applicationsSnapshot.docs.map(
			(doc) => doc.data().contestId
		);

		// Step 3: Get contest details for each contest ID
		// Firebase doesn't support array contains with more than 10 items
		// so we need to batch our requests if there are many contest IDs
		const batchSize = 10;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let allContests: any[] = [];

		for (let i = 0; i < contestIds.length; i += batchSize) {
			const batch = contestIds.slice(i, i + batchSize);

			if (batch.length > 0) {
				const contestsSnapshot = await adminDb
					.collection("contests")
					.where("id", "in", batch)
					.get();

				const batchContests = contestsSnapshot.docs.map((doc) => {
					return {
						id: doc.id,
						...convertTimestampsToISO(doc.data()),
					};
				});

				allContests = [...allContests, ...batchContests];
			}
		}

		// Step 4: Sort contests by end date (most recent first)
		allContests.sort((a, b) => {
			const dateA = new Date(a.prizeTimeline?.endDate || 0);
			const dateB = new Date(b.prizeTimeline?.endDate || 0);
			return dateB.getTime() - dateA.getTime();
		});

		return NextResponse.json(allContests);
	} catch (error) {
		console.error("Error fetching creator contests:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch creator contests",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert Firestore timestamps to ISO strings

function convertTimestampsToISO(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Record<string, any> | null) : Record<string, any> | null {
	if (!data) return data;

	const result = { ...data };

	// Convert timestamp fields to ISO strings
	for (const [key, value] of Object.entries(result)) {
		if (value instanceof Timestamp) {
			result[key] = value.toDate().toISOString();
		} else if (value && typeof value === "object" && !Array.isArray(value)) {
			// Recursively convert nested objects
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			result[key] = convertTimestampsToISO(value as Record<string, any>);
		}
	}

	return result;
}
