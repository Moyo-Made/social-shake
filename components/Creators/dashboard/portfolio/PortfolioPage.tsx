"use client";

import React, { useState, useEffect } from "react";
import {
	Play,
	Upload,
	X,
	Loader,
	CheckCircle,
	AlertCircle,
	Video,
	Camera,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PortfolioData {
	aboutMeVideoUrl: string;
	portfolioVideoUrls: string[];
	userId: string;
}

interface UploadState {
	isUploading: boolean;
	progress: number;
	error: string | null;
	preview: string | null;
	selectedFile: File | null;
}

interface VideoLoadingState {
	isLoading: boolean;
	hasError: boolean;
	canPlay: boolean;
}

const CreatorPortfolio = () => {
	const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	
	// Add a key state to force video re-renders
	const [videoKeys, setVideoKeys] = useState({
		about: 0,
		portfolio: [0, 0, 0]
	});

	// Video loading states
	const [videoLoadingStates, setVideoLoadingStates] = useState<{
		about: VideoLoadingState;
		portfolio: VideoLoadingState[];
	}>({
		about: { isLoading: true, hasError: false, canPlay: false },
		portfolio: [
			{ isLoading: true, hasError: false, canPlay: false },
			{ isLoading: true, hasError: false, canPlay: false },
			{ isLoading: true, hasError: false, canPlay: false }
		]
	});

	const { currentUser } = useAuth();

	// Upload states for each video slot
	const [aboutVideoUpload, setAboutVideoUpload] = useState<UploadState>({
		isUploading: false,
		progress: 0,
		error: null,
		preview: null,
		selectedFile: null,
	});

	const [portfolioUploads, setPortfolioUploads] = useState<
		Record<number, UploadState>
	>({
		0: { isUploading: false, progress: 0, error: null, preview: null, selectedFile: null },
		1: { isUploading: false, progress: 0, error: null, preview: null, selectedFile: null },
		2: { isUploading: false, progress: 0, error: null, preview: null, selectedFile: null },
	});

	// Selected video for full screen viewing
	const [selectedVideo, setSelectedVideo] = useState<{
		url: string;
		title: string;
	} | null>(null);

	// Video loading handlers
	const handleVideoLoadStart = (type: "about" | "portfolio", index?: number) => {
		if (type === "about") {
			setVideoLoadingStates(prev => ({
				...prev,
				about: { isLoading: true, hasError: false, canPlay: false }
			}));
		} else if (typeof index === "number") {
			setVideoLoadingStates(prev => ({
				...prev,
				portfolio: prev.portfolio.map((state, i) => 
					i === index ? { isLoading: true, hasError: false, canPlay: false } : state
				)
			}));
		}
	};

	const handleVideoCanPlay = (type: "about" | "portfolio", index?: number) => {
		if (type === "about") {
			setVideoLoadingStates(prev => ({
				...prev,
				about: { isLoading: false, hasError: false, canPlay: true }
			}));
		} else if (typeof index === "number") {
			setVideoLoadingStates(prev => ({
				...prev,
				portfolio: prev.portfolio.map((state, i) => 
					i === index ? { isLoading: false, hasError: false, canPlay: true } : state
				)
			}));
		}
	};

	const handleVideoError = (type: "about" | "portfolio", index?: number) => {
		if (type === "about") {
			setVideoLoadingStates(prev => ({
				...prev,
				about: { isLoading: false, hasError: true, canPlay: false }
			}));
		} else if (typeof index === "number") {
			setVideoLoadingStates(prev => ({
				...prev,
				portfolio: prev.portfolio.map((state, i) => 
					i === index ? { isLoading: false, hasError: true, canPlay: false } : state
				)
			}));
		}
	};

	// Fetch portfolio data
	useEffect(() => {
		if (currentUser?.uid) {
			fetchPortfolioData();
		}
	}, [currentUser?.uid]);

	const fetchPortfolioData = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const userId = currentUser?.uid;
			if (!userId) {
				console.log("No user ID available, skipping portfolio fetch");
				setLoading(false);
				return;
			}

			const response = await fetch(`/api/creator/portfolio?userId=${userId}`);
			
			if (!response.ok) {
				throw new Error(`Failed to fetch portfolio data: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			const portfolioData: PortfolioData = {
				aboutMeVideoUrl: data.aboutMeVideoUrl || "",
				portfolioVideoUrls: Array.isArray(data.portfolioVideoUrls) 
					? data.portfolioVideoUrls 
					: ["", "", ""],
				userId: data.userId || userId,
			};
			
			setPortfolioData(portfolioData);
		} catch (err) {
			console.error("Error fetching portfolio data:", err);
			setError(err instanceof Error ? err.message : "Failed to load portfolio");
			
			setPortfolioData({
				aboutMeVideoUrl: "",
				portfolioVideoUrls: ["", "", ""],
				userId: currentUser?.uid || "",
			});
		} finally {
			setLoading(false);
		}
	};

	// Handle file selection and preview
	const handleFileSelect = (
		file: File,
		type: "about" | "portfolio",
		index?: number
	) => {
		if (!file.type.startsWith("video/")) {
			alert("Please select a valid video file");
			return;
		}

		const previewUrl = URL.createObjectURL(file);

		if (type === "about") {
			setAboutVideoUpload((prev) => ({
				...prev,
				preview: previewUrl,
				selectedFile: file,
				error: null,
			}));
		} else if (typeof index === "number") {
			setPortfolioUploads((prev) => ({
				...prev,
				[index]: { 
					...prev[index], 
					preview: previewUrl, 
					selectedFile: file,
					error: null 
				},
			}));
		}
	};

	// Force video refresh by updating keys and clearing cache
	const forceVideoRefresh = (type: "about" | "portfolio", index?: number) => {
		if (type === "about") {
			setVideoKeys(prev => ({
				...prev,
				about: prev.about + 1
			}));
		} else if (typeof index === "number") {
			setVideoKeys(prev => ({
				...prev,
				portfolio: prev.portfolio.map((key, i) => i === index ? key + 1 : key)
			}));
		}
	};

	// Upload video function
	const uploadVideo = async (
		file: File,
		type: "about" | "portfolio",
		index?: number
	) => {
		const formData = new FormData();
		formData.append("video", file);
		formData.append("type", type);
		formData.append("userId", currentUser?.uid || "");
		if (typeof index === "number") {
			formData.append("index", index.toString());
		}

		try {
			// Update upload state
			if (type === "about") {
				setAboutVideoUpload((prev) => ({
					...prev,
					isUploading: true,
					progress: 0,
					error: null,
				}));
			} else if (typeof index === "number") {
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: {
						...prev[index],
						isUploading: true,
						progress: 0,
						error: null,
					},
				}));
			}

			const response = await fetch("/api/creator/portfolio/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Upload failed: ${response.status}`);
			}

			const result = await response.json();

			// Create URL with cache-busting parameter
			const urlWithCacheBuster = result.url + `?t=${Date.now()}`;

			// Update portfolio data with new URL
			if (type === "about") {
				setPortfolioData((prev) =>
					prev ? { ...prev, aboutMeVideoUrl: urlWithCacheBuster } : null
				);
				setAboutVideoUpload({
					isUploading: false,
					progress: 100,
					error: null,
					preview: null,
					selectedFile: null,
				});
				// Force video refresh
				forceVideoRefresh("about");
			} else if (typeof index === "number" && portfolioData) {
				const newUrls = [...portfolioData.portfolioVideoUrls];
				while (newUrls.length < 3) {
					newUrls.push("");
				}
				newUrls[index] = urlWithCacheBuster;
				setPortfolioData((prev) =>
					prev ? { ...prev, portfolioVideoUrls: newUrls } : null
				);
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: {
						isUploading: false,
						progress: 100,
						error: null,
						preview: null,
						selectedFile: null,
					},
				}));
				// Force video refresh
				forceVideoRefresh("portfolio", index);
			}

		} catch (err) {
			console.error("Upload error:", err);
			const errorMsg = err instanceof Error ? err.message : "Upload failed";

			if (type === "about") {
				setAboutVideoUpload((prev) => ({
					...prev,
					isUploading: false,
					error: errorMsg,
				}));
			} else if (typeof index === "number") {
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: { ...prev[index], isUploading: false, error: errorMsg },
				}));
			}
		}
	};

	// Confirm upload after preview
	const confirmUpload = (
		type: "about" | "portfolio",
		index?: number
	) => {
		let file: File | null = null;
		
		if (type === "about") {
			file = aboutVideoUpload.selectedFile;
		} else if (typeof index === "number") {
			file = portfolioUploads[index].selectedFile;
		}
		
		if (file) {
			uploadVideo(file, type, index);
		} else {
			console.error("No file selected for upload");
		}
	};

	// Video Player Component with Loading States
	const VideoPlayer = ({ 
		src, 
		type, 
		index, 
		title, 
		className = "" 
	}: { 
		src: string; 
		type: "about" | "portfolio"; 
		index?: number; 
		title: string;
		className?: string;
	}) => {
		const loadingState = type === "about" 
			? videoLoadingStates.about 
			: videoLoadingStates.portfolio[index!];

		return (
			<div className={`relative aspect-video rounded-lg overflow-hidden group cursor-pointer ${className}`}>
				{/* Loading Skeleton */}
				{loadingState.isLoading && (
					<div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
						<div className="flex flex-col items-center space-y-3">
							<div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
							<p className="text-gray-500 text-sm">Loading video...</p>
						</div>
					</div>
				)}

				{/* Error State */}
				{loadingState.hasError && (
					<div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
						<div className="text-center">
							<AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
							<p className="text-gray-600 text-sm">Failed to load video</p>
							<button 
								onClick={() => forceVideoRefresh(type, index)}
								className="text-orange-500 text-xs hover:underline mt-1"
							>
								Try again
							</button>
						</div>
					</div>
				)}

				{/* Video Element */}
				<video
					key={type === "about" ? `about-${videoKeys.about}` : `portfolio-${index}-${videoKeys.portfolio[index!]}`}
					className={`w-full h-full object-cover bg-gray-900 ${loadingState.isLoading || loadingState.hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
					preload="metadata"
					muted
					onLoadStart={() => handleVideoLoadStart(type, index)}
					onCanPlay={() => handleVideoCanPlay(type, index)}
					onError={() => handleVideoError(type, index)}
				>
					<source src={src} type="video/mp4" />
					<source src={src} type="video/mov" />
				</video>

				{/* Play Overlay - only show when video can play */}
				{loadingState.canPlay && (
					<div
						className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
						onClick={() =>
							setSelectedVideo({
								url: src,
								title: title,
							})
						}
					>
						<div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
							<Play
								className="w-5 h-5 text-orange-500 ml-1"
								fill="currentColor"
							/>
						</div>
					</div>
				)}
			</div>
		);
	};

	// Show loading state while auth is loading or data is loading
	if (loading || !currentUser) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="flex flex-col space-y-2 justify-center items-center">
					<div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
					<p className="text-gray-600">
						{!currentUser ? "" : "Loading your portfolio..."}
					</p>
				</div>
			</div>
		);
	}

	if (error && !portfolioData) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="text-center">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						Error Loading Portfolio
					</h3>
					<p className="text-gray-600 mb-4">{error}</p>
					<button
						onClick={fetchPortfolioData}
						className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-gray-900 mb-1">
						My Portfolio
					</h1>
					<p className="text-gray-600">
						Manage your portfolio videos and about video that brands will see
					</p>
					{error && (
						<div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<p className="text-yellow-800 text-sm">
								⚠️ There was an issue loading some data, but you can still manage your portfolio
							</p>
						</div>
					)}
				</div>

				{/* About Me Video Section */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-semibold text-gray-900 flex items-center">
								<Camera className="w-5 h-5 text-orange-500 mr-2" />
								About Me Video
							</h2>
							<p className="text-gray-600 mt-1">
								This video introduces you to potential brand partners
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Current About Video */}
						<div>
							<h3 className="font-medium text-gray-900 mb-3">Current Video</h3>
							{portfolioData?.aboutMeVideoUrl ? (
								<VideoPlayer 
									src={portfolioData.aboutMeVideoUrl}
									type="about"
									title="About Me Video"
								/>
							) : (
								<div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
									<div className="text-center">
										<Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
										<p className="text-gray-500">No about video uploaded</p>
										<p className="text-sm text-gray-400 mt-1">
											Upload your first video to get started
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Upload New About Video */}
						<div>
							<h3 className="font-medium text-gray-900 mb-3">
								{portfolioData?.aboutMeVideoUrl ? "Replace Video" : "Upload Video"}
							</h3>
							{aboutVideoUpload.preview ? (
								<div className="space-y-4">
									<div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
										<video
											className="w-full h-full object-cover"
											controls
											src={aboutVideoUpload.preview}
										/>
									</div>
									<div className="flex space-x-3">
										<button
											onClick={() => confirmUpload("about")}
											disabled={aboutVideoUpload.isUploading}
											className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center"
										>
											{aboutVideoUpload.isUploading ? (
												<>
													<Loader className="w-4 h-4 animate-spin mr-2" />
													Uploading...
												</>
											) : (
												<>
													<CheckCircle className="w-4 h-4 mr-2" />
													Confirm Upload
												</>
											)}
										</button>
										<button
											onClick={() => {
												URL.revokeObjectURL(aboutVideoUpload.preview!);
												setAboutVideoUpload((prev) => ({
													...prev,
													preview: null,
													selectedFile: null,
												}));
											}}
											className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
									<input
										id="about-upload"
										type="file"
										accept="video/*"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) handleFileSelect(file, "about");
										}}
									/>
									<label htmlFor="about-upload" className="cursor-pointer">
										<Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
										<p className="text-gray-600 mb-1">
											Click to upload {portfolioData?.aboutMeVideoUrl ? "new" : "your first"} video
										</p>
										<p className="text-sm text-gray-500">
											MP4, MOV up to 100MB
										</p>
									</label>
								</div>
							)}
							{aboutVideoUpload.error && (
								<p className="text-red-600 text-sm mt-2">
									{aboutVideoUpload.error}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Portfolio Videos Section */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-semibold text-gray-900 flex items-center">
								<Video className="w-5 h-5 text-orange-500 mr-2" />
								Portfolio Videos
							</h2>
							<p className="text-gray-600 mt-1">
								Your top 3 showcase videos that brands will see
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[0, 1, 2].map((index) => {
							const hasVideo = portfolioData?.portfolioVideoUrls[index];
							
							return (
								<div key={index} className="space-y-4">
									<h3 className="font-medium text-gray-900">Video {index + 1}</h3>

									{/* Current Video */}
									{hasVideo ? (
										<VideoPlayer 
											src={portfolioData.portfolioVideoUrls[index]}
											type="portfolio"
											index={index}
											title={`Portfolio Video ${index + 1}`}
										/>
									) : (
										<div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
											<div className="text-center">
												<Video className="w-6 h-6 text-gray-400 mx-auto mb-2" />
												<p className="text-gray-500 text-sm">No video uploaded</p>
											</div>
										</div>
									)}

									{/* Upload/Replace */}
									{portfolioUploads[index].preview ? (
										<div className="space-y-3">
											<div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
												<video
													className="w-full h-full object-cover"
													controls
													src={portfolioUploads[index].preview!}
												/>
											</div>
											<div className="flex space-x-2">
												<button
													onClick={() => confirmUpload("portfolio", index)}
													disabled={portfolioUploads[index].isUploading}
													className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm flex items-center justify-center"
												>
													{portfolioUploads[index].isUploading ? (
														<>
															<Loader className="w-3 h-3 animate-spin mr-1" />
															Uploading...
														</>
													) : (
														<>
															<CheckCircle className="w-3 h-3 mr-1" />
															Confirm
														</>
													)}
												</button>
												<button
													onClick={() => {
														URL.revokeObjectURL(portfolioUploads[index].preview!);
														setPortfolioUploads((prev) => ({
															...prev,
															[index]: { 
																...prev[index], 
																preview: null,
																selectedFile: null
															},
														}));
													}}
													className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
											<input
												id={`portfolio-upload-${index}`}
												type="file"
												accept="video/*"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0];
													if (file) handleFileSelect(file, "portfolio", index);
												}}
											/>
											<label
												htmlFor={`portfolio-upload-${index}`}
												className="cursor-pointer"
											>
												<Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
												<p className="text-gray-600 text-sm mb-1">
													{hasVideo ? "Replace video" : "Upload video"}
												</p>
												<p className="text-xs text-gray-500">
													MP4, MOV up to 100MB
												</p>
											</label>
										</div>
									)}
									{portfolioUploads[index].error && (
										<p className="text-red-600 text-xs">
											{portfolioUploads[index].error}
										</p>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Full Screen Video Modal */}
			{selectedVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
					<div className="relative w-full max-w-4xl max-h-full">
						<button
							onClick={() => setSelectedVideo(null)}
							className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
						>
							<X className="w-6 h-6" />
						</button>

						<div className="bg-black rounded-lg overflow-hidden">
							<video
								key={`modal-${selectedVideo.url}`}
								className="w-full h-auto max-h-[80vh]"
								controls
								autoPlay
								src={selectedVideo.url}
							>
								<source src={selectedVideo.url} type="video/mp4" />
								<source src={selectedVideo.url} type="video/mov" />
							</video>
						</div>

						<div className="mt-4 text-center">
							<h4 className="text-white text-lg font-medium">
								{selectedVideo.title}
							</h4>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CreatorPortfolio;
export const dynamic = "force-dynamic";