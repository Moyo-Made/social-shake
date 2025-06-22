import React, { useState, useRef, useEffect } from "react";
import { Play, X, ExternalLink, Download, Loader } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PortfolioVideosTabProps {
	portfolioVideoUrls: string[];
}

interface VideoCardProps {
	videoUrl: string;
	index: number;
	onOpenModal: (videoUrl: string, index: number) => void;
	onDownload: (url: string, index: number) => void;
}

const VideoCard = ({
	videoUrl,
	index,
	onOpenModal,
	onDownload,
}: VideoCardProps) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isVideoLoaded, setIsVideoLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Intersection Observer for lazy loading
	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect(); // Stop observing once visible
				}
			},
			{
				threshold: 0.1, // Trigger when 10% visible
				rootMargin: "100px", // Start loading 100px before it comes into view
			}
		);

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, []);

	// Load video only when visible
	useEffect(() => {
		if (isVisible && videoUrl && videoRef.current && !isVideoLoaded) {
			const video = videoRef.current;
			setIsLoading(true);

			const handleLoadedData = () => {
				setIsVideoLoaded(true);
				setIsLoading(false);
			};

			const handleCanPlay = () => {
				setIsVideoLoaded(true);
				setIsLoading(false);
			};

			const handleError = () => {
				setHasError(true);
				setIsLoading(false);
			};

			// Use the fastest loading events
			video.addEventListener("loadeddata", handleLoadedData);
			video.addEventListener("canplay", handleCanPlay);
			video.addEventListener("error", handleError);

			// Optimize video element
			video.preload = "metadata"; // Only load metadata initially
			video.muted = true;
			video.playsInline = true;

			// Set source and start loading
			video.src = videoUrl;
			video.load();

			return () => {
				video.removeEventListener("loadeddata", handleLoadedData);
				video.removeEventListener("canplay", handleCanPlay);
				video.removeEventListener("error", handleError);
			};
		}
	}, [isVisible, videoUrl, isVideoLoaded]);

	const handlePlayClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (videoRef.current && isVideoLoaded) {
			const video = videoRef.current;
			if (video.paused) {
				// Switch to full preload when actually playing
				video.preload = "auto";
				video.play();
			} else {
				video.pause();
			}
		}

		onOpenModal(videoUrl, index);
	};

	return (
		<div
			ref={containerRef}
			className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
		>
			{/* Video Container */}
			<div className="relative aspect-video bg-gray-900 overflow-hidden">
				{/* Loading state */}
				{(!isVisible || isLoading) && (
					<div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
						<div className="bg-white bg-opacity-20 rounded-full p-3 backdrop-blur-sm">
							<Loader className="w-6 h-6 text-white animate-spin" />
						</div>
					</div>
				)}

				{/* Error state */}
				{hasError && (
					<div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
						<div className="text-gray-400">
							<Play className="w-8 h-8" />
						</div>
					</div>
				)}

				{/* Video element - only render when visible */}
				{isVisible && (
					<video
						ref={videoRef}
						className="w-full h-full object-cover"
						style={{
							opacity: isVideoLoaded ? 1 : 0,
							transition: "opacity 0.3s ease-in-out",
						}}
						preload="metadata"
						muted
						playsInline
						poster="" // Empty poster to avoid default poster loading
					>
						<source src={videoUrl} type="video/mp4" />
						<source src={videoUrl} type="video/mov" />
						<source src={videoUrl} type="video/quicktime" />
						Your browser does not support the video tag.
					</video>
				)}

				{/* Play Overlay */}
				<div
					className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
					onClick={handlePlayClick}
				>
					<div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-300">
						<Play
							className="w-5 h-5 text-orange-500 ml-1"
							fill="currentColor"
						/>
					</div>
				</div>

				{/* Video Number Badge */}
				<div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-sm font-medium backdrop-blur-sm">
					Video {index + 1}
				</div>
			</div>

			{/* Action Bar */}
			<div className="p-4 bg-white">
				<div className="flex items-center justify-between">
					<button
						onClick={handlePlayClick}
						className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
					>
						<Play className="w-4 h-4" />
						<span>Watch</span>
					</button>

					<div className="flex items-center space-x-2">
						<button
							onClick={() => window.open(videoUrl, "_blank")}
							className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
							title="Open in new tab"
						>
							<ExternalLink className="w-4 h-4" />
						</button>
						<button
							onClick={() => onDownload(videoUrl, index)}
							className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
							title="Download video"
						>
							<Download className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

// Function to validate video URLs
const validateVideoUrls = async (urls: string[]): Promise<string[]> => {
	// You can add actual validation logic here if needed
	// For now, just return the URLs as they are
	return urls.filter((url) => url && url.trim() !== "");
};

const PortfolioVideosTab = ({
	portfolioVideoUrls,
}: PortfolioVideosTabProps) => {
	const [selectedVideo, setSelectedVideo] = useState<{
		url: string;
		index: number;
	} | null>(null);

	// Use TanStack Query to manage video URLs
	const {
		data: validatedVideoUrls = [],
		isLoading,
		error,
		isError,
	} = useQuery({
		queryKey: ["portfolio-videos", portfolioVideoUrls],
		queryFn: () => validateVideoUrls(portfolioVideoUrls || []),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
		enabled: Boolean(portfolioVideoUrls && portfolioVideoUrls.length > 0),
		retry: 2,
		refetchOnWindowFocus: false,
	});

	const openModal = (videoUrl: string, index: number) => {
		setSelectedVideo({ url: videoUrl, index });
	};

	const closeModal = () => {
		setSelectedVideo(null);
	};

	const downloadVideo = (url: string, index: number) => {
		const link = document.createElement("a");
		link.href = url;
		link.download = `portfolio-video-${index + 1}.mp4`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-16 px-4">
				<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<Loader className="w-10 h-10 text-orange-500 animate-spin" />
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Loading Portfolio Videos
				</h3>
				<p className="text-gray-500 text-center max-w-md">
					Please wait while we load the videos...
				</p>
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center py-16 px-4">
				<div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
					<X className="w-10 h-10 text-red-400" />
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Failed to Load Videos
				</h3>
				<p className="text-gray-500 text-center max-w-md">
					{error instanceof Error
						? error.message
						: "There was an error loading the portfolio videos. Please try again later."}
				</p>
			</div>
		);
	}

	// Empty state
	if (!validatedVideoUrls || validatedVideoUrls.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 px-4">
				<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<Play className="w-10 h-10 text-gray-400" />
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					No Portfolio Videos
				</h3>
				<p className="text-gray-500 text-center max-w-md">
					This creator hasn&apos;t uploaded any portfolio videos yet. Check back
					later to see their work.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-xl font-semibold text-gray-900">
						Portfolio Videos
					</h3>
					<p className="text-gray-600 mt-1">
						{validatedVideoUrls.length} video
						{validatedVideoUrls.length !== 1 ? "s" : ""} available
					</p>
				</div>
			</div>

			{/* Video Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{validatedVideoUrls.map((videoUrl, index) => (
					<VideoCard
						key={`${videoUrl}-${index}`}
						videoUrl={videoUrl}
						index={index}
						onOpenModal={openModal}
						onDownload={downloadVideo}
					/>
				))}
			</div>

			{/* Modal for Full Screen Video */}
			{selectedVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
					<div className="relative w-full max-w-3xl max-h-full">
						{/* Close Button */}
						<button
							onClick={closeModal}
							className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors z-10"
						>
							<X className="w-6 h-6" />
						</button>

						{/* Video Player */}
						<div className="bg-black rounded-lg overflow-hidden">
							<video
								className="w-full h-auto max-h-[80vh]"
								controls
								autoPlay
								src={selectedVideo.url}
								preload="auto" // Full preload for modal video
							>
								<source src={selectedVideo.url} type="video/mp4" />
								<source src={selectedVideo.url} type="video/mov" />
								<source src={selectedVideo.url} type="video/quicktime" />
								Your browser does not support the video tag.
							</video>
						</div>

						{/* Video Info */}
						<div className="mt-4 text-center">
							<h4 className="text-white text-lg font-medium">
								Portfolio Video {selectedVideo.index + 1}
							</h4>
							<div className="flex items-center justify-center space-x-4 mt-2">
								<button
									onClick={() => window.open(selectedVideo.url, "_blank")}
									className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
								>
									<ExternalLink className="w-4 h-4" />
									<span>Open in new tab</span>
								</button>
								<button
									onClick={() =>
										downloadVideo(selectedVideo.url, selectedVideo.index)
									}
									className="text-green-400 hover:text-green-300 flex items-center space-x-1 transition-colors"
								>
									<Download className="w-4 h-4" />
									<span>Download</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PortfolioVideosTab;
