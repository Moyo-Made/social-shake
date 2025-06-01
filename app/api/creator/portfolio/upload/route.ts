import { NextRequest, NextResponse } from "next/server";
import { adminStorage, adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const videoFile = formData.get("video") as File;
		const type = formData.get("type") as string; // 'about' or 'portfolio'
		const index = formData.get("index") as string; // for portfolio videos
		const userId = formData.get("userId") as string;

		// Validation
		if (!videoFile) {
			return NextResponse.json(
				{ error: "No video file provided" },
				{ status: 400 }
			);
		}

		if (!type || !userId) {
			return NextResponse.json(
				{ error: "Missing required parameters: type and userId" },
				{ status: 400 }
			);
		}

		if (type === "portfolio" && !index) {
			return NextResponse.json(
				{ error: "Index is required for portfolio video uploads" },
				{ status: 400 }
			);
		}

		// Validate file type
		if (!videoFile.type.startsWith("video/")) {
			return NextResponse.json(
				{ error: "Only video files are allowed" },
				{ status: 400 }
			);
		}

		// Validate file size (100MB limit)
		const maxSize = 100 * 1024 * 1024; // 100MB in bytes
		if (videoFile.size > maxSize) {
			return NextResponse.json(
				{ error: "File size must be less than 100MB" },
				{ status: 400 }
			);
		}

		console.log(`Uploading ${type} video for userId: ${userId}`, {
			fileName: videoFile.name,
			fileSize: videoFile.size,
			fileType: videoFile.type,
			index: index || "N/A",
		});

		// Generate unique filename
		const timestamp = Date.now();
		const sanitizedFileName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");

		let storagePath: string;
		if (type === "about") {
			storagePath = `${userId}/aboutMeVideo/${timestamp}-${sanitizedFileName}`;
		} else {
			storagePath = `${userId}/portfolioVideo-${index}/${timestamp}-${sanitizedFileName}`;
		}

		// Convert File to Buffer
		const arrayBuffer = await videoFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to Firebase Storage
		const bucket = adminStorage.bucket();
		const file = bucket.file(storagePath);

		console.log(`Uploading to storage path: ${storagePath}`);

		// Upload the file
		await file.save(buffer, {
			metadata: {
				contentType: videoFile.type,
				metadata: {
					userId: userId,
					videoType: type,
					videoIndex: index || "",
					originalName: videoFile.name,
					uploadedAt: new Date().toISOString(),
				},
			},
		});

		// Make the file publicly accessible
		await file.makePublic();

		// Get the download URL
		const downloadURL = `https://storage.googleapis.com/social-shake.firebasestorage.app/${storagePath}`;

		console.log(`Successfully uploaded video: ${downloadURL}`);

		// Update the database
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

		if (type === "about") {
			updateData.aboutMeVideoUrl = downloadURL;
			// Also update in profileData for consistency
			updateData["profileData.aboutMeVideoUrl"] = downloadURL;
		} else if (type === "portfolio") {
			const currentUrls = currentData.portfolioVideoUrls || [];
			const videoIndex = parseInt(index);

			// Create a new array, ensuring it has enough slots
			const newUrls = [...currentUrls];
			while (newUrls.length <= videoIndex) {
				newUrls.push("");
			}

			// Replace the video at the specific index (this was working correctly)
			newUrls[videoIndex] = downloadURL;

			// Remove any duplicates and empty strings, then rebuild clean array
			const cleanUrls = newUrls.filter((url, idx) => {
				if (!url || url.trim() === "") return false;
				// Keep this URL if it's the first occurrence OR it's at the target index
				return newUrls.indexOf(url) === idx || idx === videoIndex;
			});

			updateData.portfolioVideoUrls = cleanUrls;
			updateData[`portfolioVideo-${index}Url`] = downloadURL;
			// Also update in profileData for consistency
			updateData[`profileData.portfolioVideo-${index}Url`] = downloadURL;
		}

		// Update the database
		await docRef.update(updateData);

		console.log(`Successfully updated database for userId: ${userId}`);

		// Broadcast real-time update (if you have socket functionality)
		try {
			const socketServerUrl =
				process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001";

			await fetch(`${socketServerUrl}/api/broadcast-portfolio`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					event: "portfolio-video-updated",
					data: {
						type,
						index: index || null,
						url: downloadURL,
						updatedAt: updateData.updatedAt,
					},
				}),
			});
		} catch (broadcastError) {
			console.error("Error broadcasting portfolio update:", broadcastError);
			// Don't fail the request if broadcast fails
		}

		return NextResponse.json({
			message: "Video uploaded successfully",
			url: downloadURL,
			type,
			index: index || null,
			userId,
			updatedAt: updateData.updatedAt,
		});
	} catch (error) {
		console.error("Error uploading video:", error);
		return NextResponse.json(
			{
				error: "Failed to upload video",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Configure for larger file uploads
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "100mb",
		},
	},
};
