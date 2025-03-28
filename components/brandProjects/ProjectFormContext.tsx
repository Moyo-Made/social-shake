"use client";

import {
	ContestFormData,
	CreatorPricing,
	ProjectDetails,
	ProjectFormData,
	ProjectRequirements,
} from "@/types/contestFormData";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";

// Add API response types
type ApiResponse = {
	success?: boolean;
	message?: string;
	error?: string;
	data?: Record<string, unknown>;
	exists?: boolean;
};

const defaultFormData: ProjectFormData = {
	projectDetails: {
		projectName: "",
		projectType: "UGC Content",
		productType: "",
		projectDescription: [""],
		projectThumbnail: null,
	},
	status: "",
	projectRequirements: {
		contentType: "allow-applications",
		platform: [""],
		aspectRatio: "",
		duration: "30-seconds",
		videoType: "client-script",
		script: "",
		contentLinks: [""],
		brandAssets: "",
	},
	creatorPricing: {
		selectionMethod: "Invite Specific Creators",
		selectedCreators: [],
		ageGroup: "",
		gender: "",
		industry: "",
		language: "",
		creatorCount: 1,
		videosPerCreator: 1,
		totalVideos: 1,

		extras: {
			captions: false,
			captionsPrice: 50, // Default price if enabled
			captionsTotal: 0,
			music: false,
			musicPrice: 50, // Default price if enabled
			musicTotal: 0,
			rawFiles: false,
			rawFilesPrice: 100, // Default price if enabled
			rawFilesTotal: 0,
		},

		// Default cost values
		budgetPerVideo: 0,
		totalBudget: 0,

		extrasTotal: 0,
		totalAmount: 0,
		creator: {
			selectionMethod: "Invite Specific Creators",
			ageGroup: "",
			selectedCreators: [],
			gender: "",
			industry: "",
			language: "",
			creatorCount: 2,
			videosPerCreator: 1,
			totalVideos: 0,
		},
		cost: {
			budgetPerVideo: 0,
			totalBudget: 0,
			extras: {
				music: false,
				musicPrice: 0,
				musicTotal: 0,
				rawFiles: false,
				rawFilesPrice: 0,
				rawFilesTotal: 0,
			},
			extrasTotal: 0,
			totalAmount: 0,
			commissionPerSale: 0,
		},
	},

	//   prizeTimeline: {
	// 	totalBudget: 1500,
	// 	winnerCount: 5,
	// 	positions: [1000, 300, 100, 50, 50],
	// 	startDate: undefined,
	// 	endDate: undefined,
	// 	criteria: "views",
	//   },
	//   contestType: "UGC Content",
	//   incentives: [],
	//   status: "",
	//   brandEmail: ""
};

interface ProjectFormContextType {
	formData: ProjectFormData;
	updateProjectDetails: (data: Partial<ProjectDetails>) => void;
	updateProjectRequirementsData: (data: Partial<ProjectRequirements>) => void;
	updateCreatorPricing: (data: Partial<CreatorPricing>) => void;
	saveDraft: () => Promise<ApiResponse>;
	submitContest: (
		formData: FormData,
		userId?: string,
		contestId?: string
	) => Promise<ApiResponse>;
	resetDraft: () => void;
	draftSaved: boolean;
	isLoading: boolean;
	error: string | null;
	setDraftSaved: (saved: boolean) => void;
	loadDraftData: (data: ContestFormData) => void;
	// New function to save current state while navigating
	saveCurrentState: () => void;
}

const ProjectFormContext = createContext<ProjectFormContextType | undefined>(
	undefined
);

export const useProjectForm = () => {
	const context = useContext(ProjectFormContext);
	if (!context) {
		throw new Error("useProjectForm must be used within a ContestFormProvider");
	}
	return context;
};

