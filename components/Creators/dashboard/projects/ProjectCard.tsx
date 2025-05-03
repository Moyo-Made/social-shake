import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ProjectFormData } from "@/types/contestFormData";
import { format } from "date-fns";
import RenderActionButtons from "./RenderActionButton";
import { getProjectTypeIcon, getStatusInfo } from "@/types/projects";

// Brand profile interface matching first component
interface BrandProfile {
	id?: string;
	userId: string;
	email?: string;
	brandName: string;
	logoUrl: string;
}

interface ProjectCardProps {
	project: ProjectFormData;
}

export default function ProjectCard({ project }: ProjectCardProps) {
	// Add state for brand profile
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [, setBrandEmail] = useState<string>("");

	// Add useEffect to fetch brand profile
	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!project || !project.userId) return;

			try {
				// Skip if we already have this brand profile
				if (brandProfile && brandProfile.userId === project.userId) {
					return;
				}

				//  fetch from API
				const response = await fetch(
					`/api/admin/brand-approval?userId=${project.userId}`
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
						id: project.userId,
						userId: project.userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error(
					`Error fetching brand profile for userId ${project.userId}:`,
					error
				);
			}
		};

		if (project) {
			fetchBrandProfile();
		}
	});

	// Function to get the appropriate date for the current status
	const getActionDate = (project: ProjectFormData) => {
		try {
			switch (project.status) {
				case "pending":
					if (project.applicationCreatedAt) {
						// Handle different timestamp formats
						if (
							typeof project.applicationCreatedAt === "object" &&
							project.applicationCreatedAt._seconds
						) {
							return new Date(project.applicationCreatedAt._seconds * 1000);
						}
						if (typeof project.applicationCreatedAt === "string") {
							return new Date(project.applicationCreatedAt);
						} else if (
							project.applicationCreatedAt &&
							project.applicationCreatedAt._seconds
						) {
							return new Date(project.applicationCreatedAt._seconds * 1000);
						}
						return null;
					} else if (project.createdAt) {
						// Handle different timestamp formats
						if (
							typeof project.createdAt === "object" &&
							project.createdAt._seconds
						) {
							return new Date(project.createdAt._seconds * 1000);
						}
						if (
							typeof project.createdAt === "object" &&
							project.createdAt._seconds
						) {
							return new Date(project.createdAt._seconds * 1000);
						}
						return new Date(project.createdAt as string);
					}
					break;
				case "interested":
					if (project.interestCreatedAt) {
						// Handle different timestamp formats
						if (
							typeof project.interestCreatedAt === "object" &&
							project.interestCreatedAt._seconds
						) {
							return new Date(project.interestCreatedAt._seconds * 1000);
						}
						if (typeof project.interestCreatedAt === "string") {
							return new Date(project.interestCreatedAt);
						} else if (
							project.interestCreatedAt &&
							project.interestCreatedAt._seconds
						) {
							return new Date(project.interestCreatedAt._seconds * 1000);
						}
						return null;
					} else if (project.createdAt) {
						// Handle different timestamp formats
						if (
							typeof project.createdAt === "object" &&
							project.createdAt._seconds
						) {
							return new Date(project.createdAt._seconds * 1000);
						}
						if (
							typeof project.createdAt === "object" &&
							project.createdAt._seconds
						) {
							return new Date(project.createdAt._seconds * 1000);
						}
						return new Date(project.createdAt as string);
					}
					break;
				case "rejected":
				case "completed":
				case "approved":
					if (project.updatedAt) {
						// Handle different timestamp formats
						if (
							typeof project.updatedAt === "object" &&
							project.updatedAt._seconds
						) {
							if (
								typeof project.updatedAt === "object" &&
								"_seconds" in project.updatedAt
							) {
								return new Date(project.updatedAt._seconds * 1000);
							}
							return new Date(project.updatedAt as string);
						}
						if (
							typeof project.updatedAt === "object" &&
							"_seconds" in project.updatedAt
						) {
							return new Date(project.updatedAt._seconds * 1000);
						}
						return new Date(project.updatedAt as string);
					}
					break;
			}
			return null;
		} catch (error) {
			console.error("Error parsing date:", error, project);
			return null;
		}
	};

	// Use the action date or fall back to updatedAt or createdAt
	const actionDate = getActionDate(project);
	const formattedActionDate = actionDate
		? format(actionDate, "MMMM d, yyyy")
		: "No date available";


	const { prefix, label, color, bgColor, borderColor } = getStatusInfo(
		project.status
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
	const shortDescription = project.projectDetails.projectDescription
		? project.projectDetails.projectDescription.length > 400
			? project.projectDetails.projectDescription.substring(0, 400) + "..."
			: project.projectDetails.projectDescription
		: "No description available";

	return (
		<div className="border border-[#D2D2D2] rounded-lg overflow-hidden bg-white shadow-sm mb-1">
			<div className="flex">
				<div className="w-1/3">
					<Image
						src={
							typeof project.projectDetails.projectThumbnail === "string"
								? project.projectDetails.projectThumbnail
								: ""
						}
						alt={project.projectDetails.projectName}
						className="w-full h-[20rem] object-cover rounded-xl p-2"
						width={300}
						height={100}
					/>
				</div>

				{/* Project Details */}
				<div className="w-3/4 p-4 flex flex-col">
					<div className="flex items-center gap-2 mb-2 bg-[#FFF4EE] rounded-full py-2 px-4 w-fit">
						<div className="w-6 h-6 rounded-full flex items-center justify-center">
							<Image
								src={getProjectTypeIcon(project.projectDetails.projectType)}
								alt={project.projectDetails.projectType}
								width={20}
								height={20}
							/>
						</div>
						<span className="text-sm font-normal">
							{project.projectDetails.projectType}
						</span>
					</div>
					{/* Status and Title */}
					<div className="flex items-start justify-between mb-3">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-semibold mt-1">
								{project.projectDetails.projectName || project.projectId}
							</h3>
						</div>
						<div className="flex gap-1 mt-1">
							<span className="text-sm">{prefix}</span>
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${color} ${borderColor}`}
							>
								{label}
							</span>
						</div>
					</div>

					{/* Organization */}
					<div className="flex justify-between items-center mb-3">
						<div className="flex items-center">
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
						<div className="text-gray-500 text-sm">
							{getStatusTimeLabel(project.status)}{" "}
							<span className="text-gray-700">{formattedActionDate}</span>
						</div>
					</div>

					{/* Description */}
					<div className="border-b border-gray-200 mb-4">

					<p className="text-gray-600 mb-4 text-sm">{shortDescription}</p>
					</div>

					{/* Action Buttons - Now taking full width with flex-1 */}
					<div className="flex gap-3 mt-auto w-full">
						<RenderActionButtons
							project={{
								projectId: project.projectId,
								projectType: project.projectDetails.productType || "Unknown",
								status: project.status,
								interestId: project.interestId,
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
