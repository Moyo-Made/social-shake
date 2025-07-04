"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectFormData } from "@/types/contestFormData";
import { getStatusStyle } from "@/utils/statusUtils";
import ProjectSubmissions from "./ProjectSubmissions";
import ProductDelivery from "./ProductDelivery";
import Image from "next/image";
import ProjectApplications from "./ProjectApplications";
import { CreatorSubmission } from "@/types/submission";
import { ProjectFormProvider } from "../ProjectFormContext";
import { topLanguages } from "@/types/languages";
import { useQuery } from "@tanstack/react-query";

interface ProjectDetailPageProps {
	projectId: string;
}

// Query functions
const fetchProjectData = async (projectId: string): Promise<ProjectFormData> => {
	const projectRef = doc(db, "projects", projectId.toString());
	const projectSnap = await getDoc(projectRef);

	if (projectSnap.exists()) {
		return projectSnap.data() as ProjectFormData;
	} else {
		throw new Error("Project not found");
	}
};

const fetchSubmissions = async (projectId: string): Promise<CreatorSubmission[]> => {
	const response = await fetch(`/api/project-submissions?projectId=${projectId}`);

	if (!response.ok) {
		throw new Error(`Error fetching submissions: ${response.statusText}`);
	}

	const data = await response.json();

	if (data.success && data.submissions) {
		const basicSubmissions = data.submissions;

		// Transform the API response to match our Submission interface
		const transformedSubmissions = basicSubmissions.map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(submission: any, index: number) => ({
				id: submission.id,
				userId: submission.userId,
				projectId: submission.projectId,
				creatorName: submission.creatorName || "Creator",
				creatorIcon: submission.creatorIcon || "/placeholder-profile.jpg",
				videoUrl: submission.videoUrl || "/placeholder-video.jpg",
				videoNumber: submission.videoNumber || `#${index + 1}`,
				revisionNumber: submission.revisionNumber
					? `#${submission.revisionNumber}`
					: "",
				status: submission.status || "new",
				createdAt: new Date(submission.createdAt).toLocaleDateString(),
				sparkCode: submission.sparkCode || "",
			})
		);

		return transformedSubmissions;
	}

	return [];
};

