import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { BrandStatus } from "@/types/user";
import { v4 as uuidv4 } from "uuid"; // You'll need to install this package

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const imageFile = formData.get("logo") as File | null;
		const email = formData.get("email") as string;
		const userId = formData.get("userId") as string;
		const profileId = formData.get("profileId") as string; // For editing existing profiles
		const completeSignup = formData.get("completeSignup") === "true";

		// Extract form data
		const formDataObj: Record<string, string> = {};
		formData.forEach((value, key) => {
			if (key !== "logo" && typeof value === "string") {
				formDataObj[key] = value;
			}
		});

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// For complete signup process
		let resolvedUserId = userId || "";

		if (completeSignup) {
			// For new users completing their registration (from localStorage flow)
			const firstName = formDataObj.firstName;
			const lastName = formDataObj.lastName;
			const userType = formDataObj.userType || "brand";

			if (!firstName || !lastName) {
				return NextResponse.json(
					{
						error: "missing-user-data",
						message: "First name and last name are required for registration",
					},
					{ status: 400 }
				);
			}

			// If userId wasn't provided from auth context, check if the account already exists
			if (!resolvedUserId) {
				// Check if the email is already in use in the users collection
				const userQuery = await adminDb
					.collection("users")
					.where("email", "==", email)
					.get();

				if (!userQuery.empty) {
					// Email already used - extract existing userId
					resolvedUserId = userQuery.docs[0].id;
				} else {
					// The user record should have been created by the auth system
					// Let's search by email to find the newly created user
					try {
						const userRecord = await adminAuth.getUserByEmail(email);
						if (userRecord) {
							resolvedUserId = userRecord.uid;

							// Create the user document in Firestore
							await adminDb.collection("users").doc(resolvedUserId).set({
								email,
								firstName,
								lastName,
								userType,
								role: "user",
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							});
						}
					} catch (authError) {
						console.error("Auth lookup error:", authError);
						return NextResponse.json(
							{
								error: "user-not-found",
								message: "User account not found. Please try signing up again.",
							},
							{ status: 404 }
						);
					}
				}
			}
		} else if (!profileId) {
			// If not completing signup and not editing an existing profile,
			// ensure the user exists before creating a new profile
			if (!resolvedUserId) {
				const userQuery = await adminDb
					.collection("users")
					.where("email", "==", email)
					.get();

				if (!userQuery.empty) {
					resolvedUserId = userQuery.docs[0].id;
				} else {
					try {
						const userRecord = await adminAuth.getUserByEmail(email);
						resolvedUserId = userRecord.uid;
					} catch {
						return NextResponse.json(
							{
								error: "user-not-found",
								message: "User account not found. Please sign in first.",
							},
							{ status: 404 }
						);
					}
				}
			}
		}

		// Generate a new profileId if we're creating a new profile
		const newProfileId = profileId || uuidv4();

		// Using Admin SDK for Firestore operations
		if (!email) {
			throw new Error("Email is required and cannot be null");
		}
		const brandRef = adminDb.collection("brandProfiles").doc(email);
		const docSnap = await brandRef.get();

		const profileData: Record<
			string,
			string | number | boolean | null | Record<string, string>
		> = {
			...formDataObj,
			email, // Keep email in the data for easier querying
			userId: resolvedUserId,
			profileId: newProfileId,
			status: BrandStatus.PENDING, // Set initial status to pending
			updatedAt: new Date().toISOString(),
			createdAt: docSnap.exists
				? docSnap.data()?.createdAt
				: new Date().toISOString(),
		};

		// Handle image upload if file exists
		if (imageFile && imageFile.size > 0) {
			try {
				console.log(
					`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`
				);

				// Check if the file is actually an image
				if (!imageFile.type.startsWith("image/")) {
					throw new Error(
						`Invalid file type: ${imageFile.type}. Only images are accepted.`
					);
				}

				// Get buffer from File object
				const arrayBuffer = await imageFile.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				if (buffer.length === 0) {
					throw new Error("File buffer is empty");
				}

				console.log(
					`Buffer created successfully, size: ${buffer.length} bytes`
				);

				// Use a simpler file path with fewer special characters
				const timestamp = Date.now();
				const fileExtension = imageFile.name.split(".").pop() || "jpg";
				const fileName = `${timestamp}.${fileExtension}`;
				// Update path to include profileId
				const filePath = `brand-images/${resolvedUserId}/${newProfileId}/${fileName}`;

				// Get bucket and create file reference
				const bucket = adminStorage.bucket();
				const fileRef = bucket.file(filePath);

				// Upload with simplified options
				await new Promise((resolve, reject) => {
					const blobStream = fileRef.createWriteStream({
						metadata: {
							contentType: imageFile.type,
						},
						resumable: false,
					});

					blobStream.on("error", (error) => {
						console.error("Stream error:", error);
						reject(error);
					});

					blobStream.on("finish", () => {
						console.log("Upload stream finished");
						resolve(true);
					});

					blobStream.end(buffer);
				});

				// Make the file public
				await fileRef.makePublic();

				// Get the public URL
				const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
				console.log(`File uploaded successfully. URL: ${publicUrl}`);

				profileData.logoUrl = publicUrl;
			} catch (uploadError: unknown) {
				console.error("Image upload error details:", uploadError);
				if (uploadError instanceof Error) {
					console.error("Error message:", uploadError.message);
					console.error("Error stack:", uploadError.stack);
				} else {
					console.error("Unknown upload error:", uploadError);
				}

				// Add the error to profileData but continue with the rest of the request
				profileData.logoUploadError =
					uploadError instanceof Error ? uploadError.message : "Unknown error";
			}
		} else if (imageFile) {
			console.warn("Image file provided but has zero size");
			profileData.logoUploadError = "Empty file provided";
		}

		// Process social media handles
		const socialMedia = {
			tiktok: (formData.get("socialMedia.tiktok") as string) || "",
			instagram: (formData.get("socialMedia.instagram") as string) || "",
			facebook: (formData.get("socialMedia.facebook") as string) || "",
		};

		// Add social media to profile data
		profileData.socialMedia = socialMedia;

		// Save to Firestore regardless of image upload result
		await brandRef.set(profileData, { merge: true });

		// If this is a new brand profile, create an entry in the notifications collection
		if (!docSnap.exists) {
			await adminDb.collection("notifications").add({
				recipientEmail: email,
				userId: resolvedUserId,
				profileId: newProfileId,
				message:
					"Your brand profile has been submitted for approval. We'll review it shortly.",
				status: "unread",
				type: "status_update",
				createdAt: new Date().toISOString(),
				relatedTo: "brand_profile",
			});

			// Also notify admins about the new brand profile
			const adminQuery = await adminDb
				.collection("users")
				.where("role", "==", "admin")
				.get();
			if (!adminQuery.empty) {
				adminQuery.forEach(async (adminDoc) => {
					await adminDb.collection("notifications").add({
						recipientEmail: adminDoc.data().email,
						message: `New brand profile submission from ${email} is pending your approval.`,
						status: "unread",
						type: "new_brand",
						createdAt: new Date().toISOString(),
						relatedTo: "brand_profile",
						brandEmail: email,
						userId: resolvedUserId,
						profileId: newProfileId,
					});
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: completeSignup
				? "Account created and brand profile saved successfully"
				: "Brand profile saved successfully and submitted for approval",
			data: {
				email,
				userId: resolvedUserId,
				profileId: newProfileId,
				brandName: profileData.brandName,
				logoUrl: profileData.logoUrl,
			},
		});
	} catch (error: unknown) {
		console.error("Error saving brand profile:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to save brand profile";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const profileId = searchParams.get("profileId");
		let userId = searchParams.get("userId");
		const email = searchParams.get("email");

		console.log("Received query for profile lookup:", {
			profileId,
			userId,
			email,
		});

		// If profileId is provided directly, we can look it up across all users
		if (profileId) {
			// First try to find the profile using a query across all users
			const profilesQuery = await adminDb
				.collectionGroup("brandProfiles")
				.where("profileId", "==", profileId)
				.limit(1)
				.get();

			if (!profilesQuery.empty) {
				const profileData = profilesQuery.docs[0].data();
				console.log("Retrieved profile data:", profileData);
				return NextResponse.json(profileData);
			}

			console.warn(`No profile found for profileId: ${profileId}`);
			return NextResponse.json(
				{ error: "Brand profile not found" },
				{ status: 404 }
			);
		}

		// If email is provided but no profileId, we need to find the associated userId first
		if (email && !userId) {
			console.log("Looking up user by email:", email);
			const userQuery = await adminDb
				.collection("users")
				.where("email", "==", email)
				.limit(1)
				.get();

			if (userQuery.empty) {
				// Try Auth system as fallback
				try {
					const userRecord = await adminAuth.getUserByEmail(email);
					userId = userRecord.uid;
				} catch {
					console.warn(`No user found for email: ${email}`);
					return NextResponse.json(
						{ error: "User not found" },
						{ status: 404 }
					);
				}
			} else {
				userId = userQuery.docs[0].id;
			}
		}

		if (!userId) {
			console.warn("No userId available for profile lookup");
			return NextResponse.json(
				{ error: "UserID is required" },
				{ status: 400 }
			);
		}

		if (!email) {
			console.warn("No email provided for brand profile lookup");
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Get all brand profiles for this user (we'll return the first one by default)
		const brandRef = adminDb.collection("brandProfiles").doc(email);
		const docSnap = await brandRef.get();

		console.log("Document exists:", docSnap.exists);

		if (!docSnap.exists) {
			console.warn(`No profile found for email: ${email}`);
			return NextResponse.json(
				{ error: "Brand profile not found" },
				{ status: 404 }
			);
		}

		const profileData = docSnap.data();
		console.log("Retrieved profile data:", profileData);

		return NextResponse.json(profileData);
	} catch (error) {
		console.error("Detailed error fetching brand profile:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch brand profile",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const data = await request.json();
		const { email } = data;

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Using top-level brandProfiles collection
		const brandRef = adminDb.collection("brandProfiles").doc(email);
		const docSnap = await brandRef.get();

		if (!docSnap.exists) {
			return NextResponse.json(
				{ error: "Brand profile not found" },
				{ status: 404 }
			);
		}

		// Clean the received data to prevent field duplication
		const { socialMedia, ...otherData } = data;

		// Remove any dot-notation socialMedia fields if they exist
		const cleanedData = Object.keys(otherData).reduce(
			(acc, key) => {
				if (!key.startsWith("socialMedia.")) {
					acc[key] = otherData[key];
				}
				return acc;
			},
			{} as Record<string, unknown>
		);

		// Create a clean update object
		const updateData = {
			...cleanedData,
			socialMedia: socialMedia || {}, // Ensure it's an object
			updatedAt: new Date().toISOString(),
		};

		// Update the document
		await brandRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "Brand profile updated successfully",
			data: updateData,
		});
	} catch (error) {
		console.error("Error updating brand profile:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to update brand profile";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
