import { NextRequest, NextResponse } from "next/server";
import { adminStorage, adminDb } from "@/config/firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Configuration
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks (safer for Vercel)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Updated config for smaller payloads
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "2mb", // Reduced for chunk uploads
		},
		responseLimit: false,
	},
};

// Initialize upload session
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, fileName, fileSize, fileContentType, type, index } = body;

		if (!userId || !fileName || !fileSize || !type) {
			return NextResponse.json(
				{ error: "Missing required parameters for upload initialization" },
				{ status: 400 }
			);
		}

		// Validate type and index
		if (type === "portfolio" && !index) {
			return NextResponse.json(
				{ error: "Index is required for portfolio video uploads" },
				{ status: 400 }
			);
		}

		// Validate file size
		if (fileSize > MAX_VIDEO_SIZE) {
			return NextResponse.json(
				{
					error: `Video file too large. Maximum size is ${formatFileSize(
						MAX_VIDEO_SIZE
					)}. Your file is ${formatFileSize(fileSize)}.`,
				},
				{ status: 400 }
			);
		}

		const uploadId = uuidv4();
		const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

		console.log(
			`Initializing ${type} upload: ${fileName} (${formatFileSize(
				fileSize
			)}) -> ${totalChunks} chunks`
		);

		// Create upload record
		await adminDb
			.collection("video_uploads")
			.doc(uploadId)
			.set({
				userId,
				fileName,
				fileSize,
				fileContentType,
				type, // 'about' or 'portfolio'
				index: index || null,
				totalChunks,
				chunks: {},
				progress: 0,
				status: "initialized",
				createdAt: new Date(),
				uploadId,
			});

		return NextResponse.json({
			success: true,
			uploadId,
			totalChunks,
			chunkSize: CHUNK_SIZE,
			message: "Upload session initialized",
		});
	} catch (error) {
		console.error("Error initializing upload:", error);
		return NextResponse.json(
			{
				error: "Failed to initialize upload",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check content length before parsing
		const contentLength = parseInt(
			request.headers.get("content-length") || "0"
		);
		if (contentLength > 2 * 1024 * 1024) {
			// 2MB limit
			return NextResponse.json(
				{ error: "Request payload too large. Maximum size is 2MB." },
				{ status: 413 }
			);
		}

		const body = await request.json();

		// Handle chunk upload
		return handleChunkUpload(body);
	} catch (error) {
		console.error("Error in POST handler:", error);

		// Handle specific payload size errors
		if (error instanceof Error && error.message.includes("body limit")) {
			return NextResponse.json(
				{ error: "Request too large. Please reduce chunk size." },
				{ status: 413 }
			);
		}

		return NextResponse.json(
			{
				error: "Failed to process request",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChunkUpload(body: any) {
	try {
		const {
			userId,
			chunkData,
			fileName,
			fileContentType,
			chunkIndex,
			totalChunks,
			uploadId,
			fileSize,
		} = body;

		if (
			!userId ||
			!chunkData ||
			!fileName ||
			chunkIndex === undefined ||
			!totalChunks ||
			!uploadId
		) {
			return NextResponse.json(
				{ error: "Missing required parameters for chunk upload" },
				{ status: 400 }
			);
		}

		// Validate payload size
		const payloadSize = JSON.stringify(body).length;
		console.log(
			`Processing chunk ${chunkIndex + 1}/${totalChunks}, payload size: ${(
				payloadSize / 1024
			).toFixed(1)}KB`
		);

		if (payloadSize > 1.8 * 1024 * 1024) {
			// 1.8MB safety margin
			return NextResponse.json(
				{
					error: `Chunk payload too large: ${(
						payloadSize /
						1024 /
						1024
					).toFixed(1)}MB. Maximum is 1.8MB.`,
				},
				{ status: 413 }
			);
		}

		// Validate file size on first chunk
		if (chunkIndex === 0 && fileSize > MAX_VIDEO_SIZE) {
			return NextResponse.json(
				{
					error: `Video file too large. Maximum size is ${formatFileSize(
						MAX_VIDEO_SIZE
					)}. Your file is ${formatFileSize(fileSize)}.`,
				},
				{ status: 400 }
			);
		}

		// Generate a temp storage path for this upload's chunks
		const tempChunkPath = `temp/videos/${userId}/${uploadId}`;
		const bucket = adminStorage.bucket();

		// For the chunk file
		const chunkFileName = `${tempChunkPath}/chunk-${String(chunkIndex).padStart(
			6,
			"0"
		)}`; // Padded for proper sorting
		const chunkFileRef = bucket.file(chunkFileName);

		try {
			// Decode and save the chunk
			const chunkBuffer = Buffer.from(chunkData, "base64");
			await chunkFileRef.save(chunkBuffer, {
				metadata: {
					contentType: "application/octet-stream",
					customMetadata: {
						originalFileName: fileName,
						chunkIndex: chunkIndex.toString(),
						uploadId,
						uploadedBy: userId,
					},
				},
			});
		} catch (storageError) {
			console.error(`Failed to save chunk ${chunkIndex}:`, storageError);
			throw new Error(`Storage error: Failed to save chunk ${chunkIndex + 1}`);
		}

		// Update upload progress
		const uploadRef = adminDb.collection("video_uploads").doc(uploadId);
		const progress = ((chunkIndex + 1) / totalChunks) * 100;

		await uploadRef.update({
			[`chunks.${chunkIndex}`]: true,
			progress: Math.round(progress),
			lastChunkAt: new Date(),
			status: chunkIndex === totalChunks - 1 ? "processing" : "uploading",
		});

		// If this is the last chunk, combine all chunks and update database
		if (chunkIndex === totalChunks - 1) {
			try {
				console.log(`Combining ${totalChunks} chunks for upload ${uploadId}`);

				// Get upload metadata
				const uploadDoc = await uploadRef.get();
				const uploadData = uploadDoc.data();

				if (!uploadData) {
					throw new Error("Upload record not found");
				}

				// Get all chunks with proper ordering
				const [chunkFiles] = await bucket.getFiles({
					prefix: tempChunkPath,
					autoPaginate: true,
				});

				// Sort chunks by index (padded names ensure proper order)
				chunkFiles.sort((a, b) => a.name.localeCompare(b.name));

				if (chunkFiles.length !== totalChunks) {
					throw new Error(
						`Expected ${totalChunks} chunks, found ${chunkFiles.length}`
					);
				}

				// Generate unique filename
				const timestamp = Date.now();
				const sanitizedFileName = sanitizeFileName(fileName);
				
				let storagePath: string;
				if (uploadData.type === "about") {
					storagePath = `${userId}/aboutMeVideo/${timestamp}-${sanitizedFileName}`;
				} else {
					storagePath = `${userId}/portfolioVideo-${uploadData.index}/${timestamp}-${sanitizedFileName}`;
				}

				// Final video file reference
				const finalFileRef = bucket.file(storagePath);

				// Create a write stream for the final file
				const writeStream = finalFileRef.createWriteStream({
					metadata: {
						contentType: fileContentType,
						metadata: {
							userId: userId,
							videoType: uploadData.type,
							videoIndex: uploadData.index || "",
							originalName: fileName,
							uploadedAt: new Date().toISOString(),
						},
					},
				});

				// Process each chunk and append to final file
				for (let i = 0; i < chunkFiles.length; i++) {
					console.log(`Processing chunk ${i + 1}/${chunkFiles.length}`);
					const [chunkData] = await chunkFiles[i].download();
					writeStream.write(chunkData);
				}

				// Close the write stream and wait for completion
				await new Promise<void>((resolve, reject) => {
					writeStream.end();
					writeStream.on("finish", () => resolve());
					writeStream.on("error", reject);
				});

				// Make the file publicly accessible
				await finalFileRef.makePublic();

				// Get the download URL
				const downloadURL = `https://storage.googleapis.com/social-shake.firebasestorage.app/${storagePath}`;

				// Clean up temp chunks
				console.log(`Cleaning up ${chunkFiles.length} temporary chunks`);
				const deletePromises = chunkFiles.map((chunkFile) =>
					chunkFile
						.delete()
						.catch((err) =>
							console.warn(`Failed to delete chunk ${chunkFile.name}:`, err)
						)
				);
				await Promise.allSettled(deletePromises);

				console.log(`Successfully uploaded video: ${downloadURL}`);

				// Update the creator verification database
				const verificationSnapshot = await adminDb
					.collection("creator_verifications")
					.where("userId", "==", userId)
					.limit(1)
					.get();

				if (verificationSnapshot.empty) {
					throw new Error("Creator profile not found");
				}

				const doc = verificationSnapshot.docs[0];
				const docRef = adminDb.collection("creator_verifications").doc(doc.id);
				const currentData = doc.data();

				// Prepare update data
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const updateData: any = {
					updatedAt: new Date().toISOString(),
				};

				if (uploadData.type === "about") {
					updateData.aboutMeVideoUrl = downloadURL;
					// Also update in profileData for consistency
					updateData["profileData.aboutMeVideoUrl"] = downloadURL;
				} else if (uploadData.type === "portfolio") {
					const currentUrls = currentData.portfolioVideoUrls || [];
					const videoIndex = parseInt(uploadData.index);

					// Create a new array, ensuring it has enough slots
					const newUrls = [...currentUrls];
					while (newUrls.length <= videoIndex) {
						newUrls.push("");
					}

					// Replace the video at the specific index
					newUrls[videoIndex] = downloadURL;

					// Remove any duplicates and empty strings, then rebuild clean array
					const cleanUrls = newUrls.filter((url, idx) => {
						if (!url || url.trim() === "") return false;
						// Keep this URL if it's the first occurrence OR it's at the target index
						return newUrls.indexOf(url) === idx || idx === videoIndex;
					});

					updateData.portfolioVideoUrls = cleanUrls;
					updateData[`portfolioVideo-${uploadData.index}Url`] = downloadURL;
					// Also update in profileData for consistency
					updateData[`profileData.portfolioVideo-${uploadData.index}Url`] =
						downloadURL;
				}

				// Update the database
				await docRef.update(updateData);

				console.log(`Successfully updated database for userId: ${userId}`);

				// Update upload record to completed
				await uploadRef.update({
					videoUrl: downloadURL,
					status: "completed",
					completedAt: new Date(),
					progress: 100,
					fileName: sanitizedFileName,
				});

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
								type: uploadData.type,
								index: uploadData.index || null,
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
					success: true,
					message: "Video uploaded successfully",
					url: downloadURL,
					type: uploadData.type,
					index: uploadData.index || null,
					userId,
					updatedAt: updateData.updatedAt,
					uploadId,
					progress: 100,
					status: "completed",
				});
			} catch (error) {
				console.error("Error processing video chunks:", error);

				// Update upload status to failed
				await uploadRef.update({
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown error",
					failedAt: new Date(),
				});

				throw error;
			}
		} else {
			// Return progress information for non-final chunks
			return NextResponse.json({
				success: true,
				message: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded successfully`,
				uploadId,
				progress: Math.round(progress),
				status: "uploading",
			});
		}
	} catch (error) {
		console.error("Error uploading video chunk:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to upload chunk";

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
			},
			{ status: 500 }
		);
	}
}

// GET endpoint to check upload status
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const uploadId = searchParams.get("uploadId");

		if (!uploadId) {
			return NextResponse.json(
				{ error: "Upload ID is required" },
				{ status: 400 }
			);
		}

		const uploadDoc = await adminDb
			.collection("video_uploads")
			.doc(uploadId)
			.get();

		if (!uploadDoc.exists) {
			return NextResponse.json(
				{ error: "Upload record not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(uploadDoc.data());
	} catch (error) {
		console.error("Error fetching upload status:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch upload status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Utility functions
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function sanitizeFileName(fileName: string): string {
	return fileName
		.replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscore
		.replace(/_{2,}/g, "_") // Replace multiple underscores with single
		.toLowerCase();
}

// OPTIONS handler for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}