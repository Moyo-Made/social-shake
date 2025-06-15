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
	}>({});

	// File size thresholds
	const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
	const LARGE_FILE_THRESHOLD = 3 * 1024 * 1024; // 3MB - use chunked upload for files larger than this

	// Expanded video format support
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
		'video/x-matroska'
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
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			// Clear previous errors
			setErrors({ ...errors, file: undefined });

			// Get file extension
			const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
			
			// Validate file type - check both MIME type and extension
			const isValidMimeType = SUPPORTED_VIDEO_TYPES.includes(file.type);
			const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);
			
			if (!isValidMimeType && !isValidExtension) {
				setErrors({
					...errors,
					file: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}`,
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
			videoUrl?: string;
			agreement?: string;
			file?: string;
		} = {};

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

	// Chunked upload function
	const uploadFileInChunks = async (file: File): Promise<{ success: boolean; fileId?: string; error?: string }> => {
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
		const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		try {
			// Upload each chunk
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				const formData = new FormData();
				formData.append('chunk', chunk);

				const response = await fetch(`/api/projects/submission?userId=${currentUser?.uid}&projectId=${projectId}&filename=${encodeURIComponent(file.name)}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}&fileId=${fileId}`, {
					method: 'PUT',
					body: chunk, // Send raw chunk data
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
					throw new Error(errorData.error || `Chunk upload failed: ${response.status}`);
				}

				// Update progress
				const progress = Math.round(((chunkIndex + 1) / totalChunks) * 90); // Reserve 10% for finalization
				setUploadProgress(progress);
			}

			// Finalize the upload
			setUploadProgress(95);
			const finalizeResponse = await fetch('/api/projects/submission', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: currentUser?.uid,
					projectId,
					fileId,
					filename: file.name,
					note: additionalNote,
					fileType: file.type,
				}),
			});

			if (!finalizeResponse.ok) {
				const errorData = await finalizeResponse.json().catch(() => ({ error: 'Finalization failed' }));
				throw new Error(errorData.error || `Finalization failed: ${finalizeResponse.status}`);
			}

			setUploadProgress(100);
			return { success: true, fileId };

		} catch (error) {
			console.error('Chunked upload failed:', error);
			return { 
				success: false, 
				error: error instanceof Error ? error.message : 'Upload failed' 
			};
		}
	};

	// Standard upload function (for smaller files)
	interface UploadResponseData {
		submissionsCount?: number;
		message?: string;
		// Add other expected properties here
	}

	const uploadFileStandard = async (file: File): Promise<{ success: boolean; data?: UploadResponseData; error?: string }> => {
		try {
			const formData = new FormData();
			formData.append("userId", currentUser?.uid || "");
			formData.append("projectId", projectId);
			
			if (additionalNote) {
				formData.append("note", additionalNote);
			}
			
			formData.append("video", file);

			const response = await fetch("/api/projects/submission", {
				method: "POST",
				body: formData,
			});

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
				throw new Error(data?.error || `Server error: ${response.status} ${response.statusText}`);
			}

			return { success: true, data };

		} catch (error) {
			console.error('Standard upload failed:', error);
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
			
			// Decide whether to use chunked or standard upload
			if (fileToUpload.size > LARGE_FILE_THRESHOLD) {
				// Use chunked upload for large files
				result = await uploadFileInChunks(fileToUpload);
			} else {
				// Use standard upload for smaller files
				result = await uploadFileStandard(fileToUpload);
			}

			if (result.success) {
				// If provided, call onSubmitSuccess with the new submission count
				if (onSubmitSuccess && 'data' in result && result.data?.submissionsCount) {
					onSubmitSuccess(result.data.submissionsCount);
				}

				toast.success("Your video has been submitted successfully!");
				onClose();
			} else {
				throw new Error(result.error || 'Upload failed');
			}

		} catch (error) {
			console.error("Error submitting project entry:", error);
			
			// More specific error messages
			let errorMessage = "Failed to submit project entry. Please try again.";
			
			if (error instanceof Error) {
				if (error.message.includes("Failed to fetch")) {
					errorMessage = "Network error. Please check your connection and try again.";
				} else if (error.message.includes("Server error: 413")) {
					errorMessage = "File too large for server. Please try a smaller file.";
				} else if (error.message.includes("Server error: 415")) {
					errorMessage = "Unsupported file format. Please try a different video format.";
				} else {
					errorMessage = error.message;
				}
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
								} rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<input
									type="file"
									onChange={handleFileChange}
									className="hidden"
									accept={SUPPORTED_VIDEO_EXTENSIONS.join(',')}
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
											className={`flex items-center justify-center w-3.5 h-3.5 rounded border border-gray-300`}
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
						</div>
					</form>
				</div>

				{/* Modal Footer */}
				<div className="p-4 bottom-0 bg-white rounded-b-lg">
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
			</div>
		</div>
	);
};

export default ProjectSubmissionModal;