import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

// For handling large files, you can set config at runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Optional: Use Node.js runtime for file processing

// Export a POST function instead of a default export
export async function POST(request: NextRequest) {
	try {
		// Parse the JSON request body
		const body = await request.json();
		const {
			userId,
			profileData,
			verificationVideo,
			verifiableID,
			profilePicture,
		} = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Parse the profile data if it's a string
		const parsedProfileData =
			typeof profileData === "string" ? JSON.parse(profileData) : profileData;

		// Create a unique ID for this verification submission
		const verificationId = uuidv4();

		// Reference to verification document
		const verificationRef = adminDb
			.collection("creator_verifications")
			.doc(verificationId);

		// Upload files to Firebase Storage
		const fileUrls: Record<string, string> = {};
		const bucket = adminStorage.bucket();

		// Function to handle file uploads with better error handling
		const uploadFile = async (
			fileData: { data: string; name: string; type: string },
			folder: string
		): Promise<string | null> => {
			if (!fileData || !fileData.data) return null;

			try {
				const fileBuffer = Buffer.from(fileData.data, "base64");
				const fileName = `${userId}/${folder}/${Date.now()}-${fileData.name}`;
				const fileRef = bucket.file(fileName);

				await fileRef.save(fileBuffer, {
					metadata: {
						contentType: fileData.type,
					},
				});

				// Make the file publicly accessible
				await fileRef.makePublic();

				// Get the public URL
				return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
			} catch (error) {
				console.error(`Error uploading ${folder} file:`, error);
				return null;
			}
		};

		// Upload verification video if present
		if (verificationVideo) {
			const videoUrl = await uploadFile(
				verificationVideo,
				"verification_videos"
			);
			if (videoUrl) fileUrls.verificationVideoUrl = videoUrl;
		}

		// Upload ID if present
		if (verifiableID) {
			const idUrl = await uploadFile(verifiableID, "ids");
			if (idUrl) fileUrls.verifiableIDUrl = idUrl;
		}

		// Upload profile picture if present
		if (profilePicture) {
			const pictureUrl = await uploadFile(profilePicture, "profile_pictures");
			if (pictureUrl) fileUrls.profilePictureUrl = pictureUrl;
		}

		// Create verification document in Firestore
		await verificationRef.set({
			createdAt: FieldValue.serverTimestamp(),
			status: "pending", // Initial status
			userId, // Include the userId explicitly
			...fileUrls,
			profileData: parsedProfileData,
		  });
		  
		  // Update user record using userId instead of email
		  await adminDb.collection("creatorProfiles").doc(userId).set({
			verificationStatus: "pending",
			verificationId,
			updatedAt: FieldValue.serverTimestamp(),
		  }, { merge: true });

		return NextResponse.json(
			{
				success: true,
				message: "Verification submitted successfully",
				verificationId,
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
			},
			{ status: 500 }
		);
	}
}

// Optionally add an OPTIONS handler for CORS
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
