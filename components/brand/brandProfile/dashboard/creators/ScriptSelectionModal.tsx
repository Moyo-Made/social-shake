import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface ScriptSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	creatorName: string;
	onScriptChoiceSelect: (choice: "brand-written" | "creator-written") => void;
}

const ScriptSelectionModal: React.FC<ScriptSelectionModalProps> = ({
	isOpen,
	onClose,
	packageType,
	videoCount,
	totalPrice,
	creatorName,
	onScriptChoiceSelect,
}) => {
	const [selectedChoice, setSelectedChoice] = useState<
		"brand-written" | "creator-written" | null
	>(null);

	if (!isOpen) return null;

	// Get package display name
	const getPackageDisplayName = () => {
		switch (packageType) {
			case "one":
				return "1 Video";
			case "three":
				return "3 Videos";
			case "five":
				return "5 Videos";
			case "bulk":
				return "Bulk Videos";
			default:
				return `${videoCount} Videos`;
		}
	};

	const handleChoiceSelect = (choice: "brand-written" | "creator-written") => {
		setSelectedChoice(choice);
	};

	const handleContinue = () => {
		if (selectedChoice) {
			onScriptChoiceSelect(selectedChoice);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="border-b border-gray-200 p-6">
					<div className="flex justify-between items-start">
						<div>
							<h2 className="text-xl font-semibold text-gray-900">
								Create Your Custom Videos
							</h2>
							<p className="text-sm text-gray-600 mt-1">
								{getPackageDisplayName()} with {creatorName} • ${totalPrice}
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 text-2xl"
						>
							×
						</button>
					</div>

					{/* Step Indicator */}
					<div className="mt-6">
						<div className="flex items-center">
							<div className="flex items-center text-orange-600">
								<div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									1
								</div>
								<span className="ml-2 text-sm font-medium">
									Script Approach
								</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-gray-400">
								<div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">
									2
								</div>
								<span className="ml-2 text-sm">Scripts & Details</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-gray-400">
								<div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">
									3
								</div>
								<span className="ml-2 text-sm">Project Brief</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-gray-400">
								<div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">
									4
								</div>
								<span className="ml-2 text-sm">Review</span>
							</div>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="mb-6">
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							How would you like to handle the scripts?
						</h3>
						<p className="text-gray-600 text-sm">
							Choose how you want to create the scripts for your {videoCount}{" "}
							custom video{videoCount > 1 ? "s" : ""}.
						</p>
					</div>

					<div className="space-y-4">
						{/* Option 1: Brand-Written Scripts */}
						<div
							className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
								selectedChoice === "brand-written"
									? "border-orange-500 bg-orange-50"
									: "border-gray-200 hover:border-orange-300"
							}`}
							onClick={() => handleChoiceSelect("brand-written")}
						>
							<div className="flex items-start">
								<div
									className={`w-5 h-5 rounded-full border-2 mt-0.5 mr-3 flex items-center justify-center ${
										selectedChoice === "brand-written"
											? "border-orange-500 bg-orange-500"
											: "border-gray-300"
									}`}
								>
									{selectedChoice === "brand-written" && (
										<div className="w-2 h-2 bg-white rounded-full"></div>
									)}
								</div>
								<div className="flex-1">
									<h4 className="font-medium text-gray-900 mb-2">
										I&apos;ll provide the scripts
									</h4>
									<p className="text-sm text-gray-600 mb-3">
										You write and provide the complete scripts for each video.
										Perfect if you have specific messaging, brand voice, or
										detailed requirements.
									</p>
									<div className="space-y-2">
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Full control over messaging and content
										</div>
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Consistent with your brand voice
										</div>
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Faster production start (no script approval needed)
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Option 2: Creator-Written Scripts */}
						<div
							className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
								selectedChoice === "creator-written"
									? "border-orange-500 bg-orange-50"
									: "border-gray-200 hover:border-orange-300"
							}`}
							onClick={() => handleChoiceSelect("creator-written")}
						>
							<div className="flex items-start">
								<div
									className={`w-5 h-5 rounded-full border-2 mt-0.5 mr-3 flex items-center justify-center ${
										selectedChoice === "creator-written"
											? "border-orange-500 bg-orange-500"
											: "border-gray-300"
									}`}
								>
									{selectedChoice === "creator-written" && (
										<div className="w-2 h-2 bg-white rounded-full"></div>
									)}
								</div>
								<div className="flex-1">
									<h4 className="font-medium text-gray-900 mb-2">
										{creatorName} writes the scripts
									</h4>
									<p className="text-sm text-gray-600 mb-3">
										The creator writes scripts based on your brief and
										requirements. Great if you want their expertise in creating
										engaging content for their audience.
									</p>
									<div className="space-y-2">
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Creator&apos;s expertise in audience engagement
										</div>
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Natural fit with creator&apos;s style and voice
										</div>
										<div className="flex items-center text-xs text-gray-500">
											<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
											Script approval process before production
										</div>
									</div>
									<div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
										<strong>Note:</strong> Scripts will be provided for your
										approval before video production begins.
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Additional Info */}
					<div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
						<h4 className="font-medium text-gray-900 mb-2">
							What happens next?
						</h4>
						<div className="text-sm text-gray-600 space-y-1">
							<p>
								• You&apos;ll provide detailed requirements and project
								information
							</p>
							<p>• Review and confirm your order details</p>
							<p>
								• Payment will be held securely until all videos are approved
							</p>
							<p>
								• {creatorName} will be notified and can accept/decline the
								project
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-gray-200 p-6">
					<div className="flex justify-between">
						<Button onClick={onClose} variant="outline" className="px-6">
							Cancel
						</Button>
						<Button
							onClick={handleContinue}
							disabled={!selectedChoice}
							className="bg-orange-500 hover:bg-orange-600 text-white px-6 disabled:bg-gray-300"
						>
							Continue
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ScriptSelectionModal;
