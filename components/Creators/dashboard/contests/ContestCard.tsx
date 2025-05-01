import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { Contest } from "@/types/contests";
import RenderActionButtons from "./RenderActionButton";

// Brand profile interface matching first component
interface BrandProfile {
	id?: string;
	userId: string;
	email?: string;
	brandName: string;
	logoUrl: string;
}

interface ContestCardProps {
	contest: Contest;
}

export default function ContestCard({ contest }: ContestCardProps) {
	// Add state for brand profile
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [, setBrandEmail] = useState<string>("");

	// Add useEffect to fetch brand profile
	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!contest || !contest.userId) return;

			try {
				// Skip if we already have this brand profile
				if (brandProfile && brandProfile.userId === contest.userId) {
					return;
				}

				//  fetch from API
				const response = await fetch(
					`/api/admin/brand-approval?userId=${contest.userId}`
				);

				if (response.ok) {
					const data = await response.json();
					setBrandProfile(data);
					if (data.email) {
						setBrandEmail(data.email);
					}
				} else {
					// Handle 404 or other errors by setting a placeholder
					setBrandProfile({
						id: contest.userId,
						userId: contest.userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error(
					`Error fetching brand profile for userId ${contest.userId}:`,
					error
				);
			}
		};

		if (contest) {
			fetchBrandProfile();
		}
	});

	// Add error handling for date formatting
	const formattedDate = contest.prizeTimeline?.endDate
		? format(new Date(contest.prizeTimeline.endDate), "MMMM d, yyyy")
		: "No date specified";

	// Function to get the appropriate date for the current status
	const getActionDate = (contest: Contest) => {
		try {
			switch (contest.status) {
				case "joined":
					if (contest.joinedAt && contest.joinedAt._seconds) {
						return new Date(contest.joinedAt._seconds * 1000);
					} else if (contest.submissionCreatedAt) {
						// Handle different timestamp formats
						if (
							typeof contest.submissionCreatedAt === "object" &&
							contest.submissionCreatedAt._seconds
						) {
							return new Date(contest.submissionCreatedAt._seconds * 1000);
						}
						if (typeof contest.submissionCreatedAt === "string") {
							return new Date(contest.submissionCreatedAt);
						} else if (
							contest.submissionCreatedAt &&
							contest.submissionCreatedAt._seconds
						) {
							return new Date(contest.submissionCreatedAt._seconds * 1000);
						}
						return null;
					}
					break;
				case "pending":
					if (contest.applicationCreatedAt) {
						// Handle different timestamp formats
						if (
							typeof contest.applicationCreatedAt === "object" &&
							contest.applicationCreatedAt._seconds
						) {
							return new Date(contest.applicationCreatedAt._seconds * 1000);
						}
						if (typeof contest.applicationCreatedAt === "string") {
							return new Date(contest.applicationCreatedAt);
						} else if (
							contest.applicationCreatedAt &&
							contest.applicationCreatedAt._seconds
						) {
							return new Date(contest.applicationCreatedAt._seconds * 1000);
						}
						return null;
					} else if (contest.createdAt) {
						// Handle different timestamp formats
						if (
							typeof contest.createdAt === "object" &&
							contest.createdAt._seconds
						) {
							return new Date(contest.createdAt._seconds * 1000);
						}
						if (
							typeof contest.createdAt === "object" &&
							contest.createdAt._seconds
						) {
							return new Date(contest.createdAt._seconds * 1000);
						}
						return new Date(contest.createdAt as string);
					}
					break;
				case "interested":
					if (contest.interestCreatedAt) {
						// Handle different timestamp formats
						if (
							typeof contest.interestCreatedAt === "object" &&
							contest.interestCreatedAt._seconds
						) {
							return new Date(contest.interestCreatedAt._seconds * 1000);
						}
						if (typeof contest.interestCreatedAt === "string") {
							return new Date(contest.interestCreatedAt);
						} else if (
							contest.interestCreatedAt &&
							contest.interestCreatedAt._seconds
						) {
							return new Date(contest.interestCreatedAt._seconds * 1000);
						}
						return null;
					} else if (contest.createdAt) {
						// Handle different timestamp formats
						if (
							typeof contest.createdAt === "object" &&
							contest.createdAt._seconds
						) {
							return new Date(contest.createdAt._seconds * 1000);
						}
						if (
							typeof contest.createdAt === "object" &&
							contest.createdAt._seconds
						) {
							return new Date(contest.createdAt._seconds * 1000);
						}
						return new Date(contest.createdAt as string);
					}
					break;
				case "rejected":
				case "completed":
				case "approved":
					if (contest.updatedAt) {
						// Handle different timestamp formats
						if (
							typeof contest.updatedAt === "object" &&
							contest.updatedAt._seconds
						) {
							if (
								typeof contest.updatedAt === "object" &&
								"_seconds" in contest.updatedAt
							) {
								return new Date(contest.updatedAt._seconds * 1000);
							}
							return new Date(contest.updatedAt as string);
						}
						if (
							typeof contest.updatedAt === "object" &&
							"_seconds" in contest.updatedAt
						) {
							return new Date(contest.updatedAt._seconds * 1000);
						}
						return new Date(contest.updatedAt as string);
					}
					break;
			}
			return null;
		} catch (error) {
			console.error("Error parsing date:", error, contest);
			return null;
		}
	};

	// Use the action date or fall back to updatedAt or createdAt
	const actionDate = getActionDate(contest);
	const formattedActionDate = actionDate
		? format(actionDate, "MMMM d, yyyy")
		: "No date available";

	// Function to get status label and color
	const getStatusInfo = (status: string) => {
		switch (status) {
			case "joined":
				return {
					prefix: "Status:",
					label: "√ Joined",
					color: "text-[#067647]",
					bgColor: "bg-[#ECFDF3]",
					borderColor: "border border-[#ABEFC6]",
				};
			case "pending":
				return {
					prefix: "Status:",
					label: "• Pending Approval",
					color: "text-[#1A1A1A]",
					bgColor: "bg-[#FFF0C3]",
					borderColor: "border border-[#FDD849]",
				};
			case "interested":
				return {
					prefix: "Status:",
					label: "• Interested",
					color: "text-[#FC52E4]",
					bgColor: "bg-[#FFE5FB]",
					borderColor: "border border-[#FC52E4]",
				};
			case "rejected":
				return {
					prefix: "Status:",
					label: "• Rejected",
					color: "text-[#F04438]",
					bgColor: "bg-[#FFE9E7]",
					borderColor: "border border-[#F04438]",
				};
			case "completed":
				return {
					prefix: "Status:",
					label: "• Completed",
					color: "text-gray-600",
					bgColor: "bg-gray-100",
					borderColor: "border border-gray-600",
				};
			case "approved":
				return {
					prefix: "Status:",
					label: "√ Approved",
					color: "text-blue-600",
					bgColor: "bg-blue-100",
					borderColor: "border border-blue-600",
				};
			default:
				return {
					prefix: "Status:",
					label: status.charAt(0).toUpperCase() + status.slice(1),
					color: "text-gray-600",
					bgColor: "bg-gray-100",
					borderColor: "border border-gray-600",
				};
		}
	};

	const { prefix, label, color, bgColor, borderColor } = getStatusInfo(
		contest.status
	);

	// Helper function to get status time label
	function getStatusTimeLabel(status: string) {
		switch (status) {
			case "joined":
				return "Joined:";
			case "pending":
				return "Applied:";
			case "interested":
				return "Interested:";
			case "rejected":
				return "Rejected:";
			case "approved":
				return "Approved:";
			default:
				return "Published:";
		}
	}

	// Get a shortened description
	const shortDescription = contest.basic?.description
		? contest.basic.description.length > 400
			? contest.basic.description.substring(0, 400) + "..."
			: contest.basic.description
		: "No description available";

	return (
		<div className="border border-[#D2D2D2] rounded-lg overflow-hidden bg-white shadow-sm mb-1">
			<div className="flex">
				<div className="w-1/3">
					<Image
						src={contest.basic?.thumbnail || "/api/placeholder/300/200"}
						alt={contest.basic?.contestName || "Contest thumbnail"}
						className="w-full h-[20rem] object-cover rounded-xl p-2"
						width={300}
						height={100}
					/>
				</div>

				{/* Contest Details */}
				<div className="w-3/4 p-4 flex flex-col">
					{/* Status and Title */}
					<div className="flex items-start justify-between mb-2">
						<div>
							<div className="flex items-center gap-1 mb-2">
								<span className="text-sm">{prefix}</span>
								<span
									className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${color} ${borderColor}`}
								>
									{label}
								</span>
							</div>
							<h3 className="text-lg font-semibold mt-1">
								{contest.basic?.contestName || contest.id}
							</h3>
						</div>
						<div className="text-gray-500 text-sm">
							{getStatusTimeLabel(contest.status)}{" "}
							<span className="text-gray-700">{formattedActionDate}</span>
						</div>
					</div>

					{/* Organization */}
					<div className="flex items-center mb-3">
						<div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
							<Image
								src={brandProfile?.logoUrl || "/api/placeholder/32/32"}
								alt={brandProfile?.brandName || "Brand"}
								className="w-full h-full object-cover"
								width={32}
								height={32}
							/>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-700">
							{brandProfile?.brandName || "Loading..."}
						</span>
					</div>

					{/* Description */}
					<p className="text-gray-600 mb-4 text-sm">{shortDescription}</p>

					{/* Contest Details */}
					<div className="grid grid-cols-3 gap-4 mb-4">
						<div>
							<h4 className="text-sm font-normal text-orange-500">
								Contest Type
							</h4>
							<p className="text-sm">{contest.contestType || "Unknown"}</p>
						</div>
						<div>
							<h4 className="text-sm font-normal text-orange-500">
								Contest End Date
							</h4>
							<p className="text-sm">{formattedDate}</p>
						</div>
						<div>
							<h4 className="text-sm font-normal text-orange-500">
								Creators Joined
							</h4>
							<p className="text-sm ">
								{contest.participantsCount !== undefined
									? `${contest.participantsCount} Creator${contest.participantsCount !== 1 ? "s" : ""}`
									: contest.applicantsCount !== undefined
										? `${contest.applicantsCount} Applicant${contest.applicantsCount !== 1 ? "s" : ""}`
										: "0 Creators"}
							</p>
						</div>
					</div>

					{/* Action Buttons - Now taking full width with flex-1 */}
					<div className="flex gap-3 mt-auto w-full">
						<RenderActionButtons
							contest={{
								contestId: contest.id,
								contestType: contest.contestType || "Unknown",
								status: contest.status,
								interestId: contest.interestId,
								// channelId: contest.channelId,
							}}
							refreshData={() => {
								// Add actual refresh logic here
								window.location.reload(); // Simple refresh option
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
