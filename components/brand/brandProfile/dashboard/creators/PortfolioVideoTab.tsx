import React, { useState } from "react";
import { Play, X, ExternalLink, Download } from "lucide-react";

interface PortfolioVideosTabProps {
	portfolioVideoUrls: string[];
}
const PortfolioVideosTab = ({
	portfolioVideoUrls,
}: PortfolioVideosTabProps) => {
	const [selectedVideo, setSelectedVideo] = useState<{
		url: string;
		index: number;
	} | null>(null);
	const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>(
		{}
	);

	const handleVideoLoad = (index: number) => {
		setLoadingStates((prev) => ({ ...prev, [index]: false }));
	};

	const handleVideoLoadStart = (index: number) => {
		setLoadingStates((prev) => ({ ...prev, [index]: true }));
	};

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

	if (!portfolioVideoUrls || portfolioVideoUrls.length === 0) {
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
						{portfolioVideoUrls.length} video
						{portfolioVideoUrls.length !== 1 ? "s" : ""} available
					</p>
				</div>
			</div>

			{/* Video Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{portfolioVideoUrls.map((videoUrl, index) => (
					<div
						key={index}
						className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
					>
						{/* Video Container */}
						<div className="relative aspect-video bg-gray-900 overflow-hidden">
							{loadingStates[index] && (
								<div className="absolute inset-0 flex items-center justify-center bg-gray-900">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
								</div>
							)}

							<video
								className="w-full h-full object-cover"
								preload="metadata"
								onLoadStart={() => handleVideoLoadStart(index)}
								onLoadedData={() => handleVideoLoad(index)}
								muted
							>
								<source src={videoUrl} type="video/mp4" />
								<source src={videoUrl} type="video/mov" />
								<source src={videoUrl} type="video/quicktime" />
								Your browser does not support the video tag.
							</video>

							{/* Play Overlay */}
							<div
								className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
								onClick={() => openModal(videoUrl, index)}
							>
								<div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-300">
									<Play className="w-5 h-5 text-orange-500 ml-1" fill="currentColor" />
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
									onClick={() => openModal(videoUrl, index)}
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
										onClick={() => downloadVideo(videoUrl, index)}
										className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
										title="Download video"
									>
										<Download className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
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
