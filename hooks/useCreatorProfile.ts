import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
	id?: string;
	tiktokConnected?: boolean;
	tiktokUsername?: string;
	[key: string]: unknown;
}

type ProfileMode = "create" | "edit" | "view";

// Query keys
const creatorProfileKeys = {
	all: ["creatorProfile"] as const,
	profile: (userId: string) =>
		[...creatorProfileKeys.all, "profile", userId] as const,
};

// API response types
interface ApiResponse {
	success: boolean;
	data?: Record<string, unknown>;
	error?: string;
}

interface UpdateProfileResponse {
	success: boolean;
	data?: Record<string, unknown>;
	error?: string;
}

interface DisconnectTikTokResponse {
	success: boolean;
	message?: string;
	error?: string;
}

interface VerificationResponse {
	success: boolean;
	verificationId?: string;
	error?: string;
}

interface UploadResponse {
	publicUrl: string;
}

// API functions
const fetchCreatorProfile = async (
	currentUser: User | null
): Promise<CreatorProfile | null> => {
	if (!currentUser?.uid) {
		return null;
	}

	const constructProfileApiUrl = (user: User, timestamp: number): string => {
		let profileApiUrl = `/api/creator-profile?_t=${timestamp}`;
		if (user.uid) {
			profileApiUrl += `&userId=${user.uid}`;
		}
		if (user.email) {
			profileApiUrl += `&email=${encodeURIComponent(user.email)}`;
		}
		return profileApiUrl;
	};

	const timestamp = Date.now();
	const profileApiUrl = constructProfileApiUrl(currentUser, timestamp);

	const response = await fetch(profileApiUrl);

	if (!response.ok) {
		const errorData = (await response.json()) as { error?: string };
		throw new Error(errorData.error || "Failed to fetch profile");
	}

	const profileData = (await response.json()) as CreatorProfile;

	return {
		...profileData,
		id: currentUser.uid,
		userId: currentUser.uid,
		status: profileData.verificationStatus || profileData.status || undefined,
	};
};

const updateCreatorProfile = async (
	formData: FormData
): Promise<ApiResponse> => {
	const response = await fetch("/api/creator-profile", {
		method: "POST",
		body: formData,
	});

	const result = (await response.json()) as ApiResponse;

	if (!response.ok) {
		throw new Error(result.error || "Failed to update creator profile");
	}

	return result;
};

const disconnectTikTok = async (
	userId: string
): Promise<{ message: string }> => {
	const response = await fetch("/api/auth/tiktok/disconnect", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId }),
	});

	const result = (await response.json()) as { message: string; error?: string };

	if (!response.ok) {
		throw new Error(result.error || "Failed to disconnect TikTok account");
	}

	return result;
};

