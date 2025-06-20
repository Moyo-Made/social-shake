"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatus } from "@/types/projects";
import { ProjectFormData } from "@/types/contestFormData";
import { BrandProfile } from "@/types/user";
import Image from "next/image";
import { topLanguages } from "@/types/languages";

const ProjectDetailsPage: React.FC = () => {
	const params = useParams();
	const projectId = params?.projectId as string;

	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [brandEmail, setBrandEmail] = useState<string>("");

	const [project, setProject] = useState<ProjectFormData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// For action modals
	const [showModal, setShowModal] = useState(false);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");

	useEffect(() => {
		console.log("Current project status:", project?.status);
	}, [project]);

	// Fetch project details
	useEffect(() => {
		const fetchProjectDetails = async () => {
			try {
				setLoading(true);

				// In a real app, you'd fetch from API
				// For this example, we'll get from localStorage (simulating navigation from the list)
				const storedProject = localStorage.getItem("viewingProject");

				if (storedProject) {
					setProject(JSON.parse(storedProject));
				} else {
					// If not in localStorage, fetch from API
					const response = await fetch(
						`/api/admin/project-approval/${projectId}`
					);

					if (!response.ok) {
						throw new Error("Failed to fetch project details");
					}

					const data = await response.json();
					setProject(data.project);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
				console.error("Error fetching project details:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchProjectDetails();
	}, [projectId]);

	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!project || !project.userId) {
				console.error("Project or project userId not available");
				return;
			}

			try {
				// Skip if we already have this brand profile
				if (brandProfile && brandProfile.userId === project.userId) {
					return;
				}

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
				}
			} catch (err) {
				console.error("Error fetching brand profile:", err);
				setError(
					err instanceof Error
						? err.message
						: "An error occurred fetching brand"
				);
			} finally {
				setLoading(false);
			}
		};

		if (project) {
			fetchBrandProfile();
		}
	}, [project, brandProfile]);

	// Handle project action (approve, cancel, etc.)
	const handleProjectAction = async () => {
		if (!project || !actionType) return;

		try {
			const response = await fetch("/api/admin/project-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					projectId: projectId,
					action: actionType,
					message: actionMessage,
					brandEmail: brandEmail || brandProfile?.email || "",
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Update local project state to reflect the action
			let newStatus: ProjectStatus;

			switch (actionType) {
				case "pending":
					newStatus = "pending" as ProjectStatus;
					break;
				case "activate":
					newStatus = "active" as ProjectStatus;
					break;
				case "completed":
					newStatus = "completed" as ProjectStatus;
					break;
				case "rejected":
					newStatus = "rejected" as ProjectStatus;
					break;
				case "request_edit":
					newStatus = "request_edit" as ProjectStatus;
					break;
				default:
					newStatus = project.status as ProjectStatus;
			}

			setProject({
				...project,
				status: newStatus,
			});

			// Reset action state
			setShowModal(false);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing project action:", err);
		}
	};

	// Render action modal
	const renderActionModal = () => {
		if (!showModal) return null;

		let title = "";
		let description = "";
		let placeholder = "";
		let buttonText = "";
		let buttonColor = "";
		let needsMessage = false;

		switch (actionType) {
			case "activate":
				title = "Activate Project";
				description =
					"Once activated, the project will be visible to creators and can receive submissions";
				buttonText = "Yes, Activate Project";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "completed":
				title = "Mark as Completed";
				description = "This will mark the project as completed. Are you sure?";
				buttonText = "Mark as Completed";
				buttonColor = "bg-blue-600 hover:bg-blue-700";
				break;
			case "rejected":
				title = "Reject Project";
				description =
					"Please provide a reason for cancellation. This feedback will be shared with the Brand.";
				placeholder = "Type Reason for Cancellation";
				buttonText = "Reject Project";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			default:
				return null;
		}

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-xl p-6 max-w-md w-full">
					<h2 className="text-xl font-semibold mb-4">{title}</h2>
					<p className="mb-4 text-gray-600">{description}</p>

					{needsMessage && (
						<Input
							className="w-full border border-gray-300 rounded p-2 mb-4"
							value={actionMessage}
							onChange={(e) => setActionMessage(e.target.value)}
							placeholder={placeholder}
						/>
					)}

					<div className="flex justify-end space-x-2">
						<button
							className="px-4 py-2 text-[#667085]"
							onClick={() => {
								setShowModal(false);
								setActionType("");
								setActionMessage("");
							}}
						>
							Cancel
						</button>
						<button
							className={`px-4 py-2 text-white text-sm rounded-lg ${buttonColor} flex items-center`}
							onClick={handleProjectAction}
							disabled={needsMessage && !actionMessage.trim()}
						>
							{buttonText}
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: ProjectStatus }) => {
		const statusConfig = {
			active: {
				color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
				text: "✓ Accepting Pitches",
			},
			completed: {
				color: "bg-[#EEF4FF] border border-[#A1B3F7] text-[#3538CD]",
				text: "✓ Completed",
			},
			pending: {
				color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
				text: "• Pending",
			},
			rejected: {
				color: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]",
				text: "• Rejected",
			},
			request_edit: {
				color: "bg-[#FFF7ED] border border-[#FBBF24] text-[#FBBF24]",
				text: "• Request Edit",
			},
			invite: {
				color: "bg-[#E0F2FE] border border-[#0EA5E9] text-[#0EA5E9]",
				text: "• Inviting Creators",
			},
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig["pending"];

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
			>
				{config.text}
			</span>
		);
	};

	// Helper function to get creator details based on selection method
	const getCreatorDetails = () => {
		if (!project) return null;

		const selectionMethod = project.creatorPricing.selectionMethod;

		// Only show specific creators if the selection method explicitly says so
		if (selectionMethod === "Invite Specific Creators") {
			const selectedCreators = project.creatorPricing.selectedCreators || [];
			return {
				type: "specific",
				creators: selectedCreators,
				totalVideos: project.creatorPricing.totalVideos,
				totalBudget: project.creatorPricing.totalBudget,
				totalAmount: project.creatorPricing.totalAmount,
			};
		} else {
			// For all other cases (including "Post Public Brief"), show criteria
			const creator = project.creatorPricing.creator || project.creatorPricing;
			return {
				type: "criteria",
				ageGroup: creator.ageGroup || "Not specified",
				gender: creator.gender || "Not specified",
				industry: creator.industry || "Not specified",
				language: creator.language || "Not specified",
				countries: creator.countries || [],
				creatorCount: project.creatorPricing.creatorCount,
				videosPerCreator: project.creatorPricing.videosPerCreator,
				totalVideos: project.creatorPricing.totalVideos,
				budgetPerVideo: project.creatorPricing.budgetPerVideo,
				totalBudget: project.creatorPricing.totalBudget,
				totalAmount: project.creatorPricing.totalAmount,
			};
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-20 h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="p-6 w-full mx-auto">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error || "Project not found"}
				</div>
				<div className="mt-4">
					<Link
						href="/admin/campaigns/projects"
						className="text-orange-600 hover:underline"
					>
						&larr; Back to Projects
					</Link>
				</div>
			</div>
		);
	}

	const creatorDetails = getCreatorDetails();

	return (
		<div className="bg-white p-6 w-full mx-auto">
			{/* Back button */}
			<div className="mb-4">
				<Link
					href="/admin/campaigns/projects"
					className="text-gray-600 hover:text-gray-800 flex items-center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-2"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
							clipRule="evenodd"
						/>
					</svg>
					All Projects
				</Link>
			</div>

			{/* Project header with title and status */}
			<div className="flex flex-col md:flex-row justify-between items-start mb-6">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold text-gray-900">
						{project.projectDetails.projectName || "Unknown Project"}
					</h1>
					<StatusBadge status={project.status} />
				</div>

				{/* Action buttons */}
				<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
					{/* Show Activate Project button when status is pending or rejected */}
					{(project.status === "pending" || project.status === "rejected") && (
						<Button
							className="px-5 bg-[#067647] text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
							onClick={() => {
								setActionType("activate");
								setShowModal(true);
							}}
						>
							Activate Project
						</Button>
					)}

					{/* Show Complete Project button when status is active */}
					{project.status === "active" && (
						<Button
							className="px-6 bg-[#3538CD] text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
							onClick={() => {
								setActionType("completed");
								setShowModal(true);
							}}
						>
							Mark as Completed
						</Button>
					)}

					{/* Show Reject Project button when status is active or pending */}
					{(project.status === "active" || project.status === "pending") && (
						<Button
							className="px-6 bg-[#E61A1A] text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
							onClick={() => {
								setActionType("rejected");
								setShowModal(true);
							}}
						>
							Reject Project
						</Button>
					)}
				</div>
			</div>

			{/* Main content - Two column layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left column - Project details */}
				<div className="lg:col-span-2">
					{/* Project details in row layout */}
					<div className="mb-6">
						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
							<div className="font-medium text-gray-500">Selection Method</div>
							<div className="md:col-span-2">
								{project.creatorPricing.selectionMethod}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
							<div className="font-medium text-gray-500">Project Type</div>
							<div className="md:col-span-2">
								{project.projectDetails.projectType}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
							<div className="font-medium text-gray-500">
								Project Description
							</div>
							<div className="md:col-span-2">
								{project.projectDetails.projectDescription}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2 ">
							<div className="font-medium text-gray-500">Content Type</div>
							<div className="md:col-span-2">
								{(() => {
									const contentType = project.projectRequirements.contentType;
									const contentTypeMap = {
										"product-showcase": "Product Showcase",
										testimonials: "Testimonials",
										tutorials: "Tutorials",
										"trend-participation": "Trend Participation",
									};
									return (
										contentTypeMap[
											contentType as keyof typeof contentTypeMap
										] ||
										contentType ||
										"Not specified"
									);
								})()}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
							<div className="font-medium text-gray-500">Product Type</div>
							<div className="md:col-span-2">
								{project.projectDetails.productType || "Not specified"}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2 ">
							<div className="font-medium text-gray-500">Video Type</div>
							<div className="md:col-span-2">
								{(() => {
									const videoType = project.projectRequirements.videoType;
									const videoTypeMap = {
										"client-script": "Client's Script",
										"creator-script": "Creator's Script",
									};
									return (
										videoTypeMap[videoType as keyof typeof videoTypeMap] ||
										videoType ||
										"Not specified"
									);
								})()}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
							<div className="font-medium text-gray-500">Aspect Ratio</div>
							<div className="md:col-span-2">
								{project.projectRequirements.aspectRatio || "Not specified"}
							</div>
						</div>

						{project.projectRequirements.script && (
							<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
								<div className="font-medium text-gray-500">
									Client&apos;s Script
								</div>
								<div className="md:col-span-2">
									{project.projectRequirements.script}
								</div>
							</div>
						)}

						{project.projectRequirements.contentLinks &&
							project.projectRequirements.contentLinks.length > 0 && (
								<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2">
									<div className="font-medium text-gray-500">
										Links of Content you like
									</div>
									<div className="md:col-span-2 text-orange-500">
										{project.projectRequirements.contentLinks.map(
											(link, index) => (
												<a
													key={index}
													href={link}
													target="_blank"
													rel="noopener noreferrer"
													className="block hover:underline mb-1"
												>
													{link}
												</a>
											)
										)}
									</div>
								</div>
							)}

						{project.projectRequirements.brandAssets && (
							<div className="grid grid-cols-1 md:grid-cols-3 mb-4">
								<div className="font-medium text-gray-500">Brand Assets</div>
								<div className="md:col-span-2">
									<a
										href={project.projectRequirements.brandAssets}
										target="_blank"
										rel="noopener noreferrer"
										className="text-orange-500 hover:underline"
									>
										{project.projectRequirements.brandAssets}
									</a>
								</div>
							</div>
						)}

						{/* Creator Requirements Section */}
						<div className="mt-8 mb-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								{creatorDetails?.type === "specific"
									? "Selected Creators"
									: "Creator Requirements"}
							</h3>

							{creatorDetails?.type === "specific" ? (
								// Show selected creators
								<div className="space-y-4">
									{creatorDetails.creators?.map(
										(
											creator: {
												id: string;
												avatar: string;
												name: string;
												pricing: {
													oneVideo: number;
													threeVideos: number;
													fiveVideos: number;
													bulkVideos: number;
												};
											},
											index: number
										) => (
											<div
												key={creator.id || index}
												className="border rounded-lg p-4"
											>
												<div className="flex items-center mb-3">
													<Image
														src={creator.avatar || "/default-avatar.png"}
														alt={creator.name}
														width={40}
														height={40}
														className="w-10 h-10 rounded-full mr-3"
													/>
													<div>
														<h4 className="font-medium">{creator.name}</h4>
														<p className="text-sm text-gray-500">
															Creator ID: {creator.id}
														</p>
													</div>
												</div>
												<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
													<div>
														<p className="text-gray-500">Per Video</p>
														<p className="font-medium">
															${creator.pricing?.oneVideo || 0}
														</p>
													</div>
													<div>
														<p className="text-gray-500">3 Videos</p>
														<p className="font-medium">
															${creator.pricing?.threeVideos || 0}
														</p>
													</div>
													<div>
														<p className="text-gray-500">5 Videos</p>
														<p className="font-medium">
															${creator.pricing?.fiveVideos || 0}
														</p>
													</div>
													<div>
														<p className="text-gray-500">Bulk Rate</p>
														<p className="font-medium">
															${creator.pricing?.bulkVideos || 0}
														</p>
													</div>
												</div>
											</div>
										)
									)}
								</div>
							) : (
								// Show creator criteria for public briefs
								<div>
									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="font-medium text-gray-500">Age Group</p>
										<p className="text-black capitalize">
											{(() => {
												const ageGroup = creatorDetails?.ageGroup;
												const ageGroupMap = {
													"18-24": "18-24 years",
													"25-34": "25-34 years",
													"35-44": "35-44 years",
													"45+": "45+ years",
												};
												return (
													ageGroupMap[ageGroup as keyof typeof ageGroupMap] ||
													ageGroup ||
													"Not specified"
												);
											})()}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">Gender</p>
										<p className="text-black">
											{(() => {
												const genderType = creatorDetails?.gender;
												const genderTypeMap = {
													male: "Male",
													female: "Female",
													any: "Any",
												};
												return (
													genderTypeMap[
														genderType as keyof typeof genderTypeMap
													] ||
													genderType ||
													"Not specified"
												);
											})()}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">Industry</p>
										<p className="text-black capitalize">
											{creatorDetails?.industry || "Not specified"}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">Language</p>
										<p className="text-black capitalize">
											{(() => {
												const language = creatorDetails?.language;
												const foundLanguage = topLanguages.find(
													(lang) => lang.code === language
												);
												return (
													foundLanguage?.name || language || "Not specified"
												);
											})()}
										</p>
									</div>

									{creatorDetails?.countries &&
										creatorDetails.countries.length > 0 && (
											<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
												<p className="text-gray-500 ">Target Countries</p>
												<p className="text-black capitalize">
													{creatorDetails.countries.join(", ")}
												</p>
											</div>
										)}

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">No of Creators</p>
										<p className="text-black">
											{`${creatorDetails?.creatorCount || 0} ${creatorDetails?.creatorCount === 1 ? "Creator" : "Creators"}`}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">Videos per Creator</p>
										<p className="text-black">
											{`${creatorDetails?.videosPerCreator || 0} ${creatorDetails?.videosPerCreator === 1 ? "Video" : "Videos"}`}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 text-gray-500 mb-4">
										<p className="text-gray-500">Budget per Video</p>
										<p className="text-black">
											${creatorDetails?.budgetPerVideo || 0}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right column - Brand and cost information */}
				<div className="lg:col-span-1">
					{/* Brand info card */}
					<div className="rounded-xl border border-[#FFBF9B] p-6 mb-6">
						<div className="flex items-center mb-4">
							<Image
								src={brandProfile?.logoUrl || "/projects/brand-logo.png"}
								alt="Brand Logo"
								width={32}
								height={32}
								className="w-8 h-8 rounded-full mr-2"
							/>
							<p className="font-semibold">
								{brandProfile?.brandName || "Unknown Brand"}
							</p>
						</div>

						<div className="space-y-4">
							<div>
								<p className="text-gray-500 mb-1">Published On</p>
								<p className="text-black">
									{project.createdAt
										? new Date(
												typeof project.createdAt === "object" &&
												"_seconds" in project.createdAt
													? project.createdAt._seconds * 1000
													: project.createdAt
											).toLocaleDateString()
										: "Unknown Date"}
								</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Product Type</p>
								<p className="text-black">
									{project.projectDetails.productType || "Not specified"}
								</p>
							</div>

							<div className="">
								<p className="text-gray-500 mb-1">Number of Videos</p>
								<p className="text-black">
									{creatorDetails?.totalVideos || 0} Videos
								</p>
							</div>
						</div>

						{/* Cost breakdown card */}
						<div className="rounded-xl bg-[#FFF4EE] mt-5 p-6">
							<h2 className="font-semibold mb-3">Cost Breakdown</h2>

							<div className="space-y-2">
								<div>
									<p className="text-gray-500 mb-1">Total Budget</p>
									<p className="text-black font-semibold">
										${(creatorDetails?.totalBudget || 0).toLocaleString()}
									</p>
									{creatorDetails?.type === "criteria" &&
										(creatorDetails?.budgetPerVideo ?? 0) > 0 && (
											<p className="text-gray-500 text-sm">
												(Based on ${creatorDetails.budgetPerVideo} per video ×{" "}
												{creatorDetails.totalVideos} videos)
											</p>
										)}
								</div>

								<div className="pt-4 border-t border-gray-200">
									<div className="flex justify-between items-center">
										<p className="font-semibold">Total Amount:</p>
										<p className="font-bold text-xl">
											${(creatorDetails?.totalAmount || 0).toLocaleString()}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Action modals */}
			{renderActionModal()}
		</div>
	);
};

export default ProjectDetailsPage;
