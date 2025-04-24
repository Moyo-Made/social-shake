"use client";

import {
	BasicFormData,
	ContestFormData,
	PrizeTimelineFormData,
	RequirementsFormData,
} from "@/types/contestFormData";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";

export type Incentive = {
	name: string;
	worth: number;
	description: string;
};

// Add API response types
type ApiResponse = {
	success?: boolean;
	message?: string;
	error?: string;
	data?: Record<string, unknown>;
	exists?: boolean;
};

// Define types for validation
type ValidationFunction = () => boolean;
type ValidationSteps = Record<string, ValidationFunction>;

const defaultFormData: ContestFormData = {
	basic: {
		contestName: "",
		industry: "",
		description: "",
		rules: "",
		thumbnail: null,
		contestType: "Leaderboard",
	},
	requirements: {
		whoCanJoin: "allow-applications",
		duration: "30-seconds",
		videoType: "client-script",
		script: "",
		contentLinks: [""],
		brandAssets: "",
	},
	prizeTimeline: {
		totalBudget: 1500,
		winnerCount: 5,
		positions: [1000, 300, 100, 50, 50],
		startDate: undefined,
		endDate: undefined,
		criteria: "views",
	},
	contestType: "Leaderboard",
	incentives: [],
	status: "",
	brandEmail: "",
	contestId: "",
	userId: "",
	brandInfo: {
		name: "",
		logo: "",
		website: undefined,
		description: undefined
	},
	participantsCount: 0,
	createdAt: ""
};

interface ContestFormContextType {
	formData: ContestFormData;
	updateBasicData: (data: Partial<BasicFormData>) => void;
	updateRequirementsData: (data: Partial<RequirementsFormData>) => void;
	updatePrizeTimelineData: (data: Partial<PrizeTimelineFormData>) => void;
	updateIncentivesData: (incentives: Incentive[]) => void;
	saveDraft: () => Promise<ApiResponse>;
	submitContest: () => Promise<ApiResponse>;
	resetDraft: () => void;
	draftSaved: boolean;
	isLoading: boolean;
	error: string | null;
	setDraftSaved: (saved: boolean) => void;
	loadDraftData: (data: ContestFormData) => void;
	// New function to save current state while navigating
	saveCurrentState: () => void;
	// Added validation functionality
	validateStep: (step: string, validationFn: ValidationFunction) => void;
	validateAllSteps: () => boolean;
}

const ContestFormContext = createContext<ContestFormContextType | undefined>(
	undefined
);

export const useContestForm = () => {
	const context = useContext(ContestFormContext);
	if (!context) {
		throw new Error("useContestForm must be used within a ContestFormProvider");
	}
	return context;
};

