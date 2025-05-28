import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/config/firebase-admin";
import * as admin from "firebase-admin";
import { ProjectStatus } from "@/types/projects";

// Constants
const MAX_JSON_SIZE = 50 * 1024 * 1024; // 50MB

// Helper function to generate project ID
function generateProjectId(): string {
	return `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to extract tags
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTags(data: any): string[] {
	const tags: Set<string> = new Set();

	try {
		if (data.projectDetails?.projectType?.type) {
			tags.add(data.projectDetails.projectType.type.toLowerCase());
		}
		if (data.projectDetails?.industry) {
			tags.add(data.projectDetails.industry.toLowerCase());
		}
		if (data.projectRequirements?.categories?.length) {
			data.projectRequirements.categories.forEach((cat: string) => {
				if (cat) tags.add(cat.toLowerCase());
			});
		}
		if (data.projectRequirements?.platforms?.length) {
			data.projectRequirements.platforms.forEach((platform: string) => {
				if (platform) tags.add(platform.toLowerCase());
			});
		}
	} catch (error) {
		console.error("Error extracting tags:", error);
	}

	return Array.from(tags);
}

// Simplified thumbnail processing
async function processThumbnailSimple(
	thumbnailFile: File,
	projectId: string,
	userId: string
): Promise<string | null> {
	try {
		if (!thumbnailFile.type.startsWith("image/")) {
			throw new Error("Invalid file type. Only images are accepted.");
		}

		const arrayBuffer = await thumbnailFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const timestamp = Date.now();
		const fileExtension = thumbnailFile.name.split(".").pop() || "jpg";
		const fileName = `${timestamp}.${fileExtension}`;
		const filePath = `project-images/${userId}/${projectId}/${fileName}`;

		const bucket = adminStorage.bucket();
		const file = bucket.file(filePath);

		// Simple upload without streaming complexity
		await file.save(buffer, {
			metadata: { contentType: thumbnailFile.type },
		});

		await file.makePublic();
		return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
	} catch (error) {
		console.error("Thumbnail processing error:", error);
		return null;
	}
}

// Check brand approval status
async function checkBrandApproval(userId: string): Promise<boolean> {
	try {
		const brandsSnapshot = await adminDb
			.collection("brandProfiles")
			.where("userId", "==", userId)
			.limit(1)
			.get();

		if (brandsSnapshot.empty) return false;

		const brandData = brandsSnapshot.docs[0].data();
		return brandData?.status === "approved";
	} catch (error) {
		console.error("Brand approval check error:", error);
		return false;
	}
}

// New function to send creator invitations
async function sendCreatorInvitations(
	projectId: string,
	projectName: string,
	brandName: string,
	brandId: string,
	creatorIds: string[]
): Promise<void> {
	try {
		console.log(`Sending invitations to creators:`, creatorIds);

		const batch = adminDb.batch();
		let successCount = 0;

		for (const creatorId of creatorIds) {
			try {
				// Get creator details - first get user data to find email, then get creator profile
				const userDoc = await adminDb.collection("users").doc(creatorId).get();

				if (!userDoc.exists) {
					console.warn(
						`Creator ${creatorId} not found in users collection, skipping invitation`
					);
					continue;
				}

				const userData = userDoc.data();
				let creatorData = userData; // Default to user data

				// If we have email, try to get creator profile data
				if (userData?.email) {
					const creatorDoc = await adminDb
						.collection("creatorProfiles")
						.doc(userData.email)
						.get();
					if (creatorDoc.exists) {
						creatorData = { ...userData, ...creatorDoc.data() }; // Merge user data with creator profile
					}
				}

				if (!creatorData) {
					console.warn(
						`Creator ${creatorId} data not found, skipping invitation`
					);
					continue;
				}

				// Create notification document
				const notificationRef = adminDb.collection("notifications").doc();
				const notificationData = {
					type: "project_invitation",
					title: "New Project Invitation",
					message: `${brandName} has invited you to participate in "${projectName}". Check out the project details and apply if interested!`,
					userId: creatorId,
					projectId: projectId,
					projectTitle: projectName,
					brandName: brandName,
					brandId: brandId,
					creatorId: creatorId,
					creatorName:
						creatorData.displayName ||
						creatorData.name ||
						creatorData.firstName ||
						"Creator",
					read: false,
					responded: false,
					createdAt: new Date(),
					// Additional fields for invitation tracking
					invitationStatus: "pending", // pending, accepted, declined
					invitedAt: new Date(),
				};

				batch.set(notificationRef, notificationData);
				successCount++;
				console.log(`Prepared notification for creator ${creatorId}`);
			} catch (creatorError) {
				console.error(
					`Error preparing invitation for creator ${creatorId}:`,
					creatorError
				);
				continue;
			}
		}

		if (successCount > 0) {
			// Commit all notifications at once
			await batch.commit();
			console.log(
				`Successfully sent ${successCount} invitations for project ${projectId}`
			);
		} else {
			console.warn(
				`No valid creators found to invite for project ${projectId}`
			);
		}
	} catch (error) {
		console.error("Error sending creator invitations:", error);
		throw error;
	}
}

// GET handler - simplified
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");
		const projectId = url.searchParams.get("projectId");

		// Single project or draft
		if (projectId || (userId && !url.searchParams.has("filter"))) {
			const collection = projectId ? "projects" : "projectDrafts";
			const docId = projectId || userId;

			if (!docId) {
				return NextResponse.json(
					{ error: "Document ID is required" },
					{ status: 400 }
				);
			}
			const docRef = adminDb.collection(collection).doc(docId);
			const doc = await docRef.get();

			if (!doc.exists) {
				return NextResponse.json(
					{ error: "Document not found", exists: false },
					{ status: 404 }
				);
			}

			// Increment views for projects
			if (projectId) {
				await docRef.update({
					"metrics.views": admin.firestore.FieldValue.increment(1),
				});
			}

			return NextResponse.json({
				success: true,
				exists: true,
				data: doc.data(),
			});
		}

		// Project listing with basic filtering
		const status = url.searchParams.get("status") || "active";
		const limit = parseInt(url.searchParams.get("limit") || "10");

		let query = adminDb.collection("projects").where("status", "==", status);
		query = query.orderBy("createdAt", "desc").limit(limit);

		const snapshot = await query.get();
		const projects = snapshot.docs.map((doc) => doc.data());

		return NextResponse.json({
			success: true,
			data: projects,
			pagination: {
				hasMore: projects.length === limit,
				count: projects.length,
			},
		});
	} catch (error) {
		console.error("GET error:", error);
		return NextResponse.json(
			{ error: "Failed to retrieve projects" },
			{ status: 500 }
		);
	}
}

// POST handler - simplified and focused
export async function POST(request: NextRequest) {
	try {
		console.log("POST: Starting project creation");

		// Check payload size
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength) > MAX_JSON_SIZE) {
			return NextResponse.json({ error: "Payload too large" }, { status: 413 });
		}

		// Parse request data
		const contentType = request.headers.get("content-type") || "";
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let requestData: any = {};
		let thumbnailFile: File | null = null;

		if (contentType.includes("multipart/form-data")) {
			const formData = await request.formData();
			thumbnailFile = formData.get("projectThumbnail") as File | null;

			// Parse form fields
			for (const [key, value] of formData.entries()) {
				if (key !== "projectThumbnail" && typeof value === "string") {
					try {
						if (
							[
								"projectDetails",
								"projectRequirements",
								"creatorPricing",
								"invitedCreators",
							].includes(key)
						) {
							requestData[key] = JSON.parse(value);
						} else {
							requestData[key] = value;
						}
					} catch {
						requestData[key] = value;
					}
				}
			}
		} else {
			requestData = await request.json();
		}

		const {
			projectDetails = {},
			projectRequirements = {},
			creatorPricing = {},
			userId,
			isDraft,
			paid = false,
			paymentId,
		} = requestData;

		console.log(`POST: Processing for user ${userId}, isDraft: ${isDraft}`);

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
			);
		}

		// Handle draft save
		if (isDraft) {
			const draftData = {
				projectDetails,
				projectRequirements,
				creatorPricing,
				userId,
				status: "draft",
				lastUpdated: new Date().toISOString(),
			};

			await adminDb.collection("projectDrafts").doc(userId).set(draftData);

			return NextResponse.json({
				success: true,
				message: "Draft saved successfully",
				data: draftData,
			});
		}

		// Final submission validation
		if (!projectDetails.projectName) {
			return NextResponse.json(
				{ error: "Project name is required" },
				{ status: 400 }
			);
		}

		// Check brand approval for non-paid projects
		if (!paid) {
			const isApproved = await checkBrandApproval(userId);
			if (!isApproved) {
				return NextResponse.json(
					{
						error: "brand_not_approved",
						message:
							"Your brand profile must be approved before creating projects.",
					},
					{ status: 403 }
				);
			}
		}

		// Generate project ID
		const projectId = generateProjectId();
		console.log(`POST: Generated project ID: ${projectId}`);

		// Process thumbnail
		let thumbnailUrl: string | null = null;
		if (thumbnailFile) {
			thumbnailUrl = await processThumbnailSimple(
				thumbnailFile,
				projectId,
				userId
			);
		} else if (projectDetails.projectThumbnail?.startsWith("data:")) {
			// Handle base64 thumbnail
			try {
				const imageBuffer = Buffer.from(
					projectDetails.projectThumbnail.replace(
						/^data:image\/\w+;base64,/,
						""
					),
					"base64"
				);

				const bucket = adminStorage.bucket();
				const timestamp = Date.now();
				const filePath = `project-images/${userId}/${projectId}/${timestamp}.jpg`;
				const file = bucket.file(filePath);

				await file.save(imageBuffer, {
					metadata: { contentType: "image/jpeg" },
				});

				await file.makePublic();
				thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
			} catch (thumbnailError) {
				console.error("Base64 thumbnail processing error:", thumbnailError);
			}
		}

		// Verify payment if provided
		if (paid && paymentId) {
			try {
				const paymentDoc = await adminDb
					.collection("payments")
					.doc(paymentId)
					.get();
				if (!paymentDoc.exists || paymentDoc.data()?.status !== "completed") {
					return NextResponse.json(
						{ error: "Invalid or incomplete payment" },
						{ status: 400 }
					);
				}
			} catch (paymentError) {
				console.error("Payment verification error:", paymentError);
				return NextResponse.json(
					{ error: "Failed to verify payment" },
					{ status: 500 }
				);
			}
		}

		// Get brand name for notifications
		let brandName = "Brand";
		try {
			const brandSnapshot = await adminDb
				.collection("brandProfiles")
				.where("userId", "==", userId)
				.limit(1)
				.get();

			if (!brandSnapshot.empty) {
				const brandData = brandSnapshot.docs[0].data();
				brandName = brandData.companyName || brandData.brandName || "Brand";
			}
		} catch (brandError) {
			console.error("Error fetching brand name:", brandError);
		}

		// Get selected creators from the creatorPricing structure
		const selectedCreators =
			creatorPricing?.selectedCreators ||
			creatorPricing?.creator?.selectedCreators ||
			[];
		console.log("Selected creators found:", selectedCreators);

		// Create project data
		const projectData = {
			userId,
			projectId,
			projectDetails: {
				...projectDetails,
				projectThumbnail: thumbnailUrl,
			},
			projectRequirements,
			creatorPricing,
			status: paid ? ProjectStatus.ACTIVE : ProjectStatus.PENDING,
			applicationStatus: paid ? "open" : "closed",
			metrics: {
				views: 0,
				applications: 0,
				participants: 0,
				submissions: 0,
			},
			tags: extractTags({ projectDetails, projectRequirements }),
			featured: requestData.featured || false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			paymentId: paymentId || null,
			paid: paid,
			paymentAmount: null,
		};

		console.log("POST: Attempting to save to Firestore");

		// Save to Firestore with better error handling
		try {
			await adminDb.collection("projects").doc(projectId).set(projectData);
			console.log("POST: Successfully saved to Firestore");
		} catch (firestoreError) {
			console.error("Firestore save error:", firestoreError);

			// Log specific error details
			if (firestoreError instanceof Error) {
				console.error("Error name:", firestoreError.name);
				console.error("Error message:", firestoreError.message);
				console.error("Error stack:", firestoreError.stack);
			}

			// Try to identify the specific issue
			const errorMessage =
				firestoreError instanceof Error
					? firestoreError.message
					: String(firestoreError);

			if (errorMessage.includes("permission")) {
				return NextResponse.json(
					{ error: "Database permission denied" },
					{ status: 403 }
				);
			} else if (errorMessage.includes("quota")) {
				return NextResponse.json(
					{ error: "Database quota exceeded" },
					{ status: 429 }
				);
			} else if (errorMessage.includes("invalid")) {
				return NextResponse.json(
					{ error: "Invalid data format" },
					{ status: 400 }
				);
			}

			throw firestoreError; // Re-throw if we can't handle it specifically
		}

		// Send creator invitations if specific creators were selected
		if (
			selectedCreators &&
			Array.isArray(selectedCreators) &&
			selectedCreators.length > 0
		) {
			try {
				// Extract creator IDs from the selectedCreators array
				const creatorIds = selectedCreators
					.map((creator) => creator.id)
					.filter((id) => id);

				if (creatorIds.length > 0) {
					await sendCreatorInvitations(
						projectId,
						projectDetails.projectName,
						brandName,
						userId,
						creatorIds
					);
					console.log(`Sent invitations to ${creatorIds.length} creators`);
				}
				console.log("=== NOTIFICATION DEBUG ===");
				console.log("Project ID:", projectId);
				console.log("Creator IDs being invited:", creatorIds);

				// Verify notifications were created
				setTimeout(async () => {
					const testQuery = await adminDb
						.collection("notifications")
						.where("projectId", "==", projectId)
						.get();
					console.log(
						"Notifications created for this project:",
						testQuery.size
					);
					testQuery.docs.forEach((doc) => {
						console.log("Notification:", doc.data());
					});
				}, 2000);
        
			} catch (invitationError) {
				console.error("Error sending creator invitations:", invitationError);
				// Don't fail the entire request if invitations fail
			}
		}

		// Clean up draft after successful submission
		try {
			await adminDb.collection("projectDrafts").doc(userId).delete();
		} catch (draftError) {
			console.error("Draft cleanup error:", draftError);
			// Don't fail the request for this
		}

		// Create admin notification for non-paid projects
		if (!paid) {
			try {
				await adminDb.collection("notifications").add({
					recipientEmail: "madetechboy@gmail.com",
					message: `New project "${projectDetails.projectName}" requires approval`,
					status: "unread",
					type: "project_approval_requested",
					createdAt: new Date().toISOString(),
					relatedTo: "project",
					projectId: projectId,
					projectName: projectDetails.projectName,
				});
			} catch (notificationError) {
				console.error("Notification creation error:", notificationError);
				// Don't fail the request for this
			}
		}

		return NextResponse.json({
			success: true,
			message: paid
				? "Project created and activated successfully"
				: "Project created successfully and pending approval",
			data: projectData,
			invitationsSent: selectedCreators?.length || 0,
		});
	} catch (error) {
		console.error("POST: Unexpected error:", error);

		// Provide more specific error information
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				error: "Failed to process project",
				details: errorMessage,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// Simplified PUT handler
export async function PUT(request: NextRequest) {
	try {
		const requestData = await request.json();
		const { projectId, userId, ...updateData } = requestData;

		if (!projectId) {
			return NextResponse.json(
				{ error: "Project ID is required" },
				{ status: 400 }
			);
		}

		// Verify project exists and user has permission
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const existingProject = projectDoc.data();
		if (existingProject?.userId !== userId && userId !== "admin") {
			return NextResponse.json({ error: "Not authorized" }, { status: 403 });
		}

		// Update project
		const updatedData = {
			...updateData,
			updatedAt: new Date().toISOString(),
		};

		await projectRef.update(updatedData);

		return NextResponse.json({
			success: true,
			message: "Project updated successfully",
		});
	} catch (error) {
		console.error("PUT error:", error);
		return NextResponse.json(
			{ error: "Failed to update project" },
			{ status: 500 }
		);
	}
}

// Simplified DELETE handler
export async function DELETE(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const projectId = url.searchParams.get("projectId");
		const userId = url.searchParams.get("userId");

		if (!projectId) {
			return NextResponse.json(
				{ error: "Project ID is required" },
				{ status: 400 }
			);
		}

		// Verify project exists and user has permission
		const projectRef = adminDb.collection("projects").doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const existingProject = projectDoc.data();
		if (existingProject?.userId !== userId && userId !== "admin") {
			return NextResponse.json({ error: "Not authorized" }, { status: 403 });
		}

		// Delete project
		await projectRef.delete();

		return NextResponse.json({
			success: true,
			message: "Project deleted successfully",
		});
	} catch (error) {
		console.error("DELETE error:", error);
		return NextResponse.json(
			{ error: "Failed to delete project" },
			{ status: 500 }
		);
	}
}