export const useCreatorProfile = (initialMode: ProfileMode = "view") => {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	const [mode, setMode] = useState<ProfileMode>(initialMode);

	// Query for fetching profile
	const {
		data: creatorProfile,
		isLoading: loading,
		error,
		refetch: refreshCreatorProfile,
	} = useQuery({
		queryKey: creatorProfileKeys.profile(currentUser?.uid || ""),
		queryFn: () => fetchCreatorProfile(currentUser),
		enabled: mode !== "create" && !!currentUser?.uid, // Only fetch when not in create mode
		staleTime: 30 * 1000, // Consider data fresh for 30 seconds
		gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
		retry: 2,
		refetchOnWindowFocus: false, // Disable refetch on window focus if you don't want it
	});

	// Mutation for updating profile
	const updateProfileMutation = useMutation({
		mutationFn: updateCreatorProfile,
		onSuccess: () => {
			// Clear pending signup data if it exists and localStorage is available
			if (typeof window !== "undefined" && window.localStorage) {
				const pendingSignupStr = localStorage.getItem("pendingSignup");
				if (pendingSignupStr) {
					localStorage.removeItem("pendingSignup");
				}
			}

			// Switch to edit mode
			setMode("edit");

			// Invalidate and refetch profile data
			queryClient.invalidateQueries({
				queryKey: creatorProfileKeys.profile(currentUser?.uid || ""),
			});

			// Dispatch global event if window is available
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("creator-profile-updated"));
			}
		},
	});

	// Mutation for disconnecting TikTok
	const disconnectTikTokMutation = useMutation({
		mutationFn: () => disconnectTikTok(currentUser?.uid || ""),
		onSuccess: () => {
			// Invalidate and refetch profile data
			queryClient.invalidateQueries({
				queryKey: creatorProfileKeys.profile(currentUser?.uid || ""),
			});

			// Dispatch global event if window is available
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("creator-profile-updated"));
			}
		},
	});

	// Wrapper functions to maintain the same API
	const updateCreatorProfileWrapper = async (
		formData: FormData
	): Promise<UpdateProfileResponse> => {
		try {
			// Check if localStorage is available
			const pendingSignupStr =
				typeof window !== "undefined" && window.localStorage
					? localStorage.getItem("pendingSignup")
					: null;

			if (!currentUser?.email && !pendingSignupStr) {
				throw new Error("User not authenticated and no pending signup found");
			}

			// Add user data to form
			if (currentUser?.email) {
				formData.append("email", currentUser.email);
			}
			if (currentUser?.uid) {
				formData.append("userId", currentUser.uid);
			}

			// Add pending signup if available
			if (pendingSignupStr) {
				formData.append("pendingSignup", pendingSignupStr);
			}

			const result = await updateProfileMutation.mutateAsync(formData);
			return { success: true, data: result.data };
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update creator profile";
			return { success: false, error: errorMessage };
		}
	};

	const disconnectTikTokAccount =
		async (): Promise<DisconnectTikTokResponse> => {
			try {
				if (!currentUser?.uid) {
					throw new Error("User not authenticated");
				}

				const result = await disconnectTikTokMutation.mutateAsync();
				return { success: true, message: result.message };
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to disconnect TikTok account";
				return { success: false, error: errorMessage };
			}
		};

	const submitVerification = async (verificationData: {
		profileData: Record<string, unknown>;
		verificationVideo?: File;
		verifiableID?: File;
		profilePicture?: File;
	}): Promise<VerificationResponse> => {
		try {
			if (!currentUser?.uid) {
				throw new Error("User not authenticated");
			}

			// Upload files in parallel
			const uploadFile = async (
				file: File | undefined,
				uploadType: string
			): Promise<string | null> => {
				if (!file) return null;

				const formData = new FormData();
				formData.append("userId", currentUser.uid);
				formData.append("uploadType", uploadType);
				formData.append("file", file);

				const response = await fetch("/api/upload-file", {
					method: "POST",
					body: formData,
				});

				if (response.ok) {
					const result = (await response.json()) as UploadResponse;
					return result.publicUrl;
				} else {
					const errorResult = (await response
						.json()
						.catch(() => ({ error: "Unknown error" }))) as { error: string };
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
				creatorId: currentUser.uid,
				profileData: {
					...verificationData.profileData,
					creatorId: currentUser.uid,
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

			const result = (await response.json()) as {
				verificationId?: string;
				error?: string;
			};

			if (response.ok) {
				// Invalidate profile data to trigger refetch
				queryClient.invalidateQueries({
					queryKey: creatorProfileKeys.profile(currentUser.uid),
				});
				return { success: true, verificationId: result.verificationId };
			} else {
				throw new Error(result.error || "Failed to submit verification");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to submit verification";
			return { success: false, error: errorMessage };
		}
	};

	const setProfileMode = (newMode: ProfileMode): void => {
		setMode(newMode);
		if (newMode === "edit" && currentUser) {
			// This will trigger a refetch if needed
			queryClient.invalidateQueries({
				queryKey: creatorProfileKeys.profile(currentUser.uid),
			});
		}
	};

	// Helper functions
	const getProfilePictureUrl = (): string | null => {
		return creatorProfile?.profilePictureUrl || null;
	};

	const getVerificationVideoUrl = (): string | null => {
		return creatorProfile?.verificationVideoUrl || null;
	};

	const getVerifiableIDUrl = (): string | null => {
		return creatorProfile?.verifiableIDUrl || null;
	};

	const isTikTokConnected = (): boolean => {
		if (!creatorProfile) return false;
		if (creatorProfile.tiktokConnected === true) return true;
		if (creatorProfile.profileData?.tiktokConnected === true) return true;
		return !!(
			creatorProfile.tiktokUsername ||
			creatorProfile.profileData?.tiktokUsername
		);
	};

	return {
		creatorProfile,
		loading:
			loading ||
			updateProfileMutation.isPending ||
			disconnectTikTokMutation.isPending,
		error:
			error?.message ||
			updateProfileMutation.error?.message ||
			disconnectTikTokMutation.error?.message ||
			null,
		mode,
		setProfileMode,
		refreshCreatorProfile,
		updateCreatorProfile: updateCreatorProfileWrapper,
		submitVerification,
		disconnectTikTokAccount,
		getProfilePictureUrl,
		getVerificationVideoUrl,
		getVerifiableIDUrl,
		isTikTokConnected,
		// Additional TanStack Query specific states
		isRefetching: loading,
		isUpdating: updateProfileMutation.isPending,
		isDisconnectingTikTok: disconnectTikTokMutation.isPending,
	};
};
