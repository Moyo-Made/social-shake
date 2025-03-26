import React, { useEffect, useState } from "react";
import { Edit } from "lucide-react";
import Image from "next/image";
import { useProjectForm } from "./ProjectFormContext";

const TikTokShopProjectReview = () => {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const { formData } = useProjectForm();

	// Create a preview URL when a thumbnail is available
	useEffect(() => {
		if (!formData.projectDetails.projectThumbnail) {
			setPreviewUrl(null);
			return;
		}

		// If thumbnail is already a string (URL), use it directly
		if (typeof formData.projectDetails.projectThumbnail === "string") {
			setPreviewUrl(formData.projectDetails.projectThumbnail);
			return;
		}

		// Otherwise, create an object URL
		const objectUrl = URL.createObjectURL(
			formData.projectDetails.projectThumbnail as File
		);
		setPreviewUrl(objectUrl);

		// Free memory when this component is unmounted
		return () => URL.revokeObjectURL(objectUrl);
	}, [formData.projectDetails.projectThumbnail]);

	return (
		<div className="flex flex-col gap-6 max-w-4xl mx-auto border border-[#FFBF9B] rounded-xl p-6 bg-white">
			{/* Project Details Section */}
			<div>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-semibold">Project Details</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Project Title:</div>
						<div className="col-span-2">
							{formData.projectDetails.projectName || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Project Type</div>
						<div className="col-span-2">
							{formData.projectDetails.projectType || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Project Description</div>
						<div className="col-span-2">
							{formData.projectDetails.projectDescription || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Project Thumbnail</div>
						<div className="col-span-2">
							<div className="relative w-full h-48 rounded-lg overflow-hidden">
								{previewUrl ? (
									<Image
										src={previewUrl}
										alt="Project thumbnail preview"
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg">
										<Image
											src="/api/placeholder/400/200"
											alt="Project thumbnail"
											width={400}
											height={200}
											className="object-cover"
										/>
										<p className="text-gray-500 mt-2">No thumbnail selected</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content Requirements Section */}
			<div>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-semibold">Content Requirements</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Content Type</div>
						<div className="col-span-2">
							{formData.projectDetails.projectType || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Duration:</div>
						<div className="col-span-2">
							{formData.projectRequirements.duration || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Video Type</div>
						<div className="col-span-2">
							{formData.projectRequirements.videoType || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Aspect Ratio</div>
						<div className="col-span-2">
							{formData.projectRequirements.aspectRatio || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Client&apos;s Script
						</div>
						<div className="col-span-2 whitespace-pre-line">
							{formData.projectRequirements.script || "No script provided"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Links of Content you like
						</div>
						<div className="col-span-2">
							{formData.projectRequirements.contentLinks &&
							formData.projectRequirements.contentLinks.length > 0 ? (
								formData.projectRequirements.contentLinks.map((link, index) => (
									<div key={index} className="text-orange-500">
										<a
											href={link}
											target="_blank"
											rel="noopener noreferrer"
											className="truncate block hover:underline"
										>
											{link}
										</a>
									</div>
								))
							) : (
								<span className="text-gray-400">No links provided</span>
							)}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Brand Assets</div>
						<div className="col-span-2">
							{formData.projectRequirements.brandAssets ? (
								<a
									href={formData.projectRequirements.brandAssets}
									target="_blank"
									rel="noopener noreferrer"
									className="text-orange-500 truncate block hover:underline"
								>
									{formData.projectRequirements.brandAssets}
								</a>
							) : (
								<span className="text-gray-400">No brand assets provided</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Creator Section */}
			<div>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-semibold">Creator</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							How do you want to select Creators?
						</div>
						<div className="col-span-2">
							{formData.creatorPricing.creator.selectionMethod || "Not specified"}
						</div>
					</div>

					{formData.creatorPricing.creator.selectionMethod === "Invite Specific Creators" &&
						formData.creatorPricing.creator.selectedCreators && (
							<div className="grid grid-cols-3 gap-4">
								<div className="font-medium text-gray-600">
									Selected Creators
								</div>
								<div className="col-span-2">
									<div className="flex flex-wrap gap-2">
										{formData.creatorPricing.creator.selectedCreators.map((creator, index) => (
											<div
												key={index}
												className="flex items-center border border-[#D0D5DD] gap-1 bg-white rounded-lg px-3 py-1"
											>
												<div className="w-6 h-6 rounded-full bg-gray-200 mr-1 overflow-hidden relative">
													<Image
														src={creator.avatar || "/api/placeholder/24/24"}
														alt={creator.name}
														width={24}
														height={24}
														className="object-cover"
													/>
												</div>
												<span className="text-sm">{creator.name}</span>
											</div>
										))}
									</div>
								</div>
							</div>
						)}

					{formData.creatorPricing.creator.selectionMethod === "Post Public Brief" && (
						<>
							<div className="grid grid-cols-3 gap-4">
								<div className="font-medium text-gray-600">Age Group</div>
								<div className="col-span-2">
									{formData.creatorPricing.creator.ageGroup || "Not specified"}
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="font-medium text-gray-600">Gender</div>
								<div className="col-span-2">
									{formData.creatorPricing.creator.gender || "Not specified"}
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="font-medium text-gray-600">
									Type of Industry
								</div>
								<div className="col-span-2">
									{formData.creatorPricing.creator.industry || "Not specified"}
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="font-medium text-gray-600">Language</div>
								<div className="col-span-2">
									{formData.creatorPricing.creator.language || "Not specified"}
								</div>
							</div>
						</>
					)}

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">No of Creators</div>
						<div className="col-span-2">
							{formData.creatorPricing.creator.creatorCount} Creators
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Video(s) per Creator
						</div>
						<div className="col-span-2">
							{formData.creatorPricing.creator.videosPerCreator} Video
							{formData.creatorPricing.creator.videosPerCreator !== 1 ? "s" : ""}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Total Number of Videos
						</div>
						<div className="col-span-2">
							{formData.creatorPricing.creator.totalVideos} Videos
						</div>
					</div>
				</div>
			</div>

			{/* Cost Breakdown Section */}
			<div>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-semibold">Cost Breakdown</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Project Budget</div>
						<div className="col-span-2">
							<div className="font-medium">
								${formData.creatorPricing.cost.totalBudget.toLocaleString()}
							</div>
							<div className="text-sm text-gray-500">
								(Based on ${formData.creatorPricing.cost.budgetPerVideo.toLocaleString()} per
								video × {formData.creatorPricing.creator.totalVideos} videos)
							</div>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Commission per Sale</div>
						<div className="col-span-2">
							<div className="font-medium">
								{formData.creatorPricing.cost.commissionPerSale}%
							</div>
							<div className="text-sm text-gray-500">
								It applies to each creator separately
							</div>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Extras</div>
						<div className="col-span-2">
							<div className="font-medium">
								${formData.creatorPricing.cost.extrasTotal.toLocaleString()}
							</div>
							{formData.creatorPricing.cost.extras.music && (
								<div className="text-sm text-gray-500">
									Music - ${formData.creatorPricing.cost.extras.musicPrice} ×{" "}
									{formData.creatorPricing.creator.totalVideos} Videos = $
									{formData.creatorPricing.cost.extras.musicTotal}
								</div>
							)}
							{formData.creatorPricing.cost.extras.rawFiles && (
								<div className="text-sm text-gray-500">
									Raw Files - ${formData.creatorPricing.cost.extras.rawFilesPrice} ×{" "}
									{formData.creatorPricing.creator.totalVideos} Videos = $
									{formData.creatorPricing.cost.extras.rawFilesTotal}
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600 text-lg">
							Total Amount
						</div>
						<div className="col-span-2">
							<div className="col-span-2 font-bold text-lg">
								${formData.creatorPricing.cost.totalAmount.toLocaleString()}
							</div>
							<div className="text-sm text-gray-500">
								* Affiliate commission is paid separately based on sales.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TikTokShopProjectReview;
