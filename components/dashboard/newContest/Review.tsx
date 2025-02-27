"use client";

import React from "react";
import Image from "next/image";
import { Edit } from "lucide-react";
import { useContestForm } from "./ContestFormContext";
import { format } from "date-fns";
import Link from "next/link";

const Review = () => {
	const { formData } = useContestForm();
	const { basic, requirements, prizeTimeline } = formData;
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

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

	// Format prize breakdown
	const prizeBreakdown = prizeTimeline.positions
		.slice(0, prizeTimeline.winnerCount)
		.map((amount, index) => ({
			position: `${index + 1}${getSuffix(index + 1)} Position`,
			amount,
		}));

	// Get the ordinal suffix for position numbers
	function getSuffix(num: number): string {
		if (num === 1) return "st";
		if (num === 2) return "nd";
		if (num === 3) return "rd";
		return "th";
	}

	// Format dates
	const formatDate = (date: Date | undefined): string => {
		return date ? format(date, "MMMM d, yyyy") : "Not set";
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
							<div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
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
						<div className="col-span-2 bg-gray-100 p-3 rounded-lg">
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

			{/* Prizes & Timeline Section */}
			<div className="">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Prizes & Timeline</h2>
					<button className="text-gray-500">
						<Edit className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Total Budget & Prize Pool
						</div>
						<div className="col-span-2">
							${prizeTimeline.totalBudget.toLocaleString()}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Number of Winners</div>
						<div className="col-span-2">
							{prizeTimeline.winnerCount} Winners
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">Prize Breakdown</div>
						<div className="col-span-2 space-y-1">
							{prizeBreakdown.map((prize, index) => (
								<div key={index}>
									{prize.position}: ${prize.amount}
								</div>
							))}
						</div>
					</div>

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

					<div className="grid grid-cols-3 gap-4">
						<div className="font-medium text-gray-600">
							Leaderboard Criteria
						</div>
						<div className="col-span-2">
							{prizeTimeline.criteria === "views"
								? "Views"
								: prizeTimeline.criteria === "likes"
								? "Likes"
								: "Engagement Rate"}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Review;
