"use client";

import { useEffect, useState } from "react";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { toast } from "sonner";
import Image from "next/image";
import { useCreatorVerification } from "@/components/Creators/verify-identity/CreatorVerificationContext";
import { X, Play, Upload } from "lucide-react";

function PortfolioVideos() {
	const {
		verificationData,
		updateVerificationData,
		fieldErrors,
		clearFieldError,
		touched,
		setTouched,
		isCompressing,
		compressionProgress,
	} = useCreatorVerification();

	const [portfolioVideos, setPortfolioVideos] = useState<(File | null)[]>([]);
	const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(
		null
	);

	// Initialize portfolio videos array with at least 3 slots
	useEffect(() => {
		if (verificationData.portfolioVideos) {
			setPortfolioVideos(verificationData.portfolioVideos);
		} else {
			// Initialize with 3 empty slots
			setPortfolioVideos([null, null, null]);
		}
	}, [verificationData.portfolioVideos]);

	// Enhanced upload handler for portfolio videos
	const handleVideoUpload = async (file: File | null, index: number) => {
		setCurrentUploadIndex(index);
		clearFieldError(`portfolioVideo${index}`);

		// Validate file type
		const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
		if (!file || !validVideoTypes.includes(file.type)) {
			toast.error("Invalid file type. Please upload a valid video file.");
			setCurrentUploadIndex(null);
			return;
		}

		try {
			// Check file size before processing (100MB limit for portfolio videos)
			if (file.size > 100 * 1024 * 1024) {
				toast.warning(
					"Your video is large and will be automatically compressed."
				);
			}

			// Create new portfolio videos array
			const newPortfolioVideos = [...portfolioVideos];
			newPortfolioVideos[index] = file;

			// Update local state first
			setPortfolioVideos(newPortfolioVideos);

			// Update context data
			await toast.promise(
				updateVerificationData({ portfolioVideos: newPortfolioVideos }),
				{
					loading: isCompressing
						? "Compressing and uploading portfolio video..."
						: "Uploading portfolio video...",
					success: `Portfolio video ${index + 1} uploaded successfully.`,
					error: "Failed to upload video. Please try again.",
				}
			);

			// Mark field as touched after upload
			setTouched((prev) => ({ ...prev, [`portfolioVideo${index}`]: true }));
		} catch (error) {
			console.error("Error in portfolio video upload:", error);
			toast.error(
				"An error occurred while processing your video. Please try again."
			);
		} finally {
			setCurrentUploadIndex(null);
		}
	};

	// Remove video handler
	const handleRemoveVideo = (index: number) => {
		const newPortfolioVideos = [...portfolioVideos];
		newPortfolioVideos[index] = null;
		setPortfolioVideos(newPortfolioVideos);
		updateVerificationData({ portfolioVideos: newPortfolioVideos });
		toast.success(`Portfolio video ${index + 1} removed.`);
	};

	// Add new video slot
	const addVideoSlot = () => {
		const newPortfolioVideos = [...portfolioVideos, null];
		setPortfolioVideos(newPortfolioVideos);
	};

	// Create video preview URL
	const createVideoPreview = (file: Blob | MediaSource) => {
		if (file && typeof file === "object" && file instanceof File) {
			return URL.createObjectURL(file);
		}
		return null;
	};

	// Get uploaded videos count
	const uploadedVideosCount = portfolioVideos.filter(
		(video) => video !== null
	).length;
	const isMinimumMet = uploadedVideosCount >= 3;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-semibold mb-2">Upload Portfolio Videos</h1>
				<p className="text-gray-600 mb-6">
					Showcase your best work by uploading at least 3 portfolio videos.
					These videos will help potential clients understand your style and
					capabilities.
				</p>

				{/* Progress indicator */}
				<div className="mb-6 p-4 bg-gray-50 rounded-lg">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm">Videos Uploaded</span>
						<span
							className={`text-sm font-medium ${isMinimumMet ? "text-green-600" : "text-orange-600"}`}
						>
							{uploadedVideosCount} / {Math.max(3, portfolioVideos.length)}{" "}
							{isMinimumMet ? "✓" : "(minimum 3 required)"}
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className={`h-2 rounded-full transition-all duration-300 ${isMinimumMet ? "bg-green-500" : "bg-orange-500"}`}
							style={{
								width: `${Math.min(100, (uploadedVideosCount / 3) * 100)}%`,
							}}
						></div>
					</div>
				</div>

				{/* Guidelines */}
				<div className="space-y-2 mb-8 p-4 bg-blue-50 rounded-lg">
					<h3 className="font-semibold text-blue-900 mb-3">
						Portfolio Video Guidelines:
					</h3>
					<div className="flex gap-3">
						<Image
							src="/icons/audio.svg"
							alt="Quality"
							width={20}
							height={20}
						/>
						<p className="text-blue-800 text-sm">
							Upload your highest quality work that represents your skills and
							style.
						</p>
					</div>
					<div className="flex gap-3">
						<Image
							src="/icons/speak.svg"
							alt="Variety"
							width={20}
							height={20}
						/>
						<p className="text-blue-800 text-sm">
							Include a variety of content types to showcase your range and
							versatility.
						</p>
					</div>
					<div className="flex gap-3">
						<Image src="/icons/date.svg" alt="Recent" width={20} height={20} />
						<p className="text-blue-800 text-sm">
							Upload recent work that reflects your current skill level and
							style.
						</p>
					</div>
					<div className="flex gap-3">
						<Image src="/icons/id.svg" alt="Original" width={20} height={20} />
						<p className="text-blue-800 text-sm">
							Ensure all content is original and you have the rights to use it.
						</p>
					</div>
				</div>
			</div>

			{/* Compression progress indicator */}
			{isCompressing && currentUploadIndex !== null && (
				<div className="mb-4">
					<p className="text-sm text-blue-600 mb-2">
						Compressing portfolio video {currentUploadIndex + 1} (
						{Math.round(compressionProgress * 100)}%)...
					</p>
					<div className="w-full bg-gray-200 rounded-full h-2.5">
						<div
							className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
							style={{ width: `${compressionProgress * 100}%` }}
						></div>
					</div>
				</div>
			)}

			{/* Portfolio Video Upload Slots */}
			<div className="space-y-6">
				{portfolioVideos.map((video, index) => (
					<div key={index} className="border border-gray-200 rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-base font-semibold">
								Portfolio Video {index + 1}
								{index < 3 && <span className="text-red-500 ml-1">*</span>}
							</h3>
							{video && (
								<button
									onClick={() => handleRemoveVideo(index)}
									className="text-red-500 hover:text-red-700 p-1"
									title="Remove video"
								>
									<X size={20} />
								</button>
							)}
						</div>

						{video ? (
							// Video preview
							<div className="space-y-4">
								<div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video max-w-md">
									<video
										src={createVideoPreview(video) || undefined}
										className="w-full h-full object-cover"
										controls
										preload="metadata"
									/>
									<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
										<Play className="text-white" size={32} />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="flex-1">
										<p className="text-sm font-medium text-green-600">
											✓ {video.name}
										</p>
										<p className="text-xs text-gray-500">
											Size: {(video.size / (1024 * 1024)).toFixed(2)}MB
										</p>
									</div>
								</div>
							</div>
						) : (
							// Upload dropzone
							<div>
								<UploadDropzone
									onFileSelect={(file) => handleVideoUpload(file, index)}
									acceptedFileTypes="video/*"
									maxSize={100 * 1024 * 1024} // 100MB max size
									selectedFile={null}
									instructionText="Click to upload or drag and drop"
									fileTypeText="Video file (max 100MB, large files will be compressed)"
									disabled={isCompressing && currentUploadIndex === index}
								/>
								{touched[`portfolioVideo${index}`] &&
									fieldErrors[`portfolioVideo${index}`] && (
										<p className="text-sm text-red-500 mt-2">
											{fieldErrors[`portfolioVideo${index}`]}
										</p>
									)}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Add more videos button */}
			{portfolioVideos.length < 10 && (
				<div className="mt-6">
					<button
						onClick={addVideoSlot}
						className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-400 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-600 transition-colors"
					>
						<Upload size={20} />
						Add Another Video Slot
					</button>
					<p className="text-xs text-gray-500 mt-1">
						You can upload up to 10 portfolio videos total
					</p>
				</div>
			)}

			{/* Minimum requirement notice */}
			{!isMinimumMet && (
				<div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
					<p className="text-orange-800 text-sm">
						<strong>Note:</strong> You need to upload at least 3 portfolio
						videos to proceed to the next step. Currently uploaded:{" "}
						{uploadedVideosCount}/3
					</p>
				</div>
			)}
		</div>
	);
}

export default function UploadPortfolioVideos() {
	return <PortfolioVideos />;
}
