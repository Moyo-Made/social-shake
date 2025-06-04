"use client";

import {
	ContestFormData,
	CreatorPricing,
	ProjectDetails,
	ProjectFormData,
	ProjectRequirements,
} from "@/types/contestFormData";
import { ProjectStatus } from "@/types/projects";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Define stripePromise
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
);

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

const defaultFormData: ProjectFormData = {
	projectDetails: {
		projectName: "",
		projectType: "UGC Content Only",
		productLink: "",
		productType: "Physical",
		projectDescription: "",
		projectThumbnail: null,
	},

	projectRequirements: {
		contentType: "",
		platform: [],
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

		// Default cost values
		budgetPerVideo: 0,
		totalBudget: 0,

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
			countries: [],
		},
		cost: {
			budgetPerVideo: 0,
			totalBudget: 0,
			totalAmount: 0,
			commissionPerSale: "",
		},
		lockedPricing: {},
		budgetPerVideoLocked: 0,
		creatorPayments: {},
	},
	userId: "",
	status: ProjectStatus.PENDING,
	createdAt: "",
	participantsCount: 0,
	projectId: "",
	views: 0,
	applicantsCount: 0,
	interestId: "",
	paidfalse: false,
	paymentAmount: null,
	projectTitle: "",
	brandEmail: "",
	projectName: undefined
};

interface ProjectFormContextType {
	formData: ProjectFormData;
	updateProjectDetails: (data: Partial<ProjectDetails>) => void;
	updateProjectRequirementsData: (data: Partial<ProjectRequirements>) => void;
	updateCreatorPricing: (data: Partial<CreatorPricing>) => void;
	triggerPaymentIntent: (
		amount: number,
		submission: Record<string, unknown>
	) => Promise<void>;
	saveDraft: () => Promise<ApiResponse>;
	submitContest: () => Promise<ApiResponse>;
	setIsLoading: (loading: boolean) => void;
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
	// Added validation functionality
	validateStep: (step: string, validationFn: ValidationFunction) => void;
	validateAllSteps: () => boolean;
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
	// Add validation state
	const [validationFunctions, setValidationFunctions] =
		useState<ValidationSteps>({});
	const [, setSubmissionError] = useState<string | null>(null);
	const [, setValidationError] = useState<string | null>(null);
	const { currentUser } = useAuth();

	// Load saved data on first render
	useEffect(() => {
		// First try to get from sessionStorage (for current session)
		const sessionData = sessionStorage.getItem("projectFormSession");

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
		const savedData = localStorage.getItem("projectFormDraft");
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
		try {
			sessionStorage.setItem("projectFormSession", JSON.stringify(formData));
		} catch (error) {
			console.error("Error saving form state to session storage:", error);
		}
	}, [formData]);

	// Auto-save form data to sessionStorage whenever it changes
	useEffect(() => {
		saveCurrentState();
	}, [formData, saveCurrentState]);

	// Function to fetch user preferences
	const fetchUserPreferences = useCallback(async () => {
		if (!userId) return;

		try {
			setIsLoading(true);
			const response = await fetch(`/api/user-preferences?userId=${userId}`);
			const result = await response.json();

			if (response.ok && result.success && result.data) {
				// Apply preferences to the default form data
				const newFormData = { ...defaultFormData };

				// Apply project requirements if available
				if (result.data.projectRequirements) {
					newFormData.projectRequirements = {
						...newFormData.projectRequirements,
						...result.data.projectRequirements,
					};
				}

				// Apply creator pricing preferences if available
				if (result.data.creatorPricing) {
					newFormData.creatorPricing = {
						...newFormData.creatorPricing,
						...result.data.creatorPricing,
					};
				}

				setFormData(newFormData);
				console.log("Loaded user preferences:", result.data);
			}
		} catch (error) {
			console.error("Error fetching user preferences:", error);
		} finally {
			setIsLoading(false);
		}
	}, [userId]);

