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
		projectType: "UGC Content Only",
		productLink: "",
		productType: "",
		projectDescription: [""],
		projectThumbnail: null,
	},

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
			countries: []
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
	status: ""
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
		projectId?: string
	) => Promise<ApiResponse>;
	resetDraft: () => void;
	draftSaved: boolean;
	isLoading: boolean;
	error: string | null;
	setDraftSaved: (saved: boolean) => void;
	loadDraftData: (data: ContestFormData) => void;
	// New function to save current state while navigating
	saveCurrentState: () => void;
	// New flag to control whether to load saved data
	loadSavedData: boolean;
	setLoadSavedData: (load: boolean) => void;
	// New function to start a fresh project
	startNewProject: () => void;
}

const ProjectFormContext = createContext<ProjectFormContextType | undefined>(
	undefined
);

export const useProjectForm = () => {
	const context = useContext(ProjectFormContext);
	if (!context) {
		throw new Error("useProjectForm must be used within a ProjectFormProvider");
	}
	return context;
};



export const ProjectFormProvider: React.FC<{
	children: React.ReactNode;
	userId?: string;
	isNewProject?: boolean;
}> = ({ children, userId, isNewProject = false }) => {
		
	const [formData, setFormData] = useState<ProjectFormData>(defaultFormData);
	const [draftSaved, setDraftSaved] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// New state to control whether to load saved data
	const [loadSavedData, setLoadSavedData] = useState(!isNewProject);

	// Get user-specific storage keys
	const getStorageKeys = useCallback(() => {
		const userPrefix = userId ? `user_${userId}_` : '';
		return {
			sessionKey: `${userPrefix}projectFormSession`,
			localKey: `${userPrefix}projectFormDraft`
		};
	}, [userId]);

	

	// Load saved data on first render, but only if loadSavedData is true
	useEffect(() => {
		if (!loadSavedData) {
			// If we're creating a new project, use default form data
			setFormData(defaultFormData);
			return;
		}

		const { sessionKey, localKey } = getStorageKeys();

		// First try to get from sessionStorage (for current session)
		const sessionData = sessionStorage.getItem(sessionKey);

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
		const savedData = localStorage.getItem(localKey);
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
	}, [loadSavedData, userId, getStorageKeys]);

	// Helper function to process loaded form data
	const processFormData = (data: ProjectFormData) => {
		// Ensure contest type is consistent
		if (data.projectDetails?.projectName) {
			data.projectDetails.projectName = data.projectDetails.projectName;
		}
		// We can't restore the File object from storage, so we keep it null
		// But preserve the thumbnail URL if it exists
		if (typeof data.projectDetails?.projectThumbnail === "string") {
			// Keep the string URL
		} else {
			data.projectDetails.projectThumbnail = null;
		}

		// Force default contest type if not set
		data.projectDetails.projectType =
			data.projectDetails.projectType || "UGC Content Only";
		data.projectDetails.projectType = data.projectDetails.projectType;

		setFormData(data);
	};

	// Save the current state to sessionStorage to prevent loss during navigation
	const saveCurrentState = useCallback(() => {
		if (!userId) return; // Don't save if no user ID

		try {
			const { sessionKey } = getStorageKeys();
			sessionStorage.setItem(sessionKey, JSON.stringify(formData));
		} catch (error) {
			console.error("Error saving form state to session storage:", error);
		}
	}, [formData, userId, getStorageKeys]);

	// Auto-save form data to sessionStorage whenever it changes
	useEffect(() => {
		saveCurrentState();
	}, [formData, saveCurrentState]);

	// New function to start a fresh project
	const startNewProject = useCallback(() => {
		setLoadSavedData(false);
		setFormData(defaultFormData);
		setDraftSaved(false);
		setError(null);
	}, []);

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
			creatorPricing: { ...prev.creatorPricing, ...data },
		}));
		setDraftSaved(false);
	}, []);


	// Submission function
	const submitContest = async (): Promise<ApiResponse> => {
		setIsLoading(true);
		setError(null);
	  
		try {
		  // Add userId check
		  if (!userId) {
			throw new Error("User ID is required for submitting projects");
		  }
	  
		  // Create FormData for submission without pre-determining the status
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
	  
		  // Add the thumbnail file if it exists
		  if (formData.projectDetails.projectThumbnail instanceof File) {
			formDataForSubmission.append(
			  "projectThumbnail",
			  formData.projectDetails.projectThumbnail
			);
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
		  const response = await fetch("/api/projects", {
			method: "POST",
			body: formDataForSubmission,
		  });
	  
		  // Parse the response
		  const result = await response.json();
		  console.log("Submission result:", result);
	  
		  if (!response.ok || !result.success) {
			throw new Error(result.error || "Failed to create project");
		  }
	  
		  // Update local form status with status from API response
		  if (result.data && result.data.status) {
			setFormData(prevData => ({
			  ...prevData,
			  status: result.data.status
			}));
		  }
	  
		  // Only clear saved data if we're not in draft mode
		  if (result.data?.status !== "draft") {
			const { localKey, sessionKey } = getStorageKeys();
			localStorage.removeItem(localKey);
			sessionStorage.removeItem(sessionKey);
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
				throw new Error("User ID is required for submitting projects");
			}

			// Save to localStorage and sessionStorage first (for redundancy)
			const { localKey, sessionKey } = getStorageKeys();
			const dataToSave = JSON.stringify(formData);
			localStorage.setItem(localKey, dataToSave);
			sessionStorage.setItem(sessionKey, dataToSave);

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

			// Add the thumbnail file if it exists
			if (formData.projectDetails.projectThumbnail instanceof File) {
				formDataForSubmission.append(
					"projectThumbnail",
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

			// Send the FormData to your API
			const response = await fetch("/api/projects", {
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
			const { localKey, sessionKey } = getStorageKeys();
			const dataString = JSON.stringify(processedData);
			localStorage.setItem(localKey, dataString);
			sessionStorage.setItem(sessionKey, dataString);

			console.log("Loaded draft data:", processedData);
		} catch (error) {
			console.error("Error loading draft data:", error);
		}
	}, [getStorageKeys]);

	// Reset draft and storages
	const resetDraft = useCallback(() => {
		const { localKey, sessionKey } = getStorageKeys();
		localStorage.removeItem(localKey);
		sessionStorage.removeItem(sessionKey);
		setFormData(defaultFormData);
		setDraftSaved(false);
		setError(null);
	}, [getStorageKeys]);

	return (
		<ProjectFormContext.Provider
			value={{
				formData,
				updateProjectDetails,
				updateProjectRequirementsData,
				updateCreatorPricing,
				saveDraft,
				submitContest,
				resetDraft,
				draftSaved,
				isLoading,
				error,
				setDraftSaved,
				loadDraftData,
				saveCurrentState,
				loadSavedData,
				setLoadSavedData,
				startNewProject,
			}}
		>
			{children}
		</ProjectFormContext.Provider>
	);
};