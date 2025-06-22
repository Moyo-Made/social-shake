"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { BookmarkIcon } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Image from "next/image";

import { ProjectFormData } from "@/types/contestFormData";
import { useAuth } from "@/context/AuthContext";
import { BrandProfile } from "@/types/user";
import { ProjectStatus } from "@/types/projects";
import ApplyModal from "./available/ProjectApplyModal";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ProjectDetailPageProps {
	projectId: string;
	project: ProjectFormData;
}

// Fetch project data
const fetchProjectData = async (
	projectId: string
): Promise<ProjectFormData> => {
	const contestRef = doc(db, "projects", projectId.toString());
	const contestSnap = await getDoc(contestRef);

	if (contestSnap.exists()) {
		return contestSnap.data() as ProjectFormData;
	} else {
		throw new Error("Project not found");
	}
};

// Fetch brand profile
const fetchBrandProfile = async (userId: string): Promise<BrandProfile> => {
	const response = await fetch(`/api/admin/brand-approval?userId=${userId}`);

	if (response.ok) {
		return await response.json();
	} else {
		throw new Error("Error fetching brand profile");
	}
};

// Check if applied
const checkApplicationStatus = async (userId: string, projectId: string) => {
	const response = await fetch(
		`/api/projects/check-applied?userId=${userId}&projectId=${projectId}`
	);
	if (response.ok) {
		return await response.json();
	}
	throw new Error("Failed to check application status");
};

// Check if saved
const checkSavedStatus = async (userId: string, projectId: string) => {
	const response = await fetch(
		`/api/projects/check-saved?userId=${userId}&projectId=${projectId}`
	);
	if (response.ok) {
		return await response.json();
	}
	throw new Error("Failed to check saved status");
};

