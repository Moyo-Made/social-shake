"use client";

import { useState } from "react";
import { X, CloudUploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface UploadVideoModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	userId: string;
}

export default function UploadVideoModal({
	isOpen,
	onClose,
	onSuccess,
	userId,
}: UploadVideoModalProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatus, setUploadStatus] = useState<string>("");
	const [uploadId, setUploadId] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		price: "",
		licenseType: "standard",
		tags: "",
		file: null as File | null,
	});
	const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
	
	const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
	const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks (base64 will be ~1.33MB)
	
	const validateVideoFile = (file: File) => {
		if (file.size > MAX_VIDEO_SIZE) {
			return {
				valid: false,
				error: `File too large. Maximum size is ${(MAX_VIDEO_SIZE / (1024 * 1024)).toFixed(0)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
			};
		}

		return { valid: true };
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];

			// Validate file
			const validation = validateVideoFile(file);
			if (!validation.valid) {
				alert(validation.error);
				e.target.value = "";
				return;
			}

			// Clean up previous URL if it exists
			if (videoPreviewUrl) {
				URL.revokeObjectURL(videoPreviewUrl);
			}

			const newUrl = URL.createObjectURL(file);
			setFormData({ ...formData, file });
			setVideoPreviewUrl(newUrl);
		}
	};

	const generateThumbnail = (videoFile: File): Promise<{ file: File; base64: string }> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			video.onloadeddata = () => {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				video.currentTime = 1; // Seek to 1 second for thumbnail
			};

			video.onseeked = () => {
				if (ctx) {
					ctx.drawImage(video, 0, 0);
					canvas.toBlob(
						(blob) => {
							if (blob) {
								const thumbnailFile = new File([blob], "thumbnail.jpg", {
									type: "image/jpeg",
								});
								
								// Convert to base64 for API
								const reader = new FileReader();
								reader.onload = () => {
									const base64 = (reader.result as string).split(',')[1];
									resolve({ 
										file: thumbnailFile, 
										base64 
									});
								};
								reader.readAsDataURL(blob);
							} else {
								reject(new Error("Failed to generate thumbnail"));
							}
						},
						"image/jpeg",
						0.8
					);
				}
			};

			video.onerror = () => reject(new Error("Failed to load video"));
			video.src = URL.createObjectURL(videoFile);
		});
	};

	const initializeUpload = async (file: File) => {
		const response = await fetch("/api/videos", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				userId,
				fileName: file.name,
				fileSize: file.size,
				fileContentType: file.type,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to initialize upload");
		}

		return response.json();
	};

	const uploadChunk = async (
		file: File,
		chunkIndex: number,
		totalChunks: number,
		uploadId: string
	) => {
		const start = chunkIndex * CHUNK_SIZE;
		const end = Math.min(start + CHUNK_SIZE, file.size);
		const chunk = file.slice(start, end);

		// Convert chunk to base64
		const chunkBase64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const base64 = (reader.result as string).split(',')[1];
				resolve(base64);
			};
			reader.onerror = () => reject(new Error('Failed to read chunk'));
			reader.readAsDataURL(chunk);
		});

		// Verify chunk size isn't too large after base64 encoding
		const payloadSize = JSON.stringify({
			userId,
			chunkData: chunkBase64,
			fileName: file.name,
			fileContentType: file.type,
			chunkIndex,
			totalChunks,
			uploadId,
			fileSize: file.size,
		}).length;

		console.log(`Chunk ${chunkIndex + 1}/${totalChunks}: ${(chunk.size / 1024).toFixed(1)}KB -> ${(payloadSize / 1024).toFixed(1)}KB payload`);

		if (payloadSize > 4.5 * 1024 * 1024) { // 4.5MB limit for safety
			throw new Error(`Chunk ${chunkIndex + 1} payload too large: ${(payloadSize / 1024 / 1024).toFixed(1)}MB`);
		}

		const response = await fetch("/api/videos", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				userId,
				chunkData: chunkBase64,
				fileName: file.name,
				fileContentType: file.type,
				chunkIndex,
				totalChunks,
				uploadId,
				fileSize: file.size,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage;
			try {
				const errorJson = JSON.parse(errorText);
				errorMessage = errorJson.error || errorJson.message;
			} catch {
				errorMessage = errorText;
			}
			throw new Error(errorMessage || `Failed to upload chunk ${chunkIndex + 1}`);
		}

		return response.json();
	};

	const uploadMetadata = async (uploadId: string, thumbnail?: { file: File; base64: string }) => {
		const thumbnailFileName = thumbnail 
			? `thumbnails/${Date.now()}_${thumbnail.file.name}`
			: null;

		const response = await fetch("/api/videos", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: formData.title,
				description: formData.description,
				price: parseFloat(formData.price),
				licenseType: formData.licenseType,
				tags: formData.tags,
				userId,
				uploadId,
				thumbnailData: thumbnail?.base64,
				thumbnailFileName,
				thumbnailContentType: thumbnail?.file.type,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to save video metadata");
		}

		return response.json();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.file) return;

		setIsUploading(true);
		setUploadProgress(0);
		setUploadStatus("Initializing upload...");

		try {
			// Initialize upload session
			const initResponse = await initializeUpload(formData.file);
			const { uploadId: newUploadId, totalChunks } = initResponse;
			setUploadId(newUploadId);

			setUploadStatus("Uploading video...");

			// Upload chunks with retry logic
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				let retries = 3;
				let chunkResponse;
				
				while (retries > 0) {
					try {
						chunkResponse = await uploadChunk(
							formData.file,
							chunkIndex,
							totalChunks,
							newUploadId
						);
						break; // Success, exit retry loop
					} catch (error) {
						retries--;
						console.error(`Chunk ${chunkIndex + 1} failed, retries left: ${retries}`, error);
						
						if (retries === 0) {
							throw new Error(`Failed to upload chunk ${chunkIndex + 1} after 3 attempts: ${error instanceof Error ? error.message : String(error)}`);
						}
						
						// Wait before retry
						await new Promise(resolve => setTimeout(resolve, 1000));
					}
				}

				setUploadProgress(chunkResponse.progress || 0);
				setUploadStatus(chunkResponse.message || `Uploaded chunk ${chunkIndex + 1}/${totalChunks}`);

				// If this was the last chunk and video is now uploaded
				if (chunkResponse.status === "video_uploaded") {
					setUploadStatus("Processing thumbnail...");
					break;
				}
			}

			// Generate thumbnail
			const thumbnail = await generateThumbnail(formData.file);
			setUploadStatus("Finalizing upload...");

			// Upload metadata and thumbnail
			await uploadMetadata(newUploadId, thumbnail);

			setUploadStatus("Upload completed!");
			setUploadProgress(100);

			// Reset form and close modal
			setFormData({
				title: "",
				description: "",
				price: "",
				licenseType: "standard",
				tags: "",
				file: null,
			});

			if (videoPreviewUrl) {
				URL.revokeObjectURL(videoPreviewUrl);
				setVideoPreviewUrl(null);
			}

			toast.success("Video uploaded successfully!");
			onSuccess();
			onClose();

		} catch (error) {
			console.error("Upload error:", error);
			const errorMessage = error instanceof Error ? error.message : "Upload failed";
			setUploadStatus(`Error: ${errorMessage}`);
			toast.error(errorMessage);
		} finally {
			setIsUploading(false);
			setTimeout(() => {
				setUploadProgress(0);
				setUploadStatus("");
				setUploadId(null);
			}, 3000);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<div>
						<h2 className="text-xl font-bold text-gray-900">
							Upload New Video
						</h2>
						<p className="text-gray-600 mt-0.5">
							Add a new video to your content library
						</p>
					</div>
					<button
						onClick={onClose}
						className="-mt-9 hover:bg-gray-100 rounded-lg transition-colors"
						disabled={isUploading}
					>
						<X className="w-5 h-5 text-gray-600" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* File Upload */}
					<div>
						<h3 className="text-base font-medium text-gray-900 mb-2">
							Video File
						</h3>

						<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
							{formData.file ? (
								<div>
									{/* Video Preview */}
									<div className="mb-4">
										<video
											src={videoPreviewUrl || ""}
											className="mx-auto max-w-full max-h-48 rounded-lg shadow-sm"
											controls
											preload="metadata"
										>
											Your browser does not support the video tag.
										</video>
									</div>

									{/* File Info */}
									<div className="space-y-2">
										<CloudUploadIcon className="mx-auto h-8 w-8 text-green-600" />
										<p className="text-sm text-gray-600">
											<span className="font-medium">{formData.file.name}</span>
										</p>
										<p className="text-xs text-gray-500">
											{(formData.file.size / (1024 * 1024)).toFixed(2)} MB
											{formData.file.size > 50 * 1024 * 1024 && (
												<span className="text-amber-600 ml-2">
													⚠️ Large file - will be uploaded in chunks
												</span>
											)}
										</p>
										{!isUploading && (
											<button
												type="button"
												onClick={() => {
													if (videoPreviewUrl) {
														URL.revokeObjectURL(videoPreviewUrl);
													}
													setFormData({ ...formData, file: null });
													setVideoPreviewUrl(null);
												}}
												className="mt-2 text-sm text-red-600 hover:text-red-700"
											>
												Remove file
											</button>
										)}
									</div>
								</div>
							) : (
								<div>
									<CloudUploadIcon className="mx-auto h-8 w-8 text-gray-400" />
									<div className="mt-2">
										<label htmlFor="video-upload" className="cursor-pointer">
											<span className="mt-2 block text-sm font-medium text-gray-900">
												Click to upload or drag and drop
											</span>
											<span className="mt-1 block text-xs text-gray-500">
												MP4, MOV, AVI, WMV, WebM up to 100MB
											</span>
										</label>
										<input
											id="video-upload"
											type="file"
											accept="video/*"
											onChange={handleFileChange}
											className="sr-only"
											required
											disabled={isUploading}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Upload Progress */}
						{isUploading && (
							<div className="mt-4">
								<div className="flex justify-between text-sm text-gray-600 mb-1">
									<span>{uploadStatus}</span>
									<span>{Math.round(uploadProgress)}%</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2">
									<div
										className="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									></div>
								</div>
								{uploadId && (
									<p className="text-xs text-gray-500 mt-1">
										Upload ID: {uploadId}
									</p>
								)}
							</div>
						)}
					</div>

					{/* Video Details */}
					<div>
						<h3 className="text-base font-medium text-gray-900 mb-4">
							Video Details
						</h3>

						<div className="grid grid-cols-1 gap-4">
							<div>
								<Label
									htmlFor="title"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Title *
								</Label>
								<Input
									type="text"
									id="title"
									required
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									className="w-full border border-gray-300 rounded-lg px-3 py-2"
									placeholder="Enter a descriptive title for your video"
									disabled={isUploading}
								/>
							</div>

							<div>
								<Label
									htmlFor="description"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Description
								</Label>
								<Textarea
									id="description"
									rows={3}
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									className="w-full border border-gray-300 rounded-lg px-3 py-2"
									placeholder="Describe your video, its use cases, and any relevant details"
									disabled={isUploading}
								/>
							</div>

							<div>
								<Label
									htmlFor="tags"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Tags
								</Label>
								<Input
									type="text"
									id="tags"
									value={formData.tags}
									onChange={(e) =>
										setFormData({ ...formData, tags: e.target.value })
									}
									className="w-full border border-gray-300 rounded-lg px-3 py-2"
									placeholder="business, meeting, corporate, presentation (separate with commas)"
									disabled={isUploading}
								/>
								<p className="mt-1 text-xs text-gray-500">
									Add relevant tags to help brands discover your content
								</p>
							</div>
						</div>
					</div>

					{/* Pricing & Licensing */}
					<div>
						<h3 className="text-base font-medium text-gray-900 mb-4">
							Pricing & Licensing
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label
									htmlFor="price"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Price (USD) *
								</Label>
								<div className="relative">
									<span className="absolute left-3 top-2 text-gray-500">$</span>
									<Input
										type="number"
										id="price"
										required
										min="1"
										step="0.01"
										value={formData.price}
										onChange={(e) =>
											setFormData({ ...formData, price: e.target.value })
										}
										className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2"
										placeholder="25.00"
										disabled={isUploading}
									/>
								</div>
							</div>

							<div>
								<Label
									htmlFor="license"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									License Type *
								</Label>
								<Select
									value={formData.licenseType}
									onValueChange={(value) =>
										setFormData({ ...formData, licenseType: value })
									}
									disabled={isUploading}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select license type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="standard">Standard License</SelectItem>
										<SelectItem value="extended">Extended License</SelectItem>
										<SelectItem value="exclusive">Exclusive License</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* License Explanations */}
						<div className="mt-4 p-3 bg-gray-50 rounded-lg">
							<h4 className="text-sm font-medium text-gray-900 mb-2">
								License Types:
							</h4>
							<ul className="text-xs text-gray-600 space-y-1">
								<li>
									<strong>Standard:</strong> Basic commercial use, up to 500k views
								</li>
								<li>
									<strong>Extended:</strong> Unlimited commercial use, resale rights
								</li>
								<li>
									<strong>Exclusive:</strong> Buyer gets exclusive rights, you cannot resell
								</li>
							</ul>
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-end space-x-3 pt-4 border-t">
						<Button
							type="button"
							onClick={onClose}
							disabled={isUploading}
							className="px-6 py-2 border border-gray-300 shadow-none rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isUploading || !formData.file}
							className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isUploading
								? `${uploadStatus} ${Math.round(uploadProgress)}%`
								: "Upload Video"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}