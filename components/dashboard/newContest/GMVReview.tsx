"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { useContestForm } from "./ContestFormContext";
import { format } from "date-fns";
import Link from "next/link";

const GMVReview = () => {
	const { formData } = useContestForm();
	const { basic, requirements, prizeTimeline } = formData;
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [currentIncentiveIndex, setCurrentIncentiveIndex] = useState(0);
	type Incentive = {
		name?: string;
		worth?: number;
		description?: string;
		items?: string[];
	};

	const incentives: Incentive[] = formData.incentives || [];

	// Create a preview URL when a thumbnail is available
	React.useEffect(() => {
		if (!basic.thumbnail) {
			setPreviewUrl(null);
			return;
		}

		const objectUrl = URL.createObjectURL(basic.thumbnail);
		setPreviewUrl(objectUrl);

		// Free memory when this component is unmounted
		return () => URL.revokeObjectURL(objectUrl);
	}, [basic.thumbnail]);


	// Format dates
	const formatDate = (date: Date | undefined): string => {
		return date ? format(date, "MMMM d, yyyy") : "Not set";
	};

	// Navigate between incentives
	const handleNextIncentive = () => {
		setCurrentIncentiveIndex((prev) => 
			(prev + 1) % (incentives?.length || 1)
		);
	};

	const handlePrevIncentive = () => {
		setCurrentIncentiveIndex((prev) => 
			prev === 0 ? (incentives?.length || 1) - 1 : prev - 1
		);
	};

	// Render current incentive
	const renderCurrentIncentive = () => {
		if (!incentives || incentives.length === 0) {
			return (
				<div className="text-gray-500">
					No incentives have been added yet.
				</div>
			);
		}

		const currentIncentive = incentives[currentIncentiveIndex];

		return (
			<div className="relative">
				{/* Incentive Navigation */}
				{incentives.length > 1 && (
					<div className="absolute top-0 right-0 flex items-center">
						<button 
							onClick={handlePrevIncentive} 
							className="mr-2 text-gray-500 hover:text-gray-700"
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button 
							onClick={handleNextIncentive} 
							className="text-gray-500 hover:text-gray-700"
						>
							<ChevronRight className="h-5 w-5" />
						</button>
					</div>
				)}

							Incentive Worth: ${currentIncentive.worth?.toLocaleString() ?? "N/A"}
				<div className="space-y-2">
					<div>
						<div className="font-semibold">
							{currentIncentive.name || "Untitled Incentive"}
						</div>
						<div className="text-gray-600">
							Incentive Worth: ${currentIncentive.worth?.toLocaleString() || "N/A"}
						</div>
					</div>
					
					<div className="text-sm text-gray-500 mt-2">
						{currentIncentive.description || "No description provided"}
						
						{currentIncentive.items && currentIncentive.items.length > 0 && (
							<ul className="list-disc list-inside mt-1">
								{currentIncentive.items.map((item, index) => (
									<li key={index}>{item}</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6 max-w-4xl mx-auto border border-[#FFBF9B] rounded-xl p-6">
			{/* Contest Basics Section */}
			<div className="">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Contest Basics</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest Title:</div>
						<div className="col-span-2">
							{basic.contestName || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest Description</div>
						<div className="col-span-2">
							{basic.description || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest Industry:</div>
						<div className="col-span-2">
							{basic.industry || "Not specified"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest Thumbnail</div>
						<div className="col-span-2">
							<div className="relative w-full h-48 rounded-lg overflow-hidden">
								{previewUrl ? (
									<Image
										src={previewUrl}
										alt="Contest thumbnail preview"
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex flex-col items-center justify-center h-full">
										<Image
											src="/api/placeholder/400/320"
											alt="Contest thumbnail"
											width={400}
											height={200}
											className="object-cover"
										/>
										<p className="text-gray-500 mt-2">
											{basic.thumbnail
												? basic.thumbnail.name
												: "No thumbnail selected"}
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Contest Requirements Section */}
			<div className="">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Contest Requirements</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Who Can Join:</div>
						<div className="col-span-2">
							{requirements.whoCanJoin === "allow-applications"
								? "Allow Applications"
								: "Allow All Creators"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Duration:</div>
						<div className="col-span-2">
							{requirements.duration === "15-seconds"
								? "15 Seconds"
								: requirements.duration === "30-seconds"
								? "30 Seconds"
								: "60 Seconds"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Video Type</div>
						<div className="col-span-2">
							{requirements.videoType === "client-script"
								? "Client's Script"
								: "Creator's Script"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Script</div>
						<div className="col-span-2 p-3 rounded-lg">
							{requirements.script || "No script provided"}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Content Links</div>
						<div className="col-span-2">
							{requirements.contentLinks.map((link, index) => (
								<div
									key={index}
									className={link ? "text-orange-500 " : "text-gray-400"}
								>
									<Link
										href={link}
										target="_blank"
										className="truncate block hover:underline"
									>
										{link || "No link provided"}
									</Link>
								</div>
							))}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Brand Assets</div>
						<div className="col-span-2">
							{requirements.brandAssets ? (
								<Link
									href={requirements.brandAssets}
                  target="_blank"
									className="text-orange-500 truncate block hover:underline"
								>
									{requirements.brandAssets}
								</Link>
							) : (
								<span className="text-gray-400">No brand assets provided</span>
							)}
						</div>
					</div>
				</div>
			</div>

			
			{/* Incentives & Timeline Section */}

			<div className="">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Incentives & Timeline</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest Start Date</div>
						<div className="col-span-2">
							{formatDate(prizeTimeline.startDate)}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Contest End Date</div>
						<div className="col-span-2">
							{formatDate(prizeTimeline.endDate)}
						</div>
					</div>

					{/* Incentive Section */}
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Incentive {currentIncentiveIndex + 1}
						</div>
						<div className="col-span-2">
							{renderCurrentIncentive()}
						</div>
					</div>

					
				</div>
			</div>
		</div>
	);
}


export default GMVReview;
