"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import SuccessModal from "../contests/available/SuccessModal";

interface ProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
	onSubmitSuccess?: (newParticipantCount: number) => void;
	contestId: string;
}

const ProjectSubmissionModal: React.FC<ProjectModalProps> = ({
	isOpen,
	onClose,
	projectId,
	contestId,
	onSubmitSuccess,
}) => {
	const { currentUser } = useAuth();
	const [additionalNote, setAdditionalNote] = useState("");
	const [isChecked, setIsChecked] = useState(false);
	const [fileToUpload, setFileToUpload] = useState<File | null>(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [errors, setErrors] = useState<{
		videoUrl?: string;
		additionalNote?: string;
		file?: string;
		agreement?: string;
	}>({});

	// These should match your backend constants
	const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
	const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB - matches your backend

	// Expanded video format support - matches your backend
	const SUPPORTED_VIDEO_TYPES = [
		'video/mp4',
		'video/webm',
		'video/quicktime',
		'video/x-msvideo',
		'video/mpeg',
		'video/ogg',
		'video/3gpp',
		'video/x-ms-wmv',
		'video/x-flv',
		'video/mp2t',
		'video/x-matroska',
		'video/x-m4v'
	];

	const SUPPORTED_VIDEO_EXTENSIONS = [
		'.mp4',
		'.webm',
		'.mov',
		'.avi',
		'.mpeg',
		'.mpg',
		'.ogg',
		'.3gp',
		'.wmv',
		'.flv',
		'.mkv',
		'.m4v',
		'.ts'
	];

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
		// Clear agreement error when checked
		if (!isChecked) {
			setErrors(prev => ({ ...prev, agreement: undefined }));
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			// Clear previous errors
			setErrors(prev => ({ ...prev, file: undefined }));

			// Get file extension
			const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
			
			// Validate file type - check both MIME type and extension
			const isValidMimeType = SUPPORTED_VIDEO_TYPES.includes(file.type);
			const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);
			
			if (!isValidMimeType && !isValidExtension) {
				setErrors(prev => ({
					...prev,
					file: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}`,
				}));
				return;
			}

			// Check file size
			if (file.size > MAX_VIDEO_SIZE) {
				setErrors(prev => ({
					...prev,
					file: `File too large. Maximum size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
				}));
				return;
			}

			if (file.size === 0) {
				setErrors(prev => ({
					...prev,
					file: "The uploaded file appears to be empty. Please try again.",
				}));
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
		const newErrors: typeof errors = {};

		// Check if file is uploaded
		if (!fileToUpload) {
			newErrors.file = "Please upload a video file";
		}

		// Check if agreement is checked
		if (!isChecked) {
			newErrors.agreement = "Please accept the terms";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Standard upload function (matches your backend POST endpoint)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uploadFile = async (file: File): Promise<{ success: boolean; data?: any; error?: string }> => {
		try {
			setUploadProgress(10);

			const formData = new FormData();
			formData.append("userId", currentUser?.uid || "");
			formData.append("projectId", projectId);
			
			if (additionalNote) {
				formData.append("note", additionalNote);
			}
			
			formData.append("video", file);

			setUploadProgress(30);


			const response = await fetch("/api/projects/submission", {
				method: "POST",
				body: formData,
			});

			setUploadProgress(70);

			let data;
			const contentType = response.headers.get("content-type");
			
			if (contentType && contentType.includes("application/json")) {
				data = await response.json();
			} else {
				const textResponse = await response.text();
				console.error("Non-JSON response:", textResponse);
				
				if (!response.ok) {
					throw new Error(`Server error: ${response.status} ${response.statusText}`);
				}
				
				data = { success: true, message: "Upload completed successfully" };
			}

			if (!response.ok) {
				// Handle specific error cases from your backend
				if (response.status === 401) {
					throw new Error("Please sign in again");
				}
				if (response.status === 404) {
					throw new Error("Project not found");
				}
				if (response.status === 413) {
					throw new Error("File too large. Maximum size is 500MB");
				}
				if (response.status === 415) {
					throw new Error(data?.error || "Unsupported video format");
				}
				
				throw new Error(data?.error || `Server error: ${response.status} ${response.statusText}`);
			}

			setUploadProgress(100);
			return { success: true, data };

		} catch (error) {
			console.error('Upload failed:', error);
			return { 
				success: false, 
				error: error instanceof Error ? error.message : 'Upload failed' 
			};
		}
	};

	// Large file upload function (matches your backend PUT endpoint)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uploadLargeFile = async (file: File): Promise<{ success: boolean; data?: any; error?: string }> => {
		try {
			setUploadProgress(10);

			const formData = new FormData();
			formData.append("userId", currentUser?.uid || "");
			formData.append("projectId", projectId);
			
			if (additionalNote) {
				formData.append("note", additionalNote);
			}
			
			formData.append("video", file);

			setUploadProgress(30);

			// Use PUT method for large files as per your backend
			const response = await fetch("/api/projects/submission", {
				method: "PUT",
				body: formData,
			});

			setUploadProgress(70);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.error || `Server error: ${response.status} ${response.statusText}`);
			}

			setUploadProgress(100);
			return { success: true, data };

		} catch (error) {
			console.error('Large file upload failed:', error);
			return { 
				success: false, 
				error: error instanceof Error ? error.message : 'Upload failed' 
			};
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm() || !fileToUpload) {
			return;
		}

		setIsSubmitting(true);
		setUploadProgress(0);

		try {
			let result;
			
			// Decide whether to use regular or large file upload based on your backend logic
			if (fileToUpload.size > CHUNK_SIZE) {
				// Use PUT endpoint for large files
				result = await uploadLargeFile(fileToUpload);
			} else {
				// Use POST endpoint for smaller files
				result = await uploadFile(fileToUpload);
			}

			if (result.success) {
				// If provided, call onSubmitSuccess with the new submission count
				if (onSubmitSuccess && result.data?.submissionsCount) {
					onSubmitSuccess(result.data.submissionsCount);
				}

				toast.success(result.data?.message || "Your video has been submitted successfully!");
				
				// Reset form
				setFileToUpload(null);
				setFilePreviewUrl(null);
				setAdditionalNote("");
				setIsChecked(false);
				setErrors({});
				
				// Show success modal or close
				onClose();

			} else {
				throw new Error(result.error || 'Upload failed');
			}

		} catch (error) {
			console.error("Error submitting project entry:", error);
			
			// More specific error messages
			let errorMessage = "Failed to submit project entry. Please try again.";
			
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
			setUploadProgress(0);
		}
	};

	const handleSuccessModalClose = () => {
		setShowSuccessModal(false);
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

			const syntheticEvent = {
				target: {
					files: [file],
				},
			} as unknown as React.ChangeEvent<HTMLInputElement>;

			handleFileChange(syntheticEvent);
		}
	};

	if (!isOpen) return null;

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
			<div className="bg-white rounded-lg w-full max-w-lg shadow-lg my-8 relative max-h-[90vh] flex flex-col">
				{/* Modal Header */}
				<div className="p-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
					<button
						onClick={onClose}
						className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
						aria-label="Close"
						disabled={isSubmitting}
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
					<h2 className="text-xl font-bold text-black text-center">
						Submit Your Video for Review
					</h2>
					<p className="text-gray-500 text-center text-sm mt-2">
						Upload your video submission for the brand to review. Ensure it
						meets all project requirements before submitting.
					</p>
				</div>

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-grow">
					<form onSubmit={handleSubmit}>
						{/* Upload Video Section */}
						<div className="mb-4">
							<label className="block text-base text-start text-black font-medium mb-1">
								Upload Video
							</label>
							<label
								className={`border ${
									errors.file ? "border-red-500" : "border-gray-300"
								} rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
									isSubmitting ? "opacity-50 cursor-not-allowed" : ""
								}`}
								onDragOver={!isSubmitting ? handleDragOver : undefined}
								onDragLeave={!isSubmitting ? handleDragLeave : undefined}
								onDrop={!isSubmitting ? handleDrop : undefined}
							>
								<input
									type="file"
									onChange={handleFileChange}
									className="hidden"
									accept={SUPPORTED_VIDEO_EXTENSIONS.join(',')}
									disabled={isSubmitting}
								/>

								{filePreviewUrl && fileToUpload?.type.includes("video") ? (
									<div className="w-full max-w-md flex flex-col items-center justify-center">
										<video
											src={filePreviewUrl}
											className="w-auto h-48 rounded-md mb-2"
											controls
										/>
										<p className="text-green-600 text-xs text-center">
											Video uploaded: {fileToUpload?.name} (
											{(fileToUpload?.size / (1024 * 1024)).toFixed(2)}MB)
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
											Most video formats supported (max 500MB)
										</p>
									</>
								)}
							</label>
							{errors.file && (
								<p className="text-red-500 text-xs mt-1">{errors.file}</p>
							)}
						</div>

						{/* Progress Bar */}
						{isSubmitting && uploadProgress > 0 && (
							<div className="mb-4">
								<div className="flex justify-between items-center mb-1">
									<span className="text-sm text-gray-600">Uploading...</span>
									<span className="text-sm text-gray-600">{uploadProgress}%</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2">
									<div 
										className="bg-orange-500 h-2 rounded-full transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									></div>
								</div>
							</div>
						)}

						{/* Additional Notes */}
						<div className="mb-3">
							<label className="block text-base text-black text-start font-medium mb-1">
								Additional Notes (Optional)
							</label>
							<textarea
								value={additionalNote}
								onChange={(e) => setAdditionalNote(e.target.value)}
								placeholder="Type here..."
								className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 placeholder:text-sm"
								maxLength={200}
								disabled={isSubmitting}
							/>
							<p className="text-black text-xs mt-1">
								({additionalNote.length}/200 characters)
							</p>
						</div>

						{/* Checkbox Agreements */}
						<div className="space-y-1 mt-4 text-sm">
							<div className="flex items-start">
								<div className="flex-shrink-0 mt-1">
									<label className={`relative flex items-center`}>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={handleToggle}
											className="absolute opacity-0 w-0 h-0"
											disabled={isSubmitting}
										/>
										<span
											className={`flex items-center justify-center w-3.5 h-3.5 rounded border border-gray-300 ${
												isSubmitting ? "opacity-50" : ""
											}`}
											style={{
												backgroundColor: isChecked ? "#f97316" : "transparent",
												borderColor: isChecked ? "#f97316" : "#d1d5db",
											}}
										>
											{isChecked && (
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
									<p className="text-start text-[#667085]">
										I confirm that the music and resources used in my post
										comply with TikTok /Youtube /Facebook guidelines and do not
										violate any rules.
									</p>
								</div>
							</div>
							{errors.agreement && (
								<p className="text-red-500 text-xs mt-1 ml-5">{errors.agreement}</p>
							)}
						</div>

						{/* Submit Button */}
						<div className="mt-6">
							<button
								type="submit"
								disabled={isSubmitting || !isChecked || !fileToUpload}
								className={`w-full py-2 ${
									isSubmitting || !isChecked || !fileToUpload
										? "bg-orange-300 cursor-not-allowed"
										: "bg-orange-500 hover:bg-orange-600"
								} text-white rounded-md transition-colors`}
							>
								{isSubmitting ? `Uploading... ${uploadProgress}%` : "Submit Video"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default ProjectSubmissionModal;