	// Update startNewProject to fetch preferences
	const startNewProject = useCallback(() => {
		setLoadSavedData(false);
		setFormData(defaultFormData);
		setDraftSaved(false);
		setError(null);

		// Fetch and apply user preferences for the new project
		fetchUserPreferences();
	}, [fetchUserPreferences]);

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

	useEffect(() => {
		if (isNewProject && userId) {
			fetchUserPreferences();
		}
	}, [isNewProject, userId, fetchUserPreferences]);

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

	// Add validation functions
	const validateStep = useCallback(
		(step: string, validationFn: ValidationFunction) => {
			setValidationFunctions((prev) => ({
				...prev,
				[step]: validationFn,
			}));
		},
		[]
	);

	// Validate all steps
	const validateAllSteps = useCallback(() => {
		const results = Object.values(validationFunctions).map((fn) => fn());
		return results.every((result) => result === true);
	}, [validationFunctions]);

	// Submission function
	const submitContest = async (): Promise<ApiResponse> => {
		setIsLoading(true);
		setError(null);

		// First validate all steps
		const isValid = validateAllSteps();
		if (!isValid) {
			setIsLoading(false);
			return {
				success: false,
				error: "Please complete all required fields before submitting",
			};
		}

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
			if (
				formData.projectDetails.projectThumbnail !== null &&
				formData.projectDetails.projectThumbnail instanceof File
			) {
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
				setFormData((prevData) => ({
					...prevData,
					status: result.data.status,
				}));
			}

			// Only clear saved data if we're not in draft mode
			if (result.data?.status !== "draft") {
				localStorage.removeItem("projectFormDraft");
				sessionStorage.removeItem("projectFormSession");
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const triggerPaymentIntent = async (amount: number, submission: any) => {
		try {
			setIsLoading(true);
			setSubmissionError(null);
			setValidationError(null);
	
			// Validate required fields before making the request
			const userId = formData.userId || submission.brandId || submission.userId;
			const userEmail = currentUser?.email || "";
	
			if (!userId) {
				setSubmissionError(
					"User ID is required but not found in formData or submission"
				);
				setIsLoading(false);
				return;
			}
	
			if (!amount || amount <= 0) {
				setSubmissionError("Valid payment amount is required");
				setIsLoading(false);
				return;
			}
	
			if (!userEmail) {
				setSubmissionError("User email is required but not found");
				setIsLoading(false);
				return;
			}
	
			// Validate submission ID exists
			if (!submission.id) {
				setSubmissionError("Submission ID is required but not found");
				setIsLoading(false);
				return;
			}
	
			console.log("Creating payment intent with:", {
				userId,
				amount,
				userEmail,
				submissionId: submission.id,
			});
	
			// Save current state before payment
			saveCurrentState();
	
			// Save form data to sessionStorage for recovery after payment
			const completeFormData = {
				...formData,
				userId: userId,
				submission: submission,
			};
			sessionStorage.setItem(
				"projectFormData",
				JSON.stringify(completeFormData)
			);
	
			// Enhanced project title extraction with more fallback options
			const getProjectTitle = () => {
				// Try multiple possible locations for the project title
				const possibleTitles = [
					// From submission data
					submission.projectFormData?.projectDetails?.projectName,
					submission.projectFormData?.projectTitle,
					submission.projectName,
					submission.projectTitle,
					// From form data
					formData.projectDetails?.projectName,
					formData.projectTitle,
					formData.projectName,
					// From nested submission data
					submission.submissionData?.projectTitle,
					submission.submissionData?.projectFormData?.projectDetails?.projectName,
				];
	
				// Return the first non-empty title found
				for (const title of possibleTitles) {
					if (title && typeof title === 'string' && title.trim() !== '') {
						return title.trim();
					}
				}
	
				return "Untitled Project";
			};
	
			const projectTitle = getProjectTitle();
	
			// Create payment intent with minimal required data
			// The endpoint will auto-fetch creatorId, projectId, etc. from the submission
			const paymentFormData = new FormData();
			paymentFormData.append("userId", userId);
			paymentFormData.append("brandEmail", userEmail);
			paymentFormData.append("amount", amount.toString());
			paymentFormData.append("paymentType", "submission_approval");
			paymentFormData.append("submissionId", submission.id); // This is the key field
			paymentFormData.append("projectTitle", projectTitle);
	
			console.log("Simplified Payment FormData being sent:");
			for (const [key, value] of paymentFormData.entries()) {
				console.log(`${key}: ${value}`);
			}
	
			const stripeAccountResponse = await axios.get(
				`/api/creator/stripe-status?userId=${userId}`
			);
			if (!stripeAccountResponse.data.connected) {
				// Add your toast message here
				toast.error("Creator hasn't connected their Stripe account. Please ask them to connect it first.", {
					duration: 5000
				});
				setIsLoading(false);
				return;
			}
	
			const paymentResponse = await axios.post(
				"/api/create-payment-intent",
				paymentFormData
			);
	
			if (!paymentResponse.data.success) {
				throw new Error(
					paymentResponse.data.error || "Failed to initiate payment"
				);
			}
	
			const { paymentId } = paymentResponse.data;
	
			// Step 2: Initialize Stripe checkout with the payment ID
			const stripe = await stripePromise;
			if (!stripe) {
				setSubmissionError(
					"Stripe is not initialized. Please try again later."
				);
				setIsLoading(false);
				return;
			}
	
			// Create a checkout session
			const checkoutData = {
				amount: amount,
				paymentId: paymentId,
				projectTitle: projectTitle, // Use the extracted project title
				userEmail: userEmail,
				userId: userId,
				paymentType: "submission_approval",
				// Include additional data for better context
				projectFormData: submission.projectFormData || formData,
				submissionData: {
					userId: submission.userId,
					projectTitle: projectTitle,
					...submission
				},
			};
	
			console.log("Checkout session data being sent:", checkoutData);
	
			const response = await axios.post(
				"/api/create-checkout-session",
				checkoutData
			);
	
			const { sessionId } = response.data;
	
			// Redirect to Stripe checkout
			const { error } = await stripe.redirectToCheckout({ sessionId });
	
			if (error) {
				console.error("Error redirecting to checkout:", error);
				setSubmissionError("Payment initiation failed. Please try again.");
				setIsLoading(false);
			}
	
			// On success, clear saved step (happens after redirect)
			sessionStorage.removeItem("projectFormStep");
		} catch (error) {
			console.error("Payment intent error:", error);
			setSubmissionError(
				error instanceof Error
					? error.message
					: "An error occurred during payment processing"
			);
			setIsLoading(false);
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

			const dataToSave = JSON.stringify(formData);
			localStorage.setItem("projectFormDraft", dataToSave);
			sessionStorage.setItem("projectFormSession", dataToSave);

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
			const dataString = JSON.stringify(processedData);
			localStorage.setItem("projectFormData", dataString);
			sessionStorage.setItem("projectFormSession", dataString);

			console.log("Loaded draft data:", processedData);
		} catch (error) {
			console.error("Error loading draft data:", error);
		}
	}, []);

	// Reset draft and storages
	const resetDraft = useCallback(() => {
		localStorage.removeItem("projectFormDraft");
		sessionStorage.removeItem("projectFormSession");
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
				triggerPaymentIntent,
				saveDraft,
				submitContest,
				resetDraft,
				draftSaved,
				isLoading,
				error,
				setIsLoading,
				setDraftSaved,
				loadDraftData,
				saveCurrentState,
				loadSavedData,
				setLoadSavedData,
				startNewProject,
				validateStep,
				validateAllSteps,
			}}
		>
			{children}
		</ProjectFormContext.Provider>
	);
};