export const ProjectFormProvider: React.FC<{
	children: React.ReactNode;
	userId?: string;
}> = ({ children, userId }) => {
	const [formData, setFormData] = useState<ProjectFormData>(defaultFormData);
	const [draftSaved, setDraftSaved] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
	const processFormData = (data: ProjectFormData) => {
		// Ensure contest type is consistent
		if (data.projectDetails?.projectName) {
			data.projectDetails.projectName = data.projectDetails.projectName;
		}

		// Handle dates - convert string dates back to Date objects
		// if (data.prizeTimeline?.startDate) {
		// 	data.prizeTimeline.startDate = new Date(data.prizeTimeline.startDate);
		// }
		// if (data.prizeTimeline?.endDate) {
		// 	data.prizeTimeline.endDate = new Date(data.prizeTimeline.endDate);
		// }

		// We can't restore the File object from storage, so we keep it null
		// But preserve the thumbnail URL if it exists
		if (typeof data.projectDetails?.projectThumbnail === "string") {
			// Keep the string URL
		} else {
			data.projectDetails.projectThumbnail = null;
		}

		// Force default contest type if not set
		data.projectDetails.projectType =
			data.projectDetails.projectType || "UGC Content";
		data.projectDetails.projectType = data.projectDetails.projectType;

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

	const updateProjectDetails = useCallback((data: Partial<ProjectDetails>) => {
		setFormData((prevData) => {
			// Create a completely new object to ensure re-render
			const updatedData: ProjectFormData = {
				...prevData,
				projectDetails: {
					...prevData.projectDetails,
					...data,
				},
			};

			// Explicitly update top-level contest type if changed
			if (data.projectType) {
				updatedData.projectDetails.projectType = data.projectType;
			}

			return updatedData;
		});

		setDraftSaved(false);
	}, []);

	const updateProjectRequirementsData = useCallback(
		(data: Partial<ProjectRequirements>) => {
			setFormData((prev) => ({
				...prev,
				projectRequirements: { ...prev.projectRequirements, ...data },
			}));
			setDraftSaved(false);
		},
		[]
	);

	const updateCreatorPricing = useCallback((data: Partial<CreatorPricing>) => {
		setFormData((prev) => ({
			...prev,
			prizeTimeline: { ...prev.creatorPricing, ...data },
		}));
		setDraftSaved(false);
	}, []);

	// const updateIncentivesData = useCallback((incentives: Incentive[]) => {
	// 	setFormData((prev) => ({
	// 		...prev,
	// 		incentives,
	// 	}));
	// 	setDraftSaved(false);
	// }, []);

	// Update your submission function to clearly distinguish between your form state and the FormData object
	const submitContest = async (): Promise<ApiResponse> => {
		setIsLoading(true);
		setError(null);

		try {
			// Add userId check
			if (!userId) {
				throw new Error("User ID is required for submitting contests");
			}

			const formDataForSubmission = new FormData();
			formDataForSubmission.append("userId", userId);

			// Add the complex objects from your state, properly stringified
			formDataForSubmission.append(
				"projectDetails",
				JSON.stringify(formData.projectDetails)
			);
			formDataForSubmission.append(
				"projectRequirements",
				JSON.stringify(formData.projectRequirements)
			);
			formDataForSubmission.append(
				"creatorPricing",
				JSON.stringify(formData.creatorPricing)
			);
			formDataForSubmission.append(
				"projectType",
				JSON.stringify(formData.projectDetails.projectType)
			);
			// formDataForSubmission.append(
			// 	"incentives",
			// 	JSON.stringify(formData.incentives)
			// );

			// Add the thumbnail file if it exists
			if (formData.projectDetails.projectThumbnail instanceof File) {
				formDataForSubmission.append(
					"thumbnail",
					formData.projectDetails.projectThumbnail
				);
			}

			// Log what we're about to send (for debugging)
			console.log("Submitting data:", {
				projectDetails: formData.projectDetails,
				projectRequirements: formData.projectRequirements,
				creatorPricing: formData.creatorPricing,
				// contestType: formData.contestType,
				// incentives: formData.incentives,
			});

			// Send the FormData to your API
			const response = await fetch("/api/contests", {
				method: "POST",
				body: formDataForSubmission,
			});

			// Parse the response
			const result = await response.json();
			console.log("Submission result:", result);

			if (!response.ok || !result.success) {
				throw new Error(result.error || "Failed to create contest");
			}

			// On success, clear saved data
			localStorage.removeItem("contestFormDraft");

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
			formDataForSubmission.append(
				"projectDetails",
				JSON.stringify(formData.projectDetails)
			);
			formDataForSubmission.append(
				"projectRequirements",
				JSON.stringify(formData.projectRequirements)
			);
			formDataForSubmission.append(
				"creatorPricing",
				JSON.stringify(formData.creatorPricing)
			);
			formDataForSubmission.append(
				"projectType",
				JSON.stringify(formData.projectDetails.projectType)
			);
			//   formDataForSubmission.append(
			// 	"incentives",
			// 	JSON.stringify(formData.incentives)
			//   );

			// Add the thumbnail file if it exists
			if (formData.projectDetails.projectThumbnail instanceof File) {
				formDataForSubmission.append(
					"thumbnail",
					formData.projectDetails.projectThumbnail
				);
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

			// Log what we're about to send (for debugging)
			console.log("Saving draft data:", {
				projectDetails: formData.projectDetails,
				// requirements: formData.requirements,
				// prizeTimeline: formData.prizeTimeline,
				// contestType: formData.contestType,
				// incentives: formData.incentives,
				status: "draft",
			});

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
		<ProjectFormContext.Provider
			value={{
				formData,
				updateProjectDetails,
				updateProjectRequirementsData,
				updateCreatorPricing,
				// updateIncentivesData,
				saveDraft,
				submitContest,
				resetDraft,
				draftSaved,
				isLoading,
				error,
				setDraftSaved,
				loadDraftData,
				saveCurrentState,
			}}
		>
			{children}
		</ProjectFormContext.Provider>
	);
};
