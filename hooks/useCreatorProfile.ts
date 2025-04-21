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
	// Verification-specific fields
	profileData?: Record<string, unknown>;
	verificationVideoUrl?: string;
	verifiableIDUrl?: string;
	status?: string;
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
			const profileApiUrl = `/api/creator-profile?email=${encodeURIComponent(currentUser.email)}&userId=${currentUser.uid}`;

			const profileResponse = await fetch(profileApiUrl);
			let combinedProfileData: CreatorProfile = {};

			if (profileResponse.ok) {
				const profileData = await profileResponse.json();
				combinedProfileData = { ...profileData };

				// Check for verification ID in all possible locations
				const verificationId =
					profileData.verificationId ||
					profileData.verification_id ||
					(profileData.verification && profileData.verification.id) ||
					null;

				// If we found a verificationId, fetch the verification data
				if (verificationId) {
					try {
						const verificationResponse = await fetch(
							`/api/verification?id=${verificationId}&userId=${currentUser.uid}`
						);

						if (verificationResponse.ok) {
							const verificationData = await verificationResponse.json();

							// Merge verification data with profile data
							combinedProfileData = {
								...combinedProfileData,
								verificationVideoUrl: verificationData.verificationVideoUrl,
								verifiableIDUrl: verificationData.verifiableIDUrl,
								profilePictureUrl:
									combinedProfileData.profilePictureUrl ||
									verificationData.profilePictureUrl,
								profileData: verificationData.profileData,
								status:
									verificationData.status ||
									verificationData.verificationStatus,
								verificationId: verificationId, // Ensure it's included in the combined data
							};
						} else {
							console.warn(
								"Failed to fetch verification data:",
								await verificationResponse.text()
							);
						}
					} catch (verificationErr) {
						console.error("Error fetching verification data:", verificationErr);
					}
				} else {
					// Even if no verification ID found, still try to fetch by user ID as fallback
					try {
						const verificationResponse = await fetch(
							`/api/verification?userId=${currentUser.uid}`
						);

						if (verificationResponse.ok) {
							const verificationData = await verificationResponse.json();

							// Merge verification data with profile data
							combinedProfileData = {
								...combinedProfileData,
								verificationVideoUrl: verificationData.verificationVideoUrl,
								verifiableIDUrl: verificationData.verifiableIDUrl,
								profilePictureUrl:
									combinedProfileData.profilePictureUrl ||
									verificationData.profilePictureUrl,
								profileData: verificationData.profileData,
								status:
									verificationData.status ||
									verificationData.verificationStatus,
								verificationId:
									verificationData.id ||
									verificationData._id ||
									verificationData.verificationId,
							};
						}
					} catch (fallbackErr) {
						console.error("Fallback verification fetch failed:", fallbackErr);
					}
				}
				setCreatorProfile(combinedProfileData);
			} else {
				const errorData = await profileResponse.json();
				console.error("API error:", errorData);
				setCreatorProfile(null);
				setError(errorData.error || "Failed to fetch profile");
			}
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

	const updateCreatorProfile = async (formData: FormData) => {
		try {
			setLoading(true);

			// Check for pending signup data
			const pendingSignupStr = localStorage.getItem("pendingSignup");

			if (!currentUser?.email && !pendingSignupStr) {
				setError("User not authenticated and no pending signup found");
				return {
					success: false,
					error: "User not authenticated and no pending signup found",
				};
			}

			// If we have a logged-in user, use their email
			if (currentUser?.email) {
				formData.append("email", currentUser.email);
			}

			// Ensure userId is added
			if (currentUser?.uid) {
				formData.append("userId", currentUser.uid);
			}

			// If we have pending signup data, add it to the request
			if (pendingSignupStr) {
				formData.append("pendingSignup", pendingSignupStr);
			}

			const response = await fetch("/api/creator-profile", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (response.ok) {
				// If signup was processed, clear the pending data
				if (pendingSignupStr) {
					localStorage.removeItem("pendingSignup");
				}

				// After successful creation/update, switch to edit mode
				setMode("edit");

				// Refresh profile data after successful update
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

	// New function to handle verification submission
	const submitVerification = async (verificationData: {
		profileData: Record<string, unknown>;
		verificationVideo?: File;
		verifiableID?: File;
		profilePicture?: File;
	}) => {
		try {
			setLoading(true);

			if (!currentUser?.uid) {
				setError("User not authenticated");
				return { success: false, error: "User not authenticated" };
			}

			// Prepare data for submission

			// Convert files to base64 if present
			const prepareFile = async (file: File | undefined) => {
				if (!file) return null;
				return new Promise((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => {
						const base64data = reader.result as string;
						// Remove prefix (e.g., "data:image/jpeg;base64,")
						const base64Content = base64data.split(",")[1];
						resolve({
							data: base64Content,
							name: file.name,
							type: file.type,
						});
					};
					reader.readAsDataURL(file);
				});
			};

			// Process files in parallel
			const [verificationVideoData, verifiableIDData, profilePictureData] =
				await Promise.all([
					prepareFile(verificationData.verificationVideo),
					prepareFile(verificationData.verifiableID),
					prepareFile(verificationData.profilePicture),
				]);

			// Prepare the request body
			const requestBody = {
				userId: currentUser.uid,
				profileData: verificationData.profileData,
				verificationVideo: verificationVideoData,
				verifiableID: verifiableIDData,
				profilePicture: profilePictureData,
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
				// Refresh profile data after successful submission
				await fetchCreatorProfile();
				return { success: true, verificationId: result.verificationId };
			} else {
				setError(result.error || "Failed to submit verification");
				return { success: false, error: result.error };
			}
		} catch (err) {
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

		// Clear existing data when switching to create mode
		if (newMode === "create") {
			setCreatorProfile(null);
		} else if (newMode === "edit" && currentUser) {
			// When switching to edit mode, fetch the latest data
			fetchCreatorProfile();
		}
	};

	// Return the fetch and update functions plus the new verification submission function
	return {
		creatorProfile,
		loading,
		error,
		mode,
		setProfileMode,
		refreshCreatorProfile: fetchCreatorProfile,
		updateCreatorProfile,
		submitVerification,
	};
};
