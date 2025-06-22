"use client";

import { useState, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import {
	PlusIcon,
	VideoIcon,
	EyeIcon,
	DollarSignIcon,
	Play,
} from "lucide-react";
import Image from "next/image";
import UploadVideoModal from "./UploadVideoModal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import VideoPreviewModal from "./VideoPlayerModal";
import VideoManageModal from "./ManageVideoModal";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Video {
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
}

interface ContentLibraryPageProps {
	userId: string;
}

export default function ContentLibraryPage({
	userId,
}: ContentLibraryPageProps) {
	const queryClient = useQueryClient()
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [statusFilter, setStatusFilter] = useState("all");
	const [licenseFilter, setLicenseFilter] = useState("all");
	const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
	const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
	const [isManageModalOpen, setIsManageModalOpen] = useState(false);

	const handleVideoPreview = (video: Video) => {
		setSelectedVideo(video);
		setIsPreviewModalOpen(true);
	};

	const handleVideoManage = (video: Video) => {
		setSelectedVideo(video);
		setIsManageModalOpen(true);
	};

	const trackViewMutation = useMutation({
		mutationFn: async (videoId: string) => {
		  await fetch(`/api/videos/${videoId}/view`, { method: "POST" });
		},
		onSuccess: () => {
		  queryClient.invalidateQueries({ queryKey: ['videos', userId] });
		},
	  });
	  
	  const handleViewTracked = (videoId: string) => {
		trackViewMutation.mutate(videoId);
	  };

	const updateVideoMutation = useMutation({
		mutationFn: async ({ videoId, updates }: { videoId: string; updates: Partial<Video> }) => {
		  const response = await fetch(`/api/videos/${videoId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		  });
		  if (!response.ok) throw new Error("Failed to update video");
		  return response.json();
		},
		onSuccess: () => {
		  queryClient.invalidateQueries({ queryKey: ['videos', userId] });
		},
	  });
	  
	  const handleVideoUpdate = (videoId: string, updates: Partial<Video>) => {
		updateVideoMutation.mutate({ videoId, updates });
	  };

	  const deleteVideoMutation = useMutation({
		mutationFn: async (videoId: string) => {
		  const response = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
		  if (!response.ok) throw new Error("Failed to delete video");
		},
		onSuccess: () => {
		  queryClient.invalidateQueries({ queryKey: ['videos', userId] });
		},
	  });
	  
	  const handleVideoDelete = (videoId: string) => {
		deleteVideoMutation.mutate(videoId);
	  };


	const { data: allVideos = [], isLoading: loading, error } = useQuery({
		queryKey: ['videos', userId],
		queryFn: async () => {
		  const response = await fetch(`/api/videos?userId=${userId}`);
		  if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to fetch videos");
		  }
		  const data = await response.json();
		  return data.videos;
		},
		enabled: !!userId,
	  })

	// Filter videos on the frontend
	const filteredVideos = allVideos.filter((video: { status: string; licenseType: string; }) => {
		const statusMatch = statusFilter === "all" || video.status === statusFilter;
		const licenseMatch =
			licenseFilter === "all" || video.licenseType === licenseFilter;
		return statusMatch && licenseMatch;
	});

	// Calculate stats based on ALL videos (not filtered)
	const totalVideos = allVideos.length;
	const totalViews = allVideos.reduce((sum: number, video: { views: number }) => sum + video.views, 0);
	const totalEarnings = allVideos.reduce(
		(sum: number, video: { purchases: number; price: number; }) => sum + video.purchases * video.price,
		0
	);

	const formatDate = (dateString: string) => {
		if (!dateString) return "Unknown";
		const date = new Date(dateString);
		return date.toLocaleDateString();
	};

	const handleUploadSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ['videos', userId] });
	  };

	const clearFilters = () => {
		setStatusFilter("all");
		setLicenseFilter("all");
	};

	const hasActiveFilters = statusFilter !== "all" || licenseFilter !== "all";

	if (loading) {
		return (
			<div className="p-6">
				<div className="flex flex-col justify-center items-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-orange-500"></div>
					<span className="ml-2 text-gray-600">Loading videos...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<div className="text-center py-12">
					<div className="text-red-600 mb-4">
						<VideoIcon className="mx-auto h-12 w-12 mb-2" />
						<p className="text-lg font-semibold">Error Loading Videos</p>
						<p className="text-sm mt-1">{error instanceof Error ? error.message : "An unknown error occurred"}</p>
					</div>
					<button
						onClick={() => queryClient.invalidateQueries({ queryKey: ['videos', userId] })}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="md:w-[70rem] p-6">
			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Content Library
					</h1>
					<p className="text-gray-600 mt-1">
						Manage your video content and track performance
					</p>
				</div>
				<Button
					onClick={() => setIsUploadModalOpen(true)}
					className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
					Upload Video
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<VideoIcon className="w-8 h-8 text-blue-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Videos</p>
							<p className="text-2xl font-bold text-gray-900">{totalVideos}</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<EyeIcon className="w-8 h-8 text-green-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Views</p>
							<p className="text-2xl font-bold text-gray-900">
								{totalViews.toLocaleString()}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<DollarSignIcon className="w-8 h-8 text-purple-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">
								Total Earnings
							</p>
							<p className="text-2xl font-bold text-gray-900">
								${totalEarnings}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content Section */}
			{allVideos.length === 0 ? (
				// Empty State - No videos at all
				<div className="text-center py-12">
					<VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-semibold text-gray-900">
						No videos yet
					</h3>
					<p className="mt-1 text-sm text-gray-500">
						Get started by uploading your first video.
					</p>
					<div className="mt-6">
						<button
							onClick={() => setIsUploadModalOpen(true)}
							className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
						>
							<PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
							Upload Video
						</button>
					</div>
				</div>
			) : (
				<>
					{/* View Toggle & Filters */}
					<div className="flex justify-between items-center mb-6">
						<div className="flex space-x-4 items-center">
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="all">All Videos</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="archived">Archived</SelectItem>
								</SelectContent>
							</Select>

							<Select value={licenseFilter} onValueChange={setLicenseFilter}>
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

							{hasActiveFilters && (
								<button
									onClick={clearFilters}
									className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
								>
									Clear Filters
								</button>
							)}
						</div>

						<div className="flex border rounded-lg">
							<button
								onClick={() => setViewMode("grid")}
								className={`px-3 py-1 text-sm rounded-l-lg ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
							>
								Grid
							</button>
							<button
								onClick={() => setViewMode("list")}
								className={`px-3 py-1 text-sm rounded-r-lg ${viewMode === "list" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
							>
								List
							</button>
						</div>
					</div>

					{filteredVideos.length === 0 ? (
						// No videos match filters
						<div className="text-center py-12">
							<VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-semibold text-gray-900">
								No videos match your filters
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								Try adjusting your filters to see more videos, or clear all
								filters to see all {allVideos.length} videos.
							</p>
							<div className="mt-4">
								<button
									onClick={clearFilters}
									className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
								>
									Clear All Filters
								</button>
							</div>
						</div>
					) : (
						/* Videos Grid/List */
						<div
							className={
								viewMode === "grid"
									? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
									: "space-y-4"
							}
						>
							{filteredVideos.map((video: Video) => (
								<div
									key={video.id}
									className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
								>
									<div
										className="aspect-video relative cursor-pointer group"
										onClick={() => handleVideoPreview(video)}
									>
										<Image
											src={video.thumbnailUrl}
											alt={video.title}
											className="w-full h-full object-cover"
											width={500}
											height={300}
										/>
										{/* Play button overlay - shows on hover */}
										<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
											<div className="opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200">
												<div className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-lg">
													<Play
														className="w-4 h-4 text-gray-800 ml-0.5"
														fill="currentColor"
													/>
												</div>
											</div>
										</div>
										<div className="absolute top-2 right-2">
											<span
												className={`px-2 py-1 text-xs rounded-full ${
													video.status === "active"
														? "bg-green-100 text-green-800"
														: video.status === "draft"
															? "bg-yellow-100 text-yellow-800"
															: "bg-gray-100 text-gray-800"
												}`}
											>
												{video.status}
											</span>
										</div>
									</div>

									<div className="p-4">
										<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
											{video.title}
										</h3>

										{video.description && (
											<p className="text-sm text-gray-600 mb-3 line-clamp-2">
												{video.description}
											</p>
										)}

										<div className="flex justify-between items-center text-sm text-gray-600 mb-3">
											<span>${video.price}</span>
											<span className="capitalize">{video.licenseType}</span>
										</div>

										<div className="flex justify-between items-center text-sm text-gray-500 mb-3">
											<span>
												{video.views} {video.views > 1 ? "views" : "view"}
											</span>
											<span>{video.purchases} sales</span>
										</div>

										<div className="text-xs text-gray-400 mb-3">
											Uploaded: {formatDate(video.uploadedAt)}
										</div>

										{video.tags && video.tags.length > 0 && (
											<div className="mb-3">
												<div className="flex flex-wrap gap-1">
													 {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
													{video.tags.slice(0, 3).map((tag: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: Key | null | undefined) => (
														<span
															key={index}
															className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
														>
															{tag}
														</span>
													))}
													{video.tags.length > 3 && (
														<span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
															+{video.tags.length - 3} more
														</span>
													)}
												</div>
											</div>
										)}

										<div className="flex space-x-2">
											<Button
												onClick={() => handleVideoManage(video)}
												className="flex-1 bg-gray-200 text-gray-800 px-2 py-2 rounded text-sm text-center hover:bg-gray-300 transition-colors"
											>
												Manage
											</Button>
											<Button
												onClick={() => handleVideoPreview(video)}
												className="flex-1 px-3 py-2 text-orange-600 bg-orange-100 hover:bg-orange-200 shadow-none rounded text-sm transition-colors"
											>
												Preview
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{/* Upload Modal */}
			<UploadVideoModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				onSuccess={handleUploadSuccess}
				userId={userId}
			/>

			{/* Video Modals */}
			<VideoPreviewModal
				isOpen={isPreviewModalOpen}
				onClose={() => setIsPreviewModalOpen(false)}
				video={selectedVideo}
				onViewTracked={handleViewTracked}
			/>

			<VideoManageModal
				isOpen={isManageModalOpen}
				onClose={() => setIsManageModalOpen(false)}
				video={selectedVideo}
				onUpdate={handleVideoUpdate}
				onDelete={handleVideoDelete}
			/>
		</div>
	);
}