const ProjectDetailPage = ({ projectId }: ProjectDetailPageProps) => {
	// TanStack Query for project data
	const {
		data: project,
		isLoading: projectLoading,
		error: projectError,
	} = useQuery({
		queryKey: ["project", projectId],
		queryFn: () => fetchProjectData(projectId),
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});

	// TanStack Query for submissions
	const {
		data: submissionsList = [],
		isLoading: submissionsLoading,
		error: submissionsError,
	} = useQuery({
		queryKey: ["submissions", projectId],
		queryFn: () => fetchSubmissions(projectId),
		enabled: !!projectId,
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: 2,
	});

	const isLoading = projectLoading || submissionsLoading;
	const error = projectError || submissionsError;

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<div className="text-center">Loading project details...</div>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="p-8 text-center text-red-500">
				{error instanceof Error ? error.message : "Project not available"}
			</div>
		);
	}

	const { projectDetails, projectRequirements, creatorPricing } = project;

	const getLanguageDisplayName = (languageCode: string | null) => {
		if (!languageCode) return "Not specified";
		const language = topLanguages.find((lang) => lang.code === languageCode);
		return language ? language.name : languageCode;
	};

	// Check if the product type is physical to determine whether to show the delivery tab
	const isPhysicalProduct = projectDetails.productType === "Physical";

	const tabTriggerStyles =
		"w-40 data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3";

	return (
		<ProjectFormProvider>
			<div className="flex flex-col bg-white border border-[#FFD9C3] rounded-lg py-5 px-6 mt-3">
				{/* Header Banner */}
				<div className="relative w-full h-64 p-6 flex flex-col justify-end rounded-lg">
					<Image
						src={
							typeof projectDetails.projectThumbnail === "string"
								? projectDetails.projectThumbnail
								: projectDetails.projectThumbnail
									? URL.createObjectURL(projectDetails.projectThumbnail)
									: ""
						}
						alt="Project thumbnail"
						fill
						sizes="100vw"
						className="object-cover z-0"
						priority={true}
					/>

					{/* Dark overlay to improve text visibility */}
					<div className="absolute inset-0 bg-black bg-opacity-40 z-1"></div>

					{/* Back Button */}
					<Link
						href="/brand/dashboard/projects"
						className="absolute top-4 left-6 flex items-center text-white hover:underline z-10"
					>
						<ChevronLeft size={20} />
						<span>All Projects</span>
					</Link>

					{/* Project Title & Stats */}
					<div className="relative z-10 mt-8">
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-2xl font-bold text-white drop-shadow-md">
								{projectDetails.projectName}
							</h1>
							<div
								className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusStyle(project.status).color}`}
							>
								{getStatusStyle(project.status).text}
							</div>
						</div>

						{/* Project Stats */}
						<div className="flex flex-wrap gap-4 w-fit text-sm bg-white bg-opacity-90 border border-[#FFD9C3] px-5 py-2 rounded-lg shadow-md">
							<div>
								<span className="text-[#FD5C02]">Project Budget:</span> $
								{creatorPricing.cost.totalBudget || 0}
							</div>
							{creatorPricing.selectionMethod === "Post Public Brief" && (
								<div>
									<div>
										<span className="text-[#FD5C02]">Creators Required:</span>{" "}
										{creatorPricing.creatorCount}{" "}
										{creatorPricing.creatorCount > 1 ? "Creators" : "Creator"}
									</div>
								</div>
							)}

							<div>
								<span className="text-[#FD5C02]">Project Type:</span>{" "}
								{projectDetails.projectType}
							</div>
							<div>
								<span className="text-[#FD5C02]">Product Type:</span>{" "}
								{projectDetails.productType === "Physical"
									? "Physical Product"
									: "Virtual Product"}
							</div>
							<div>
								<span className="text-[#FD5C02]">Submissions:</span>{" "}
								{submissionsList.length}{" "}
								{submissionsList.length !== 1 ? "Videos" : "Video"} •{" "}
								{
									submissionsList.filter((sub) => sub.status === "pending")
										.length
								}{" "}
								Pending
							</div>
						</div>
					</div>
				</div>

				{/* Tabs Navigation */}
				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="flex gap-6 mb-3 p-3 mt-6">
						<TabsTrigger value="overview" className={tabTriggerStyles}>
							Project Overview
						</TabsTrigger>
						<TabsTrigger value="applications" className={tabTriggerStyles}>
							Applications
						</TabsTrigger>
						<TabsTrigger value="submissions" className={tabTriggerStyles}>
							Submissions
						</TabsTrigger>
						{isPhysicalProduct && (
							<TabsTrigger
								value="product-delivery"
								className={tabTriggerStyles}
							>
								Product Delivery
							</TabsTrigger>
						)}

						{/* {projectDetails.projectType === "TikTok Shop" && (
							<>
								<TabsTrigger value="analytics" className={tabTriggerStyles}>
									Analytics
								</TabsTrigger>
								<TabsTrigger
									value="affiliate-payout"
									className={tabTriggerStyles}
								>
									Affiliates Payout
								</TabsTrigger>
							</>
						)} */}
					</TabsList>

					{/* Project Overview Tab */}
<TabsContent value="overview" className="w-full space-y-6 pl-4 pt-3">
	{/* Project Title */}
	<div className="flex gap-28">
		<p className="text-[#667085] font-normal w-40">Project Title:</p>
		<p>{projectDetails.projectName}</p>
	</div>

	{/* Project Type */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Project Type:</h3>
		<p>{projectDetails.projectType}</p>
	</div>

	{/* Product Type */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Product Type:</h3>
		<p>
			{projectDetails.productType === "Physical"
				? "Physical Product - A tangible item that will be shipped to creators"
				: "Virtual Product – A digital or online service that does not require shipping"}
		</p>
	</div>

	{/* Project Description */}
	<div className="flex gap-[8.5rem] w-full">
		<h3 className="text-[#667085] font-normal">
			Project Description:
		</h3>
		<p className="whitespace-pre-line max-w-2xl">
			{Array.isArray(projectDetails.projectDescription)
				? projectDetails.projectDescription.join("\n")
				: projectDetails.projectDescription}
		</p>
	</div>

	{/* Content Type */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Content Type:</h3>
		<p>
			{(() => {
				const contentType = projectRequirements.contentType;

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
		</p>
	</div>

	{/* Product Link */}
	{projectDetails.projectType === "TikTok Shop" && (
		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				Product Link:
			</h3>
			<Link
				href={projectDetails.productLink}
				target="_blank"
				rel="noopener noreferrer"
				className="text-orange-500 hover:underline"
			>
				{projectDetails.productLink}
			</Link>
		</div>
	)}

	{/* Duration */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Duration:</h3>
		<p>
			{projectRequirements.duration === ""
				? ""
				: projectRequirements.duration}
		</p>
	</div>

	{/* Video Type */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Video Type:</h3>
		<p>
			{(() => {
				const videoType = projectRequirements.videoType;

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
		</p>
	</div>

	{/* Aspect Ratio */}
	<div className="flex gap-28">
		<h3 className="text-[#667085] font-normal w-40">Aspect Ratio:</h3>
		<p>{projectRequirements.aspectRatio || ""}</p>
	</div>

	{/* Client's Script */}
	{projectRequirements.videoType === "client-script" &&
		projectRequirements.script && (
			<div className="flex gap-[10.7rem] w-full">
				<h3 className="text-[#667085] font-normal">
					Client&apos;s Script:
				</h3>
				<div className="whitespace-pre-line max-w-2xl">
					{projectRequirements.script}
				</div>
			</div>
		)}

	{/* Links of Content */}
	{projectRequirements.contentLinks &&
		projectRequirements.contentLinks.length > 0 && (
			<div className="flex gap-28">
				<h3 className="text-[#667085] font-normal w-40">
					Links of Content:
				</h3>
				<div className="space-y-1">
					{projectRequirements.contentLinks.map(
						(link, idx) =>
							link && (
								<a
									key={idx}
									href={link}
									target="_blank"
									rel="noopener noreferrer"
									className="block text-orange-500 hover:underline"
								>
									{link}
								</a>
							)
					)}
				</div>
			</div>
		)}

	{/* Brand Assets */}
	{projectRequirements.brandAssets && (
		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				Brand Assets:
			</h3>
			<a
				href={projectRequirements.brandAssets}
				target="_blank"
				rel="noopener noreferrer"
				className="text-orange-500 hover:underline"
			>
				{projectRequirements.brandAssets}
			</a>
		</div>
	)}

	{/* Creator Details - Dynamic based on selection method */}
	<div className="space-y-4">
		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				Selection Method:
			</h3>
			<p>{creatorPricing.selectionMethod || ""}</p>
		</div>

		{/* Show Selected Creators List for "Invite Specific Creators" */}
		{creatorPricing.selectionMethod === "Invite Specific Creators" && 
		 creatorPricing.selectedCreators && 
		 creatorPricing.selectedCreators.length > 0 && (
			<div className="space-y-4">
				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">
						Selected Creators:
					</h3>
					<div className="space-y-3">
						{creatorPricing.selectedCreators.map((creator, idx) => (
							<div key={creator.id || idx} className="flex items-center gap-3">
								<Image 
									src={creator.avatar} 
									alt={creator.name}
									className="w-10 h-10 rounded-full object-cover"
									width={40}
									height={40}
								/>
								<div>
									<p className="font-medium">{creator.name}</p>
									<p className="text-sm text-[#667085]">
										${creator.pricing?.oneVideo || 0} per video
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)}

		{/* Show Creator Criteria for "Post Public Brief" */}
		{creatorPricing.selectionMethod === "Post Public Brief" && (
			<>
				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">Age Group:</h3>
					<p className="capitalize">
						{creatorPricing.ageGroup === "all" ? "All Ages" : creatorPricing.ageGroup || ""}
					</p>
				</div>

				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">Gender:</h3>
					<p>
						{(() => {
							const genderType = creatorPricing.gender;

							const genderTypeMap = {
								male: "Male",
								female: "Female",
								all: "All Genders"
							};

							return (
								genderTypeMap[genderType as keyof typeof genderTypeMap] ||
								genderType ||
								"Not specified"
							);
						})()}
					</p>
				</div>

				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">
						Type of Industry:
					</h3>
					<p className="capitalize">
						{(() => {
							const industry = creatorPricing.creator?.industry || creatorPricing.industry;
							const industryMap = {
								"arts-culture": "Arts & Culture",
								"": "Any Industry"
							};
							
							return industryMap[industry as keyof typeof industryMap] || industry || "Any Industry";
						})()}
					</p>
				</div>

				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">Countries:</h3>
					<p className="capitalize">
						{(creatorPricing.creator?.countries?.length ?? 0) > 0 
							? creatorPricing.creator.countries?.join(", ")
							: "Any Country"}
					</p>
				</div>

				<div className="flex gap-28">
					<h3 className="text-[#667085] font-normal w-40">Language:</h3>
					<p className="capitalize">
						{getLanguageDisplayName(
							creatorPricing.creator?.language ?? null
						)}
					</p>
				</div>
			</>
		)}

		{/* Common fields for both selection methods */}
		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				No of Creators:
			</h3>
			<p>
				{creatorPricing.creatorCount || 0}{" "}
				{creatorPricing.creatorCount <= 1 ? "Creator" : "Creators"}
			</p>
		</div>

		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				Videos per Creator:
			</h3>
			<p>{creatorPricing.videosPerCreator || 0} Video</p>
		</div>

		<div className="flex gap-28">
			<h3 className="text-[#667085] font-normal w-40">
				Total Videos:
			</h3>
			<p>
				{creatorPricing.totalVideos ||
					creatorPricing.creatorCount *
						creatorPricing.videosPerCreator ||
					4}{" "}
				{creatorPricing.totalVideos ||
				creatorPricing.creatorCount *
					creatorPricing.videosPerCreator <=
					1
					? "Video"
					: "Videos"}
			</p>
		</div>

		{/* Budget Per Video - Only show for "Post Public Brief" */}
		{creatorPricing.selectionMethod === "Post Public Brief" && (
			<div className="flex gap-28">
				<h3 className="text-[#667085] font-normal w-40">
					Budget per Video:
				</h3>
				<p>${creatorPricing.budgetPerVideo || 0}</p>
			</div>
		)}

		
		{/* Pricing */}
		<div className="mt-8">
			<h2 className="font-semibold text-base mb-2">Pricing</h2>

			{/* Show individual creator payments for "Invite Specific Creators" */}
			{creatorPricing.selectionMethod === "Invite Specific Creators" && 
			 creatorPricing.creatorPayments && Object.keys(creatorPricing.creatorPayments).length > 0 && (
				<div className="space-y-2 mb-4">
					{Object.entries(creatorPricing.creatorPayments).map(([creatorId, payment]) => {
						const creator = creatorPricing.selectedCreators?.find(c => c.id === creatorId);
						return (
							<div key={creatorId} className="flex gap-28">
								<h3 className="text-[#667085] font-normal w-40">
									{creator?.name}:
								</h3>
								<p>${(payment as { totalAmount: number }).totalAmount || 0}</p>
							</div>
						);
					})}
				</div>
			)}

			{/* Total */}
			<div className="flex gap-28 pt-4 border-b">
				<h3 className="text-[#667085] font-normal w-40 mb-2">
					Total:
				</h3>
				<p className="font-medium">
					${creatorPricing.cost?.totalAmount || creatorPricing.totalAmount || 0}
				</p>
			</div>
		</div>
	</div>
</TabsContent>

					{/* Applications Tab */}
					<TabsContent value="applications">
						<div className="p-8 text-center text-gray-500">
							<ProjectApplications
								projectData={{
									id: projectId,
								}}
							/>
						</div>
					</TabsContent>

					{/* Submissions Tab */}
					<TabsContent value="submissions">
						<div className="p-8 text-center text-gray-500">
							<ProjectSubmissions
								projectFormData={project}
								projectId={projectId}
							/>
						</div>
					</TabsContent>

					{/* Product Delivery Tab (only shown for physical products) */}
					{isPhysicalProduct && (
						<TabsContent value="product-delivery">
							<div className="p-8 text-gray-500">
								<ProductDelivery projectId={projectId} />
							</div>
						</TabsContent>
					)}

					{/* Analytics and Affiliate tab for Tiktok shop  */}
					{/* {projectDetails.projectType === "TikTok Shop" && (
						<>
							<TabsContent value="analytics">
								<div className="p-8 text-gray-500">
									<ProjectAnalytics />
								</div>
							</TabsContent>
							<TabsContent value="affiliate-payout">
								<div className="p-8 text-gray-500">
									<AffiliatePayout />
								</div>
							</TabsContent>
						</>
					)} */}
				</Tabs>
			</div>
		</ProjectFormProvider>
	);
};

export default ProjectDetailPage;