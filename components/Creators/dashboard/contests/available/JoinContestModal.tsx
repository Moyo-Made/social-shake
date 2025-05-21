"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import SuccessModal from "./SuccessModal";
import { toast } from "sonner";

interface ContestModalProps {
	isOpen: boolean;
	onClose: () => void;
	contestId: string;
	onSubmitSuccess?: (newParticipantCount: number) => void;
	hasJoined?: boolean;
}

const ContestModal: React.FC<ContestModalProps> = ({
	isOpen,
	onClose,
	contestId,
	onSubmitSuccess,
	hasJoined: initialHasJoined = false,
}) => {
	const { currentUser } = useAuth();
	const [postUrl, setPostUrl] = useState("");
	const [postDescription, setPostDescription] = useState("");
	const [isChecked, setIsChecked] = useState(false);
	const [isChecked2, setIsChecked2] = useState(false);
	const [isChecked3, setIsChecked3] = useState(false);
	const [fileToUpload, setFileToUpload] = useState<File | null>(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [hasJoined, setHasJoined] = useState(initialHasJoined);
	const [errors, setErrors] = useState<{
		postUrl?: string;
		agreement?: string;
		file?: string;
	}>({});

	useEffect(() => {
		// Clean up object URLs when component unmounts or when file changes
		return () => {
			if (filePreviewUrl) {
				URL.revokeObjectURL(filePreviewUrl);
			}
		};
	}, [filePreviewUrl]);

	const handleToggle = () => {
		setIsChecked(!isChecked);
	};

	const handleToggle2 = () => {
		setIsChecked2(!isChecked2);
	};

	const handleToggle3 = () => {
		setIsChecked3(!isChecked3);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			// Clear previous errors
			setErrors({ ...errors, file: undefined });

			// Validate file type
			const validTypes = [
				"image/jpeg",
				"image/png",
				"video/mp4",
				"video/quicktime",
				"video/webm",
			];
			if (!validTypes.includes(file.type)) {
				setErrors({
					...errors,
					file: "Please upload a valid PNG, JPG, or video file (MP4, QuickTime, WebM)",
				});
				return;
			}

			// Check file size - 500MB max
			const maxSize = 500 * 1024 * 1024; // 500MB

			if (file.size > maxSize) {
				setErrors({
					...errors,
					file: "File too large. Maximum size is 500MB.",
				});
				return;
			}

			// Set the file and create a preview URL
			setFileToUpload(file);

			// Revoke previous URL if exists
			if (filePreviewUrl) {
				URL.revokeObjectURL(filePreviewUrl);
			}

			// Create new preview URL
			const previewUrl = URL.createObjectURL(file);
			setFilePreviewUrl(previewUrl);

			// Show success toast
			toast.success("File uploaded successfully");
		}
	};

	const validateForm = () => {
		const newErrors: {
			postUrl?: string;
			agreement?: string;
			file?: string;
		} = {};

		if (!postUrl.trim()) {
			newErrors.postUrl = "TikTok URL is required";
		} else if (!postUrl.includes("tiktok.com")) {
			newErrors.postUrl = "Please enter a valid TikTok URL";
		}

		if (!isChecked || !isChecked2 || !isChecked3) {
			newErrors.agreement = "You must agree to all terms to continue";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			let mediaUrlToSave = null;

			// If there's a file to upload, handle that first
			if (fileToUpload) {
				const fileUploadFormData = new FormData();
				fileUploadFormData.append("file", fileToUpload);
				fileUploadFormData.append("userId", currentUser?.uid || "");

				// Upload the file to your file upload endpoint
				const uploadResponse = await fetch("/api/upload", {
					method: "POST",
					body: fileUploadFormData,
				});

				if (!uploadResponse.ok) {
					throw new Error("Failed to upload file");
				}

				const uploadData = await uploadResponse.json();
				mediaUrlToSave = uploadData.fileUrl; // Get the URL from your upload service
			}

			// Now send the contest join request with the file URL
			const response = await fetch("/api/contests/join", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser?.uid || "",
					contestId,
					postUrl,
					postDescription,
					mediaUrl: mediaUrlToSave, // Include the media URL in the request
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit contest entry");
			}

			// If provided, call onSubmitSuccess with the new participant count
			if (onSubmitSuccess && data.participantCount) {
				onSubmitSuccess(data.participantCount);
			}

			// Mark as joined
			setHasJoined(true);

			// Show success modal instead of closing
			setShowSuccessModal(true);

			// Important: Don't close the contest modal yet
			// The parent component shouldn't call closeContestModal() after submission success
		} catch (error) {
			console.error("Error submitting contest entry:", error);
			toast.error("Failed to submit contest entry. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSuccessModalClose = () => {
		// Close the success modal
		setShowSuccessModal(false);
		// Then close the contest modal
		onClose();
	};

	const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		e.currentTarget.classList.add("border-orange-400", "bg-orange-50");
	};

	const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		e.currentTarget.classList.remove("border-orange-400", "bg-orange-50");
	};

	const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		e.currentTarget.classList.remove("border-orange-400", "bg-orange-50");

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];

			// Create a synthetic event to reuse the handleFileChange logic
			const syntheticEvent = {
				target: {
					files: [file],
				},
			} as unknown as React.ChangeEvent<HTMLInputElement>;

			handleFileChange(syntheticEvent);
		}
	};

	if (!isOpen) return null;

	// If showing success modal, render it on top of the contest modal
	if (showSuccessModal) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
				<SuccessModal
					isOpen={showSuccessModal}
					onClose={handleSuccessModalClose}
					contestId={contestId}
				/>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
			{/* Modal Content */}
			<div className="bg-white rounded-lg w-full max-w-lg shadow-lg my-8 relative max-h-[90vh] flex flex-col">
				{/* Modal Header - Fixed at top */}
				<div className="p-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
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
					<h2 className="text-xl font-bold text-center">Join Contest</h2>
					<p className="text-gray-500 text-center text-sm mt-1">
						Provide your post details to officially submit your entry
					</p>
				</div>

				{/* Modal Body - Scrollable */}
				<div className="p-4 overflow-y-auto flex-grow">
					<form onSubmit={handleSubmit}>
						{/* TikTok URL Input */}
						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">
								Your TikTok Post URL
							</label>
							<input
								type="text"
								value={postUrl}
								onChange={(e) => setPostUrl(e.target.value)}
								placeholder="https://vt.tiktok.com/ZS6KEanvB/"
								className={`w-full px-2 py-1 border ${
									errors.postUrl ? "border-red-500" : "border-gray-300"
								} rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-sm`}
								disabled={hasJoined}
							/>
							{errors.postUrl && (
								<p className="text-red-500 text-xs mt-1">{errors.postUrl}</p>
							)}
						</div>

						{/* Upload Video Section */}
						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">
								Upload Video Created
							</label>
							<label
								className={`border ${
									errors.file ? "border-red-500" : "border-gray-300"
								} rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${hasJoined ? "opacity-60 cursor-not-allowed" : ""}`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<input
									type="file"
									onChange={handleFileChange}
									className="hidden"
									accept="image/png,image/jpeg,video/mp4,video/quicktime,video/webm"
									disabled={hasJoined}
								/>

								{filePreviewUrl && fileToUpload?.type.includes("video") ? (
									<div className="w-full max-w-md mx-auto">
										<video
											src={filePreviewUrl}
											className="w-full h-auto rounded-md mb-2"
											controls
										/>
										<p className="text-green-600 text-xs text-center">
											Video uploaded: {fileToUpload.name} (
											{(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB)
										</p>
									</div>
								) : filePreviewUrl && fileToUpload?.type.includes("image") ? (
									<div className="w-full max-w-md mx-auto">
										<Image
											src={filePreviewUrl}
											alt="Preview"
											className="w-full h-auto rounded-md mb-2"
											width={200}
											height={200}
										/>
										<p className="text-green-600 text-xs text-center">
											Image uploaded: {fileToUpload.name} (
											{(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB)
										</p>
									</div>
								) : (
									<>
										<div className="bg-white border border-gray-200 rounded-lg py-1 px-2 w-12 mx-auto mb-2">
											<Image
												src="/icons/upload.svg"
												alt="Upload"
												width={40}
												height={40}
											/>
										</div>
										<p className="text-orange-500 text-sm">
											Click to upload{" "}
											<span className="text-gray-500">or drag and drop</span>
										</p>
										<p className="text-gray-500 text-xs mt-1">
											PNG, JPG, or video files (MP4, QuickTime, WebM) accepted
											(max 500MB)
										</p>
									</>
								)}
							</label>
							{errors.file && (
								<p className="text-red-500 text-xs mt-1">{errors.file}</p>
							)}
						</div>

						{/* Post Description */}
						<div className="mb-3">
							<label className="block text-sm font-medium mb-1">
								Describe Your Post
							</label>
							<textarea
								value={postDescription}
								onChange={(e) => setPostDescription(e.target.value)}
								placeholder="Showcased the product's unique features with a fun and engaging dance challenge, highlighting its benefits for everyday use."
								className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 placeholder:text-sm"
								maxLength={200}
								disabled={hasJoined}
							/>
							<p className="text-gray-500 text-xs mt-1">
								({postDescription.length}/200 characters)
							</p>
						</div>

						{/* Checkbox Agreements */}
						<div className="space-y-1 mb-3 text-sm">
							<div className="flex items-start">
								<div className="flex-shrink-0 mt-1">
									<label
										className={`relative flex items-center ${hasJoined ? "cursor-not-allowed" : "cursor-pointer"}`}
									>
										<input
											type="checkbox"
											checked={isChecked || hasJoined}
											onChange={handleToggle}
											className="absolute opacity-0 w-0 h-0"
											disabled={hasJoined}
										/>
										<span
											className={`flex items-center justify-center w-3.5 h-3.5 rounded border border-gray-300 ${hasJoined ? "opacity-70" : ""}`}
											style={{
												backgroundColor:
													isChecked || hasJoined ? "#f97316" : "transparent",
												borderColor:
													isChecked || hasJoined ? "#f97316" : "#d1d5db",
											}}
										>
											{(isChecked || hasJoined) && (
												<svg
													className="w-3 h-3"
													viewBox="0 0 20 20"
													fill="white"
												>
													<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
												</svg>
											)}
										</span>
									</label>
								</div>
								<div className="ml-2">
									<p className="text-[#667085]">
										I agree to the contest rules and requirements, including
										providing the TikTok Spark Code for my submitted post upon
										successful completion of the contest.
									</p>
								</div>
							</div>

							<div className="flex items-start">
								<div className="flex-shrink-0 mt-1">
									<label
										className={`relative flex items-center ${hasJoined ? "cursor-not-allowed" : "cursor-pointer"}`}
									>
										<input
											type="checkbox"
											checked={isChecked2 || hasJoined}
											onChange={handleToggle2}
											className="absolute opacity-0 w-0 h-0"
											disabled={hasJoined}
										/>
										<span
											className={`flex items-center justify-center w-3.5 h-3.5 rounded border border-gray-300 ${hasJoined ? "opacity-70" : ""}`}
											style={{
												backgroundColor:
													isChecked2 || hasJoined ? "#f97316" : "transparent",
												borderColor:
													isChecked2 || hasJoined ? "#f97316" : "#d1d5db",
											}}
										>
											{(isChecked2 || hasJoined) && (
												<svg
													className="w-3 h-3"
													viewBox="0 0 20 20"
													fill="white"
												>
													<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
												</svg>
											)}
										</span>
									</label>
								</div>
								<div className="ml-2">
									<p className="text-[#667085]">
										I agree to allow tracking of metrics such as views, likes,
										shares, and comments for this post by submitting my entry.
									</p>
								</div>
							</div>

							<div className="flex items-start">
								<div className="flex-shrink-0 mt-1">
									<label
										className={`relative flex items-center ${hasJoined ? "cursor-not-allowed" : "cursor-pointer"}`}
									>
										<input
											type="checkbox"
											checked={isChecked3 || hasJoined}
											onChange={handleToggle3}
											className="absolute opacity-0 w-0 h-0"
											disabled={hasJoined}
										/>
										<span
											className={`flex items-center justify-center w-3.5 h-3.5 rounded border border-gray-300 ${hasJoined ? "opacity-70" : ""}`}
											style={{
												backgroundColor:
													isChecked3 || hasJoined ? "#f97316" : "transparent",
												borderColor:
													isChecked3 || hasJoined ? "#f97316" : "#d1d5db",
											}}
										>
											{(isChecked3 || hasJoined) && (
												<svg
													className="w-3 h-3"
													viewBox="0 0 20 20"
													fill="white"
												>
													<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
												</svg>
											)}
										</span>
									</label>
								</div>
								<div className="ml-2">
									<p className="text-[#667085]">
										I confirm that the music and resources used in my post
										comply with TikTok&apos;s guidelines and do not violate any
										rules.
									</p>
								</div>
							</div>

							{errors.agreement && (
								<p className="text-red-500 text-xs mt-1">{errors.agreement}</p>
							)}
						</div>
					</form>
				</div>

				{/* Modal Footer - Fixed at bottom */}
				<div className="p-4 border-t sticky bottom-0 bg-white rounded-b-lg">
					{hasJoined ? (
						<button
							disabled
							className="w-full py-2 bg-green-500 text-white rounded-md flex items-center justify-center opacity-90 cursor-not-allowed"
						>
							<svg
								className="w-4 h-4 mr-2"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
							</svg>
							Contest Joined
						</button>
					) : (
						<button
							type="submit"
							onClick={(e) => {
								e.preventDefault();
								const form = e.currentTarget
									.closest("div")
									?.previousElementSibling?.querySelector("form");
								if (form)
									form.dispatchEvent(new Event("submit", { bubbles: true }));
							}}
							disabled={
								isSubmitting || !isChecked || !isChecked2 || !isChecked3
							}
							className={`w-full py-2 ${
								isSubmitting || !isChecked || !isChecked2 || !isChecked3
									? "bg-orange-300 cursor-not-allowed"
									: "bg-orange-500 hover:bg-orange-600"
							} text-white rounded-md transition-colors`}
						>
							{isSubmitting ? "Joining..." : "Join Contest"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default ContestModal;
