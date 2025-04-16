"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatus } from "@/types/projects";
import { ProjectFormData } from "@/types/contestFormData";
import { Brand } from "@/types/user";

const ProjectDetailsPage: React.FC = () => {
	const params = useParams();
	const projectId = params?.projectId as string;

	const [brand, setBrand] = useState<Brand | null>(null);
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
					const response = await fetch(`/api/admin/project/${projectId}`);

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
				setLoading(true);

				// First try to get brand from localStorage (similar to BrandDetailsPage approach)
				const storedBrand = localStorage.getItem("viewingBrand");

				if (storedBrand) {
					setBrand(JSON.parse(storedBrand));
				} else {
					// If not in localStorage, fetch from API using the userId
					const response = await fetch(`/api/admin/brand/${project.userId}`);

					if (!response.ok) {
						throw new Error("Failed to fetch brand details");
					}

					const data = await response.json();
					setBrand(data.brand);
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
	}, [project]);

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
					brandEmail: brand?.email || "",
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
				text: "• Accepting Pitches",
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
		};

		const config = statusConfig[status] || statusConfig.pending;

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
			>
				{config.text}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-20">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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

			{/* Main project card */}
			<div className="overflow-hidden mb-6">
				{/* Project header with title and actions */}
				<div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center ">
					<div className="flex items-center mb-4 md:mb-0">
						<div className="flex gap-2">
							<h1 className="text-xl font-semibold text-gray-900">
								{project.projectDetails.projectName || "Unknown Project"}
							</h1>
							<div className="">
								<StatusBadge status={project.status} />
							</div>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
						{/* Show Activate Project button when status is pending or canceled */}
						{(project.status === "pending" ||
							project.status === "rejected") && (
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

						{/* Show Cancel Project button when status is active or pending */}
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

				{/* Project information section */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
					{/* Left column - Project details */}
					<div className="lg:col-span-2">
						<div className="rounded-xl border border-[#6670854D] p-6">
							<div className="space-y-6">
								<div>
									<p className="text-gray-500 mb-1">Project Type</p>
									<p className="text-black">
										{project.projectDetails.productType}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Project Description</p>
									<p className="text-black">
										{project.projectDetails.projectDescription}
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
									<div>
										<p className="text-gray-500 mb-1">Content Type</p>
										<p className="text-black">
											{project.projectRequirements.contentType ||
												"Not specified"}
										</p>
									</div>

									<div>
										<p className="text-gray-500 mb-1">Video Type</p>
										<p className="text-black">
											{project.projectRequirements.videoType || "Not specified"}
										</p>
									</div>

									<div>
										<p className="text-gray-500 mb-1">Aspect Ratio</p>
										<p className="text-black">
											{project.projectRequirements.aspectRatio ||
												"Not specified"}
										</p>
									</div>

									<div>
										<p className="text-gray-500 mb-1">Client&apos;s Script</p>
										<p className="text-black">
											{project.projectRequirements.script ||
												"No script provided"}
										</p>
									</div>
								</div>

								{project.projectRequirements.contentLinks &&
									project.projectRequirements.contentLinks.length > 0 && (
										<div>
											<p className="text-gray-500 mb-1">
												Links of Content you like
											</p>
											<div className="text-orange-500">
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
									<div>
										<p className="text-gray-500 mb-1">Brand Assets</p>
										<a
											href={project.projectRequirements.brandAssets}
											target="_blank"
											rel="noopener noreferrer"
											className="text-orange-500 hover:underline"
										>
											{project.projectRequirements.brandAssets}
										</a>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Right column - Brand info and cost */}
					<div className="lg:col-span-1">
						{/* Brand info card */}
						<div className="rounded-xl border border-[#6670854D] p-6 mb-6">
							{/* <div className="flex items-center mb-4">
                {project..brandLogoUrl ? (
                  <Image
                    src={project.brandLogoUrl}
                    alt={`${project.brandName} logo`}
                    width={40}
                    height={40}
                    className="rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xs font-bold">
                      {project.brandName?.substring(0, 2).toUpperCase() || "BR"}
                    </span>
                  </div>
                )}
                <p className="font-semibold">{project.brandName || ""}</p>
              </div> */}

							<div className="space-y-4">
								<div>
									<p className="text-gray-500 mb-1">Published On</p>
									<p className="text-black">
										{new Date(project.createdAt).toISOString().split("T")[0]}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Product Type</p>
									<p className="text-black">
										{project.projectDetails.productType || ""}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Number of Videos</p>
									<p className="text-black">
										{project.creatorPricing.totalVideos || ""} Videos
									</p>
								</div>
							</div>
						</div>

						{/* Cost breakdown card */}
						<div className="rounded-xl border border-[#6670854D] p-6">
							<h2 className="font-semibold mb-4">Cost Breakdown</h2>

							<div className="space-y-4">
								<div>
									<p className="text-gray-500 mb-1">Total Budget</p>
									<p className="text-black font-semibold">
										$
										{project.creatorPricing.totalBudget?.toLocaleString() || ""}
									</p>
									<p className="text-gray-500 text-sm">
										(Based on $1,500 per video × 4 videos)
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Extras</p>
									<p className="text-black">
										${project.creatorPricing.extrasTotal}
									</p>
									<div className="text-gray-500 text-sm">
										<p>
											Music - {project.creatorPricing.extras.musicPrice} ×{" "}
											{project.creatorPricing.totalVideos} Videos ={" "}
											{project.creatorPricing.extras.musicTotal}
										</p>
										<p>
											Raw Files - {project.creatorPricing.extras.rawFilesPrice}{" "}
											× {project.creatorPricing.totalVideos} Videos ={" "}
											{project.creatorPricing.extras.rawFilesTotal}
										</p>
									</div>
								</div>

								<div className="pt-4 border-t border-gray-200">
									<div className="flex justify-between items-center">
										<p className="font-semibold">Total Amount:</p>
										<p className="font-bold text-xl">
											$
											{(
												project.creatorPricing.totalAmount || ""
											).toLocaleString()}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Target audience info */}
						<div className="rounded-xl border border-[#6670854D] p-6 mt-6">
							<h2 className="font-semibold mb-4">Target Audience</h2>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-gray-500 mb-1">Age Group</p>
									<p className="text-black">
										{project.creatorPricing.creator.ageGroup || ""}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Gender</p>
									<p className="text-black">
										{project.creatorPricing.creator.gender || ""}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Industry</p>
									<p className="text-black">
										{project.creatorPricing.creator.industry || ""}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">Language</p>
									<p className="text-black">
										{project.creatorPricing.creator.language || ""}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1">No of Creators</p>
									<p className="text-black">
										{project.creatorPricing.creatorCount || ""} Creators
									</p>
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
