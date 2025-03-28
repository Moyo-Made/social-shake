"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Basic from "./Basic";
import Requirements from "./Requirements";
import PrizeTimeline from "./PrizeTimeline";
import Review from "./Review";
import { MdOutlinePayment } from "react-icons/md";
import { useRouter } from "next/navigation";
import { ContestFormProvider, useContestForm } from "./ContestFormContext";
import { CheckCircle2, AlertCircle } from "lucide-react";
import GMVPrizeTimeline from "./GMVPrizeTimeline";
import GMVReview from "./GMVReview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

const ContestFormContent = () => {
	const [step, setStep] = useState(1);
	const router = useRouter();
	const { user } = useAuth();

	const { formData, isLoading, saveDraft, submitContest, saveCurrentState } =
		useContestForm();

	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [draftSuccess, setDraftSuccess] = useState<boolean>(false);

	const {
		prizeTimeline,
		basic: { contestType = "Leaderboard" },
	} = formData;

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

			console.log("Thumbnail before submission:", formData.basic.thumbnail);
			// Create FormData for file upload
			const submitFormData = new FormData();

			// Add the thumbnail file separately
      if (formData.basic.thumbnail instanceof File) {
        submitFormData.append("thumbnail", formData.basic.thumbnail);
    } 
    submitFormData.append(
      "basic",
      JSON.stringify({
          ...formData.basic,
          thumbnail: formData.basic.thumbnail instanceof File 
              ? null  // For new files 
              : formData.basic.thumbnail  // Preserve existing URL
      })
  )
			submitFormData.append(
				"requirements",
				JSON.stringify(formData.requirements)
			);
			submitFormData.append(
				"prizeTimeline",
				JSON.stringify(formData.prizeTimeline)
			);
			submitFormData.append(
				"contestType",
				JSON.stringify(formData.contestType)
			);
			submitFormData.append("incentives", JSON.stringify(formData.incentives));

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
			router.push("/payment-successful");
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

	// Dynamic component rendering based on contest type and step
	const renderStepComponent = () => {
		if (contestType === "Leaderboard") {
			switch (step) {
				case 1:
					return <Basic />;
				case 2:
					return <Requirements />;
				case 3:
					return <PrizeTimeline />;
				case 4:
					return <Review />;
				default:
					return <Basic />;
			}
		} else {
			switch (step) {
				case 1:
					return <Basic />;
				case 2:
					return <Requirements />;
				case 3:
					return <GMVPrizeTimeline />;
				case 4:
					return <GMVReview />;
				default:
					return <Basic />;
			}
		}
	};

	return (
		<div className="max-w-[48rem] mx-auto">
			{/* Navigation Tabs */}
			<nav className="grid grid-cols-4 gap-5 pb-5 pt-5">
				{["Basics", "Requirements", "Incentives & Timeline", "Review"].map(
					(tab, index) => (
						<div key={index} className="whitespace-nowrap relative">
							<button
								className={`pb-2 ${
									index + 1 <= step  ? "text-orange-500" : "text-gray-500"
								}`}
								onClick={() => handleStepChange(index + 1)}
								disabled={isLoading}
							>
								<div className="flex items-start gap-1">
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
					)
				)}
			</nav>

			{/* Draft Status Indicator */}
			{formData?.status === "draft" && (
				<Alert
					variant="default"
					className="mb-4 bg-gray-100 border border-gray-300"
				>
					<div className="flex items-center gap-2">
						<span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium">
							DRAFT
						</span>
						<AlertDescription>
							You&apos;re working on a draft contest. Submit when ready to
							publish.
						</AlertDescription>
					</div>
				</Alert>
			)}

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
							Draft saved successfully! View in{" "}
							<a href="/dashboard" className="underline font-medium">
								dashboard
							</a>
							.
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
							className="mt-4 bg-[#000] hover:bg-[#141414] text-white text-base py-2 font-normal"
							disabled={isLoading}
						>
							{isLoading ? (
								"Processing..."
							) : (
								<>
									<MdOutlinePayment size={30} /> Pay $
									{prizeTimeline.totalBudget.toLocaleString()}
								</>
							)}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

export default function ContestForm() {
	const { user } = useAuth();

	return (
		<ContestFormProvider userId={user?.uid}>
			<ContestFormContent />
		</ContestFormProvider>
	);
}
