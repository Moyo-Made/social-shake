import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { BrandStatus } from "@/types/user";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const imageFile = formData.get("logo") as File | null;
		const email = formData.get("email") as string;
		const userId = formData.get("userId") as string;
		const profileId = formData.get("profileId") as string; // For editing existing profiles

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

		// Assuming the Firebase account already exists, verify userId is provided
		let resolvedUserId = userId;
		
		if (!resolvedUserId) {
			// Try to find the user by email if userId was not provided
			if (!adminAuth) {
				throw new Error("Firebase admin auth is not initialized");
			}
			try {
				const userRecord = await adminAuth.getUserByEmail(email);
				resolvedUserId = userRecord.uid;
			} catch {
				return NextResponse.json(
					{
						error: "user-not-found",
						message: "User account not found. Please ensure you're signed in first.",
					},
					{ status: 404 }
				);
			}
		}

		// Generate a new profileId if we're creating a new profile
		const newProfileId = profileId || uuidv4();

		// Using Admin SDK for Firestore operations
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		
		const brandRef = adminDb.collection("brandProfiles").doc(email);
		const docSnap = await brandRef.get();

		const profileData: Record<
			string,
			string | number | boolean | null | Record<string, string>
		> = {
			...formDataObj,
			email,
			userId: resolvedUserId,
			profileId: newProfileId,
			status: BrandStatus.APPROVED,
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
				if (!adminStorage) {
					throw new Error("Firebase admin storage is not initialized");
				}
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

		// Create a success notification for the user
		await adminDb.collection("notifications").add({
			recipientEmail: email,
			userId: resolvedUserId,
			profileId: newProfileId,
			message: "Your brand profile has been created successfully and is now active.",
			status: "unread",
			type: "status_update",
			createdAt: new Date().toISOString(),
			relatedTo: "brand_profile",
		});

		return NextResponse.json({
			success: true,
			message: "Brand profile created and activated successfully",
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
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
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

		// If only userId is provided (no email)
		if (userId && !email) {
			// Query the brandProfiles collection for documents where userId matches
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			const brandProfilesQuery = await adminDb
				.collection("brandProfiles")
				.where("userId", "==", userId)
				.limit(1)
				.get();

			if (!brandProfilesQuery.empty) {
				const profileData = brandProfilesQuery.docs[0].data();
				console.log("Retrieved profile data by userId:", profileData);
				return NextResponse.json(profileData);
			}

			console.warn(`No profile found for userId: ${userId}`);
			return NextResponse.json(
				{ error: "Brand profile not found" },
				{ status: 404 }
			);
		}

		// If email is provided but no userId, we need to find the associated userId first
		if (email && !userId) {
			console.log("Looking up user by email:", email);
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			const userQuery = await adminDb
				.collection("users")
				.where("email", "==", email)
				.limit(1)
				.get();

			if (userQuery.empty) {
				// Try Auth system as fallback

				try {
					if (!adminAuth) {
						throw new Error("Firebase admin auth is not initialized");
					}
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

		// If we still have no userId at this point, return an error
		if (!userId) {
			console.warn("No userId available for profile lookup");
			return NextResponse.json(
				{ error: "UserID or email is required" },
				{ status: 400 }
			);
		}

		// If we have both email and userId, try to get the profile by email first
		if (email) {
			if (!adminDb) {
				throw new Error("Firebase admin database is not initialized");
			}
			const brandRef = adminDb.collection("brandProfiles").doc(email);
			const docSnap = await brandRef.get();
			
			if (docSnap.exists) {
				const profileData = docSnap.data();
				console.log("Retrieved profile data by email:", profileData);
				return NextResponse.json(profileData);
			}
		}

		// If we couldn't find by email or no email was provided, try by userId
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
		const brandProfilesQuery = await adminDb
			.collection("brandProfiles")
			.where("userId", "==", userId)
			.limit(1)
			.get();

		if (!brandProfilesQuery.empty) {
			const profileData = brandProfilesQuery.docs[0].data();
			console.log("Retrieved profile data by userId fallback:", profileData);
			return NextResponse.json(profileData);
		}

		console.warn(`No profile found for userId: ${userId}`);
		return NextResponse.json(
			{ error: "Brand profile not found" },
			{ status: 404 }
		);
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
		if (!adminDb) {
			throw new Error("Firebase admin database is not initialized");
		}
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