export const ContestFormProvider: React.FC<{
	children: React.ReactNode;
	userId?: string;
}> = ({ children, userId }) => {
	const [formData, setFormData] = useState<ContestFormData>(defaultFormData);
	const [draftSaved, setDraftSaved] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Add validation state
	const [validationFunctions, setValidationFunctions] = useState<ValidationSteps>({});

	// Load saved data on first render
	useEffect(() => {
		// First try to get from sessionStorage (for current session)
		const sessionData = sessionStorage.getItem("contestFormSession");

		if (sessionData) {
			try {
				const parsedData = JSON.parse(sessionData);
				processFormData(parsedData);
				console.log("Loaded form data from session storage");
				return; // Exit early if session data exists
			} catch (error) {
				console.error("Error parsing session form data:", error);
			}
		}

		// Fall back to localStorage (for drafts between sessions)
		const savedData = localStorage.getItem("contestFormDraft");
		if (savedData) {
			try {
				const parsedData = JSON.parse(savedData);
				processFormData(parsedData);
				console.log("Loaded form data from local storage");
			} catch (error) {
				console.error("Error parsing saved form data:", error);
				// Fallback to default if parsing fails
				setFormData(defaultFormData);
			}
		}
	}, []);

	// Helper function to process loaded form data
	const processFormData = (data: ContestFormData) => {
		// Ensure contest type is consistent
		if (data.basic?.contestType) {
			data.contestType = data.basic.contestType;
		}

		// Handle dates - convert string dates back to Date objects
		if (data.prizeTimeline?.startDate) {
			data.prizeTimeline.startDate = new Date(data.prizeTimeline.startDate);
		}
		if (data.prizeTimeline?.endDate) {
			data.prizeTimeline.endDate = new Date(data.prizeTimeline.endDate);
		}

		// We can't restore the File object from storage, so we keep it null
		// But preserve the thumbnail URL if it exists
		if (typeof data.basic?.thumbnail === "string") {
			// Keep the string URL
		} else {
			data.basic.thumbnail = null;
		}

		// Force default contest type if not set
		data.basic.contestType = data.basic.contestType || "leaderboard";
		data.contestType = data.basic.contestType;

		setFormData(data);
	};

	// Save the current state to sessionStorage to prevent loss during navigation
	const saveCurrentState = useCallback(() => {
		try {
			sessionStorage.setItem("contestFormSession", JSON.stringify(formData));
		} catch (error) {
			console.error("Error saving form state to session storage:", error);
		}
	}, [formData]);

	// Auto-save form data to sessionStorage whenever it changes
	useEffect(() => {
		saveCurrentState();
	}, [formData, saveCurrentState]);

	// Add this utility function to ContestFormContext.tsx
	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.readAsDataURL(file);
		});
	};

	// Modify your updateBasicData function:
	const updateBasicData = useCallback(async (data: Partial<BasicFormData>) => {
		// Handle file conversion if thumbnail is a File
		let processedData = { ...data };

		if (data.thumbnail instanceof File) {
			const base64Thumbnail = await fileToBase64(data.thumbnail);
			processedData = {
				...data,
				thumbnail: base64Thumbnail,
				// Store the original filename if needed
				thumbnailName: data.thumbnail.name,
			};
		}

		setFormData((prevData) => {
			const updatedData: ContestFormData = {
				...prevData,
				basic: {
					...prevData.basic,
					...processedData,
				},
			};

			if (data.contestType) {
				updatedData.contestType = data.contestType;
			}

			return updatedData;
		});

		setDraftSaved(false);
	}, []);

	const updateRequirementsData = useCallback(
		(data: Partial<RequirementsFormData>) => {
			setFormData((prev) => ({
				...prev,
				requirements: { ...prev.requirements, ...data },
			}));
			setDraftSaved(false);
		},
		[]
	);

	const updatePrizeTimelineData = useCallback(
		(data: Partial<PrizeTimelineFormData>) => {
			setFormData((prev) => ({
				...prev,
				prizeTimeline: { ...prev.prizeTimeline, ...data },
			}));
			setDraftSaved(false);
		},
		[]
	);

	const updateIncentivesData = useCallback((incentives: Incentive[]) => {
		setFormData((prev) => ({
			...prev,
			incentives,
		}));
		setDraftSaved(false);
	}, []);

	// Add validation functions
	const validateStep = useCallback((step: string, validationFn: ValidationFunction) => {
		setValidationFunctions(prev => ({
			...prev,
			[step]: validationFn
		}));
	}, []);

	// Validate all steps
	const validateAllSteps = useCallback(() => {
		const results = Object.values(validationFunctions).map(fn => fn());
		return results.every(result => result === true);
	}, [validationFunctions]);

	// Update your submission function to include validation
	const submitContest = async (): Promise<ApiResponse> => {
		setIsLoading(true);
		setError(null);

		// First validate all steps
		const isValid = validateAllSteps();
		if (!isValid) {
			setIsLoading(false);
			return {
				success: false,
				error: "Please complete all required fields before submitting"
			};
		}

		try {
			// Add userId check
			if (!userId) {
				throw new Error("User ID is required for submitting contests");
			}

			const formDataForSubmission = new FormData();
			formDataForSubmission.append("userId", userId);

			// Add the complex objects from your state, properly stringified
			formDataForSubmission.append("basic", JSON.stringify(formData.basic));
			formDataForSubmission.append(
				"requirements",
				JSON.stringify(formData.requirements)
			);
			formDataForSubmission.append(
				"prizeTimeline",
				JSON.stringify(formData.prizeTimeline)
			);
			formDataForSubmission.append(
				"contestType",
				JSON.stringify(formData.contestType)
			);
			formDataForSubmission.append(
				"incentives",
				JSON.stringify(formData.incentives)
			);

			// Add the thumbnail file if it exists
			if (formData.basic.thumbnail instanceof File) {
				formDataForSubmission.append("thumbnail", formData.basic.thumbnail);
			}
			// Convert the Base64 back to a File if needed for the API
			if (
				typeof formData.basic.thumbnail === "string" &&
				formData.basic.thumbnail.startsWith("data:")
			) {
				// Convert base64 to blob
				const base64Response = await fetch(formData.basic.thumbnail);
				const blob = await base64Response.blob();

				// Create file from blob
				const thumbnailFile = new File(
					[blob],
					formData.basic.thumbnailName || "thumbnail.png",
					{ type: blob.type }
				);

				formDataForSubmission.append("thumbnail", thumbnailFile);
			}

			// Add timestamps for sorting in dashboard
			formDataForSubmission.append(
				"createdAt",
				JSON.stringify(new Date().toISOString())
			);
			formDataForSubmission.append(
				"updatedAt",
				JSON.stringify(new Date().toISOString())
			);

			// Send the FormData to your API
			const response = await fetch("/api/contests", {
				method: "POST",
				body: formDataForSubmission,
			});

			// Log what we're about to send (for debugging)
			console.log("Submitting data:", {
				basic: formData.basic,
				requirements: formData.requirements,
				prizeTimeline: formData.prizeTimeline,
				contestType: formData.contestType,
				incentives: formData.incentives,
			});

			// Parse the response
			const result = await response.json();
			console.log("Submission result:", result);

			if (!response.ok || !result.success) {
				throw new Error(result.error || "Failed to create contest");
			}

			// Update local form status with status from API response
			if (result.data && result.data.status) {
				setFormData((prevData) => ({
					...prevData,
					status: result.data.status,
				}));
			}

			// Only clear saved data if we're not in draft mode
			if (result.data?.status !== "draft") {
				localStorage.removeItem("contestFormDraft");
				sessionStorage.removeItem("contestFormSession");
			}

			setIsLoading(false);
			return result;
		} catch (error) {
			console.error("Submission error:", error);
			setIsLoading(false);
			setError(
				error instanceof Error
					? error.message
					: "An error occurred during submission"
			);

			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: "An error occurred during submission",
			};
		}
	};

	const saveDraft = async (): Promise<ApiResponse> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!userId) {
				throw new Error("User ID is required for submitting contests");
			}

			// Save to localStorage and sessionStorage first (for redundancy)
			const dataToSave = JSON.stringify(formData);
			localStorage.setItem("contestFormDraft", dataToSave);
			sessionStorage.setItem("contestFormSession", dataToSave);

			// Create a new FormData object for the HTTP request
			const formDataForSubmission = new FormData();
			formDataForSubmission.append("userId", userId);

			// Add the complex objects from your state, properly stringified
			formDataForSubmission.append("basic", JSON.stringify(formData.basic));
			formDataForSubmission.append(
				"requirements",
				JSON.stringify(formData.requirements)
			);
			formDataForSubmission.append(
				"prizeTimeline",
				JSON.stringify(formData.prizeTimeline)
			);
			formDataForSubmission.append(
				"contestType",
				JSON.stringify(formData.contestType)
			);
			formDataForSubmission.append(
				"incentives",
				JSON.stringify(formData.incentives)
			);

			// Add the thumbnail file if it exists
			if (formData.basic.thumbnail instanceof File) {
				formDataForSubmission.append("thumbnail", formData.basic.thumbnail);
			}

			// Convert the Base64 back to a File if needed for the API
			if (
				typeof formData.basic.thumbnail === "string" &&
				formData.basic.thumbnail.startsWith("data:")
			) {
				// Convert base64 to blob
				const base64Response = await fetch(formData.basic.thumbnail);
				const blob = await base64Response.blob();

				// Create file from blob
				const thumbnailFile = new File(
					[blob],
					formData.basic.thumbnailName || "thumbnail.png",
					{ type: blob.type }
				);

				formDataForSubmission.append("thumbnail", thumbnailFile);
			}

			// Explicitly mark this as a draft
			formDataForSubmission.append("status", "draft");
			formDataForSubmission.append("isDraft", "true");

			// Add timestamps for sorting in dashboard
			formDataForSubmission.append(
				"createdAt",
				JSON.stringify(new Date().toISOString())
			);
			formDataForSubmission.append(
				"updatedAt",
				JSON.stringify(new Date().toISOString())
			);

			// Send the FormData to your API
			const response = await fetch("/api/contests", {
				method: "POST",
				body: formDataForSubmission,
			});

			// Check if response is OK before trying to parse JSON
			if (!response.ok) {
				const responseText = await response.text();
				console.error("API Error Response:", responseText);
				throw new Error(`API Error: ${response.status} ${response.statusText}`);
			}

			// Now safely parse the JSON
			const result = await response.json();
			console.log("Draft save result:", result);

			if (!result.success) {
				throw new Error(result.error || "Failed to save draft");
			}

			setDraftSaved(true);

			// Reset the saved status after 3 seconds
			setTimeout(() => {
				setDraftSaved(false);
			}, 3000);

			setIsLoading(false);
			return result;
		} catch (error) {
			console.error("Error saving draft:", error);
			setIsLoading(false);
			setError(error instanceof Error ? error.message : "Failed to save draft");

			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to save draft",
			};
		}
	};

	const loadDraftData = useCallback((data: ContestFormData) => {
		try {
			// Create a deep copy to avoid reference issues
			const processedData = JSON.parse(JSON.stringify(data));
			processFormData(processedData);

			// Save to both localStorage and sessionStorage
			const dataString = JSON.stringify(processedData);
			localStorage.setItem("contestFormDraft", dataString);
			sessionStorage.setItem("contestFormSession", dataString);

			console.log("Loaded draft data:", processedData);
		} catch (error) {
			console.error("Error loading draft data:", error);
		}
	}, []);

	// Reset draft and storages
	const resetDraft = useCallback(() => {
		localStorage.removeItem("contestFormDraft");
		sessionStorage.removeItem("contestFormSession");
		setFormData(defaultFormData);
		setDraftSaved(false);
		setError(null);
	}, []);

	return (
		<ContestFormContext.Provider
			value={{
				formData,
				updateBasicData,
				updateRequirementsData,
				updatePrizeTimelineData,
				updateIncentivesData,
				saveDraft,
				submitContest,
				resetDraft,
				draftSaved,
				isLoading,
				error,
				setDraftSaved,
				loadDraftData,
				saveCurrentState,
				validateStep,
				validateAllSteps,
			}}
		>
			{children}
		</ContestFormContext.Provider>
	);
};