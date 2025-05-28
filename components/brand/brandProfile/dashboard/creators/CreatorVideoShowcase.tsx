"use client";

import React, { useState, useEffect } from "react";
import {
	Play,
	ShoppingCart,
	Eye,
	Grid3X3,
	List,
	Download,
	Clock,
	BookmarkPlus,
	CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
);

interface Video {
	id: string;
	title: string;
	description: string;
	thumbnailUrl: string;
	videoUrl: string;
	price: number;
	licenseType: string;
	tags: string[];
	views: number;
	purchases: number;
	status: "active" | "draft" | "archived";
	uploadedAt: string;
	createdBy: string;
	fileName: string;
	fileSize: number;
	creatorInfo: {
		name: string;
		username: string;
		avatar: string;
		rating: number;
		totalSales: number;
	};
}

interface CreatorVideoShowcaseProps {
	userId: string;
	creatorName: string;
	showHeader?: boolean;
}

const CreatorVideoShowcase: React.FC<CreatorVideoShowcaseProps> = ({
	userId,
	creatorName,
	showHeader = true,
}) => {
	const { currentUser } = useAuth();
	const searchParams = useSearchParams();

	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<string | null>(null);
	const [purchasedVideos, setPurchasedVideos] = useState<Set<string>>(
		new Set()
	);
	const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(
		null
	);
	const [, setSavedVideos] = useState<Set<string>>(new Set());

	// Filters
	const [selectedLicense, setSelectedLicense] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("newest");


	// Check for purchase success on component mount
	useEffect(() => {
		const purchaseSuccess = searchParams.get("purchase_success");
		const videoId = searchParams.get("video_id");

		if (purchaseSuccess && videoId) {
			setShowSuccessMessage(purchaseSuccess);

			// Add the purchased video to the set immediately
			setPurchasedVideos((prev) => new Set([...prev, videoId]));

			// Update the video's purchase count in the local state
			setVideos((prevVideos) =>
				prevVideos.map((video) =>
					video.id === videoId
						? { ...video, purchases: video.purchases + 1 }
						: video
				)
			);

			// Clear URL parameters
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("purchase_success");
			newUrl.searchParams.delete("video_id");
			window.history.replaceState(null, "", newUrl.toString());

			setTimeout(() => setShowSuccessMessage(null), 5000);
		}
	}, [searchParams]);

	// Fetch creator's videos
	useEffect(() => {
		const fetchCreatorVideos = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/videos/creator/${userId}?status=active`
				);
				if (!response.ok) throw new Error("Failed to fetch videos");

				const data = await response.json();
				setVideos(data.videos);

				// Check purchased videos
				if (currentUser) {
					const purchasedResponse = await fetch(
						`/api/purchases/user/${currentUser.uid}`
					);
					if (purchasedResponse.ok) {
						const purchasedData = await purchasedResponse.json();
						const purchasedIds = new Set<string>(
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							purchasedData.purchases.map((p: any) => p.videoId)
						);
						setPurchasedVideos(purchasedIds);
					}
				}
			} catch (err) {
				console.error("Error fetching videos:", err);
				setError("Failed to load videos");
			} finally {
				setLoading(false);
			}
		};

		if (userId) {
			fetchCreatorVideos();
		}
	}, [userId, currentUser, showSuccessMessage]); // Refetch when purchase succeeds

	// Simplified handleDownload function - no backend endpoint needed
	const handleDownload = async (video: Video) => {
		if (!currentUser || !purchasedVideos.has(video.id)) {
			toast("You need to purchase this video first");
			return;
		}

		setIsDownloading(video.id);
		try {
			// Create a temporary anchor element to trigger download
			const link = document.createElement("a");
			link.href = video.videoUrl; // Use the video URL directly
			link.download = video.fileName || `${video.title}.mp4`;
			link.target = "_blank"; // Fallback to open in new tab if download fails

			// Add to DOM, click, then remove
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Optional: Track download for analytics (non-blocking)
			try {
				await fetch(`/api/purchases/track-download`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						videoId: video.id,
						userId: currentUser.uid,
					}),
				});
			} catch (trackError) {
				console.error("Failed to track download:", trackError);
				// Don't show error to user for tracking failures
			}
		} catch (error) {
			console.error("Download error:", error);
			toast("Download failed. Please try again.");
		} finally {
			setIsDownloading(null);
		}
	};

	// Handle save to library
	const handleSaveToLibrary = async (video: Video) => {
		if (!currentUser || !purchasedVideos.has(video.id)) return;

		setIsSaving(video.id);
			// Add video to saved set
	setSavedVideos((prev) => new Set([...prev, video.id]));

		try {
			const response = await fetch("/api/video-library", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videoId: video.id,
					userId: currentUser.uid,
					title: video.title,
					thumbnailUrl: video.thumbnailUrl,
					creatorId: userId,
					creatorName: creatorName,
				}),
			});
			if (!response.ok) throw new Error("Failed to save purchased video");

			// Show success feedback
			toast("Video purchased added to your library!");
		} catch (error) {
			console.error("Save error:", error);
			toast("Video purchased has already been added to your library.");

		} finally {
			setIsSaving(null);
		}
	};

	const handleVideoPreview = (video: Video) => {
		setSelectedVideo(video);
		setIsPreviewOpen(true);
	};

	const handlePurchaseVideo = async (video: Video) => {
		if (!currentUser) {
			toast("Please log in to purchase videos");
			return;
		}

		if (purchasedVideos.has(video.id)) {
			toast("You have already purchased this video");
			return;
		}

		setIsPurchasing(video.id);

		try {
			// Save purchase data for recovery
			const videoPurchaseData = {
				videoId: video.id,
				creatorId: video.createdBy,
				videoTitle: video.title,
				amount: video.price,
				userId: currentUser.uid,
			};
			sessionStorage.setItem(
				"videoPurchaseData",
				JSON.stringify(videoPurchaseData)
			);

			// Create payment intent
			const paymentFormData = new FormData();
			paymentFormData.append("userId", currentUser.uid);
			paymentFormData.append("brandEmail", currentUser.email || "");
			paymentFormData.append("amount", video.price.toString());
			paymentFormData.append("paymentType", "video");
			paymentFormData.append("videoId", video.id);
			paymentFormData.append("creatorId", video.createdBy);
			paymentFormData.append("videoTitle", video.title);

			const paymentResponse = await fetch("/api/create-payment-intent", {
				method: "POST",
				body: paymentFormData,
			});

			const paymentData = await paymentResponse.json();
			if (!paymentData.success) {
				throw new Error(paymentData.error || "Failed to initiate payment");
			}

			// Create checkout session
			const stripe = await stripePromise;
			if (!stripe) throw new Error("Stripe is not initialized");

			const checkoutResponse = await fetch("/api/create-checkout-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: video.price,
					paymentId: paymentData.paymentId,
					videoTitle: video.title,
					userEmail: currentUser.email,
					userId: currentUser.uid,
					paymentType: "video",
				}),
			});

			const checkoutData = await checkoutResponse.json();
			if (!checkoutResponse.ok) {
				throw new Error(
					checkoutData.error || "Failed to create checkout session"
				);
			}

			// Redirect to Stripe
			const { error } = await stripe.redirectToCheckout({
				sessionId: checkoutData.sessionId,
			});
			if (error) throw new Error("Payment initiation failed");

			setIsPreviewOpen(false);
		} catch (error) {
			console.error("Purchase error:", error);
			toast(error instanceof Error ? error.message : "Purchase failed");
		} finally {
			setIsPurchasing(null);
		}
	};

	// Filter and sort videos
	const filteredAndSortedVideos = videos
		.filter((video) => {
			const licenseMatch =
				selectedLicense === "all" || video.licenseType === selectedLicense;
			return licenseMatch;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case "price-low":
					return a.price - b.price;
				case "price-high":
					return b.price - a.price;
				case "popular":
					return b.purchases - a.purchases;
				case "newest":
				default:
					return (
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
					);
			}
		});

	const formatFileSize = (bytes: number) => {
		const sizes = ["Bytes", "KB", "MB", "GB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-orange-500"></div>
				<span className="ml-2 text-gray-600">Loading videos...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="text-red-600 mb-4">
					<p className="text-lg font-semibold">Error Loading Videos</p>
					<p className="text-sm mt-1">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Success Message */}
			{showSuccessMessage && (
				<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
					<div className="flex items-center gap-3">
						<CheckCircle2 className="h-5 w-5 text-green-600" />
						<div>
							<p className="text-green-800 font-medium">Purchase Successful!</p>
							<p className="text-green-700 text-sm">
								Your video is now available for download and has been added to
								your library.
							</p>
						</div>
					</div>
				</div>
			)}

			{showHeader && (
				<div className="mb-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-1">
						{creatorName}&apos;s Video Library
					</h2>
					<p className="text-gray-600">
						Browse and purchase high-quality video content
					</p>
				</div>
			)}

			{/* Filters and Controls - Same as before */}
			<div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
				<div className="flex flex-wrap gap-4 items-center justify-between">
					<div className="flex flex-wrap gap-4 items-center">
						<Select value={selectedLicense} onValueChange={setSelectedLicense}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by license" />
							</SelectTrigger>
							<SelectContent className="bg-white">
								<SelectItem value="all">All Licenses</SelectItem>
								<SelectItem value="standard">Standard</SelectItem>
								<SelectItem value="extended">Extended</SelectItem>
								<SelectItem value="exclusive">Exclusive</SelectItem>
							</SelectContent>
						</Select>

						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Sort" />
							</SelectTrigger>
							<SelectContent className="bg-white">
								<SelectItem value="newest">Newest First</SelectItem>
								<SelectItem value="price-low">Price: Low to High</SelectItem>
								<SelectItem value="price-high">Price: High to Low</SelectItem>
								<SelectItem value="popular">Most Popular</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex border rounded-lg">
						<Button
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-l-lg ${
								viewMode === "grid"
									? "bg-orange-500 text-white"
									: "text-gray-600 hover:bg-gray-50"
							}`}
						>
							<Grid3X3 size={16} />
						</Button>
						<Button
							onClick={() => setViewMode("list")}
							className={`p-2 rounded-r-lg ${
								viewMode === "list"
									? "bg-orange-500 text-white"
									: "text-gray-600 hover:bg-gray-50"
							}`}
						>
							<List size={16} />
						</Button>
					</div>
				</div>

				<div className="mt-3 text-sm text-gray-600">
					Showing {filteredAndSortedVideos.length} of {videos.length} videos
				</div>
			</div>

			{/* Videos Display */}
			{filteredAndSortedVideos.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-gray-500 mb-4">
						<Play className="mx-auto h-12 w-12 mb-2" />
						<p className="text-lg font-semibold">No videos found</p>
						<p className="text-sm mt-1">Try adjusting your filters</p>
					</div>
				</div>
			) : (
				<div
					className={
						viewMode === "grid"
							? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
							: "space-y-4"
					}
				>
					{filteredAndSortedVideos.map((video) => (
						<div
							key={video.id}
							className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all ${
								viewMode === "list" ? "flex" : ""
							}`}
						>
							{/* Thumbnail */}
							<div
								className={`relative cursor-pointer group ${
									viewMode === "list"
										? "w-48 h-32 flex-shrink-0"
										: "aspect-video"
								}`}
								onClick={() => handleVideoPreview(video)}
							>
								<Image
									src={video.thumbnailUrl}
									alt={video.title}
									className="w-full h-full object-cover"
									width={viewMode === "list" ? 192 : 500}
									height={viewMode === "list" ? 128 : 300}
								/>

								{/* Play button overlay */}
								<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
									<div className="opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200">
										<div className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg">
											<Play
												className="w-6 h-6 text-orange-500 ml-0.5"
												fill="currentColor"
											/>
										</div>
									</div>
								</div>

								{/* Purchase status badge */}
								{purchasedVideos.has(video.id) && (
									<div className="absolute top-2 left-2">
										<span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
											Purchased
										</span>
									</div>
								)}

								{/* License type badge */}
								<div className="absolute top-2 right-2">
									<span
										className={`px-2 py-1 text-xs rounded-full ${
											video.licenseType === "exclusive"
												? "bg-purple-100 text-purple-800"
												: video.licenseType === "extended"
													? "bg-blue-100 text-blue-800"
													: "bg-gray-100 text-gray-800"
										}`}
									>
										{video.licenseType}
									</span>
								</div>
							</div>

							{/* Content */}
							<div className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}>
								<div
									className={
										viewMode === "list"
											? "flex justify-between items-start"
											: ""
									}
								>
									<div className={viewMode === "list" ? "flex-1 pr-4" : ""}>
										<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
											{video.title}
										</h3>

										{video.description && (
											<p className="text-sm text-gray-600 mb-3 line-clamp-2">
												{video.description}
											</p>
										)}

										<div className="flex items-center justify-between text-sm text-gray-500 mb-3">
											<div className="flex items-center gap-4">
												<span className="flex items-center gap-1">
													<Eye size={14} />
													{video.views}
												</span>
												<span className="flex items-center gap-1">
													<ShoppingCart size={14} />
													{video.purchases}
												</span>
											</div>
											<span className="flex items-center gap-1">
												<Clock size={14} />
												{formatDate(video.uploadedAt)}
											</span>
										</div>

										{video.tags && video.tags.length > 0 && (
											<div className="mb-3">
												<div className="flex flex-wrap gap-1">
													{video.tags.slice(0, 3).map((tag, index) => (
														<span
															key={index}
															className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
														>
															{tag}
														</span>
													))}
													{video.tags.length > 3 && (
														<span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
															+{video.tags.length - 3}
														</span>
													)}
												</div>
											</div>
										)}

										<div className="text-xs text-gray-400 mb-3">
											File size: {formatFileSize(video.fileSize)}
										</div>
									</div>

									<div
										className={
											viewMode === "list" ? "flex flex-col items-end gap-2" : ""
										}
									>
										<div className="text-xl font-semibold text-gray-900 mb-3">
											${video.price}
										</div>

										<div
											className={`flex gap-3 ${viewMode === "list" ? "flex-col" : ""}`}
										>
											<Button
												onClick={() => handleVideoPreview(video)}
												className="w-full px-3 py-2 text-orange-600 bg-orange-100 hover:bg-orange-200 rounded text-sm transition-colors"
											>
												Preview
											</Button>

											{purchasedVideos.has(video.id) ? (
												<div className="flex gap-3">
													<Button
														onClick={() => handleDownload(video)}
														disabled={isDownloading === video.id}
														className="w-full px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50 transition-colors"
													>
														{isDownloading === video.id ? (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mx-auto"></div>
														) : (
															<>
																<Download size={16} className="inline mr-1" />
																Download
															</>
														)}
													</Button>
													<Button
														onClick={() => handleSaveToLibrary(video)}
														disabled={
															isSaving === video.id || purchasedVideos.has(video.id)
														}
														className={`w-full px-3 py-2 rounded text-sm transition-colors ${
															purchasedVideos.has(video.id)
																? "bg-gray-100 text-gray-500 cursor-not-allowed"
																: "bg-blue-100 text-blue-700 hover:bg-blue-200"
														} disabled:opacity-50`}
													>
														{isSaving === video.id ? (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mx-auto"></div>
														) : purchasedVideos.has(video.id) ? (
															<>
																<CheckCircle2
																	size={16}
																	className="inline mr-1"
																/>
																Saved
															</>
														) : (
															<>
																<BookmarkPlus
																	size={16}
																	className="inline mr-1"
																/>
																Save
															</>
														)}
													</Button>
												</div>
											) : (
												<Button
													onClick={() => handlePurchaseVideo(video)}
													disabled={isPurchasing === video.id}
													className="w-full px-3 py-2 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 rounded text-sm transition-colors flex items-center justify-center gap-1"
												>
													{isPurchasing === video.id ? (
														<>
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
															Purchasing...
														</>
													) : (
														<>
															<ShoppingCart size={16} />
															Buy Now
														</>
													)}
												</Button>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Video Preview Modal */}
			{isPreviewOpen && selectedVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
						<div className="p-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-lg font-semibold">
										{selectedVideo.title}
									</h3>
									<p className="text-gray-600">{selectedVideo.description}</p>
								</div>
								<button
									onClick={() => setIsPreviewOpen(false)}
									className="text-gray-500 hover:text-gray-700 text-2xl"
								>
									×
								</button>
							</div>

							<div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
								<video
									controls
									className="w-full h-full rounded-lg"
									poster={selectedVideo.thumbnailUrl}
								>
									<source src={selectedVideo.videoUrl} type="video/mp4" />
								</video>
							</div>

							<div className="flex justify-between items-center">
								<div className="text-xl font-semibold">
									${selectedVideo.price}
								</div>
								<div className="flex gap-2">
									<Button
										onClick={() => setIsPreviewOpen(false)}
										className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
									>
										Close
									</Button>
									{purchasedVideos.has(selectedVideo.id) ? (
										<div className="flex gap-2">
											<Button
												onClick={() => handleDownload(selectedVideo)}
												disabled={isDownloading === selectedVideo.id}
												className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
											>
												{isDownloading === selectedVideo.id ? (
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
												) : (
													<>
														<Download size={16} className="inline mr-1" />
														Download
													</>
												)}
											</Button>
											<Button
												onClick={() => handleSaveToLibrary(selectedVideo)}
												disabled={
													isSaving === selectedVideo.id ||
													purchasedVideos.has(selectedVideo.id)
												}
												className={`px-4 py-2 rounded disabled:opacity-50 ${
													purchasedVideos.has(selectedVideo.id)
														? "bg-gray-100 text-gray-500 cursor-not-allowed"
														: "bg-blue-500 text-white hover:bg-blue-600"
												}`}
											>
												{isSaving === selectedVideo.id ? (
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
												) : purchasedVideos.has(selectedVideo.id) ? (
													<>
														<CheckCircle2 size={16} className="inline mr-1" />
														Saved
													</>
												) : (
													<>
														<BookmarkPlus size={16} className="inline mr-1" />
														Save
													</>
												)}
											</Button>
										</div>
									) : (
										<Button
											onClick={() => handlePurchaseVideo(selectedVideo)}
											disabled={isPurchasing === selectedVideo.id}
											className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
										>
											{isPurchasing === selectedVideo.id
												? "Purchasing..."
												: "Buy Now"}
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CreatorVideoShowcase;
