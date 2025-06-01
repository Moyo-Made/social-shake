import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

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

		console.log(`Fetching portfolio data for userId: ${userId}`);

		// Find the creator verification document by userId
		const verificationSnapshot = await adminDb
			.collection("creator_verifications")
			.where("userId", "==", userId)
			.orderBy("createdAt", "desc")
			.limit(1)
			.get();

		if (verificationSnapshot.empty) {
			console.log(`No creator profile found for userId: ${userId}`);
			return NextResponse.json(
				{ error: "Creator profile not found" },
				{ status: 404 }
			);
		}

		const doc = verificationSnapshot.docs[0];
		const data = doc.data();
		const profileData = data.profileData || {};

		console.log(`Found creator profile: ${doc.id}`);

		// Try to fetch creator profile data for additional portfolio videos
		let creatorProfileData = null;
		const creatorEmail = profileData?.email || data?.email;
		
		if (creatorEmail) {
			try {
				const profileDoc = await adminDb
					.collection("creatorProfiles")
					.doc(creatorEmail)
					.get();

				if (profileDoc.exists) {
					creatorProfileData = profileDoc.data();
				}
			} catch (profileError) {
				console.error(`Error fetching creator profile for email ${creatorEmail}:`, profileError);
			}
		}

		// Collect portfolio video URLs from multiple sources (same logic as creator approval endpoint)
		const portfolioVideoUrls = [];
		
		// First, check for individual portfolio video URLs in the root level
		const rootData = data;
		for (let i = 0; i < 10; i++) { // Check up to 10 portfolio videos
			const portfolioVideoKey = `portfolioVideo-${i}Url`;
			if (rootData && rootData[portfolioVideoKey]) {
				portfolioVideoUrls.push(rootData[portfolioVideoKey]);
			}
		}
		
		// Also check in profileData for individual portfolio video URLs
		for (let i = 0; i < 10; i++) {
			const portfolioVideoKey = `portfolioVideo-${i}Url`;
			if (profileData[portfolioVideoKey]) {
				portfolioVideoUrls.push(profileData[portfolioVideoKey]);
			}
		}
		
		// Check for portfolioVideoUrls array in profileData
		if (profileData.portfolioVideoUrls && Array.isArray(profileData.portfolioVideoUrls)) {
			portfolioVideoUrls.push(...profileData.portfolioVideoUrls);
		}
		
		// Check for portfolioVideoUrls array in root data
		if (data.portfolioVideoUrls && Array.isArray(data.portfolioVideoUrls)) {
			portfolioVideoUrls.push(...data.portfolioVideoUrls);
		}
		
		// Check for portfolioVideoUrls array in creatorProfileData
		if (creatorProfileData?.portfolioVideoUrls && Array.isArray(creatorProfileData.portfolioVideoUrls)) {
			portfolioVideoUrls.push(...creatorProfileData.portfolioVideoUrls);
		}
		
		// Remove duplicates and filter out empty/null values
		const uniquePortfolioVideoUrls = [...new Set(portfolioVideoUrls)].filter(url => url && url.trim() !== '');

		// Extract portfolio-related data with comprehensive video collection
		const portfolioData = {
			userId: userId,
			aboutMeVideoUrl: data.aboutMeVideoUrl || profileData.aboutMeVideoUrl || profileData.aboutMeVideo || creatorProfileData?.aboutMeVideoUrl || null,
			portfolioVideoUrls: uniquePortfolioVideoUrls, // Use the comprehensive collection
			profileData: data.profileData || null,
			// Include other relevant fields
			status: data.status,
			updatedAt: data.updatedAt,
			createdAt: data.createdAt,
		};

		console.log(`Portfolio videos found: ${uniquePortfolioVideoUrls.length} videos`);
		console.log('Portfolio video URLs:', uniquePortfolioVideoUrls);

		return NextResponse.json(portfolioData);
	} catch (error) {
		console.error("Error fetching portfolio data:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch portfolio data",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { aboutMeVideoUrl, portfolioVideoUrls, videoIndex, videoUrl, type } =
			body;

		console.log(`Updating portfolio for userId: ${userId}`, {
			type,
			videoIndex,
		});

		// Find the creator verification document
		const verificationSnapshot = await adminDb
			.collection("creator_verifications")
			.where("userId", "==", userId)
			.limit(1)
			.get();

		if (verificationSnapshot.empty) {
			return NextResponse.json(
				{ error: "Creator profile not found" },
				{ status: 404 }
			);
		}

		const doc = verificationSnapshot.docs[0];
		const docRef = adminDb.collection("creator_verifications").doc(doc.id);
		const currentData = doc.data();

		// Prepare update data
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {
			updatedAt: new Date().toISOString(),
		};

		if (type === "about" && aboutMeVideoUrl) {
			// Update about me video
			updateData.aboutMeVideoUrl = aboutMeVideoUrl;
		} else if (
			type === "portfolio" &&
			typeof videoIndex === "number" &&
			videoUrl
		) {
			// Update specific portfolio video
			const currentUrls = currentData.portfolioVideoUrls || [];
			const newUrls = [...currentUrls];

			// Ensure array has enough slots
			while (newUrls.length <= videoIndex) {
				newUrls.push("");
			}

			newUrls[videoIndex] = videoUrl;
			updateData.portfolioVideoUrls = newUrls;
		} else if (portfolioVideoUrls) {
			// Update entire portfolio array
			updateData.portfolioVideoUrls = portfolioVideoUrls;
		} else {
			return NextResponse.json(
				{ error: "Invalid update data provided" },
				{ status: 400 }
			);
		}

		// Update the document
		await docRef.update(updateData);

		console.log(`Successfully updated portfolio for userId: ${userId}`);

		// Return updated data - use the same comprehensive collection logic
		const updatedDoc = await docRef.get();
		const updatedData = updatedDoc.data();
		const updatedProfileData = updatedData?.profileData || {};

		// Collect updated portfolio video URLs using the same comprehensive logic
		const portfolioVideoUrls_updated = [];
		
		// Check for individual portfolio video URLs in the root level
		for (let i = 0; i < 10; i++) {
			const portfolioVideoKey = `portfolioVideo-${i}Url`;
			if (updatedData && updatedData[portfolioVideoKey]) {
				portfolioVideoUrls_updated.push(updatedData[portfolioVideoKey]);
			}
		}
		
		// Check in profileData for individual portfolio video URLs
		for (let i = 0; i < 10; i++) {
			const portfolioVideoKey = `portfolioVideo-${i}Url`;
			if (updatedProfileData[portfolioVideoKey]) {
				portfolioVideoUrls_updated.push(updatedProfileData[portfolioVideoKey]);
			}
		}
		
		// Check for portfolioVideoUrls arrays
		if (updatedProfileData.portfolioVideoUrls && Array.isArray(updatedProfileData.portfolioVideoUrls)) {
			portfolioVideoUrls_updated.push(...updatedProfileData.portfolioVideoUrls);
		}
		
		if (updatedData?.portfolioVideoUrls && Array.isArray(updatedData.portfolioVideoUrls)) {
			portfolioVideoUrls_updated.push(...updatedData.portfolioVideoUrls);
		}
		
		// Remove duplicates and filter out empty values
		const uniqueUpdatedPortfolioVideoUrls = [...new Set(portfolioVideoUrls_updated)].filter(url => url && url.trim() !== '');

		return NextResponse.json({
			message: "Portfolio updated successfully",
			userId: userId,
			aboutMeVideoUrl: updatedData?.aboutMeVideoUrl || updatedProfileData?.aboutMeVideoUrl || null,
			portfolioVideoUrls: uniqueUpdatedPortfolioVideoUrls,
			updatedAt: updateData.updatedAt,
		});
	} catch (error) {
		console.error("Error updating portfolio:", error);
		return NextResponse.json(
			{
				error: "Failed to update portfolio",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";