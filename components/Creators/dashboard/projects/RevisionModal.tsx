"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface RevisionData {
	id: string;
	submissionId: string;
	approved: boolean;
	feedback: string;
	issues: string[];
	createdAt: string;
	revisionNumber?: number;
}

interface RevisionModalProps {
	isOpen: boolean;
	onClose: () => void;
	submissionId: string;
	onRevisionSubmit?: (newSubmissionData: { id: string; status: string }) => void;
}

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks

const RevisionModal: React.FC<RevisionModalProps> = ({
	isOpen,
	onClose,
	submissionId,
	onRevisionSubmit,
}) => {
	const [revisions, setRevisions] = useState<RevisionData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [fileToUpload, setFileToUpload] = useState<File | null>(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Clean up object URLs when component unmounts or when file changes
		return () => {
			if (filePreviewUrl) {
				URL.revokeObjectURL(filePreviewUrl);
			}
		};
	}, [filePreviewUrl]);

	// Separate useEffect for fetching data
	useEffect(() => {
		// Fetch revision data when modal opens and submissionId is available
		if (isOpen && submissionId) {
			console.log("Fetching revision data for submission:", submissionId);
			fetchRevisionData();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, submissionId]);

	const fetchRevisionData = async () => {
		// If submissionId is empty, don't attempt to fetch
		if (!submissionId) {
			console.error("Cannot fetch: submissionId is empty");
			setError("Missing submission ID");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			console.log(
				`Making API request to: /api/reviews?submissionId=${submissionId}`
			);
			const response = await fetch(`/api/reviews?submissionId=${submissionId}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error("API error response:", response.status, errorData);
				throw new Error(
					errorData.error ||
						`Failed to fetch revision data (${response.status})`
				);
			}

			const data = await response.json();
			console.log("Fetched revision data:", data);

			// Add revision number to each revision
			const revisionsWithNumber = data.reviews.map(
				(revision: RevisionData, index: number) => ({
					...revision,
					revisionNumber: data.reviews.length - index,
				})
			);

			setRevisions(revisionsWithNumber);
		} catch (error) {
			console.error("Error fetching revision data:", error);
			setError(
				error instanceof Error ? error.message : "Failed to fetch revision data"
			);
			toast.error("Failed to fetch revision data. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			// Validate file type
			const validTypes = ["video/mp4", "video/quicktime", "video/x-matroska"];
			if (!validTypes.includes(file.type)) {
				toast.error("Please upload a valid video file (MP4 or MKV)");
				return;
			}

			// Check file size - 500MB max
			const maxSize = 500 * 1024 * 1024; // 500MB
			if (file.size > maxSize) {
				toast.error("File too large. Maximum size is 500MB.");
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

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.currentTarget.classList.add("border-orange-400", "bg-orange-50");
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.currentTarget.classList.remove("border-orange-400", "bg-orange-50");
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uploadChunk = async (chunk: Blob, chunkIndex: number, totalChunks: number, file: File): Promise<any> => {
		const formData = new FormData();
		formData.append("submissionId", submissionId);
		formData.append("chunk", chunk);
		formData.append("chunkIndex", chunkIndex.toString());
		formData.append("totalChunks", totalChunks.toString());
		formData.append("fileName", file.name);
		formData.append("fileSize", file.size.toString());
		formData.append("fileType", file.type);

		const response = await fetch("/api/project-submissions/revision", {
			method: "POST",
			body: formData,
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || `Failed to upload chunk ${chunkIndex + 1}`);
		}

		return data;
	};

	const handleSubmitRevision = async () => {
		if (!fileToUpload) {
			toast.error("Please upload a video file");
			return;
		}

		if (!submissionId) {
			toast.error("Missing submission ID");
			return;
		}

		setIsSubmitting(true);
		setUploadProgress(0);

		try {
			const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
			let uploadedChunks = 0;

			console.log(`Starting chunked upload: ${totalChunks} chunks`);

			// Upload chunks sequentially
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
				const chunk = fileToUpload.slice(start, end);

				console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}`);

				const result = await uploadChunk(chunk, chunkIndex, totalChunks, fileToUpload);
				
				uploadedChunks++;
				const progress = Math.round((uploadedChunks / totalChunks) * 100);
				setUploadProgress(progress);

				// If this is the last chunk and upload is complete
				if (result.completed) {
					toast.success("Your revised video has been submitted successfully!");

					// Clear the file state
					setFileToUpload(null);
					if (filePreviewUrl) {
						URL.revokeObjectURL(filePreviewUrl);
						setFilePreviewUrl(null);
					}

					// Trigger refresh in parent component if callback exists
					if (onRevisionSubmit) {
						onRevisionSubmit(result.data);
					}

					onClose();
					return;
				}
			}

		} catch (error) {
			console.error("Error submitting revision:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to submit revision. Please try again."
			);
		} finally {
			setIsSubmitting(false);
			setUploadProgress(0);
		}
	};

	if (!isOpen) return null;

	// Format date to YYYY-MM-DD
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0];
	};

	const currentRevision = revisions[0]; // Most recent revision

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
			<div className="bg-white rounded-xl w-full max-w-lg shadow-lg my-8 relative max-h-[90vh] overflow-y-auto">
				{isLoading ? (
					<div className="p-8 text-center">
						<p>Loading revision data...</p>
					</div>
				) : error ? (
					<div className="p-8 text-center text-red-500">
						<p>{error}</p>
					</div>
				) : (
					<>
						{/* Modal Header */}
						<div className="p-4 text-center">
							<h2 className="text-xl font-semibold text-black">
								Revision - Video #{currentRevision?.revisionNumber || 1}
							</h2>
							<p className="text-gray-500 mt-1 text-sm">
								Requested on{" "}
								{currentRevision ? formatDate(currentRevision.createdAt) : ""}
							</p>

							{/* Close button */}
							<button
								onClick={onClose}
								className="absolute top-6 right-6 text-gray-500 hover:text-gray-700"
								aria-label="Close"
								disabled={isSubmitting}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6"
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
						</div>

						{/* Revision Content */}
						<div className="px-8 pb-8">
							<div className="bg-[#FFF4EE] rounded-lg p-4 mb-5 ">
								<h3 className="text-start text-black font-medium mb-2">
									Revision {currentRevision.revisionNumber}{" "}
								</h3>

								<h4 className=" text-gray-600 mb-2 text-start">
									Issues Raised
								</h4>
								<ul className="list-disc ml-6 mb-4 text-start text-sm text-black">
									{currentRevision?.issues.map((issue, index) => (
										<li key={index} className="mb-1">
											{issue}
										</li>
									))}
								</ul>

								<h4 className="text-start text-gray-600 mb-1">
									Additional Comments
								</h4>
								<p className="text-sm text-start text-black">
									{currentRevision?.feedback || ""}
								</p>
							</div>

							{/* Upload Section */}
							<h3 className="text-base font-medium mb-2 text-black text-start">
								Upload Revised Video
							</h3>
							<p className="text-sm text-gray-500 mb-4 text-start">
								Your new video will replace the previous submission and its
								status will be set to pending for review.
							</p>

							<div
								className="border-2 border-gray-300 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer"
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onClick={() => {
									if (!isSubmitting) {
										const input = document.getElementById("fileInput");
										if (input) input.click();
									}
								}}
							>
								<input
									id="fileInput"
									type="file"
									onChange={handleFileChange}
									className="hidden"
									accept="video/mp4,video/x-matroska,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/avi,video/webm,video/3gpp,video/3gpp2,video/ogg"
									disabled={isSubmitting}
								/>

								{filePreviewUrl ? (
									<div className="flex flex-col items-center">
										<video
											src={filePreviewUrl}
											className="w-full max-h-48 rounded-md mb-2"
											controls
										/>
										<p className="text-green-600 text-sm">
											Video uploaded: {fileToUpload?.name} (
											{fileToUpload?.size
												? (fileToUpload.size / (1024 * 1024)).toFixed(2)
												: "0"}
											MB)
										</p>
									</div>
								) : (
									<>
										<div className="mx-auto w-12 h-12 mb-4">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												className="w-12 h-12 text-gray-400"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
												/>
											</svg>
										</div>
										<p className="text-orange-500">
											Click to upload{" "}
											<span className="text-gray-500">or drag and drop</span>
										</p>
										<p className="text-gray-500 text-sm mt-1">
											MP4 or MKV (max. 500MB)
										</p>
									</>
								)}
							</div>

							{/* Progress bar */}
							{isSubmitting && (
								<div className="mb-4">
									<div className="flex justify-between text-sm text-gray-600 mb-1">
										<span>Uploading...</span>
										<span>{uploadProgress}%</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-orange-500 h-2 rounded-full transition-all duration-300"
											style={{ width: `${uploadProgress}%` }}
										></div>
									</div>
								</div>
							)}

							{/* Submit button */}
							<button
								onClick={handleSubmitRevision}
								disabled={isSubmitting || !fileToUpload}
								className={`w-full py-2 rounded-lg text-white  ${
									isSubmitting || !fileToUpload
										? "bg-orange-300 cursor-not-allowed"
										: "bg-orange-500 hover:bg-orange-600"
								} transition-colors`}
							>
								{isSubmitting 
									? `Uploading... ${uploadProgress}%` 
									: "Submit Revision"}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default RevisionModal;