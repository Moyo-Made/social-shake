"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ProjectFormProvider, useProjectForm } from "./ProjectFormContext";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import ProjectDetails from "./ProjectDetails";
import CreatorPricingTab from "./CreatorPricing";
import TikTokShopContentRequirements from "./TikTokShopContentRequirements";
import TikTokShopCreatorPricingTab from "./TikTokShopCreatorPricing";
import CreatorProjectReview from "./ProjectReview";
import TikTokShopProjectReview from "./TikTokShopReview";
import ContentRequirements from "./ContentRequirements";
import { useRouter } from "next/navigation";

// Subscription Error Modal Component
interface SubscriptionErrorModalProps {
	isOpen: boolean;
	onClose: () => void;
	message: string;
}

const SubscriptionErrorModal = ({ isOpen, onClose, message }: SubscriptionErrorModalProps) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black bg-opacity-50" 
				onClick={onClose}
			/>
			
			{/* Modal */}
			<div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
				{/* Close button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Icon */}
				<div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
					<AlertCircle className="h-6 w-6 text-red-600" />
				</div>

				{/* Title */}
				<h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
					Subscription Required
				</h3>

				{/* Message */}
				<p className="text-gray-600 text-center mb-6">
					{message}
				</p>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row gap-3">
					<Button
						onClick={() => {
							// Navigate to subscription/upgrade page
							window.location.href = '/brand/dashboard/settings'; // Adjust path as needed
						}}
						className="flex-1 bg-[#FD5C02] hover:bg-orange-600 text-white"
					>
						Upgrade Subscription
					</Button>
					<Button
						onClick={onClose}
						variant="outline"
						className="flex-1"
					>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	);
};