// Toggle saved status
const toggleSavedStatus = async (data: {
	userId: string;
	projectId: string;
	currentSavedState: boolean;
	interestId: string | null;
}) => {
	const response = await fetch("/api/projects/toggle-saved", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (response.ok) {
		return await response.json();
	}
	throw new Error("Failed to toggle saved status");
};

export default function ProjectDetails({
	projectId,
	project,
}: ProjectDetailPageProps) {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

	// Project data query
	const {
		data: projectData,
		isLoading: loading,
		error,
	} = useQuery({
		queryKey: ["project", projectId],
		queryFn: () => fetchProjectData(projectId),
		enabled: !project && !!projectId, // Only fetch if not passed as prop
		initialData: project || undefined,
		staleTime: 5 * 60 * 1000,
	});

	// Brand profile query
	const { data: brandProfile, isLoading: brandLoading } = useQuery({
		queryKey: ["brandProfile", projectData?.userId],
		queryFn: () => fetchBrandProfile(projectData!.userId),
		enabled: !!projectData?.userId,
		staleTime: 10 * 60 * 1000,
	});

	// Application status query
	const { data: applicationData } = useQuery({
		queryKey: ["applicationStatus", currentUser?.uid, projectId],
		queryFn: () => checkApplicationStatus(currentUser!.uid, projectId),
		enabled: !!currentUser?.uid && !!projectId,
		staleTime: 2 * 60 * 1000,
	});

	const hasApplied = applicationData?.hasApplied || false;
	const applicationStatus = applicationData?.applicationStatus || "pending";

	// Saved status query
	const { data: savedData } = useQuery({
		queryKey: ["savedStatus", currentUser?.uid, projectId],
		queryFn: () => checkSavedStatus(currentUser!.uid, projectId),
		enabled: !!currentUser?.uid && !!projectId,
		staleTime: 2 * 60 * 1000,
	});

	const isSaved = savedData?.isSaved || false;
	const interestId = savedData?.interestId || null;

	const toggleSavedMutation = useMutation({
		mutationFn: toggleSavedStatus,
		onSuccess: () => {
			// Invalidate and refetch saved status
			queryClient.invalidateQueries({
				queryKey: ["savedStatus", currentUser?.uid, projectId],
			});
		},
	});

	const toggleSaved = () => {
		if (!currentUser?.uid || !projectId) return;

		toggleSavedMutation.mutate({
			userId: currentUser.uid,
			projectId,
			currentSavedState: isSaved,
			interestId,
		});
	};

	const saveLoading = toggleSavedMutation.isPending;

	const openApplyModal = () => {
		setIsApplyModalOpen(true);
	};

	const closeApplyModal = () => {
		setIsApplyModalOpen(false);
	};

	// Format date for display
	const formatDate = (
		dateInput?: string | { _seconds: number } | Date
	): string => {
		if (!dateInput) return "Not Set";
		let date: Date;
		if (dateInput instanceof Date) {
			date = dateInput;
		} else if (typeof dateInput === "object" && "_seconds" in dateInput) {
			date = new Date(dateInput._seconds * 1000);
		} else {
			date = new Date(dateInput);
		}
		return date instanceof Date && !isNaN(date.getTime())
			? date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Not Set";
	};

	// Handle application success
	const handleApplySuccess = async () => {
		// Invalidate application status to refetch
		queryClient.invalidateQueries({
		  queryKey: ["applicationStatus", currentUser?.uid, projectId]
		});
	  };

	if (loading) {
		return (
			<div className="flex-col mx-auto my-5 flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading project details...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container px-4 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 flex justify-center items-center h-64">
				<p className="text-red-500">{error instanceof Error ? error.message : String(error)}</p>
			</div>
		);
	}

	// Extract contest details from fetched data
	const projectTitle =
		projectData?.projectDetails.projectName || "Untitled Contest";
	const projectStatus = projectData?.status || ProjectStatus.ACTIVE;
	// const paymentPerVideo = projectData?.creatorPricing.budgetPerVideo || 0;
	const publishedDate = formatDate(projectData?.createdAt);
	const projectType =
		projectData?.projectDetails.projectType || "Not specified";
	const productLink =
		projectData?.projectDetails.productLink || "Not specified";
	const description =
		projectData?.projectDetails.projectDescription ||
		"No description provided.";
	const contentType =
		projectData?.projectRequirements.contentType || "Not specified";
	const videoType =
		projectData?.projectRequirements.videoType || "Not specified";
	const aspectRatio =
		projectData?.projectRequirements.aspectRatio || "Not specified";
	const clientScript =
		projectData?.projectRequirements.script || "No script provided.";
	const productType =
		projectData?.projectDetails.productType || "Not specified";
	const numberOfVideos = projectData?.creatorPricing.videosPerCreator || 0;
	const fixedFeePerVideo = projectData?.creatorPricing.cost.budgetPerVideo;
	const commissionSale =
		projectData?.creatorPricing.cost.commissionPerSale || 0;

	// Get the status display properties
	const getStatusDisplay = (status: string) => {
		switch (status) {
			case ProjectStatus.ACTIVE:
				return {
					text: "• Ongoing Project",
					className: "bg-pink-100 border border-pink-400 text-pink-500",
				};
			case ProjectStatus.COMPLETED:
				return {
					text: "✓ Completed",
					className: "bg-green-100 text-green-500",
				};
			case ProjectStatus.PENDING:
				return {
					text: "• Pending",
					className: "bg-yellow-100 text-yellow-500",
				};
			case ProjectStatus.REJECTED:
				return { text: "• Rejected", className: "bg-red-100 text-red-500" };
			case ProjectStatus.REQUEST_EDIT:
				return {
					text: "Edits Requested",
					className: "bg-blue-100 text-blue-500",
				};
			default:
				return {
					text: "• Ongoing Project",
					className: "bg-pink-100 text-pink-500",
				};
		}
	};

	const statusDisplay = getStatusDisplay(projectStatus);

	return (
		<div className="px-3 sm:px-4 lg:px-5 py-4 sm:py-6 w-full md:w-[70rem] min-h-[80vh] bg-white border border-[#FFD9C3] rounded-lg mx-auto my-3 sm:my-5 relative">
			{/* Back Navigation */}
			<div className="mb-4 sm:mb-5">
				<Link
					href="/creator/dashboard/project/all"
					className="flex items-center gap-2 text-sm sm:text-base"
				>
					&larr; <p className="hover:underline">Back to Available Projects</p>
				</Link>
			</div>

			{/* Title and Status */}
			<div className="mb-4 sm:mb-6">
				<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start">
					<h1 className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
						{projectTitle}
					</h1>
					<span
						className={`px-2 py-0.5 mt-1.5 rounded-full text-xs whitespace-nowrap ${statusDisplay.className}`}
					>
						{statusDisplay.text}
					</span>
				</div>
			</div>

			{/* Main Content Layout */}
			<div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
				{/* Main Content Column */}
				<div className="flex-1 min-w-0">
					{/* Mobile Project Card */}
					<div className="xl:hidden mb-4 sm:mb-6">
						<Card className="bg-white border border-[#FFBF9B] shadow-none p-4 w-full">
							{/* Brand Info */}
							<div className="flex items-center gap-2 mb-4">
								{brandLoading ? (
									<div className="flex items-center">
										<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
											<div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full"></div>
										</div>
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
									</div>
								) : (
									<div className="flex items-center w-full">
										{brandProfile?.logoUrl ? (
											<Image
												className="h-8 w-8 rounded-full mr-2 object-cover flex-shrink-0"
												src={brandProfile.logoUrl}
												alt={brandProfile.brandName || "Brand"}
												width={32}
												height={32}
											/>
										) : (
											<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
												<span className="text-xs text-gray-500">
													{brandProfile?.brandName?.charAt(0) || "B"}
												</span>
											</div>
										)}
										<p className="text-sm font-medium truncate">
											{brandProfile?.brandName || "Unknown Brand"}
										</p>
									</div>
								)}
							</div>

							{/* Project Details Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/dateIcon.svg"
										alt="Date"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Published On</p>
										<span className="text-black font-normal text-sm">
											{publishedDate}
										</span>
									</div>
								</div>

								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/productType.svg"
										alt="Product Type"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Product Type</p>
										<span className="text-black font-normal text-sm">
											{productType}
										</span>
									</div>
								</div>

								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/videos.svg"
										alt="Videos"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Number of Videos</p>
										<span className="text-black font-normal text-sm">
											{numberOfVideos}
										</span>
									</div>
								</div>

								{/* Payment Information */}
								{/* {(projectType === "UGC Content Only" ||
									projectType === "Creator-Posted UGC" ||
									projectType === "Spark Ads") && (
									<div className="flex gap-2 text-sm">
										<Image
											src="/icons/money.svg"
											alt="Money"
											width={20}
											height={20}
											className="flex-shrink-0"
										/>
										<div className="min-w-0">
											<p className="text-[#667085] text-xs">
												Payment Per Video
											</p>
											<span className="text-black font-normal text-sm">
												${paymentPerVideo}
											</span>
										</div>
									</div>
								)} */}

								{projectType === "TikTok Shop" && (
									<>
										<div className="flex gap-2 text-sm">
											<Image
												src="/icons/money.svg"
												alt="Money"
												width={20}
												height={20}
												className="flex-shrink-0"
											/>
											<div className="min-w-0">
												<p className="text-[#667085] text-xs">
													Fixed Fee Per Video
												</p>
												<span className="text-black font-normal text-sm">
													${fixedFeePerVideo}
												</span>
											</div>
										</div>

										<div className="flex gap-2 text-sm">
											<Image
												src="/icons/sales.svg"
												alt="Commission"
												width={20}
												height={20}
												className="flex-shrink-0"
											/>
											<div className="min-w-0">
												<p className="text-[#667085] text-xs">
													Commission Per Sale
												</p>
												<span className="text-black font-normal text-sm">
													${commissionSale}
												</span>
											</div>
										</div>
									</>
								)}
							</div>

							{/* Action Buttons */}
							<div className="space-y-2">
								<button
									onClick={hasApplied ? undefined : openApplyModal}
									disabled={hasApplied}
									className={`w-full py-2.5 px-4 text-sm font-medium rounded-md transition-colors ${
										hasApplied
											? applicationStatus === "approved"
												? "bg-green-500 cursor-not-allowed"
												: applicationStatus === "rejected"
													? "bg-red-500 cursor-not-allowed"
													: "bg-gray-400 cursor-not-allowed"
											: "bg-orange-500 hover:bg-orange-600"
									} text-white`}
								>
									{hasApplied
										? applicationStatus === "approved"
											? "Application Approved"
											: applicationStatus === "rejected"
												? "Application Rejected"
												: "Application Pending"
										: "Apply Now"}
								</button>

								<button
									onClick={toggleSaved}
									disabled={saveLoading}
									className="w-full flex justify-center items-center py-2.5 px-4 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
								>
									{saveLoading ? (
										<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									) : (
										<>
											<span>
												{isSaved ? "Unsave Project" : "Save for Later"}
											</span>
											<BookmarkIcon
												size={16}
												className={`ml-2 ${isSaved ? "fill-white" : ""}`}
											/>
										</>
									)}
								</button>
							</div>

							<ApplyModal
								isOpen={isApplyModalOpen}
								onClose={closeApplyModal}
								projectId={projectId}
								onSubmitSuccess={handleApplySuccess}
							/>
						</Card>
					</div>

					{/* Project Overview Content */}
					<div className="space-y-4 sm:space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
							<h3 className="text-sm sm:text-base text-[#667085] font-medium">
								Project Type
							</h3>
							<p className="lg:col-span-2 text-sm sm:text-base">
								{projectType}
							</p>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
							<h3 className="text-sm sm:text-base text-[#667085] font-medium">
								Project Description
							</h3>
							<p className="lg:col-span-2 text-sm sm:text-base leading-relaxed">
								{description}
							</p>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
							<h3 className="text-sm sm:text-base text-[#667085] font-medium">
								Content Type
							</h3>
							<p className="lg:col-span-2 text-sm sm:text-base capitalize">
								{contentType.replace(/-/g, " ")}
							</p>
						</div>

						{projectData?.projectDetails.projectType === "TikTok Shop" && (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
								<h3 className="text-sm sm:text-base text-[#667085] font-medium">
									Product Link
								</h3>
								<div className="lg:col-span-2">
									<Link
										href={productLink}
										target="_blank"
										rel="noopener noreferrer"
										className="text-orange-500 hover:underline text-sm sm:text-base break-all"
									>
										{productLink}
									</Link>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
							<h3 className="text-sm sm:text-base text-[#667085] font-medium">
								Video Type
							</h3>
							<p className="lg:col-span-2 text-sm sm:text-base capitalize">
								{videoType.replace(/-/g, " ")}
							</p>
						</div>

						{projectType === "UGC Content Only" && (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
								<h3 className="text-sm sm:text-base text-[#667085] font-medium">
									Aspect Ratio
								</h3>
								<p className="lg:col-span-2 text-sm sm:text-base">
									{aspectRatio}
								</p>
							</div>
						)}

						{/* Content Creation Guidance */}
						<div className="relative">
							{hasApplied ? (
								<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4">
									<h3 className="text-sm sm:text-base text-[#667085] font-medium">
										Client&apos;s Script
									</h3>
									<div className="lg:col-span-2 text-sm sm:text-base leading-relaxed">
										{clientScript}
									</div>
								</div>
							) : (
								<>
									<div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 border-b pb-3 sm:pb-4 filter blur-sm">
										<h3 className="text-sm sm:text-base text-[#667085] font-medium">
											Client&apos;s Script
										</h3>
										<div className="lg:col-span-2 text-sm sm:text-base leading-relaxed">
											{clientScript}
										</div>
									</div>

									{/* Overlay */}
									<div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 py-8 bg-white bg-opacity-80 rounded-lg">
										<div className="max-w-md">
											<h2 className="text-base sm:text-base font-bold mb-2 sm:mb-3 text-gray-800">
												Apply to the project, and once accepted, you&apos;ll
												unlock full details to get started!
											</h2>
											<Button
												onClick={openApplyModal}
												className="px-4 py-2 sm:px-5 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors text-sm sm:text-base font-medium"
											>
												Apply Now
											</Button>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Desktop Sidebar */}
				<div className="hidden xl:block xl:w-80 flex-shrink-0">
					<div className="sticky top-4">
						<Card className="bg-white border border-[#FFBF9B] shadow-none p-4">
							{/* Brand Info */}
							<div className="flex items-center gap-2 mb-4">
								{brandLoading ? (
									<div className="flex items-center w-full">
										<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
											<div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full"></div>
										</div>
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
									</div>
								) : (
									<div className="flex items-center w-full">
										{brandProfile?.logoUrl ? (
											<Image
												className="h-8 w-8 rounded-full mr-2 object-cover flex-shrink-0"
												src={brandProfile.logoUrl}
												alt={brandProfile.brandName || "Brand"}
												width={32}
												height={32}
											/>
										) : (
											<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
												<span className="text-xs text-gray-500">
													{brandProfile?.brandName?.charAt(0) || "B"}
												</span>
											</div>
										)}
										<p className="text-sm font-medium truncate">
											{brandProfile?.brandName || "Unknown Brand"}
										</p>
									</div>
								)}
							</div>

							{/* Project Details */}
							<div className="space-y-3 mb-4">
								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/dateIcon.svg"
										alt="Date"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Published On</p>
										<span className="text-black font-normal">
											{publishedDate}
										</span>
									</div>
								</div>

								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/productType.svg"
										alt="Product Type"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Product Type</p>
										<span className="text-black font-normal">
											{productType}
										</span>
									</div>
								</div>

								<div className="flex gap-2 text-sm">
									<Image
										src="/icons/videos.svg"
										alt="Videos"
										width={20}
										height={20}
										className="flex-shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-[#667085] text-xs">Number of Videos</p>
										<span className="text-black font-normal">
											{numberOfVideos} {numberOfVideos > 1 ? "Videos" : "Video"}
										</span>
									</div>
								</div>

								{/* {(projectType === "UGC Content Only" ||
									projectType === "Creator-Posted UGC" ||
									projectType === "Spark Ads") && (
									<div className="flex gap-2 text-sm">
										<Image
											src="/icons/money.svg"
											alt="Money"
											width={20}
											height={20}
											className="flex-shrink-0"
										/>
										<div className="min-w-0">
											<p className="text-[#667085] text-xs mb-1">
												Payment Per Video
											</p>
											<span className="text-black font-normal">
												${paymentPerVideo}
											</span>
										</div>
									</div>
								)} */}

								{projectType === "TikTok Shop" && (
									<>
										<div className="flex gap-2 text-sm">
											<Image
												src="/icons/money.svg"
												alt="Money"
												width={20}
												height={20}
												className="flex-shrink-0"
											/>
											<div className="min-w-0">
												<p className="text-[#667085] text-xs mb-1">
													Fixed Fee Per Video
												</p>
												<span className="text-black font-normal">
													${fixedFeePerVideo}
												</span>
											</div>
										</div>

										<div className="flex gap-2 text-sm">
											<Image
												src="/icons/sales.svg"
												alt="Commission"
												width={20}
												height={20}
												className="flex-shrink-0"
											/>
											<div className="min-w-0">
												<p className="text-[#667085] text-xs mb-1">
													Commission Per Sale
												</p>
												<span className="text-black font-normal">
													{commissionSale}%
												</span>
											</div>
										</div>
									</>
								)}
							</div>

							{/* Action Buttons */}
							<div className="space-y-2">
								<button
									onClick={hasApplied ? undefined : openApplyModal}
									disabled={hasApplied}
									className={`w-full py-2.5 px-4 text-sm font-medium rounded-md transition-colors ${
										hasApplied
											? applicationStatus === "approved"
												? "bg-green-500 cursor-not-allowed"
												: applicationStatus === "rejected"
													? "bg-red-500 cursor-not-allowed"
													: "bg-gray-400 cursor-not-allowed"
											: "bg-orange-500 hover:bg-orange-600"
									} text-white`}
								>
									{hasApplied
										? applicationStatus === "approved"
											? "Application Approved"
											: applicationStatus === "rejected"
												? "Application Rejected"
												: "Application Pending"
										: "Apply Now"}
								</button>

								<button
									onClick={toggleSaved}
									disabled={saveLoading}
									className="w-full flex justify-center items-center py-2.5 px-4 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
								>
									{saveLoading ? (
										<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									) : (
										<>
											<span>
												{isSaved ? "Unsave Project" : "Save for Later"}
											</span>
											<BookmarkIcon
												size={16}
												className={`ml-2 ${isSaved ? "fill-white" : ""}`}
											/>
										</>
									)}
								</button>
							</div>
						</Card>
					</div>

					<ApplyModal
						isOpen={isApplyModalOpen}
						onClose={closeApplyModal}
						projectId={projectId}
						onSubmitSuccess={handleApplySuccess}
					/>
				</div>
			</div>
		</div>
	);
}
