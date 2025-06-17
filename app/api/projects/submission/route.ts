import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { join } from "path";
import { mkdir, writeFile, readFile, unlink, rmdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";

// Maximum video size: 500MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB in bytes
// Chunk size for large file uploads: 5MB
const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB in bytes

// Expanded video format support
const SUPPORTED_VIDEO_TYPES = [
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
	"video/mpeg",
	"video/ogg",
	"video/3gpp",
	"video/x-ms-wmv",
	"video/x-flv",
	"video/mp2t",
	"video/x-matroska",
	"video/mp2t",
	"video/x-m4v",
];

const SUPPORTED_VIDEO_EXTENSIONS = [
	".mp4",
	".webm",
	".mov",
	".avi",
	".mpeg",
	".mpg",
	".ogg",
	".3gp",
	".wmv",
	".flv",
	".mkv",
	".m4v",
	".ts",
];

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();

		// Extract form data fields
		const userId = formData.get("userId") as string;
		const projectId = formData.get("projectId") as string;
		const note = (formData.get("note") as string) || "";
		const videoFile = formData.get("video") as File | null;

		// Validate required fields
		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		if (!projectId) {
			return NextResponse.json(
				{ error: "Project ID is required" },
				{ status: 400 }
			);
		}

		if (!videoFile) {
			return NextResponse.json(
				{ error: "Video file is required" },
				{ status: 400 }
			);
		}

		// Verify the user exists in Auth system
		try {
			await adminAuth.getUser(userId);
		} catch (error) {
			console.error("Error verifying user:", error);
			return NextResponse.json(
				{
					error: "invalid-user",
					message: "Invalid user ID. Please sign in again.",
				},
				{ status: 401 }
			);
		}

		// Enhanced file validation
		const fileExtension = videoFile.name
			.toLowerCase()
			.substring(videoFile.name.lastIndexOf("."));
		const isValidType = SUPPORTED_VIDEO_TYPES.includes(videoFile.type);
		const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);

		// More lenient validation - accept if either MIME type or extension is valid
		if (!isValidType && !isValidExtension) {
			return NextResponse.json(
				{
					error: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(", ")}`,
					supportedTypes: SUPPORTED_VIDEO_EXTENSIONS,
				},
				{ status: 415 }
			);
		}

		// Validate file size
		if (videoFile.size > MAX_VIDEO_SIZE) {
			return NextResponse.json(
				{
					error: `Video size exceeds the maximum limit of 500MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB.`,
				},
				{ status: 413 }
			);
		}

		// Check for empty file
		if (videoFile.size === 0) {
			return NextResponse.json(
				{ error: "The uploaded file appears to be empty. Please try again." },
				{ status: 400 }
			);
		}

		// Get project details to verify it exists and is open
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const projectData = projectDoc.data();

		// Check if the project is still open for submissions
		const now = new Date();
		const endDate = projectData?.submissionDeadline
			? new Date(projectData.submissionDeadline)
			: null;

		if (endDate && endDate < now) {
			return NextResponse.json(
				{ error: "This project has closed for submissions" },
				{ status: 400 }
			);
		}

		// Check if user has already submitted
		const existingSubmission = await adminDb
			.collection("project_submissions")
			.where("userId", "==", userId)
			.where("projectId", "==", projectId)
			.get();

		if (!existingSubmission.empty) {
			return NextResponse.json(
				{ error: "You have already submitted a video for this project" },
				{ status: 400 }
			);
		}

		// Determine upload method based on file size
		const useChunkedUpload = videoFile.size > CHUNK_SIZE;

		if (useChunkedUpload) {
			// For large files, return chunked upload instructions
			const fileId = uuidv4();
			const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

			return NextResponse.json({
				useChunkedUpload: true,
				fileId,
				chunkSize: CHUNK_SIZE,
				totalChunks,
				message: "File is large. Please use chunked upload method.",
				uploadEndpoint: `/api/projects/submit-video/chunk`,
			});
		}

		// Process regular upload for smaller files
		const videoArrayBuffer = await videoFile.arrayBuffer();
		const videoBuffer = Buffer.from(videoArrayBuffer);

		// Generate a unique filename with original extension
		const originalExtension = fileExtension || ".mp4";
		const uniqueFileName = `${uuidv4()}${originalExtension}`;
		const filePath = `projects/${projectId}/submissions/${userId}/${uniqueFileName}`;

		// Upload to Firebase Storage with error handling
		const bucket = adminStorage.bucket();
		const fileRef = bucket.file(filePath);

		try {
			await fileRef.save(videoBuffer, {
				metadata: {
					contentType: videoFile.type || "video/mp4",
					customMetadata: {
						originalName: videoFile.name,
						uploadedBy: userId,
						projectId: projectId,
						uploadDate: new Date().toISOString(),
					},
				},
				resumable: false, // For files under 5MB, use simple upload
			});

			// Get the public URL
			await fileRef.makePublic();
			const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

			// Create submission document
			const submissionRef = adminDb.collection("project_submissions").doc();

			// Start a transaction
			const result = await adminDb.runTransaction(async (transaction) => {
				// Get the current project data
				const currentProject = await transaction.get(projectRef);
				const currentSubmissionsCount =
					currentProject.data()?.submissionsCount || 0;

				// Create the submission document
				transaction.set(submissionRef, {
					userId,
					projectId,
					note,
					videoUrl,
					fileName: videoFile.name,
					fileSize: videoFile.size,
					fileType: videoFile.type,
					fileExtension: originalExtension,
					createdAt: FieldValue.serverTimestamp(),
					status: "pending",
					storagePath: filePath,
				});

				// Increment the submission count in the project document
				transaction.update(projectRef, {
					submissionsCount: FieldValue.increment(1),
					lastSubmissionAt: FieldValue.serverTimestamp(),
				});

				// Return the updated submission count
				return currentSubmissionsCount + 1;
			});

			// Create a notification for the user
			await adminDb.collection("notifications").add({
				userId,
				message: "Your project submission has been received successfully.",
				status: "unread",
				type: "project_submission",
				createdAt: FieldValue.serverTimestamp(),
				relatedTo: "project",
				projectId,
			});

			return NextResponse.json({
				success: true,
				message: "Project submission completed successfully",
				submissionsCount: result,
				submissionId: submissionRef.id,
				videoUrl,
				fileName: videoFile.name,
				fileSize: videoFile.size,
			});
		} catch (uploadError) {
			console.error("Error uploading to Firebase Storage:", uploadError);

			// Try to clean up any partially uploaded file
			try {
				await fileRef.delete();
			} catch (cleanupError) {
				console.error("Error cleaning up failed upload:", cleanupError);
			}

			return NextResponse.json(
				{
					error: "Failed to upload video file",
					details:
						uploadError instanceof Error
							? uploadError.message
							: String(uploadError),
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error submitting project:", error);

		// More specific error handling
		if (error instanceof Error) {
			if (error.message.includes("request entity too large")) {
				return NextResponse.json(
					{ error: "File too large. Maximum size is 500MB." },
					{ status: 413 }
				);
			}

			if (error.message.includes("timeout")) {
				return NextResponse.json(
					{ error: "Upload timeout. Please try again with a smaller file." },
					{ status: 408 }
				);
			}

			if (error.message.includes("network")) {
				return NextResponse.json(
					{
						error: "Network error. Please check your connection and try again.",
					},
					{ status: 503 }
				);
			}
		}

		return NextResponse.json(
			{
				error: "Failed to submit project",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Additional endpoint to handle large file uploads with chunks
export async function PUT(request: NextRequest) {
	try {
		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId");
		const projectId = searchParams.get("projectId");
		const filename = searchParams.get("filename");
		const chunkIndex = searchParams.get("chunkIndex");
		const totalChunks = searchParams.get("totalChunks");
		const fileId = searchParams.get("fileId") || uuidv4();

		// Validate parameters
		if (!userId || !projectId || !filename || !chunkIndex || !totalChunks) {
			return NextResponse.json(
				{ error: "Missing required parameters" },
				{ status: 400 }
			);
		}

		// Verify the user exists
		try {
			await adminAuth.getUser(userId);
		} catch {
			return NextResponse.json(
				{ error: "Invalid user ID. Please sign in again." },
				{ status: 401 }
			);
		}

		// Create temp directory for chunks if it doesn't exist
		const tempDir = join("/tmp", "uploads", fileId);
		if (!existsSync(tempDir)) {
			await mkdir(tempDir, { recursive: true });
		}

		// Save this chunk to temporary storage
		const chunkData = await request.arrayBuffer();
		const chunkPath = join(tempDir, `chunk-${chunkIndex.padStart(4, "0")}`);
		await writeFile(chunkPath, Buffer.from(chunkData));

		// If this is the last chunk, return success with fileId for the client to finalize
		if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
			return NextResponse.json({
				success: true,
				message: "All chunks received",
				fileId,
				ready: true,
			});
		}

		// Return success for this chunk
		return NextResponse.json({
			success: true,
			message: `Chunk ${parseInt(chunkIndex) + 1} of ${totalChunks} received`,
			fileId,
			ready: false,
			progress: Math.round(
				((parseInt(chunkIndex) + 1) / parseInt(totalChunks)) * 100
			),
		});
	} catch (error) {
		console.error("Error handling chunk upload:", error);
		return NextResponse.json(
			{ error: "Failed to process chunk upload", details: String(error) },
			{ status: 500 }
		);
	}
}

// Finalize the chunked upload
export async function PATCH(request: NextRequest) {
	let tempDir = "";

	try {
		const { userId, projectId, fileId, filename, note, fileType, fileSize } =
			await request.json();

		// Validate parameters
		if (!userId || !projectId || !fileId || !filename) {
			return NextResponse.json(
				{ error: "Missing required parameters" },
				{ status: 400 }
			);
		}

		// Verify the user exists
		try {
			await adminAuth.getUser(userId);
		} catch {
			return NextResponse.json(
				{ error: "Invalid user ID. Please sign in again." },
				{ status: 401 }
			);
		}

		// Verify project exists and is still open
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		// Check if user has already submitted
		const existingSubmissions = await adminDb
			.collection("project_submissions")
			.where("userId", "==", userId)
			.where("projectId", "==", projectId)
			.get();

		const projectData = projectDoc.data();
		const maxVideos = projectData?.creatorPricing?.videosPerCreator || 1;

		if (existingSubmissions.size >= maxVideos) {
			return NextResponse.json(
				{
					error: `You have reached the maximum number of submissions (${maxVideos}) for this project.`,
				},
				{ status: 400 }
			);
		}

		// Reconstruct file from chunks
		tempDir = join("/tmp", "uploads", fileId);

		if (!existsSync(tempDir)) {
			return NextResponse.json(
				{ error: "Upload session not found. Please restart the upload." },
				{ status: 404 }
			);
		}

		// Read all chunks and combine them
		const chunks = [];
		let chunkIndex = 0;

		while (true) {
			const chunkPath = join(
				tempDir,
				`chunk-${chunkIndex.toString().padStart(4, "0")}`
			);

			if (!existsSync(chunkPath)) {
				break;
			}

			const chunkData = await readFile(chunkPath);
			chunks.push(chunkData);
			chunkIndex++;
		}

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "No chunks found. Please restart the upload." },
				{ status: 400 }
			);
		}

		// Combine all chunks into a single buffer
		const combinedBuffer = Buffer.concat(chunks);

		// Generate file path and upload to Firebase Storage
		const fileExtension =
			filename.toLowerCase().substring(filename.lastIndexOf(".")) || ".mp4";
		const uniqueFileName = `${uuidv4()}${fileExtension}`;
		const filePath = `projects/${projectId}/submissions/${userId}/${uniqueFileName}`;

		const bucket = adminStorage.bucket();
		const fileRef = bucket.file(filePath);

		try {
			await fileRef.save(combinedBuffer, {
				metadata: {
					contentType: fileType || "video/mp4",
					customMetadata: {
						originalName: filename,
						uploadedBy: userId,
						projectId: projectId,
						uploadDate: new Date().toISOString(),
						uploadMethod: "chunked",
					},
				},
				resumable: true, // Use resumable upload for large files
			});

			// Make file public and get URL
			await fileRef.makePublic();
			const videoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

			// Create submission document and update project in transaction
			const submissionRef = adminDb.collection("project_submissions").doc();

			const result = await adminDb.runTransaction(async (transaction) => {
				const currentProject = await transaction.get(projectRef);
				const currentSubmissionsCount =
					currentProject.data()?.submissionsCount || 0;

				transaction.set(submissionRef, {
					userId,
					projectId,
					note: note || "",
					videoUrl,
					fileName: filename,
					fileSize: fileSize || combinedBuffer.length,
					fileType: fileType || "video/mp4",
					fileExtension,
					createdAt: FieldValue.serverTimestamp(),
					status: "pending",
					storagePath: filePath,
					uploadMethod: "chunked",
				});

				transaction.update(projectRef, {
					submissionsCount: FieldValue.increment(1),
					lastSubmissionAt: FieldValue.serverTimestamp(),
				});

				return currentSubmissionsCount + 1;
			});

			// Create notification
			await adminDb.collection("notifications").add({
				userId,
				message: "Your project submission has been received successfully.",
				status: "unread",
				type: "project_submission",
				createdAt: FieldValue.serverTimestamp(),
				relatedTo: "project",
				projectId,
			});

			// Clean up temp files
			try {
				for (let i = 0; i < chunks.length; i++) {
					const chunkPath = join(
						tempDir,
						`chunk-${i.toString().padStart(4, "0")}`
					);
					if (existsSync(chunkPath)) {
						await unlink(chunkPath);
					}
				}
				await rmdir(tempDir);
			} catch (cleanupError) {
				console.error("Error cleaning up temp files:", cleanupError);
				// Don't fail the request if cleanup fails
			}

			return NextResponse.json({
				success: true,
				message: "Project submission finalized successfully",
				submissionsCount: result,
				submissionId: submissionRef.id,
				videoUrl,
				fileName: filename,
				fileSize: fileSize || combinedBuffer.length,
			});
		} catch (uploadError) {
			console.error("Error uploading combined file:", uploadError);

			// Try to clean up the failed upload
			try {
				await fileRef.delete();
			} catch (cleanupError) {
				console.error("Error cleaning up failed upload:", cleanupError);
			}

			return NextResponse.json(
				{
					error: "Failed to upload combined video file",
					details:
						uploadError instanceof Error
							? uploadError.message
							: String(uploadError),
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error finalizing upload:", error);
		return NextResponse.json(
			{ error: "Failed to finalize upload", details: String(error) },
			{ status: 500 }
		);
	} finally {
		// Cleanup temp directory in case of any error
		if (tempDir && existsSync(tempDir)) {
			try {
				await rmdir(tempDir, { recursive: true });
			} catch (cleanupError) {
				console.error("Error cleaning up temp directory:", cleanupError);
			}
		}
	}
}
