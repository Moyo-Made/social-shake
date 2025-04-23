"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ApplicationSuccessModal from "./ApplicationSuccessModal";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	contestId: string;
	onSubmitSuccess?: () => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({
	isOpen,
	onClose,
	contestId,
	onSubmitSuccess,
}) => {
	const { currentUser } = useAuth();
	const [postUrl, setPostUrl] = useState("");
	const [hasBusinessAccount, setHasBusinessAccount] = useState<boolean | null>(
		null
	);
	const [applicationText, setApplicationText] = useState("");
	const [sampleUrls, setSampleUrls] = useState<string[]>([""]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [errors, setErrors] = useState<{
		postUrl?: string;
		applicationText?: string;
		samples?: string;
	}>({});

	const addSampleField = () => {
		setSampleUrls([...sampleUrls, ""]);
	};

	const removeSampleField = (index: number) => {
		const newSampleUrls = [...sampleUrls];
		newSampleUrls.splice(index, 1);
		setSampleUrls(newSampleUrls);
	};

	const updateSampleUrl = (index: number, value: string) => {
		const newSampleUrls = [...sampleUrls];
		newSampleUrls[index] = value;
		setSampleUrls(newSampleUrls);
	};

	const validateForm = () => {
		const newErrors: {
			postUrl?: string;
			applicationText?: string;
			samples?: string;
		} = {};

		if (!postUrl.trim()) {
			newErrors.postUrl = "TikTok URL is required";
		} else if (!postUrl.includes("tiktok.com")) {
			newErrors.postUrl = "Please enter a valid TikTok URL";
		}

		if (!applicationText.trim()) {
			newErrors.applicationText = "Please explain why you should be selected";
		}

		// Validate at least one valid sample URL
		const validSamples = sampleUrls.filter(
			(url) => url.trim() && url.includes("tiktok.com")
		);
		if (validSamples.length === 0) {
			newErrors.samples = "Please provide at least one valid TikTok sample";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			// Filter out empty sample URLs
			const filteredSamples = sampleUrls.filter((url) => url.trim() !== "");

			// Send the application to the API
			const response = await fetch("/api/contests/apply", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser?.uid || "",
					contestId,
					postUrl,
					applicationText,
					sampleUrls: filteredSamples,
					hasBusinessAccount: hasBusinessAccount === true,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit application");
			}

			// Show success modal
			setShowSuccessModal(true);

			// Call success callback if provided
			if (onSubmitSuccess) {
				onSubmitSuccess();
			}
		} catch (error) {
			console.error("Error submitting application:", error);
			toast.error("Failed to submit application. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCloseAll = () => {
		setShowSuccessModal(false);
		onClose();
	};

	if (!isOpen) return null;

	// Show success modal if submission was successful
	if (showSuccessModal) {
		return (
			<ApplicationSuccessModal
				isOpen={showSuccessModal}
				onClose={handleCloseAll}
				message="Your application has been submitted for review. We'll notify you once it's approved."
			/>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
			<div className="bg-white rounded-lg w-full max-w-lg shadow-lg my-8 relative">
				<div className="p-6">
					<button
						onClick={onClose}
						className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
					<h2 className="text-xl font-bold text-center mb-3">
						Apply to Join the Contest
					</h2>
					<p className="text-gray-500 text-center mb-6">
						Fill in the required details to submit your application for this
						contest.
					</p>

					<form onSubmit={handleSubmit}>
						{/* Business Account Question */}

						<div className="flex flex-col mb-4">
							<Label className="text-base">
								Do you have a Tiktok Business Account?
							</Label>

							<RadioGroup
								className="flex flex-wrap gap-3 mt-2"
								value={hasBusinessAccount ? "yes" : "no"}
								onValueChange={(value) =>
									setHasBusinessAccount(value === "yes")
								}
							>
								<div
									className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-6 py-2 rounded-lg data-[state=checked]:bg-[#f26f38] data-[state=checked]:text-[#fff] data-[state=checked]:border-none"
									data-state={hasBusinessAccount ? "checked" : "unchecked"}
								>
									<RadioGroupItem value="yes" id="yes" className="" />
									<Label htmlFor="yes">Yes</Label>
								</div>

								<div
									className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-6 py-2 rounded-lg data-[state=checked]:bg-[#f26f38] data-[state=checked]:text-white data-[state=checked]:border-none"
									data-state={!hasBusinessAccount ? "checked" : "unchecked"}
								>
									<RadioGroupItem value="no" id="no" className="" />
									<Label htmlFor="no">No</Label>
								</div>
							</RadioGroup>
						</div>

						{/* TikTok URL */}
						<div className="mb-4">
							<label className="block text-base font-medium mb-1">
								Your TikTok Post URL
							</label>
							<Input
								type="text"
								value={postUrl}
								onChange={(e) => setPostUrl(e.target.value)}
								placeholder="https://vt.tiktok.com/ZS6KEanvB/"
								className={`w-full px-3 py-2 border ${
									errors.postUrl ? "border-red-500" : "border-gray-300"
								} rounded-md`}
							/>
							{errors.postUrl && (
								<p className="text-red-500 text-sm mt-1">{errors.postUrl}</p>
							)}
						</div>

						{/* Why should you be selected */}
						<div className="mb-4">
							<label className="block text-base font-medium mb-1">
								Why should you be selected?
							</label>
							<Textarea
								value={applicationText}
								onChange={(e) => setApplicationText(e.target.value)}
								placeholder="Hi Social Shake, I'm thrilled about the opportunity to participate in your contest! As a content creator with 10,000 Followers and an engagement rate of 60%, I've honed my skills in crafting TikTok videos that are not only visually appealing but also drive real results..."
								className={`w-full px-3 py-2 border ${
									errors.applicationText ? "border-red-500" : "border-gray-300"
								} rounded-md min-h-32 placeholder:text-sm`}
								maxLength={500}
							/>
							<p className="text-gray-500 text-sm mt-1">
								({applicationText.length}/500 characters)
							</p>
							{errors.applicationText && (
								<p className="text-red-500 text-sm mt-1">
									{errors.applicationText}
								</p>
							)}
						</div>

						{/* Sample TikToks */}
						<div className="mb-6">
							<label className="block text-base font-medium mb-1">
								Samples of your best Tiktoks
							</label>
							{sampleUrls.map((url, index) => (
								<div key={index} className="flex items-center mb-2">
									<Input
										type="text"
										value={url}
										onChange={(e) => updateSampleUrl(index, e.target.value)}
										placeholder="https://vt.tiktok.com/ZS6KEanvB/"
										className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder:text-sm"
									/>
									<div className="flex ml-2">
										{index === sampleUrls.length - 1 && (
											<button
												type="button"
												onClick={addSampleField}
												className="p-2 text-2xl"
											>
												+
											</button>
										)}
										{sampleUrls.length > 1 && (
											<button
												type="button"
												onClick={() => removeSampleField(index)}
												className="p-2 text-2xl"
											>
												<Trash2 size={20} />
											</button>
										)}
									</div>
								</div>
							))}
							{errors.samples && (
								<p className="text-red-500 text-sm mt-1">{errors.samples}</p>
							)}
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isSubmitting}
							className={`w-full py-3 ${
								isSubmitting
									? "bg-orange-400"
									: "bg-orange-500 hover:bg-orange-600"
							} text-white font-medium rounded-md transition-colors`}
						>
							{isSubmitting ? "Submitting..." : "Submit Application"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default ApplicationModal;
