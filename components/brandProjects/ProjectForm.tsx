"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MdOutlinePayment } from "react-icons/md";
import { useRouter } from "next/navigation";
import {
	ProjectFormProvider,
	useProjectForm,
} from "../brandProjects/ProjectFormContext";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import ProjectDetails from "./ProjectDetails";
import CreatorPricingTab from "./CreatorPricing";
import TikTokShopContentRequirements from "./TikTokShopContentRequirements";
import TikTokShopCreatorPricingTab from "./TikTokShopCreatorPricing";
import CreatorProjectReview from "./ProjectReview";
import TikTokShopProjectReview from "./TikTokShopReview";
import ContentRequirements from "./ContentRequirements";

const ProjectFormContent = () => {
	const [step, setStep] = useState(1);
	const router = useRouter();
	const { user } = useAuth();

	const { formData, isLoading, saveDraft, submitContest, saveCurrentState } =
		useProjectForm();

	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [draftSuccess, setDraftSuccess] = useState<boolean>(false);

	const {
		projectDetails: { projectType = "UGC Content" },
	} = formData;

	const { creatorPricing } = formData;

	// Save current state when navigating between steps
	const handleStepChange = (newStep: number) => {
		// First save the current state
		saveCurrentState();
		// Then change the step
		setStep(newStep);
	};

	// On component mount, try to restore previously saved step from sessionStorage
	useEffect(() => {
		const savedStep = sessionStorage.getItem("contestFormStep");
		if (savedStep) {
			setStep(parseInt(savedStep, 10));
		}
	}, []);

	// Save current step to sessionStorage whenever it changes
	useEffect(() => {
		sessionStorage.setItem("contestFormStep", step.toString());
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
			setSubmissionError(null);

			if (!user?.email) {
				setSubmissionError("You must be logged in to submit a contest");
				return;
			}

			// Save current state before submission
			saveCurrentState();

			console.log(
				"Thumbnail before submission:",
				formData.projectDetails.projectThumbnail
			);
			// Create FormData for file upload
			const submitFormData = new FormData();

			// Add the thumbnail file separately
			if (formData.projectDetails.projectThumbnail instanceof File) {
				submitFormData.append(
					"projectThumbnail",
					formData.projectDetails.projectThumbnail
				);
			}

			// Add the rest of the data as JSON strings
			submitFormData.append(
				"projectDetails",
				JSON.stringify({
					...formData.projectDetails,
					projectThumbnail:
						formData.projectDetails.projectThumbnail instanceof File
							? null // For new files
							: formData.projectDetails.projectThumbnail, // Preserve existing URL
				})
			);
			submitFormData.append(
				"projectRequirements",
				JSON.stringify(formData.projectRequirements)
			);
			submitFormData.append(
				"creatorPricing",
				JSON.stringify(formData.creatorPricing)
			);

			// Add status fields to explicitly mark this as a published contest (not a draft)
			submitFormData.append("status", "published");
			submitFormData.append("isDraft", "false");

			// Add brandEmail and userId for proper association
			submitFormData.append("brandEmail", user.email);
			submitFormData.append("userId", user.uid);

			// Add timestamp for sorting in dashboard
			submitFormData.append(
				"createdAt",
				JSON.stringify(new Date().toISOString())
			);
			submitFormData.append(
				"updatedAt",
				JSON.stringify(new Date().toISOString())
			);

			// Submit using the context method with submitFormData
			const result = await submitContest(submitFormData, user.email, user.uid);

			if (!result.success) {
				throw new Error(result.error || "Failed to create contest");
			}

			// On success, clear saved step
			sessionStorage.removeItem("contestFormStep");

			// Redirect to success page
			router.push("/dashboard/projects/payment-successful");
		} catch (error) {
			console.error("Submission error:", error);
			setSubmissionError(
				error instanceof Error
					? error.message
					: "An error occurred during submission"
			);
		}
	};

	const handleSaveDraft = async () => {
		try {
			setSubmissionError(null);
			setDraftSuccess(false);

			if (!user?.email) {
				setSubmissionError("You must be logged in to save a draft");
				return;
			}

			// Save current state
			saveCurrentState();

			// Save draft to Firestore using the updated saveDraft method
			const result = await saveDraft();

			if (!result.success) {
				throw new Error(result.error || "Failed to save draft");
			}

			// Show success message
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

			{/* Error Message */}
			{submissionError && (
				<Alert variant="destructive" className="mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{submissionError}</AlertDescription>
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
			<div className="flex justify-between">
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
							{isLoading ? (
								"Processing..."
							) : (
								<>
									<MdOutlinePayment size={30} /> Pay $
									{creatorPricing.totalAmount.toLocaleString()}
								</>
							)}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

export default function ProjectForm() {
	const { user } = useAuth();

	return (
		<ProjectFormProvider userId={user?.uid}>
			<ProjectFormContent />
		</ProjectFormProvider>
	);
}