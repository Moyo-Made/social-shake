import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Increase the body size limit to 50MB
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "50mb",
		},
		responseLimit: false,
	},
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	try {
		// Parse the JSON request body
		const body = await request.json();

		const {
			userId,
			verificationId, // Optional - if provided, we'll validate it matches userId
			bio,
			tiktokUrl,
			ethnicity,
			dateOfBirth,
			gender,
			country,
			contentTypes,
			contentLinks,
			socialMedia,
			pricing,
			abnNumber,
			// File URLs are now provided by the client after chunked uploads
			verificationVideoUrl,
			verifiableIDUrl,
			profilePictureUrl,
			aboutMeVideo,
			portfolioVideoUrls,
			languages,
		} = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Use userId as document ID - ignore verificationId if it doesn't match
		const documentId = userId;
		
		// If verificationId is provided and doesn't match userId, log a warning
		if (verificationId && verificationId !== userId) {
			console.warn(`Warning: verificationId (${verificationId}) doesn't match userId (${userId}). Using userId as document ID.`);
		}

		// Validate required fields
		const requiredFields = {
			bio,
			tiktokUrl,
			dateOfBirth,
			gender,
			country,
			contentTypes,
			pricing,
			languages,
		};

		const missingFields = Object.entries(requiredFields)
			.filter(([key, value]) => {
				if (key === "contentTypes") return !value || value.length === 0;
				if (key === "pricing") return !value || Object.keys(value).length === 0;
				if (key === "languages") return !value || !Array.isArray(value) || value.length === 0;
				return !value || (typeof value === "string" && value.trim() === "");
			})
			.map(([key]) => key);

		if (missingFields.length > 0) {
			return NextResponse.json(
				{
					error: "Missing required fields",
					missingFields,
				},
				{ status: 400 }
			);
		}

		// Validate content links
		if (
			!contentLinks ||
			contentLinks.length === 0 ||
			!contentLinks[0] ||
			contentLinks[0].trim() === ""
		) {
			return NextResponse.json(
				{ error: "At least one content link is required" },
				{ status: 400 }
			);
		}

		// Validate file URLs (these should have been uploaded via chunked upload)
		if (
			!verificationVideoUrl ||
			!verifiableIDUrl ||
			!profilePictureUrl ||
			!aboutMeVideo
		) {
			return NextResponse.json(
				{
					error: "All required files must be uploaded first",
					missing: {
						verificationVideo: !verificationVideoUrl,
						verifiableID: !verifiableIDUrl,
						profilePicture: !profilePictureUrl,
						aboutMeVideo: !aboutMeVideo,
					},
				},
				{ status: 400 }
			);
		}

		// Validate portfolio videos
		if (
			!portfolioVideoUrls ||
			!Array.isArray(portfolioVideoUrls) ||
			portfolioVideoUrls.length < 3
		) {
			return NextResponse.json(
				{
					error: "At least 3 portfolio videos are required",
					portfolioVideoCount: portfolioVideoUrls?.length || 0,
				},
				{ status: 400 }
			);
		}

		// Validate that all portfolio video URLs are valid
		const validPortfolioUrls = portfolioVideoUrls.filter(
			(url) => url && url.trim() !== ""
		);
		if (validPortfolioUrls.length < 3) {
			return NextResponse.json(
				{
					error: "At least 3 valid portfolio video URLs are required",
					validPortfolioVideoCount: validPortfolioUrls.length,
				},
				{ status: 400 }
			);
		}

		// Reference to verification document using userId as document ID
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(documentId);

		// Check if document already exists and get current status
		const existingDoc = await verificationRef.get();
		const existingData = existingDoc.exists ? existingDoc.data() : null;
		
		// Don't allow updates if verification is already approved
		if (existingData?.status === 'approved') {
			return NextResponse.json(
				{
					error: "Cannot update verification - already approved",
					currentStatus: existingData.status
				},
				{ status: 400 }
			);
		}

		// Prepare the verification data (flattened structure)
		const verificationData = {
			// Core verification fields
			userId,
			status: existingData?.status || "pending", // Keep existing status if updating
			createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
			
			// Profile fields at root level
			bio,
			tiktokUrl,
			ethnicity,
			dateOfBirth,
			gender,
			country,
			contentTypes,
			contentLinks,
			socialMedia: socialMedia || {
				instagram: "",
				twitter: "",
				facebook: "",
				youtube: "",
				tiktok: "",
			},
			pricing,
			abnNumber,
			languages: languages || [],
			
			// File URLs
			verificationVideoUrl,
			verifiableIDUrl,
			profilePictureUrl,
			aboutMeVideoUrl: aboutMeVideo,
			portfolioVideoUrls: validPortfolioUrls,
			
			// Keep profileData for backwards compatibility (optional)
			profileData: {
				bio,
				tiktokUrl,
				ethnicity,
				dateOfBirth,
				gender,
				country,
				contentTypes,
				contentLinks,
				socialMedia: socialMedia || {
					instagram: "",
					twitter: "",
					facebook: "",
					youtube: "",
					tiktok: "",
				},
				pricing,
				abnNumber,
				verificationVideoUrl,
				verifiableIDUrl,
				profilePictureUrl,
				aboutMeVideoUrl: aboutMeVideo,
				portfolioVideoUrls: validPortfolioUrls,
				languages: languages || [],
			}
		};

		// Create or update verification document in Firestore
		await verificationRef.set(verificationData, { merge: true });


		// Update user record - use userId as document ID here too
		await adminDb.collection("creatorProfiles").doc(userId).set(
			{
				verificationStatus: verificationData.status,
				verificationId: documentId, // This will be the same as userId
				updatedAt: FieldValue.serverTimestamp(),
				// Store some basic profile info for quick access
				bio,
				gender,
				country,
				contentTypes,
				profilePictureUrl,
				abnNumber,
				portfolioVideoCount: validPortfolioUrls.length,
			},
			{ merge: true }
		);

		// Broadcast real-time update
		try {
			const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
			
			await fetch(`${socketServerUrl}/api/broadcast-verification`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					event: 'verification-submitted',
					data: {
						verificationId: documentId,
						status: verificationData.status,
						userId: userId,
						submittedAt: new Date().toISOString()
					}
				})
			});
		} catch (broadcastError) {
			console.error('Error broadcasting verification submission:', broadcastError);
		}

		return NextResponse.json(
			{
				success: true,
				message: existingData ? 
					"Verification updated successfully! Your updated application is now under review." :
					"Verification submitted successfully! Your application is now under review.",
				verificationId: documentId,
				status: verificationData.status,
				portfolioVideoCount: validPortfolioUrls.length,
				isUpdate: !!existingData
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error submitting verification:", error);

		// Provide more detailed error information
		const errorMessage =
			error instanceof Error ? error.message : "Failed to submit verification";

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				message:
					"There was an error submitting your verification. Please try again.",
			},
			{ status: 500 }
		);
	}
}

// OPTIONS handler for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}