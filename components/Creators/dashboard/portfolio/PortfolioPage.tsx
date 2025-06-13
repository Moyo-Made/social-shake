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
import Image from "next/image";

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
	uploadStatus: string;
	uploadId: string | null;
	thumbnail: string | null; // Added thumbnail property
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
		portfolio: [0, 0, 0],
	});

	const { currentUser } = useAuth();

	// Chunked upload constants
	const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
	const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks

	// Function to extract thumbnail from video file
	const extractVideoThumbnail = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			
			video.addEventListener('loadedmetadata', () => {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				video.currentTime = 1; // Extract frame at 1 second
			});
			
			video.addEventListener('seeked', () => {
				if (ctx) {
					ctx.drawImage(video, 0, 0);
					const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
					resolve(thumbnailUrl);
				} else {
					reject(new Error('Could not get canvas context'));
				}
			});
			
			video.addEventListener('error', reject);
			video.src = URL.createObjectURL(file);
		});
	};

	// Upload states for each video slot
	const [aboutVideoUpload, setAboutVideoUpload] = useState<UploadState>({
		isUploading: false,
		progress: 0,
		error: null,
		preview: null,
		selectedFile: null,
		uploadStatus: "",
		uploadId: null,
		thumbnail: null, // Added thumbnail
	});

	const [portfolioUploads, setPortfolioUploads] = useState<
		Record<number, UploadState>
	>({
		0: {
			isUploading: false,
			progress: 0,
			error: null,
			preview: null,
			selectedFile: null,
			uploadStatus: "",
			uploadId: null,
			thumbnail: null, // Added thumbnail
		},
		1: {
			isUploading: false,
			progress: 0,
			error: null,
			preview: null,
			selectedFile: null,
			uploadStatus: "",
			uploadId: null,
			thumbnail: null, // Added thumbnail
		},
		2: {
			isUploading: false,
			progress: 0,
			error: null,
			preview: null,
			selectedFile: null,
			uploadStatus: "",
			uploadId: null,
			thumbnail: null, // Added thumbnail
		},
	});

	// Selected video for full screen viewing
	const [selectedVideo, setSelectedVideo] = useState<{
		url: string;
		title: string;
	} | null>(null);

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
	
			const response = await fetch(`/api/creator/portfolio?userId=${userId}`, {
				// Add cache control headers
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0'
				}
			});
	
			if (!response.ok) {
				throw new Error(
					`Failed to fetch portfolio data: ${response.status} ${response.statusText}`
				);
			}
	
			const data = await response.json();
			console.log("Fetched portfolio data:", data);
	
			const portfolioData: PortfolioData = {
				aboutMeVideoUrl: data.aboutMeVideoUrl || "",
				portfolioVideoUrls: Array.isArray(data.portfolioVideoUrls)
					? data.portfolioVideoUrls.filter((url: string) => url && url.trim() !== "") // Filter out empty URLs
					: [],
				userId: data.userId || userId,
			};
	
			// Ensure we always have 3 slots for portfolio videos
			while (portfolioData.portfolioVideoUrls.length < 3) {
				portfolioData.portfolioVideoUrls.push("");
			}
	
			console.log("Processed portfolio data:", portfolioData); // Debug log
			setPortfolioData(portfolioData);
		} catch (err) {
			console.error("Error fetching portfolio data:", err);
			setError(err instanceof Error ? err.message : "Failed to load portfolio");
	
			// Set empty portfolio data as fallback
			setPortfolioData({
				aboutMeVideoUrl: "",
				portfolioVideoUrls: ["", "", ""],
				userId: currentUser?.uid || "",
			});
		} finally {
			setLoading(false);
		}
	};

	// Fetch portfolio data
	useEffect(() => {
		if (currentUser?.uid) {
			fetchPortfolioData();
		}
	}, [currentUser?.uid]);

	// Validate video file
	const validateVideoFile = (file: File) => {
		if (file.size > MAX_VIDEO_SIZE) {
			return {
				valid: false,
				error: `File too large. Maximum size is ${(MAX_VIDEO_SIZE / (1024 * 1024)).toFixed(0)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
			};
		}
		return { valid: true };
	};

	// Handle file selection and preview - UPDATED with thumbnail extraction
	const handleFileSelect = async (
		file: File,
		type: "about" | "portfolio",
		index?: number
	) => {
		if (!file.type.startsWith("video/")) {
			alert("Please select a valid video file");
			return;
		}

		// Validate file size
		const validation = validateVideoFile(file);
		if (!validation.valid) {
			alert(validation.error);
			return;
		}

		const previewUrl = URL.createObjectURL(file);

		try {
			const thumbnailUrl = await extractVideoThumbnail(file);
			
			if (type === "about") {
				setAboutVideoUpload((prev) => ({
					...prev,
					preview: previewUrl,
					selectedFile: file,
					error: null,
					thumbnail: thumbnailUrl,
				}));
			} else if (typeof index === "number") {
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: {
						...prev[index],
						preview: previewUrl,
						selectedFile: file,
						error: null,
						thumbnail: thumbnailUrl,
					},
				}));
			}
		} catch (error) {
			console.error('Failed to extract thumbnail:', error);
			// Fallback to just preview without thumbnail
			if (type === "about") {
				setAboutVideoUpload((prev) => ({
					...prev,
					preview: previewUrl,
					selectedFile: file,
					error: null,
					thumbnail: null,
				}));
			} else if (typeof index === "number") {
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: {
						...prev[index],
						preview: previewUrl,
						selectedFile: file,
						error: null,
						thumbnail: null,
					},
				}));
			}
		}
	};

	// Force video refresh by updating keys and clearing cache
	const forceVideoRefresh = (type: "about" | "portfolio", index?: number) => {
		if (type === "about") {
			setVideoKeys((prev) => ({
				...prev,
				about: prev.about + 1,
			}));
		} else if (typeof index === "number") {
			setVideoKeys((prev) => ({
				...prev,
				portfolio: prev.portfolio.map((key, i) =>
					i === index ? key + 1 : key
				),
			}));
		}
	};

	// Initialize chunked upload
	const initializeUpload = async (
		file: File,
		type: "about" | "portfolio",
		index?: number
	) => {
		const response = await fetch("/api/creator/portfolio/upload", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				userId: currentUser?.uid,
				fileName: file.name,
				fileSize: file.size,
				fileContentType: file.type,
				type: type,
				index: index,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to initialize upload");
		}

		return response.json();
	};

	// Upload a single chunk
	const uploadChunk = async (
		file: File,
		chunkIndex: number,
		totalChunks: number,
		uploadId: string,
		type: "about" | "portfolio",
		index?: number
	) => {
		const start = chunkIndex * CHUNK_SIZE;
		const end = Math.min(start + CHUNK_SIZE, file.size);
		const chunk = file.slice(start, end);

		// Convert chunk to base64
		const chunkBase64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const base64 = (reader.result as string).split(",")[1];
				resolve(base64);
			};
			reader.onerror = () => reject(new Error("Failed to read chunk"));
			reader.readAsDataURL(chunk);
		});

		// Build payload with portfolioIndex for portfolio uploads
		const payload = {
			userId: currentUser?.uid,
			chunkData: chunkBase64,
			fileName: file.name,
			fileContentType: file.type,
			chunkIndex,
			totalChunks,
			uploadId,
			fileSize: file.size,
			uploadType: type, // Add uploadType
			...(type === "portfolio" &&
				typeof index === "number" && { portfolioIndex: index }), // Add portfolioIndex for portfolio uploads
		};

		// Verify chunk size isn't too large after base64 encoding
		const payloadSize = JSON.stringify(payload).length;

		console.log(
			`Chunk ${chunkIndex + 1}/${totalChunks}: ${(chunk.size / 1024).toFixed(1)}KB -> ${(payloadSize / 1024).toFixed(1)}KB payload`
		);

		if (payloadSize > 1.8 * 1024 * 1024) {
			throw new Error(
				`Chunk ${chunkIndex + 1} payload too large: ${(payloadSize / 1024 / 1024).toFixed(1)}MB`
			);
		}

		const response = await fetch("/api/creator/portfolio/upload", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
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
			throw new Error(
				errorMessage || `Failed to upload chunk ${chunkIndex + 1}`
			);
		}

		// Check if response has content before parsing JSON
		const text = await response.text();
		if (!text.trim()) {
			return {
				status: "chunk_uploaded",
				progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
			};
		}

		try {
			return JSON.parse(text);
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error("JSON parse error:", error, "Response text:", text);
				throw new Error(`Invalid JSON response: ${error.message}`);
			} else {
				console.error("Unknown error:", error, "Response text:", text);
				throw new Error("Invalid JSON response: Unknown error occurred");
			}
		}
	};

	// Upload video function with chunked upload - FIXED
	const uploadVideo = async (
		file: File,
		type: "about" | "portfolio",
		index?: number
	) => {
		try {
			// Update upload state
			const updateState = (updates: Partial<UploadState>) => {
				if (type === "about") {
					setAboutVideoUpload((prev) => ({ ...prev, ...updates }));
				} else if (typeof index === "number") {
					setPortfolioUploads((prev) => ({
						...prev,
						[index]: { ...prev[index], ...updates },
					}));
				}
			};

			updateState({
				isUploading: true,
				progress: 0,
				error: null,
				uploadStatus: "Initializing upload...",
			});

			// Initialize upload session
			const initResponse = await initializeUpload(file, type, index);
			const { uploadId: newUploadId, totalChunks } = initResponse;

			updateState({
				uploadId: newUploadId,
				uploadStatus: "Uploading video...",
			});

			let finalResponse = null;

			// Upload chunks with retry logic
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				let retries = 3;
				let chunkResponse;

				while (retries > 0) {
					try {
						chunkResponse = await uploadChunk(
							file,
							chunkIndex,
							totalChunks,
							newUploadId,
							type,
							index
						);
						break; // Success, exit retry loop
					} catch (error) {
						retries--;
						console.error(
							`Chunk ${chunkIndex + 1} failed, retries left: ${retries}`,
							error
						);

						if (retries === 0) {
							throw new Error(
								`Failed to upload chunk ${chunkIndex + 1} after 3 attempts: ${error instanceof Error ? error.message : String(error)}`
							);
						}

						// Wait before retry
						await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

				// Update progress
				const currentProgress =
					chunkResponse?.progress ||
					Math.round(((chunkIndex + 1) / totalChunks) * 100);
				updateState({
					progress: currentProgress,
					uploadStatus: `Uploading... ${currentProgress}%`,
				});

				// Check if this is the final response with video URL
				if (
					chunkResponse &&
					(chunkResponse.status === "completed" || chunkResponse.url)
				) {
					console.log("Final upload response received:", chunkResponse);
					finalResponse = chunkResponse;
					break;
				}
			}

			// Handle successful upload
			// Handle successful upload
			if (finalResponse && finalResponse.url) {
				console.log(
					"Processing successful upload with URL:",
					finalResponse.url
				);

				// Use the URL as-is from the server (don't add cache busting here)
				const serverUrl = finalResponse.url;

				// Update portfolio data with new URL
				if (type === "about") {
					setPortfolioData((prev) =>
						prev ? { ...prev, aboutMeVideoUrl: serverUrl } : null
					);

					// Clear upload state properly
					setAboutVideoUpload({
						isUploading: false,
						progress: 100,
						error: null,
						preview: null,
						selectedFile: null,
						uploadStatus: "Upload completed successfully!",
						uploadId: null,
						thumbnail: null, // Clear thumbnail
					});

					// Force video refresh
					forceVideoRefresh("about");
				} else if (typeof index === "number" && portfolioData) {
					const newUrls = [...portfolioData.portfolioVideoUrls];
					while (newUrls.length < 3) {
						newUrls.push("");
					}
					newUrls[index] = serverUrl;
					setPortfolioData((prev) =>
						prev ? { ...prev, portfolioVideoUrls: newUrls } : null
					);

					// Clear upload state properly
					setPortfolioUploads((prev) => ({
						...prev,
						[index]: {
							isUploading: false,
							progress: 100,
							error: null,
							preview: null,
							selectedFile: null,
							uploadStatus: "Upload completed successfully!",
							uploadId: null,
							thumbnail: null, // Clear thumbnail
						},
					}));

					// Force video refresh
					forceVideoRefresh("portfolio", index);
				}

				// Clear success status after 5 seconds
				setTimeout(() => {
					updateState({
						uploadStatus: "",
						progress: 0,
					});
				}, 5000);
			} else {
				throw new Error("Upload completed but no video URL received");
			}
		} catch (err) {
			console.error("Upload error:", err);
			const errorMsg = err instanceof Error ? err.message : "Upload failed";

			if (type === "about") {
				setAboutVideoUpload((prev) => ({
					...prev,
					isUploading: false,
					error: errorMsg,
					uploadStatus: `Error: ${errorMsg}`,
					progress: 0, // Reset progress on error
				}));
			} else if (typeof index === "number") {
				setPortfolioUploads((prev) => ({
					...prev,
					[index]: {
						...prev[index],
						isUploading: false,
						error: errorMsg,
						uploadStatus: `Error: ${errorMsg}`,
						progress: 0, // Reset progress on error
					},
				}));
			}

			// Clear error status after 7 seconds
			setTimeout(() => {
				if (type === "about") {
					setAboutVideoUpload((prev) => ({
						...prev,
						uploadStatus: "",
						error: null,
					}));
				} else if (typeof index === "number") {
					setPortfolioUploads((prev) => ({
						...prev,
						[index]: { ...prev[index], uploadStatus: "", error: null },
					}));
				}
			}, 7000);
		}
	};

	// Confirm upload after preview
	const confirmUpload = (type: "about" | "portfolio", index?: number) => {
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
								⚠️ There was an issue loading some data, but you can still
								manage your portfolio
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
								 <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
								 {/* Loading overlay with thumbnail */}
								 <div id="loading-overlay-about" className="absolute inset-0 bg-gray-200 flex items-center justify-center">
								   <div className="bg-white bg-opacity-90 rounded-full p-3">
									 <Loader className="w-6 h-6 text-orange-500 animate-spin" />
								   </div>
								 </div>
								 
								 <video
								   key={`about-${videoKeys.about}-${portfolioData.aboutMeVideoUrl}`}
								   className="w-full h-full object-cover opacity-0 transition-opacity duration-500"
								   preload="metadata"
								   muted
								   onLoadedData={(e) => {
									 e.currentTarget.style.opacity = '1';
									 const overlay = document.getElementById('loading-overlay-about');
									 if (overlay) overlay.style.display = 'none';
								   }}
								   onError={(e) => console.error("Video load error:", e)}
								 >
										<source
											src={`${portfolioData.aboutMeVideoUrl}?t=${Date.now()}`}
											type="video/mp4"
										/>
										<source
											src={`${portfolioData.aboutMeVideoUrl}?t=${Date.now()}`}
											type="video/mov"
										/>
										Your browser does not support the video tag.
									</video>
									<div
										className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
										onClick={() =>
											setSelectedVideo({
												url: portfolioData.aboutMeVideoUrl,
												title: "About Me Video",
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
								</div>
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
								{portfolioData?.aboutMeVideoUrl
									? "Replace Video"
									: "Upload Video"}
							</h3>
							{aboutVideoUpload.preview ? (
								<div className="space-y-4">
									<div className="relative aspect-video bg-gray-100 animate-pulse rounded-lg overflow-hidden">
										<video
											className="w-full h-full object-cover"
											controls
											src={aboutVideoUpload.preview}
										/>
									</div>
									{/* File info */}
									{aboutVideoUpload.selectedFile && (
										<div className="text-sm text-gray-600">
											<p className="font-medium">
												{aboutVideoUpload.selectedFile.name}
											</p>
											<p className="text-xs text-gray-500">
												{(
													aboutVideoUpload.selectedFile.size /
													(1024 * 1024)
												).toFixed(2)}{" "}
												MB
												{aboutVideoUpload.selectedFile.size >
													50 * 1024 * 1024 && (
													<span className="text-amber-600 ml-2">
														⚠️ Large file - will be uploaded in chunks
													</span>
												)}
											</p>
										</div>
									)}
									{/* Upload Progress */}
									{aboutVideoUpload.isUploading && (
										<div className="mt-4">
											<div className="flex justify-between text-sm text-gray-600 mb-1">
												<span>{aboutVideoUpload.uploadStatus}</span>
												<span>{Math.round(aboutVideoUpload.progress)}%</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className="bg-blue-600 h-2 rounded-full transition-all duration-300"
													style={{ width: `${aboutVideoUpload.progress}%` }}
												></div>
											</div>
											{aboutVideoUpload.uploadId && (
												<p className="text-xs text-gray-500 mt-1">
													Upload ID: {aboutVideoUpload.uploadId}
												</p>
											)}
										</div>
									)}
									{/* Success/Error Status */}
									{aboutVideoUpload.uploadStatus &&
										!aboutVideoUpload.isUploading && (
											<div
												className={`text-sm mt-2 ${
													aboutVideoUpload.error
														? "text-red-600"
														: aboutVideoUpload.uploadStatus.includes(
																	"completed"
															  )
															? "text-green-600"
															: "text-gray-600"
												}`}
											>
												{aboutVideoUpload.uploadStatus}
											</div>
										)}
									<div className="flex space-x-3">
										<button
											onClick={() => confirmUpload("about")}
											disabled={aboutVideoUpload.isUploading}
											className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center"
										>
											{aboutVideoUpload.isUploading ? (
												<>
													<Loader className="w-4 h-4 animate-spin mr-2" />
													{aboutVideoUpload.uploadStatus || "Uploading..."}
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
												if (aboutVideoUpload.preview) {
													URL.revokeObjectURL(aboutVideoUpload.preview);
												}
												setAboutVideoUpload((prev) => ({
													...prev,
													preview: null,
													selectedFile: null,
													error: null,
													uploadStatus: "",
												}));
											}}
											disabled={aboutVideoUpload.isUploading}
											className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
											Click to upload{" "}
											{portfolioData?.aboutMeVideoUrl ? "new" : "your first"}{" "}
											video
										</p>
										<p className="text-sm text-gray-500">
											MP4, MOV up to 100MB
										</p>
									</label>
								</div>
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
							const uploadState = portfolioUploads[index];

							return (
								<div key={index} className="space-y-4">
									<h3 className="font-medium text-gray-900">
										Video {index + 1}
									</h3>

									{/* Current Video */}
									{hasVideo ? (
										 <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
										 <div id={`loading-overlay-portfolio-${index}`} className="absolute inset-0 bg-gray-200 flex items-center justify-center">
										   <div className="bg-white bg-opacity-90 rounded-full p-2">
											 <Loader className="w-4 h-4 text-orange-500 animate-spin" />
										   </div>
										 </div>
										 
										 <video
										   key={`portfolio-${index}-${videoKeys.portfolio[index]}-${portfolioData.portfolioVideoUrls[index]}`}
										   className="w-full h-full object-cover opacity-0 transition-opacity duration-500"
										   onLoadedData={(e) => {
											 e.currentTarget.style.opacity = '1';
											 const overlay = document.getElementById(`loading-overlay-portfolio-${index}`);
											 if (overlay) overlay.style.display = 'none';
										   }}
												preload="metadata"
												muted
												onError={(e) => {
													console.error(
														`Portfolio video ${index} load error:`,
														e
													);
												}}
												onLoadStart={() => {
													console.log(
														`Portfolio video ${index} load started:`,
														portfolioData.portfolioVideoUrls[index]
													);
												}}
											>
												<source
													src={`${portfolioData.portfolioVideoUrls[index]}?t=${Date.now()}`}
													type="video/mp4"
												/>
												<source
													src={`${portfolioData.portfolioVideoUrls[index]}?t=${Date.now()}`}
													type="video/mov"
												/>
												Your browser does not support the video tag.
											</video>
											<div
												className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
												onClick={() =>
													setSelectedVideo({
														url: portfolioData.portfolioVideoUrls[index],
														title: `Portfolio Video ${index + 1}`,
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
										</div>
									) : (
										<div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
											<div className="text-center">
												<Video className="w-6 h-6 text-gray-400 mx-auto mb-2" />
												<p className="text-gray-500 text-sm">
													No video uploaded
												</p>
											</div>
										</div>
									)}

									{/* Upload/Replace */}
									{uploadState.preview ? (
										 <div className="space-y-3">
										 <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
										   {/* Show blurred thumbnail if available */}
										   {uploadState.thumbnail && (
											 <div className="absolute inset-0">
											   <Image 
												 src={uploadState.thumbnail} 
												 alt="Video thumbnail"
												 className="w-full h-full object-cover filter blur-sm"
												 width={640}
												 height={360}
											   />
											   <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
												 <div className="bg-white bg-opacity-90 rounded-full p-2">
												   <Play className="w-4 h-4 text-orange-500" />
												 </div>
											   </div>
											 </div>
										   )}
										   
										   <video
											 className="w-full h-full object-cover relative z-10"
											 controls
											 src={uploadState.preview}
										   />
										 </div>
											{/* File info */}
											{uploadState.selectedFile && (
												<div className="text-xs text-gray-600">
													<p className="font-medium">
														{uploadState.selectedFile.name}
													</p>
													<p className="text-gray-500">
														{(
															uploadState.selectedFile.size /
															(1024 * 1024)
														).toFixed(2)}{" "}
														MB
														{uploadState.selectedFile.size >
															50 * 1024 * 1024 && (
															<span className="text-amber-600 ml-1">
																⚠️ Large file
															</span>
														)}
													</p>
												</div>
											)}
											{/* Upload Progress */}
											{uploadState.isUploading && (
												<div className="mt-2">
													<div className="flex justify-between text-xs text-gray-600 mb-1">
														<span>{uploadState.uploadStatus}</span>
														<span>{Math.round(uploadState.progress)}%</span>
													</div>
													<div className="w-full bg-gray-200 rounded-full h-1.5">
														<div
															className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
															style={{ width: `${uploadState.progress}%` }}
														></div>
													</div>
												</div>
											)}
											<div className="flex space-x-2">
												<button
													onClick={() => confirmUpload("portfolio", index)}
													disabled={uploadState.isUploading}
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
														URL.revokeObjectURL(
															portfolioUploads[index].preview!
														);
														setPortfolioUploads((prev) => ({
															...prev,
															[index]: {
																...prev[index],
																preview: null,
																selectedFile: null,
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

			{/* Full Screen Video Modal - UPDATED with key prop */}
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
								key={`modal-${selectedVideo.url}`} // Force re-render with key
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