const ProjectFormContent = () => {
	const [step, setStep] = useState(1);
	const { currentUser } = useAuth();

	const {
		formData,
		isLoading,
		setIsLoading,
		saveDraft,
		saveCurrentState,
		validateStep,
		validateAllSteps,
	} = useProjectForm();

	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
	const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
	const [draftSuccess, setDraftSuccess] = useState<boolean>(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const {
		projectDetails: { projectType = "UGC Content" },
	} = formData;

	const router = useRouter();

	// Define validation rules for each step
	useEffect(() => {
		// Step 1: Project Details validation
		validateStep("projectDetails", () => {
			const { projectName, productType, projectDescription } =
				formData.projectDetails;

			if (!projectName || projectName.trim() === "") {
				setValidationError("Project name is required");
				return false;
			}

			if (!productType || productType.trim() === "") {
				setValidationError("Project type is required");
				return false;
			}

			if (
				!projectDescription ||
				projectDescription.length === 0 ||
				!projectDescription[0] ||
				projectDescription[0].trim() === ""
			) {
				setValidationError("Project description is required");
				return false;
			}

			if (
				!formData.projectDetails.projectThumbnail ||
				(formData.projectDetails.projectThumbnail instanceof File &&
					formData.projectDetails.projectThumbnail.size === 0)
			) {
				setValidationError("Project thumbnail is required");
				return false;
			}

			return true;
		});

		// Step 2: Content Requirements validation
		validateStep("contentRequirements", () => {
			const { contentType, platform, aspectRatio, duration, script } =
				formData.projectRequirements;
			const { projectType } = formData.projectDetails;

			if (!contentType || contentType.trim() === "") {
				setValidationError("Content type is required");
				return false;
			}

			// Only validate platforms and aspect ratio for specific project types
			if (["UGC Content Only"].includes(projectType)) {
				if (
					!platform ||
					platform.length === 0 ||
					!platform[0] ||
					platform[0].trim() === ""
				) {
					setValidationError("At least one platform is required");
					return false;
				}

				if (!aspectRatio || aspectRatio.trim() === "") {
					setValidationError("Aspect ratio is required");
					return false;
				}
			}

			if (!duration || duration.trim() === "") {
				setValidationError("Video duration is required");
				return false;
			}

			// Validate script only when client-script is selected
			const { videoType } = formData.projectRequirements;
			if (videoType === "client-script" && (!script || script.trim() === "")) {
				setValidationError(
					"Project script is required when using client script"
				);
				return false;
			}

			return true;
		});

		// Step 3: Creator Pricing validation
		validateStep("creatorPricing", () => {
			const { selectionMethod, selectedCreators, creatorCount } =
				formData.creatorPricing;

			if (
				selectionMethod === "Invite Specific Creators" &&
				(!selectedCreators || selectedCreators.length === 0)
			) {
				setValidationError("Please select at least one creator");
				return false;
			}

			if (
				selectionMethod !== "Invite Specific Creators" &&
				(!creatorCount || creatorCount < 1)
			) {
				setValidationError("Creator count must be at least 1");
				return false;
			}

			return true;
		});

		// Step 4: Review (no specific validation needed as it's just a review)
		validateStep("review", () => true);
	}, [formData, validateStep]);

	// Save current state when navigating between steps
	const handleStepChange = (newStep: number) => {
		// Reset validation error
		setValidationError(null);

		// If moving forward, validate the current step
		if (newStep > step) {
			let validationResult = false;

			// Validate based on current step
			switch (step) {
				case 1:
					validationResult = validateStepOne();
					break;
				case 2:
					validationResult = validateStepTwo();
					break;
				case 3:
					validationResult = validateStepThree();
					break;
				default:
					validationResult = true;
					break;
			}

			// Don't proceed if validation fails
			if (!validationResult) return;
		}

		// Save the current state
		saveCurrentState();

		// Then change the step
		setStep(newStep);
	};

	// Validate Step 1: Project Details
	const validateStepOne = () => {
		const { projectName, productType, projectDescription } =
			formData.projectDetails;

		if (!projectName || projectName.trim() === "") {
			setValidationError("Project name is required");
			return false;
		}

		if (!productType || productType.trim() === "") {
			setValidationError("Product type is required");
			return false;
		}

		if (
			!projectDescription ||
			projectDescription.length === 0 ||
			!projectDescription[0] ||
			projectDescription[0].trim() === ""
		) {
			setValidationError("Project description is required");
			return false;
		}

		if (
			!formData.projectDetails.projectThumbnail ||
			(formData.projectDetails.projectThumbnail instanceof File &&
				formData.projectDetails.projectThumbnail.size === 0)
		) {
			setValidationError("Project thumbnail is required");
			return false;
		}

		return true;
	};

	// Validate Step 2: Content Requirements
	const validateStepTwo = () => {
		const { contentType, platform, aspectRatio, duration, script } =
			formData.projectRequirements;
		const { projectType } = formData.projectDetails;

		// Common validation for all project types
		if (!contentType || contentType.trim() === "") {
			setValidationError("Content type is required");
			return false;
		}

		if (!duration || duration.trim() === "") {
			setValidationError("Video duration is required");
			return false;
		}

		// Validation for UGC Content Only, Creator-Posted UGC, and Spark Ads
		if (["UGC Content Only"].includes(projectType)) {
			if (!platform || platform.length === 0) {
				setValidationError("At least one platform is required");
				return false;
			}

			if (!aspectRatio || aspectRatio.trim() === "") {
				setValidationError("Aspect ratio is required");
				return false;
			}
		}

		// Validate script only when client-script is selected
		const { videoType } = formData.projectRequirements;
		if (videoType === "client-script" && (!script || script.trim() === "")) {
			setValidationError("Project script is required when using client script");
			return false;
		}

		return true;
	};

	// Validate Step 3: Creator Pricing
	const validateStepThree = () => {
		const { selectionMethod, selectedCreators, creatorCount } =
			formData.creatorPricing;

		if (
			selectionMethod === "Invite Specific Creators" &&
			(!selectedCreators || selectedCreators.length === 0)
		) {
			setValidationError("Please select at least one creator");
			return false;
		}

		if (
			selectionMethod !== "Invite Specific Creators" &&
			(!creatorCount || creatorCount < 1)
		) {
			setValidationError("Creator count must be at least 1");
			return false;
		}

		return true;
	};

	// On component mount, try to restore previously saved step from sessionStorage
	useEffect(() => {
		const savedStep = sessionStorage.getItem("projectFormStep");
		if (savedStep) {
			setStep(parseInt(savedStep, 10));
		}
	}, []);

	// Save current step to sessionStorage whenever it changes
	useEffect(() => {
		sessionStorage.setItem("projectFormStep", step.toString());
	}, [step]);

	// Automatically hide the success message after 5 seconds
	useEffect(() => {
		if (draftSuccess) {
			const timer = setTimeout(() => {
				setDraftSuccess(false);
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [draftSuccess]);

	const handleSubmit = async () => {
		try {
			setIsLoading(true);
			setSubmissionError(null);
			setSubscriptionError(null);
			setValidationError(null);

			if (!currentUser?.email) {
				setSubmissionError("You must be logged in to submit a project");
				setIsLoading(false);
				return;
			}

			// Validate all steps before submission
			if (!validateAllSteps()) {
				setValidationError(
					"Please complete all required fields before submitting"
				);
				setIsLoading(false);
				return;
			}

			// Save current state before submission
			saveCurrentState();

			// Prepare form data for project creation
			const formDataToSubmit = new FormData();

			// Add basic fields
			formDataToSubmit.append("userId", currentUser.uid);
			formDataToSubmit.append(
				"projectDetails",
				JSON.stringify(formData.projectDetails)
			);
			formDataToSubmit.append(
				"projectRequirements",
				JSON.stringify(formData.projectRequirements)
			);
			formDataToSubmit.append(
				"creatorPricing",
				JSON.stringify(formData.creatorPricing)
			);
			formDataToSubmit.append("paid", "false");

			// Handle project thumbnail if it exists
			if (formData.projectDetails.projectThumbnail) {
				if (formData.projectDetails.projectThumbnail instanceof File) {
					// If it's a File object, append it directly
					formDataToSubmit.append(
						"projectThumbnail",
						formData.projectDetails.projectThumbnail
					);
				}
				// If it's a base64 string or URL, it will be handled by the API endpoint
			}

			// Submit to the projects API endpoint
			const response = await fetch("/api/projects", {
				method: "POST",
				body: formDataToSubmit,
			});

			const result = await response.json();

			if (!response.ok) {
				// Handle subscription-specific errors
				if (response.status === 402 && result.subscriptionRequired) {
					setSubscriptionError(result.message);
					setShowSubscriptionModal(true);
				} else {
					throw new Error(
						result.error || `HTTP error! status: ${response.status}`
					);
				}
				return;
			}

			if (!result.success) {
				throw new Error(result.error || "Failed to create project");
			}

			// Clear saved form state on success
			sessionStorage.removeItem("projectFormStep");
			sessionStorage.removeItem("projectFormData");

			// Redirect to project dashboard
			router.push("/brand/dashboard/projects");
		} catch (error) {
			console.error("Submission error:", error);
			setSubmissionError(
				error instanceof Error
					? error.message
					: "An error occurred during submission"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveDraft = async () => {
		try {
			setSubmissionError(null);
			setDraftSuccess(false);

			if (!currentUser?.email) {
				setSubmissionError("You must be logged in to save a draft");
				return;
			}

			// Make sure to save the current state first
			saveCurrentState();

			// Then save to backend
			const result = await saveDraft();

			if (!result.success) {
				throw new Error(result.error || "Failed to save draft");
			}

			// Show success message and keep it shown for 5 seconds
			setDraftSuccess(true);
		} catch (error) {
			console.error("Draft save error:", error);
			setSubmissionError(
				error instanceof Error
					? error.message
					: "An error occurred while saving draft"
			);
		}
	};

	// Dynamic component rendering based on project type and step
	const renderStepComponent = () => {
		if (projectType == "UGC Content Only") {
			switch (step) {
				case 1:
					return <ProjectDetails />;
				case 2:
					return <ContentRequirements />;
				case 3:
					return <CreatorPricingTab />;
				case 4:
					return <CreatorProjectReview />;
				default:
					return <ProjectDetails />;
			}
		} else if (projectType == "Creator-Posted UGC") {
			switch (step) {
				case 1:
					return <ProjectDetails />;
				case 2:
					return <ContentRequirements />;
				case 3:
					return <CreatorPricingTab />;
				case 4:
					return <CreatorProjectReview />;
				default:
					return <ProjectDetails />;
			}
		} else if (projectType == "Spark Ads") {
			switch (step) {
				case 1:
					return <ProjectDetails />;
				case 2:
					return <ContentRequirements />;
				case 3:
					return <CreatorPricingTab />;
				case 4:
					return <CreatorProjectReview />;
				default:
					return <ProjectDetails />;
			}
		} else {
			switch (step) {
				case 1:
					return <ProjectDetails />;
				case 2:
					return <TikTokShopContentRequirements />;
				case 3:
					return <TikTokShopCreatorPricingTab />;
				case 4:
					return <TikTokShopProjectReview />;
				default:
					return <ProjectDetails />;
			}
		}
	};

	return (
		<div className="max-w-[56rem] mx-auto">
			{/* Subscription Error Modal */}
			<SubscriptionErrorModal
				isOpen={showSubscriptionModal}
				onClose={() => setShowSubscriptionModal(false)}
				message={subscriptionError || " You need a valid subscription to create a project."}
			/>

			{/* Navigation Tabs */}
			<nav className="flex pb-5 pt-5 gap-8">
				{[
					"Project Details",
					"Content Requirements",
					"Creator & Pricing",
					"Review & Publish",
				].map((tab, index) => (
					<div key={index} className="flex-1 whitespace-nowrap relative">
						<button
							className={`pb-2 ${
								index + 1 <= step ? "text-orange-500" : "text-gray-500"
							}`}
							onClick={() => handleStepChange(index + 1)}
							disabled={isLoading}
						>
							<div className="flex items-center justify-center gap-1">
								<Image
									src={
										index + 1 <= step
											? "/icons/orange-check.svg"
											: "/icons/gray-check.svg"
									}
									alt="Check"
									width={25}
									height={25}
								/>
								<span className="text-base">{tab}</span>
							</div>
						</button>
						{index + 1 <= step ? (
							<div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FD5C02] rounded-full" />
						) : (
							<div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-300 rounded-full" />
						)}
					</div>
				))}
			</nav>

			{/* Regular Error Message (non-subscription errors) */}
			{submissionError && (
				<Alert variant="destructive" className="mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription className="pt-1">
						{submissionError}
					</AlertDescription>
				</Alert>
			)}

			{/* Validation Error Message */}
			{validationError && (
				<Alert variant="destructive" className="mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription className="pt-1">
						{validationError}
					</AlertDescription>
				</Alert>
			)}

			{/* Draft Success Message */}
			{draftSuccess && (
				<Alert
					variant="default"
					className="mb-4 bg-green-50 border border-green-200"
				>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="h-4 w-4 text-green-500" />
						<AlertDescription className="text-green-700">
							Draft saved successfully!
						</AlertDescription>
					</div>
				</Alert>
			)}

			{/* Step Content */}
			<div className="">
				<div className="">{renderStepComponent()}</div>
			</div>

			{/* Navigation Buttons */}
			<div className="flex justify-between pb-5 pt-5">
				{/* Save Draft Button */}
				<div className="relative">
					<Button
						onClick={handleSaveDraft}
						className="mt-4 bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white text-base"
						disabled={isLoading}
					>
						{isLoading ? "Saving..." : "Save Draft"}
					</Button>
				</div>

				{/* Navigation Buttons */}
				<div className="flex gap-2">
					{step > 1 && (
						<Button
							onClick={() => handleStepChange(step - 1)}
							className="mt-4 bg-[#FC52E4] hover:bg-[#e061cf] px-4 py-2 text-white text-base"
							disabled={isLoading}
						>
							← Back
						</Button>
					)}

					{step < 4 ? (
						<Button
							onClick={() => handleStepChange(step + 1)}
							className="mt-4 bg-[#FD5C02] hover:bg-orange-600 text-white text-base py-2 font-normal"
							disabled={isLoading}
						>
							Next →
						</Button>
					) : (
						<Button
							onClick={handleSubmit}
							className="mt-4 bg-[#FD5C02] hover:bg-orange-600 text-white text-base py-2 font-normal"
							disabled={isLoading}
						>
							{isLoading ? "Creating..." : <>Create Project</>}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

export default function ProjectForm() {
	const { currentUser } = useAuth();

	return (
		<ProjectFormProvider
			userId={currentUser?.uid}
			isNewProject={!currentUser?.uid}
		>
			<ProjectFormContent />
		</ProjectFormProvider>
	);
}