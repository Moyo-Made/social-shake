import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

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

	const fetchCreatorProfile = async () => {
		if (!currentUser?.uid) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// First fetch basic profile data
			// Add timestamp to prevent caching
			const timestamp = new Date().getTime();
			const profileApiUrl = `/api/creator-profile?userId=${currentUser.uid}&_t=${timestamp}`;
			const profileResponse = await fetch(profileApiUrl);

			if (!profileResponse.ok) {
				const errorData = await profileResponse.json();
				setError(errorData.error || "Failed to fetch profile");
				setCreatorProfile(null);
				return;
			}

			const profileData = await profileResponse.json();
			console.log("Profile data fetched:", profileData);

			// Fetch verification data if we have an ID
			const verificationId = profileData.verificationId || null;
			console.log("Verification ID:", verificationId);

			let verificationData: Partial<CreatorProfile> = {};

			// If we still don't have verification data, try by userId as fallback
			if (Object.keys(verificationData).length === 0) {
				try {
					const verificationResponse = await fetch(
						`/api/verification?userId=${currentUser.uid}`
					);

					if (verificationResponse.ok) {
						verificationData = await verificationResponse.json();
						console.log(
							"Verification data fetched by userId:",
							verificationData
						);
					} else {
						console.warn(
							"Failed to fetch verification by userId, status:",
							verificationResponse.status
						);
					}
				} catch (err) {
					console.error("Error fetching verification by userId:", err);
				}
			}

			console.log("Final verification data:", verificationData);

			// Merge the data with clear priorities
			const combinedProfileData: CreatorProfile = {
				...profileData,
				...verificationData,
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
				},
			};

			setCreatorProfile(combinedProfileData);
			console.log("Combined profile after fetching:", combinedProfileData);

			// Log specific URLs for debugging
			console.log(
				"Profile Picture URL:",
				combinedProfileData.profilePictureUrl
			);
			console.log(
				"Verification Video URL:",
				combinedProfileData.verificationVideoUrl
			);
			console.log("Verifiable ID URL:", combinedProfileData.verifiableIDUrl);
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
			console.log("Profile update event detected in hook, refreshing data");
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
				console.log("TikTok account disconnected successfully");

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

			console.log("Starting verification submission with data:", {
				hasVideo: !!verificationData.verificationVideo,
				hasID: !!verificationData.verifiableID,
				hasPicture: !!verificationData.profilePicture,
				profileDataKeys: Object.keys(verificationData.profileData),
			});

			// Upload files in parallel
			const uploadFile = async (file: File | undefined, uploadType: string) => {
				if (!file) {
					console.log(`No ${uploadType} file provided to upload`);
					return null;
				}

				console.log(`Uploading ${uploadType} file:`, file.name);

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
					console.log(`${uploadType} upload success:`, result.publicUrl);
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
				profileData: verificationData.profileData,
				verificationVideoUrl,
				verifiableIDUrl,
				profilePictureUrl,
			};

			console.log("Submitting verification with URLs:", {
				verificationVideoUrl,
				verifiableIDUrl,
				profilePictureUrl,
			});

			const response = await fetch("/api/submit-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			const result = await response.json();

			if (response.ok) {
				console.log("Verification submission successful:", result);
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
