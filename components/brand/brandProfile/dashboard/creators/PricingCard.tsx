import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import VideoSelectionModal from "./VideoSelectionModal";

interface CreatorPricing {
	oneVideo: number;
	threeVideos: number;
	fiveVideos: number;
	bulkVideos: number;
	bulkVideosNote?: string;
	aiActorPricing?: number;
}

interface Creator {
	id: string;
	name: string;
	pricing: CreatorPricing;
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
	purchased: boolean;
}

interface PricingCardProps {
	selectedCreator: Creator;
	onPurchaseComplete?: (
		packageType: string,
		selectedVideoIds: string[],
		totalPrice: number
	) => void;
	isProcessing?: boolean;
}

type PackageType = "one" | "three" | "five" | "bulk";

const PricingCard: React.FC<PricingCardProps> = ({
	selectedCreator,
	onPurchaseComplete,
	isProcessing = false,
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedPackage, setSelectedPackage] = useState<{
		type: PackageType;
		price: number;
		videoCount: number;
	} | null>(null);
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoadingVideos, setIsLoadingVideos] = useState(true);
	const [fetchError, setFetchError] = useState<string | null>(null);

	// Fetch videos when creator changes
	useEffect(() => {
		const fetchVideos = async () => {
			if (!selectedCreator.id) {
				setVideos([]);
				setIsLoadingVideos(false);
				return;
			}

			setIsLoadingVideos(true);
			setFetchError(null);

			try {
				const response = await fetch(
					`/api/videos/creator/${selectedCreator.id}?status=active`
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch videos: ${response.status} ${response.statusText}`
					);
				}

				const fetchedVideos: Video[] = await response.json();
				setVideos(fetchedVideos);
			} catch (error) {
				console.error("Failed to fetch videos:", error);
				setFetchError(
					error instanceof Error ? error.message : "Failed to fetch videos"
				);
				setVideos([]);
			} finally {
				setIsLoadingVideos(false);
			}
		};

		fetchVideos();
	}, [selectedCreator.id]);

	// Filter available videos for the creator (only non-purchased active videos)
	const availableVideos = Array.isArray(videos)
		? videos.filter(
				(video) =>
					video.createdBy === selectedCreator.id &&
					video.status === "active" &&
					!video.purchased
			)
		: [];

	const getPackageDetails = (packageType: PackageType) => {
		switch (packageType) {
			case "one":
				return {
					type: packageType,
					price: selectedCreator.pricing.oneVideo,
					videoCount: 1,
				};
			case "three":
				return {
					type: packageType,
					price: selectedCreator.pricing.threeVideos,
					videoCount: 3,
				};
			case "five":
				return {
					type: packageType,
					price: selectedCreator.pricing.fiveVideos,
					videoCount: 5,
				};
			case "bulk":
				return {
					type: packageType,
					price: selectedCreator.pricing.bulkVideos,
					videoCount: availableVideos.length,
				};
			default:
				return null;
		}
	};

	const handleBuyClick = (packageType: PackageType) => {
		const packageDetails = getPackageDetails(packageType);

		if (!packageDetails) return;

		// Check if there are enough available videos
		if (availableVideos.length < packageDetails.videoCount) {
			alert(
				`Not enough videos available. Only ${availableVideos.length} videos are available.`
			);
			return;
		}

		// For bulk package, if it matches available videos exactly, auto-select all
		if (
			packageType === "bulk" &&
			availableVideos.length === packageDetails.videoCount
		) {
			const allVideoIds = availableVideos.map((video) => video.id);
			handleConfirmSelection(allVideoIds);
			return;
		}

		// Open modal for video selection
		setSelectedPackage(packageDetails);
		setIsModalOpen(true);
	};

	const handleViewAIActorPricing = () => {}

	const handleConfirmSelection = (selectedVideoIds: string[]) => {
		if (!selectedPackage) return;

		setIsModalOpen(false);

		// Call the purchase completion handler
		if (onPurchaseComplete) {
			onPurchaseComplete(
				selectedPackage.type,
				selectedVideoIds,
				selectedPackage.price
			);
		}

		// Reset selected package
		setSelectedPackage(null);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setSelectedPackage(null);
	};

	const isPackageAvailable = (packageType: PackageType) => {
		const packageDetails = getPackageDetails(packageType);
		return (
			packageDetails && availableVideos.length >= packageDetails.videoCount
		);
	};

	const getUnavailableMessage = (packageType: PackageType) => {
		const packageDetails = getPackageDetails(packageType);
		if (!packageDetails) return "";

		if (availableVideos.length < packageDetails.videoCount) {
			return `Only ${availableVideos.length} videos available`;
		}
		return "";
	};

	// Show loading state
	if (isLoadingVideos) {
		return (
			<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
				<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
					Video Pricing
				</h3>
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
					<span className="ml-3 text-gray-600">Loading videos...</span>
				</div>
			</div>
		);
	}

	// Show error state
	if (fetchError) {
		return (
			<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
				<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
					Video Pricing
				</h3>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800 text-sm">
						<span className="font-medium">Error loading videos:</span>{" "}
						{fetchError}
					</p>
					<Button
						onClick={() => window.location.reload()}
						className="mt-3 bg-red-500 hover:bg-red-600 text-white text-sm"
					>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
				<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
					Video Pricing
				</h3>

				<div className="space-y-3">
					{/* 1 Video Package */}
					<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
						<div className="flex flex-col">
							<span className="font-medium">1 Video</span>
							{!isPackageAvailable("one") && (
								<span className="text-xs text-red-500">
									{getUnavailableMessage("one")}
								</span>
							)}
						</div>
						<div className="flex items-center">
							<span className="font-medium text-orange-600">
								${selectedCreator.pricing.oneVideo}
							</span>
							<Button
								onClick={() => handleBuyClick("one")}
								disabled={!isPackageAvailable("one") || isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{isProcessing ? "Processing..." : "Buy"}
							</Button>
						</div>
					</div>

					{/* 3 Videos Package */}
					<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
						<div className="flex flex-col">
							<span className="font-medium">3 Videos</span>
							{!isPackageAvailable("three") && (
								<span className="text-xs text-red-500">
									{getUnavailableMessage("three")}
								</span>
							)}
						</div>
						<div className="flex items-center">
							<span className="font-medium text-orange-600">
								${selectedCreator.pricing.threeVideos}
							</span>
							<Button
								onClick={() => handleBuyClick("three")}
								disabled={!isPackageAvailable("three") || isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{isProcessing ? "Processing..." : "Buy"}
							</Button>
						</div>
					</div>

					{/* 5 Videos Package */}
					<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
						<div className="flex flex-col">
							<span className="font-medium">5 Videos</span>
							{!isPackageAvailable("five") && (
								<span className="text-xs text-red-500">
									{getUnavailableMessage("five")}
								</span>
							)}
						</div>
						<div className="flex items-center">
							<span className="font-medium text-orange-600">
								${selectedCreator.pricing.fiveVideos}
							</span>
							<Button
								onClick={() => handleBuyClick("five")}
								disabled={!isPackageAvailable("five") || isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{isProcessing ? "Processing..." : "Buy"}
							</Button>
						</div>
					</div>

					{/* Bulk Videos Package */}
					<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
						<div className="flex flex-col">
							<span className="font-medium">
								Bulk Videos ({availableVideos.length} available)
							</span>
							{!isPackageAvailable("bulk") && (
								<span className="text-xs text-red-500">
									No videos available
								</span>
							)}
						</div>
						<div className="flex items-center">
							<span className="font-medium text-orange-600">
								${selectedCreator.pricing.bulkVideos}
							</span>
							<Button
								onClick={() => handleBuyClick("bulk")}
								disabled={!isPackageAvailable("bulk") || isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{isProcessing ? "Processing..." : "Buy"}
							</Button>
						</div>
					</div>

					{selectedCreator.pricing.bulkVideosNote && (
						<p className="text-xs text-gray-500 mt-2">
							{selectedCreator.pricing.bulkVideosNote}
						</p>
					)}

					{/* Available Videos Info */}
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
						<p className="text-sm text-blue-800">
							<span className="font-medium">{availableVideos.length}</span>{" "}
							videos available from {selectedCreator.name}
						</p>
					</div>
				</div>

				<div>
					<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center mt-4">
						AI Actor Pricing
					</h3>

					<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
						<div className="flex flex-col">
							<span className="font-medium">Price per Usage</span>
						
						</div>
						<div className="flex items-center">
							<span className="font-medium text-orange-600">
								${selectedCreator.pricing.aiActorPricing || 0}
							</span>
							<Button
								onClick={() => handleViewAIActorPricing()}
								className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								 View AI Actor
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Video Selection Modal */}
			{selectedPackage && (
				<VideoSelectionModal
					isOpen={isModalOpen}
					onClose={handleModalClose}
					videos={availableVideos}
					packageType={selectedPackage.type}
					packagePrice={selectedPackage.price}
					videoCount={selectedPackage.videoCount}
					onConfirmSelection={handleConfirmSelection}
					isProcessing={isProcessing}
				/>
			)}
		</>
	);
};

export default PricingCard;
