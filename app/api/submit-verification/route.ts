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
		console.log("Received verification submission:", Object.keys(body));

		const {
			userId,
			verificationId, // Now coming from the client
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
		} = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		if (!verificationId) {
			return NextResponse.json(
				{ error: "Verification ID is required" },
				{ status: 400 }
			);
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
		};

		const missingFields = Object.entries(requiredFields)
			.filter(([key, value]) => {
				if (key === "contentTypes") return !value || value.length === 0;
				if (key === "pricing") return !value || Object.keys(value).length === 0;
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

		// ADD: Validate portfolio videos
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

		console.log("All validations passed, creating verification document");

		// Reference to verification document using the provided verificationId
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(verificationId);

		// Prepare the complete profile data
		const profileData = {
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
			// File URLs from chunked uploads
			verificationVideoUrl,
			verifiableIDUrl,
			profilePictureUrl,
			aboutMeVideoUrl: aboutMeVideo,
			portfolioVideoUrls: validPortfolioUrls,
		};

		// Create or update verification document in Firestore
		await verificationRef.set(
			{
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp(),
				status: "pending",
				userId,
				profileData: profileData,
			},
			{ merge: true }
		);

		console.log("Verification document created/updated successfully");

		// Update user record
		await adminDb.collection("creatorProfiles").doc(userId).set(
			{
				verificationStatus: "pending",
				verificationId,
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

		console.log("Creator profile updated successfully");

		return NextResponse.json(
			{
				success: true,
				message:
					"Verification submitted successfully! Your application is now under review.",
				verificationId,
				status: "pending",
				portfolioVideoCount: validPortfolioUrls.length,
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
