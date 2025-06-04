import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/types/user";

export interface CreatorProfile {
	displayUsername?: string;
	bio?: string;
	profilePictureUrl?: string;
	contentTypes?: string[];
	email?: string;
	verificationId?: string;
	verificationStatus?: string;
	userId?: string;
	verificationVideoUrl?: string;
	verifiableIDUrl?: string;
	status?: string;
	profileData?: Record<string, unknown>;
	[key: string]: unknown; // Allow for additional fields
}

type ProfileMode = "create" | "edit" | "view";

export const useCreatorProfile = (initialMode: ProfileMode = "view") => {
	const { currentUser } = useAuth();
	const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(
		null
	);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<ProfileMode>(initialMode);

	const constructProfileApiUrl = (
		currentUser: User | null,
		timestamp: number
	) => {
		// Start with the base URL
		let profileApiUrl = `/api/creator-profile?_t=${timestamp}`;

		// Add userId if available
		if (currentUser?.uid) {
			profileApiUrl += `&userId=${currentUser.uid}`;
		}

		// Add email if available
		if (currentUser?.email) {
			profileApiUrl += `&email=${encodeURIComponent(currentUser.email)}`;
		}

		return profileApiUrl;
	};

	const timestamp = Date.now(); // Current timestamp to prevent caching
	const profileApiUrl = constructProfileApiUrl(currentUser, timestamp);

	// In your useCreatorProfile hook, update the fetchCreatorProfile function:

	const fetchCreatorProfile = async () => {
		if (!currentUser?.uid) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// First fetch basic profile data
			const profileResponse = await fetch(profileApiUrl);

			if (!profileResponse.ok) {
				const errorData = await profileResponse.json();
				setError(errorData.error || "Failed to fetch profile");
				setCreatorProfile(null);
				return;
			}

			const profileData = await profileResponse.json();

			// Fetch verification data using the auth user ID
			let verificationData: Partial<CreatorProfile> = {};

			try {
				const verificationResponse = await fetch(
					`/api/verification?userId=${currentUser.uid}`
				);

				if (verificationResponse.ok) {
					verificationData = await verificationResponse.json();
					console.log("Verification data received:", verificationData);
				} else {
					console.warn(
						"Failed to fetch verification by userId, status:",
						verificationResponse.status
					);
				}
			} catch (err) {
				console.error("Error fetching verification by userId:", err);
			}

			// Merge the data with clear priorities and ID consistency
			const combinedProfileData: CreatorProfile = {
				...profileData,
				...verificationData,
				// CRITICAL: Use the auth user ID as the primary identifier
				id: currentUser.uid, // This is what gets used as creator.id
				userId: currentUser.uid, // Keep consistent
				verificationId: verificationData.verificationId || currentUser.uid, // Keep the verification ID for reference
				// Make sure specific properties are properly merged with priorities
				profilePictureUrl:
					verificationData.profilePictureUrl ||
					profileData.profilePictureUrl ||
					null,
				verificationVideoUrl:
					verificationData.verificationVideoUrl ||
					profileData.verificationVideoUrl ||
					null,
				verifiableIDUrl:
					verificationData.verifiableIDUrl ||
					profileData.verifiableIDUrl ||
					null,
				status:
					verificationData.status ||
					profileData.status ||
					profileData.verificationStatus ||
					null,
				// Ensure profileData is preserved if it exists
				profileData: {
					...(verificationData.profileData || {}),
					...(profileData.profileData || {}),
					// Maintain ID consistency in nested data
					id: currentUser.uid,
					userId: currentUser.uid,
				},
			};

			console.log("=== CREATOR PROFILE DEBUG ===");
			console.log("Auth User ID:", currentUser.uid);
			console.log("Profile ID (creator.id):", combinedProfileData.id);
			console.log("User ID:", combinedProfileData.userId);
			console.log("Verification ID:", combinedProfileData.verificationId);

			setCreatorProfile(combinedProfileData);
		} catch (err) {
			console.error("Error fetching creator profile:", err);
			setError("Failed to fetch creator profile");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Only fetch profile data if we're in edit or view mode
		if (mode !== "create" && currentUser) {
			fetchCreatorProfile();
		} else if (mode === "create") {
			// Clear any existing profile data when in create mode
			setCreatorProfile(null);
		}
	}, [currentUser, mode]);

	useEffect(() => {
		// Function to handle global profile update events
		const handleProfileUpdate = () => {
			fetchCreatorProfile();
		};

		// Add event listener
		window.addEventListener("creator-profile-updated", handleProfileUpdate);

		// Clean up
		return () => {
			window.removeEventListener(
				"creator-profile-updated",
				handleProfileUpdate
			);
		};
	}, [currentUser]);

	const updateCreatorProfile = async (formData: FormData) => {
		try {
			setLoading(true);

			if (!currentUser?.email && !localStorage.getItem("pendingSignup")) {
				setError("User not authenticated and no pending signup found");
				return {
					success: false,
					error: "User not authenticated and no pending signup found",
				};
			}

			// Add user data to form
			if (currentUser?.email) {
				formData.append("email", currentUser.email);
			}

			if (currentUser?.uid) {
				formData.append("userId", currentUser.uid);
			}

			// Add pending signup if available
			const pendingSignupStr = localStorage.getItem("pendingSignup");
			if (pendingSignupStr) {
				formData.append("pendingSignup", pendingSignupStr);
			}

			const response = await fetch("/api/creator-profile", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (response.ok) {
				// Clear pending signup data if processed
				if (pendingSignupStr) {
					localStorage.removeItem("pendingSignup");
				}

				// Switch to edit mode
				setMode("edit");

				// Refresh profile data
				await fetchCreatorProfile();
				return { success: true, data: result.data };
			} else {
				setError(result.error || "Failed to update creator profile");
				return { success: false, error: result.error };
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update creator profile";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// New function to disconnect TikTok account
	const disconnectTikTokAccount = async () => {
		try {
			setLoading(true);
			setError(null);

			if (!currentUser?.uid) {
				setError("User not authenticated");
				return { success: false, error: "User not authenticated" };
			}

			const response = await fetch("/api/auth/tiktok/disconnect", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId: currentUser.uid }),
			});

			const result = await response.json();

			if (response.ok) {
				// Immediately update local state to reflect the disconnection
				if (creatorProfile) {
					const updatedProfile = { ...creatorProfile };

					// Remove TikTok-related fields from the root level
					delete updatedProfile.tiktokConnected;
					delete updatedProfile.tiktokId;
					delete updatedProfile.tiktokUsername;
					delete updatedProfile.tiktokAvatarUrl;

					// Also clean the nested profileData if it exists
					if (updatedProfile.profileData) {
						delete updatedProfile.profileData.tiktokConnected;
						delete updatedProfile.profileData.tiktokId;
						delete updatedProfile.profileData.tiktokUsername;
						delete updatedProfile.profileData.tiktokAvatarUrl;
					}

					setCreatorProfile(updatedProfile);
				}

				// Refresh profile data to ensure it's updated
				await fetchCreatorProfile();

				// Dispatch an event to notify other components
				window.dispatchEvent(new CustomEvent("creator-profile-updated"));

				return { success: true, message: result.message };
			} else {
				setError(result.error || "Failed to disconnect TikTok account");
				return { success: false, error: result.error };
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to disconnect TikTok account";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	const submitVerification = async (verificationData: {
		profileData: Record<string, unknown>;
		verificationVideo?: File; // Changed from verificationVideoUrl
		verifiableID?: File; // Changed from verifiableIDUrl
		profilePicture?: File; // Changed from profilePictureUrl
	}) => {
		try {
			setLoading(true);

			if (!currentUser?.uid) {
				setError("User not authenticated");
				return { success: false, error: "User not authenticated" };
			}

			// Upload files in parallel
			const uploadFile = async (file: File | undefined, uploadType: string) => {
				if (!file) {
					return null;
				}

				const formData = new FormData();
				formData.append("userId", currentUser.uid);
				formData.append("uploadType", uploadType);
				formData.append("file", file);

				const response = await fetch("/api/upload-file", {
					method: "POST",
					body: formData,
				});

				if (response.ok) {
					const result = await response.json();
					return result.publicUrl;
				} else {
					const errorResult = await response
						.json()
						.catch(() => ({ error: "Unknown error" }));
					console.error(`${uploadType} upload failed:`, errorResult);
					return null;
				}
			};

			const [verificationVideoUrl, verifiableIDUrl, profilePictureUrl] =
				await Promise.all([
					uploadFile(verificationData.verificationVideo, "verificationVideo"),
					uploadFile(verificationData.verifiableID, "verifiableID"),
					uploadFile(verificationData.profilePicture, "profilePicture"),
				]);

			// Submit verification with URLs
			const requestBody = {
				userId: currentUser.uid,
				creatorId: currentUser.uid, // Make sure creator ID matches user ID
				profileData: {
					...verificationData.profileData,
					creatorId: currentUser.uid, // Ensure consistency
				},
				verificationVideoUrl,
				verifiableIDUrl,
				profilePictureUrl,
			};

			const response = await fetch("/api/submit-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			const result = await response.json();

			if (response.ok) {
				// Refresh profile after submission
				await fetchCreatorProfile();
				return { success: true, verificationId: result.verificationId };
			} else {
				console.error("Verification submission failed:", result);
				setError(result.error || "Failed to submit verification");
				return { success: false, error: result.error };
			}
		} catch (err) {
			console.error("Exception during verification submission:", err);
			const errorMessage =
				err instanceof Error ? err.message : "Failed to submit verification";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	const setProfileMode = (newMode: ProfileMode) => {
		setMode(newMode);

		if (newMode === "create") {
			setCreatorProfile(null);
		} else if (newMode === "edit" && currentUser) {
			fetchCreatorProfile();
		}
	};

	// Helper functions to get specific URLs
	const getProfilePictureUrl = () => {
		if (!creatorProfile) return null;
		// Check all possible locations for a profile picture URL
		return creatorProfile.profilePictureUrl || null;
	};

	// Helper for verification video URL
	const getVerificationVideoUrl = () => {
		if (!creatorProfile) return null;
		return creatorProfile.verificationVideoUrl || null;
	};

	// Helper for ID URL
	const getVerifiableIDUrl = () => {
		if (!creatorProfile) return null;
		return creatorProfile.verifiableIDUrl || null;
	};

	// Helper to check if TikTok is connected
	const isTikTokConnected = () => {
		if (!creatorProfile) return false;

		// Check root level
		if (creatorProfile.tiktokConnected === true) return true;

		// Check nested profileData
		if (creatorProfile.profileData?.tiktokConnected === true) return true;

		// Check for TikTok username as a fallback
		return !!(
			creatorProfile.tiktokUsername ||
			creatorProfile.profileData?.tiktokUsername
		);
	};

	return {
		creatorProfile,
		loading,
		error,
		mode,
		setProfileMode,
		refreshCreatorProfile: fetchCreatorProfile,
		updateCreatorProfile,
		submitVerification,
		disconnectTikTokAccount, // New function to disconnect TikTok
		getProfilePictureUrl,
		getVerificationVideoUrl,
		getVerifiableIDUrl,
		isTikTokConnected, // New helper function
	};
};
