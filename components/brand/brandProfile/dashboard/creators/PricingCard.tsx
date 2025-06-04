import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ScriptSelectionModal from "./ScriptSelectionModal";
import ScriptInputForm from "./ScriptInputForm";
import ProjectBriefForm from "./ProjectFormBrief";
import OrderSummaryModal from "./OrderSummaryModal";

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

interface PricingCardProps {
	selectedCreator: Creator;
	onPackageSelect?: (
		packageType: string,
		videoCount: number,
		totalPrice: number
	) => void;
	isProcessing?: boolean;
}

type PackageType = "one" | "three" | "five" | "bulk";

const PricingCard: React.FC<PricingCardProps> = ({
	selectedCreator,
	onPackageSelect,
	isProcessing = false,
}) => {
	const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(
		null
	);
	const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
	const [modalPackageDetails, setModalPackageDetails] = useState<{
		type: string;
		videoCount: number;
		price: number;
	} | null>(null);
	const [selectedScriptChoice, setSelectedScriptChoice] = useState<
		"brand-written" | "creator-written" | null
	>(null);
	const [isScriptInputModalOpen, setIsScriptInputModalOpen] = useState(false);

	// New state for project brief form
	const [isProjectBriefModalOpen, setIsProjectBriefModalOpen] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [scriptsData, setScriptsData] = useState<any>(null); // Store scripts data for later use
	const [isOrderSummaryModalOpen, setIsOrderSummaryModalOpen] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [projectBriefData, setProjectBriefData] = useState<any>(null);

	const getPackageDetails = (packageType: PackageType) => {
		switch (packageType) {
			case "one":
				return {
					type: packageType,
					price: selectedCreator.pricing.oneVideo,
					videoCount: 1,
					description: "Perfect for testing or single campaign",
					timeline: "5-7 days",
				};
			case "three":
				return {
					type: packageType,
					price: selectedCreator.pricing.threeVideos,
					videoCount: 3,
					description: "Great for A/B testing different approaches",
					timeline: "2-3 weeks",
				};
			case "five":
				return {
					type: packageType,
					price: selectedCreator.pricing.fiveVideos,
					videoCount: 5,
					description: "Campaign-ready content bundle",
					timeline: "3-4 weeks",
				};
			case "bulk":
				return {
					type: packageType,
					price: selectedCreator.pricing.bulkVideos,
					videoCount: 6, // You mentioned 6+ for bulk
					description: "Best value for extensive campaigns",
					timeline: "4-6 weeks",
				};
			default:
				return null;
		}
	};

	const handlePackageSelect = (packageType: PackageType) => {
		const packageDetails = getPackageDetails(packageType);

		if (!packageDetails) return;

		setSelectedPackage(packageType);

		// Store package details for the modal
		setModalPackageDetails(packageDetails);

		// Open the script selection modal
		setIsScriptModalOpen(true);

		// Call the package selection handler if needed
		if (onPackageSelect) {
			onPackageSelect(
				packageDetails.type,
				packageDetails.videoCount,
				packageDetails.price
			);
		}
	};

	const handleScriptModalClose = () => {
		setIsScriptModalOpen(false);
		setModalPackageDetails(null);
	};

	const handleScriptChoiceSelect = (
		choice: "brand-written" | "creator-written"
	) => {
		console.log("Script choice selected:", choice);

		// Store the script choice
		setSelectedScriptChoice(choice);

		// Close the script selection modal
		setIsScriptModalOpen(false);

		// Open the script input modal
		setIsScriptInputModalOpen(true);
	};

	const handleScriptInputBack = () => {
		setIsScriptInputModalOpen(false);
		setIsScriptModalOpen(true); // Go back to script selection
	};

	// Modified to proceed to project brief instead of completing
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleScriptsComplete = (scripts: any) => {
		console.log("Scripts completed:", scripts);

		// Store scripts data for later use
		setScriptsData(scripts);

		// Close script input modal and open project brief modal
		setIsScriptInputModalOpen(false);
		setIsProjectBriefModalOpen(true);
	};

	const handleScriptInputModalClose = () => {
		setIsScriptInputModalOpen(false);
		setModalPackageDetails(null);
	};

	// New handlers for project brief form
	const handleProjectBriefBack = () => {
		setIsProjectBriefModalOpen(false);
		setIsScriptInputModalOpen(true); // Go back to script input
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleProjectBriefComplete = (projectBriefDataParam: any) => {
		console.log("Project brief completed:", projectBriefDataParam);

		// Store project brief data
		setProjectBriefData(projectBriefDataParam);

		// Close project brief modal and open order summary
		setIsProjectBriefModalOpen(false);
		setIsOrderSummaryModalOpen(true);
	};

	const handleProjectBriefModalClose = () => {
		setIsProjectBriefModalOpen(false);
		setModalPackageDetails(null);
		setScriptsData(null);
	};

	const handleOrderSummaryBack = () => {
		setIsOrderSummaryModalOpen(false);
		setIsProjectBriefModalOpen(true);
	};

	const handleOrderSummaryClose = () => {
		setIsOrderSummaryModalOpen(false);
		setModalPackageDetails(null);
		setSelectedScriptChoice(null);
		setScriptsData(null);
		setProjectBriefData(null);
	};

	const handleOrderConfirm = () => {
		console.log("Order confirmed - proceed to payment");
		// Here you would navigate to payment or create the order
		setIsOrderSummaryModalOpen(false);
		// Reset all state or navigate to next phase
	};

	const handleViewAIActorPricing = () => {
		// This would navigate to AI Actor section or modal
		console.log("Navigate to AI Actor pricing");
	};

	const calculateSavings = (packageType: PackageType) => {
		const packageDetails = getPackageDetails(packageType);
		if (!packageDetails || packageType === "one") return null;

		const singleVideoPrice = selectedCreator.pricing.oneVideo;
		const regularPrice = singleVideoPrice * packageDetails.videoCount;
		const packagePrice = packageDetails.price;
		const savings = regularPrice - packagePrice;
		const percentageSavings = Math.round((savings / regularPrice) * 100);

		return {
			savings,
			percentageSavings,
			regularPrice,
		};
	};

	return (
		<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
			<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
				Custom Video Creation Pricing
			</h3>

			{/* Updated explanation of new process */}
			<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
				<ol className="text-sm text-blue-800 space-y-1">
					<li>1. Choose your package</li>
					<li>2. Provide scripts or let the creator write them</li>
					<li>3. Share your project brief</li>
					<li>4. Review and approve all videos</li>
					<li>5. Payment released on approval</li>
				</ol>
			</div>

			<div className="space-y-3">
				{/* 1 Video Package */}
				<div
					className={`relative border-2 rounded-lg p-4 transition-all ${
						selectedPackage === "one"
							? "border-orange-500 bg-orange-50"
							: "border-gray-200 hover:border-orange-300"
					}`}
				>
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-base">1 Custom Video</span>
							</div>
							<p className="text-sm text-gray-600 mb-2">
								{getPackageDetails("one")?.description}
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<span>⏱️ {getPackageDetails("one")?.timeline}</span>
								<span>✏️ 2 revision rounds</span>
								<span>📋 2-3 day review period</span>
							</div>
						</div>
						<div className="text-right">
							<div className="text-lg font-bold text-orange-600 mb-2">
								${selectedCreator.pricing.oneVideo}
							</div>
							<Button
								onClick={() => handlePackageSelect("one")}
								disabled={isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white shadow-none disabled:bg-gray-300"
							>
								{isProcessing ? "Processing..." : "Select Package"}
							</Button>
						</div>
					</div>
				</div>

				{/* 3 Videos Package */}
				<div
					className={`relative border-2 rounded-lg p-4 transition-all ${
						selectedPackage === "three"
							? "border-orange-500 bg-orange-50"
							: "border-gray-200 hover:border-orange-300"
					}`}
				>
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-base">3 Custom Videos</span>
								{calculateSavings("three") && (
									<span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
										Save {calculateSavings("three")?.percentageSavings}%
									</span>
								)}
							</div>
							<p className="text-sm text-gray-600 mb-2">
								{getPackageDetails("three")?.description}
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<span>⏱️ {getPackageDetails("three")?.timeline}</span>
								<span>✏️ 2 revision rounds</span>
								<span>📋 Batch approval</span>
							</div>
						</div>
						<div className="text-right">
							<div className="text-lg font-bold text-orange-600 mb-1">
								${selectedCreator.pricing.threeVideos}
							</div>
							{calculateSavings("three") && (
								<div className="text-xs text-gray-500 line-through mb-2">
									Regular: ${calculateSavings("three")?.regularPrice}
								</div>
							)}
							<Button
								onClick={() => handlePackageSelect("three")}
								disabled={isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white shadow-none disabled:bg-gray-300"
							>
								{isProcessing ? "Processing..." : "Select Package"}
							</Button>
						</div>
					</div>
				</div>

				{/* 5 Videos Package */}
				<div
					className={`relative border-2 rounded-lg p-4 transition-all ${
						selectedPackage === "five"
							? "border-orange-500 bg-orange-50"
							: "border-gray-200 hover:border-orange-300"
					}`}
				>
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-base">5 Custom Videos</span>
								{calculateSavings("five") && (
									<span className="bg-green-100 text-green-800 text-xs px-1 py-1 rounded-full">
										Save {calculateSavings("five")?.percentageSavings}%
									</span>
								)}
								<span className="bg-blue-100 text-blue-800 text-xs px-1 py-1 rounded-full">
									Most Popular
								</span>
							</div>
							<p className="text-sm text-gray-600 mb-2">
								{getPackageDetails("five")?.description}
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<span>⏱️ {getPackageDetails("five")?.timeline}</span>
								<span>✏️ 2 revision rounds</span>
								<span>📋 Batch approval</span>
							</div>
						</div>
						<div className="text-right">
							<div className="text-lg font-bold text-orange-600 mb-1">
								${selectedCreator.pricing.fiveVideos}
							</div>
							{calculateSavings("five") && (
								<div className="text-xs text-gray-500 line-through mb-2">
									Regular: ${calculateSavings("five")?.regularPrice}
								</div>
							)}
							<Button
								onClick={() => handlePackageSelect("five")}
								disabled={isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white shadow-none disabled:bg-gray-300"
							>
								{isProcessing ? "Processing..." : "Select Package"}
							</Button>
						</div>
					</div>
				</div>

				{/* Bulk Videos Package */}
				<div
					className={`relative border-2 rounded-lg p-4 transition-all ${
						selectedPackage === "bulk"
							? "border-orange-500 bg-orange-50"
							: "border-gray-200 hover:border-orange-300"
					}`}
				>
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-base">
									Bulk Videos (6+)
								</span>
								{calculateSavings("bulk") && (
									<span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
										Save {calculateSavings("bulk")?.percentageSavings}%
									</span>
								)}
								<span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
									Best Value
								</span>
							</div>
							<p className="text-sm text-gray-600 mb-2">
								{getPackageDetails("bulk")?.description}
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<span>⏱️ {getPackageDetails("bulk")?.timeline}</span>
								<span>✏️ 2 revision rounds</span>
								<span>📋 Milestone approvals</span>
							</div>
						</div>
						<div className="text-right">
							<div className="text-lg font-bold text-orange-600 mb-1">
								${selectedCreator.pricing.bulkVideos}
							</div>
							{calculateSavings("bulk") && (
								<div className="text-xs text-gray-500 line-through mb-2">
									Regular: ${calculateSavings("bulk")?.regularPrice}
								</div>
							)}
							<Button
								onClick={() => handlePackageSelect("bulk")}
								disabled={isProcessing}
								className="bg-orange-500 hover:bg-orange-600 text-white shadow-none disabled:bg-gray-300"
							>
								{isProcessing ? "Processing..." : "Select Package"}
							</Button>
						</div>
					</div>
				</div>

				{selectedCreator.pricing.bulkVideosNote && (
					<p className="text-xs text-gray-500 mt-2">
						{selectedCreator.pricing.bulkVideosNote}
					</p>
				)}
			</div>

			{/* Script Selection Modal */}
			<ScriptSelectionModal
				isOpen={isScriptModalOpen}
				onClose={handleScriptModalClose}
				packageType={modalPackageDetails?.type || ""}
				videoCount={modalPackageDetails?.videoCount || 0}
				totalPrice={modalPackageDetails?.price || 0}
				creatorName={selectedCreator.name}
				onScriptChoiceSelect={handleScriptChoiceSelect}
			/>

			{/* Script Input Form */}
			<ScriptInputForm
				isOpen={isScriptInputModalOpen}
				onClose={handleScriptInputModalClose}
				onBack={handleScriptInputBack}
				packageType={modalPackageDetails?.type || ""}
				videoCount={modalPackageDetails?.videoCount || 0}
				totalPrice={modalPackageDetails?.price || 0}
				creatorName={selectedCreator.name}
				onScriptsComplete={handleScriptsComplete}
				scriptChoice={selectedScriptChoice || "brand-written"}
			/>

			{/* New Project Brief Form */}
			<ProjectBriefForm
				isOpen={isProjectBriefModalOpen}
				onClose={handleProjectBriefModalClose}
				onBack={handleProjectBriefBack}
				packageType={modalPackageDetails?.type || ""}
				videoCount={modalPackageDetails?.videoCount || 0}
				totalPrice={modalPackageDetails?.price || 0}
				creatorName={selectedCreator.name}
				onBriefComplete={handleProjectBriefComplete}
			/>

			<OrderSummaryModal
				isOpen={isOrderSummaryModalOpen}
				onClose={handleOrderSummaryClose}
				onBack={handleOrderSummaryBack}
				onOrderConfirm={handleOrderConfirm}
				packageType={modalPackageDetails?.type || ""}
				videoCount={modalPackageDetails?.videoCount || 0}
				totalPrice={modalPackageDetails?.price || 0}
				creatorName={selectedCreator.name}
				scriptChoice={selectedScriptChoice || "brand-written"}
				scriptFormData={
					scriptsData || {
						scripts: [],
						generalRequirements: {},
						videoSpecs: {},
					}
				}
				projectBriefData={
					projectBriefData || {
						projectOverview: {},
						contentRequirements: {},
						brandGuidelines: {},
						videoSpecs: {},
						examples: {},
						timeline: {},
					}
				}
			/>

			{/* AI Actor Pricing Section */}
			<div className="mt-8">
				<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
					AI Actor Pricing
				</h3>

				<div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
					<div className="flex flex-col">
						<span className="font-medium">Price per Usage</span>
						<span className="text-sm text-gray-600">
							Digital avatar of {selectedCreator.name}
						</span>
					</div>
					<div className="flex items-center">
						<span className="font-medium text-orange-600">
							${selectedCreator.pricing.aiActorPricing || 0}
						</span>
						<Button
							onClick={handleViewAIActorPricing}
							className="bg-orange-500 hover:bg-orange-600 text-white ml-3 shadow-none"
						>
							View AI Actor
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PricingCard;
