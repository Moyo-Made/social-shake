import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface BrandProfile {
	brandName: string;
	logoUrl?: string;
	industry: string;
	targetAudience: string;
	[key: string]: string | undefined;
}

type ProfileMode = "create" | "edit" | "view";

export const useBrandProfile = (initialMode: ProfileMode = "view") => {
	const { currentUser } = useAuth();
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<ProfileMode>(initialMode);

	const fetchBrandProfile = async () => {
		if (!currentUser?.email) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Fetch from API (which uses Admin SDK)
			const apiUrl = `/api/brand-profile?email=${encodeURIComponent(currentUser.email)}&userId=${currentUser.uid}`;
			const response = await fetch(apiUrl);

			if (response.ok) {
				const data = (await response.json()) as BrandProfile;
				setBrandProfile(data);
				setLoading(false);
				return;
			}

			// Fallback to Firestore client SDK if API fails
			const brandRef = doc(db, "brandProfiles", currentUser.email);
			const docSnap = await getDoc(brandRef);

			if (docSnap.exists()) {
				const data = docSnap.data() as BrandProfile;
				setBrandProfile(data);
			} else {
				setBrandProfile(null);
			}
		} catch (err) {
			console.error("Error fetching brand profile:", err);
			setError("Failed to fetch brand profile");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Only fetch profile data if we're in edit or view mode
		if (mode !== "create" && currentUser) {
			fetchBrandProfile();
		} else if (mode === "create") {
			// Clear any existing profile data when in create mode
			setBrandProfile(null);
		}
	}, [currentUser, mode]);

	const updateBrandProfile = async (formData: FormData) => {
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

			// If we have pending signup data, add it to the request
			if (pendingSignupStr) {
				formData.append("pendingSignup", pendingSignupStr);
			}

			const response = await fetch("/api/brand-profile", {
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
				await fetchBrandProfile();

				return { success: true, data: result.data };
			} else {
				setError(result.error || "Failed to update brand profile");
				return { success: false, error: result.error };
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update brand profile";
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
			setBrandProfile(null);
		} else if (newMode === "edit" && currentUser) {
			// When switching to edit mode, fetch the latest data
			fetchBrandProfile();
		}
	};

	// Return the fetch and update functions
	return {
		brandProfile,
		loading,
		error,
		mode,
		setProfileMode,
		refreshBrandProfile: fetchBrandProfile,
		updateBrandProfile,
	};
};
