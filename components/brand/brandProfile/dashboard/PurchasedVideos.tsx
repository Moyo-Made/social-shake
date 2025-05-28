"use client";

import React, { useState, useEffect } from "react";
import {
	Play,
	Download,
	Trash2,
	Grid3X3,
	List,
	Search,
	User,
	Clock,
	BookmarkCheck,
	Eye,
	Filter,
	SortDesc,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FaMoneyCheck } from "react-icons/fa6";

interface PurchasedVideo { 
    id: string;
    videoId: string;
    title: string;
    thumbnailUrl?: string;
    creatorId: string;
    creatorName: string;
    purchasedAt: string; 
    licenseType: string;
    transactionId?: string; 
    purchasePrice?: number; 
}

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

interface PurchasedVideosLibraryProps {
	className?: string;
}

const PurchasedVideosLibrary: React.FC<PurchasedVideosLibraryProps> = ({
	className = "",
}) => {
	const { currentUser } = useAuth();

const [purchasedVideos, setPurchasedVideos] = useState<PurchasedVideo[]>([]);  
const [selectedVideo, setSelectedVideo] = useState<PurchasedVideo | null>(null);
	const [fullVideoData, setFullVideoData] = useState<{ [key: string]: Video }>(
		{}
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<string>("newest");
	const [selectedCreator, setSelectedCreator] = useState<string>("all");
	const [isRemoving, setIsRemoving] = useState<string | null>(null);
	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	// Fetch purchased videos
	useEffect(() => {
		const fetchPurchasedVideos = async () => {
			if (!currentUser) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/purchases/create?userId=${currentUser.uid}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch purchased videos");
				}

				const data = await response.json();
				setPurchasedVideos(data.purchasedVideos || []); 

				// Fetch full video data for each purchased video
				const videoIds =
					data.purchasedVideos?.map((sv: PurchasedVideo) => sv.videoId) || [];
				if (videoIds.length > 0) {
					const videoDataPromises = videoIds.map(async (videoId: string) => {
						try {
							const videoResponse = await fetch(`/api/videos/${videoId}`);
							if (videoResponse.ok) {
								const videoData = await videoResponse.json();
								return { [videoId]: videoData };
							}
						} catch (error) {
							console.error(`Failed to fetch video ${videoId}:`, error);
						}
						return null;
					});

					const videoDataResults = await Promise.all(videoDataPromises);
					const videoDataMap = videoDataResults.reduce((acc, curr) => {
						if (curr) return { ...acc, ...curr };
						return acc;
					}, {});

					setFullVideoData(videoDataMap);
				}
			} catch (err) {
				console.error("Error fetching purchased videos:", err);
				setError("Failed to load purchased videos");
			} finally {
				setLoading(false);
			}
		};

		fetchPurchasedVideos();
	}, [currentUser]);

	// Handle download
	const handleDownload = async (purchasedVideos: PurchasedVideo) => {
		if (!currentUser) {
			toast("Please log in to download videos");
			return;
		}

		const fullVideo = fullVideoData[purchasedVideos.videoId];
		if (!fullVideo) {
			toast("Video data not available");
			return;
		}

		setIsDownloading(purchasedVideos.videoId);
		try {
			// Create a temporary anchor element to trigger download
			const link = document.createElement("a");
			link.href = fullVideo.videoUrl;
			link.download = fullVideo.fileName || `${purchasedVideos.title}.mp4`;
			link.target = "_blank";

			// Add to DOM, click, then remove
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			toast("Download started successfully");
		} catch (error) {
			console.error("Download error:", error);
			toast("Download failed. Please try again.");
		} finally {
			setIsDownloading(null);
		}
	};

	// Handle remove from library
	const handleRemoveFromLibrary = async (purchasedVideos: PurchasedVideo) => {
		if (!currentUser) return;

		setIsRemoving(purchasedVideos.id);
		try {
			const response = await fetch(
				`/api/purchases/create?userId=${currentUser.uid}&videoId=${purchasedVideos.videoId}`,
				{ method: "DELETE" }
			);

			if (!response.ok) throw new Error("Failed to remove video");

			// Update local state
			setPurchasedVideos((prev) =>
				prev.filter((video) => video.id !== purchasedVideos.id)
			);
			toast("Video removed from library");
		} catch (error) {
			console.error("Remove error:", error);
			toast("Failed to remove video. Please try again.");
		} finally {
			setIsRemoving(null);
		}
	};

	// Handle video preview
	const handleVideoPreview = (purchasedVideos: PurchasedVideo) => {
		setSelectedVideo(purchasedVideos);
		setIsPreviewOpen(true);
	};

	// Get unique creators for filter
	const uniqueCreators = Array.from(
		new Set(purchasedVideos.map((video) => video.creatorName))
	).sort();

	// Filter and sort videos
	const filteredAndSortedVideos = purchasedVideos
		.filter((video) => {
			const matchesSearch =
				video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				video.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCreator =
				selectedCreator === "all" || video.creatorName === selectedCreator;
			return matchesSearch && matchesCreator;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case "title-asc":
					return a.title.localeCompare(b.title);
				case "title-desc":
					return b.title.localeCompare(a.title);
				case "creator-asc":
					return a.creatorName.localeCompare(b.creatorName);
				case "creator-desc":
					return b.creatorName.localeCompare(a.creatorName);
				case "oldest":
					return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
				case "newest":
				default:
					return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
			}
		});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatFileSize = (bytes: number) => {
		const sizes = ["Bytes", "KB", "MB", "GB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
	};

	if (!currentUser) {
		return (
			<div className={`text-center py-12 ${className}`}>
				<FaMoneyCheck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
				<p className="text-lg font-semibold text-gray-700">
					Please log in to view your purchased videos
				</p>
				<p className="text-sm text-gray-500 mt-1">
					Sign in to access your video library
				</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div
				className={`flex flex-col justify-center items-center h-64 ${className}`}
			>
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<span className="ml-3 text-gray-600">Loading your purchased videos...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`text-center py-12 ${className}`}>
				<div className="text-red-600 mb-4">
					<p className="text-lg font-semibold">Error Loading Saved Videos</p>
					<p className="text-sm mt-1">{error}</p>
				</div>
				<Button
					onClick={() => window.location.reload()}
					className="bg-orange-500 hover:bg-orange-600 text-white"
				>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className={`w-full max-w-6xl p-6`}>
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-2">
					<FaMoneyCheck className="h-6 w-6 text-orange-500" />
					<h1 className="text-xl font-semibold text-gray-900">
						My Video Library
					</h1>
				</div>
				<p className="ml-8 text-gray-600">
					{purchasedVideos.length === 0
						? "Your purchased videos will appear here"
						: `${purchasedVideos.length} video${purchasedVideos.length === 1 ? "" : "s"} purchased`}
				</p>
			</div>

			{purchasedVideos.length === 0 ? (
				<div className="text-center py-16">
					<FaMoneyCheck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
					<p className="text-xl font-semibold text-gray-700 mb-2">
						No purchased videos yet
					</p>
					<p className="text-gray-500 mb-6">
						Start exploring and save videos you want to keep for later
					</p>
					<Button className="bg-orange-500 hover:bg-orange-600 text-white">
						Browse Videos
					</Button>
				</div>
			) : (
				<>
					{/* Search and Filters */}
					<div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
						<div className="flex flex-col lg:flex-row gap-4">
							{/* Search */}
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									type="text"
									placeholder="Search purchased videos..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>

							{/* Creator Filter */}
							<Select
								value={selectedCreator}
								onValueChange={setSelectedCreator}
							>
								<SelectTrigger className="w-full lg:w-[200px]">
									<Filter className="h-4 w-4 " />
									<SelectValue placeholder="Filter by creator" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="all">All Creators</SelectItem>
									{uniqueCreators.map((creator) => (
										<SelectItem key={creator} value={creator}>
											{creator}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Sort */}
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-full lg:w-[200px]">
									<SortDesc className="h-4 w-4 " />
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="newest">Recently Saved</SelectItem>
									<SelectItem value="oldest">Oldest First</SelectItem>
									<SelectItem value="title-asc">Title A-Z</SelectItem>
									<SelectItem value="title-desc">Title Z-A</SelectItem>
									<SelectItem value="creator-asc">Creator A-Z</SelectItem>
									<SelectItem value="creator-desc">Creator Z-A</SelectItem>
								</SelectContent>
							</Select>

							{/* View Mode Toggle */}
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

						{/* Results count */}
						<div className="mt-4 text-sm text-gray-600">
							Showing {filteredAndSortedVideos.length} of {purchasedVideos.length}{" "}
							purchased videos
						</div>
					</div>

					{/* Videos Display */}
					{filteredAndSortedVideos.length === 0 ? (
						<div className="text-center py-12">
							<Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
							<p className="text-lg font-semibold text-gray-700">
								No videos match your search
							</p>
							<p className="text-sm text-gray-500 mt-1">
								Try different search terms or filters
							</p>
						</div>
					) : (
						<div
							className={
								viewMode === "grid" ? "flex flex-wrap gap-6" : "space-y-4"
							}
						>
							{filteredAndSortedVideos.map((purchasedVideos) => {
								const fullVideo = fullVideoData[purchasedVideos.videoId];
								return (
									<div
										key={purchasedVideos.id}
										className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all group ${
											viewMode === "list" ? "flex" : ""
										}`}
									>
										{/* Thumbnail */}
										<div
											className={`relative cursor-pointer ${
												viewMode === "list"
													? "w-48 h-32 flex-shrink-0"
													: "aspect-video"
											}`}
											onClick={() => handleVideoPreview(purchasedVideos)}
										>
											{purchasedVideos.thumbnailUrl ? (
												<Image
													src={purchasedVideos.thumbnailUrl}
													alt={purchasedVideos.title}
													className="w-full h-full object-cover"
													width={viewMode === "list" ? 192 : 300}
													height={viewMode === "list" ? 128 : 200}
												/>
											) : (
												<div className="w-full h-full bg-gray-200 flex items-center justify-center">
													<Play className="h-8 w-8 text-gray-400" />
												</div>
											)}

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

											{/* Saved badge */}
											<div className="absolute top-2 left-2">
												<span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full flex items-center gap-1">
													<BookmarkCheck size={12} />
													Saved
												</span>
											</div>

											{/* License type badge */}
											{purchasedVideos && (
												<div className="absolute top-2 right-2">
													<span
														className={`px-3 py-1 text-xs rounded-full ${
															purchasedVideos.licenseType === "exclusive"
																? "bg-purple-100 text-purple-800"
																: purchasedVideos.licenseType === "extended"
																	? "bg-blue-100 text-blue-800"
																	: "bg-gray-100 text-gray-800"
														}`}
													>
														{purchasedVideos.licenseType}
													</span>
												</div>
											)}
										</div>

										{/* Content */}
										<div
											className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}
										>
											<div
												className={
													viewMode === "list"
														? "flex justify-between items-start"
														: ""
												}
											>
												<div
													className={viewMode === "list" ? "flex-1 pr-4" : ""}
												>
													<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
														{purchasedVideos.title}
													</h3>

													{fullVideo?.description && (
														<p className="text-sm text-gray-600 mb-3 line-clamp-2">
															{fullVideo.description}
														</p>
													)}

													<div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
														<User size={14} />
														<span>{purchasedVideos.creatorName}</span>
													</div>

													<div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
														<Clock size={12} />
														<span>Saved {formatDate(purchasedVideos.purchasedAt)}</span>
													</div>

													{fullVideo?.tags && fullVideo.tags.length > 0 && (
														<div className="mb-3">
															<div className="flex flex-wrap gap-1">
																{fullVideo.tags
																	.slice(0, 3)
																	.map((tag, index) => (
																		<span
																			key={index}
																			className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
																		>
																			{tag}
																		</span>
																	))}
																{fullVideo.tags.length > 3 && (
																	<span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
																		+{fullVideo.tags.length - 3}
																	</span>
																)}
															</div>
														</div>
													)}

													{fullVideo?.fileSize && (
														<div className="text-xs text-gray-400 mb-3">
															File size: {formatFileSize(fullVideo.fileSize)}
														</div>
													)}
												</div>

												<div
													className={`flex gap-2 ${
														viewMode === "list" ? "flex-col" : ""
													}`}
												>
													<Button
														onClick={() => handleVideoPreview(purchasedVideos)}
														className="px-3 py-2 text-orange-600 bg-orange-100 hover:bg-orange-200 rounded text-sm transition-colors"
													>
														<Eye size={14} className="mr-1" />
														View
													</Button>

													<Button
														onClick={() => handleDownload(purchasedVideos)}
														disabled={
															isDownloading === purchasedVideos.videoId || !fullVideo
														}
														className="px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50 transition-colors"
													>
														{isDownloading === purchasedVideos.videoId ? (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mx-auto"></div>
														) : (
															<>
																<Download size={14} className="mr-1" />
																Download
															</>
														)}
													</Button>

													<Button
														onClick={() => handleRemoveFromLibrary(purchasedVideos)}
														disabled={isRemoving === purchasedVideos.id}
														className="px-3 py-2 text-red-600 bg-red-100 hover:bg-red-200 rounded text-sm transition-colors disabled:opacity-50"
													>
														{isRemoving === purchasedVideos.id ? (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mx-auto"></div>
														) : (
															<>
																<Trash2 size={14} className="mr-1" />
																Remove
															</>
														)}
													</Button>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</>
			)}

			{/* Video Preview Modal */}
			{isPreviewOpen && selectedVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
						<div className="p-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-xl font-semibold text-gray-900">
										{selectedVideo.title}
									</h3>
									{fullVideoData[selectedVideo.videoId]?.description && (
										<p className="text-gray-600 mt-1">
											{fullVideoData[selectedVideo.videoId].description}
										</p>
									)}
									<div className="flex items-center gap-2 text-gray-600 mt-2">
										<User size={16} />
										<span>{selectedVideo.creatorName}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
										<Clock size={14} />
										<span>Saved {formatDate(selectedVideo.purchasedAt)}</span>
									</div>
								</div>
								<Button
									onClick={() => setIsPreviewOpen(false)}
									className="text-gray-500 hover:text-gray-700 text-2xl p-2"
								>
									×
								</Button>
							</div>

							<div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
								{fullVideoData[selectedVideo.videoId] ? (
									<video
										controls
										className="w-full h-full rounded-lg"
										poster={selectedVideo.thumbnailUrl}
									>
										<source
											src={fullVideoData[selectedVideo.videoId].videoUrl}
											type="video/mp4"
										/>
									</video>
								) : (
									<div className="text-gray-400">
										<Play className="h-16 w-16 mx-auto mb-2" />
										<p>Loading video...</p>
									</div>
								)}
							</div>

							<div className="flex justify-between items-center">
								<div className="text-sm text-gray-600">
									This video is purchased in your library
									{fullVideoData[selectedVideo.videoId]?.price && (
										<span className="ml-2 text-lg font-semibold text-gray-900">
											${fullVideoData[selectedVideo.videoId].price}
										</span>
									)}
								</div>
								<div className="flex gap-3">
									<Button
										onClick={() => setIsPreviewOpen(false)}
										className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
									>
										Close
									</Button>

									<Button
										onClick={() => handleDownload(selectedVideo)}
										disabled={
											isDownloading === selectedVideo.videoId ||
											!fullVideoData[selectedVideo.videoId]
										}
										className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
									>
										{isDownloading === selectedVideo.videoId ? (
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
										) : (
											<>
												<Download size={16} className="mr-1" />
												Download
											</>
										)}
									</Button>

									<Button
										onClick={() => handleRemoveFromLibrary(selectedVideo)}
										disabled={isRemoving === selectedVideo.id}
										className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
									>
										{isRemoving === selectedVideo.id ? (
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
										) : (
											<>
												<Trash2 size={16} className="mr-1" />
												Remove from Library
											</>
										)}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PurchasedVideosLibrary;
