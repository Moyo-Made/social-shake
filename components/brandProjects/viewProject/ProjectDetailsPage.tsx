"use client";

import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectFormData } from "@/types/contestFormData";
import { getStatusDot, getStatusStyle } from "@/utils/statusUtils";
import ProjectApplications from "./ProjectApplications";
import ProjectSubmissions from "./ProjectSubmissions";
import ProductDelivery from "./ProductDelivery";
import Image from "next/image";
import ProjectAnalytics from "./ProjectAnalytics";
import AffiliatePayout from "./AffiliatePayout";

interface ProjectDetailPageProps {
	projectId: string;
}
const ProjectDetailPage = ({ projectId }: ProjectDetailPageProps) => {
	//   const router = useRouter();
	const [project, setProject] = useState<ProjectFormData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// const [applications] = useState<unknown[]>([]);
	// const [submissions] = useState<unknown[]>([]);

	useEffect(() => {
		const fetchProjectData = async () => {
			try {
				setLoading(true);
				const projectRef = doc(db, "projects", projectId.toString());
				const projectSnap = await getDoc(projectRef);

				if (projectSnap.exists()) {
					setProject(projectSnap.data() as ProjectFormData);
				} else {
					setError("Project not found");
				}
			} catch (err) {
				console.error("Error fetching project:", err);
				setError("Failed to load project details");
			} finally {
				setLoading(false);
			}
		};

		if (projectId) {
			fetchProjectData();
		}
	}, [projectId]);

	if (loading) {
		return <div className="p-8 text-center">Loading project details...</div>;
	}

	if (error || !project) {
		return (
			<div className="p-8 text-center text-red-500">
				{error || "Project not available"}
			</div>
		);
	}

	const { projectDetails, projectRequirements, creatorPricing } = project;

	// Check if the product type is physical to determine whether to show the delivery tab
	const isPhysicalProduct = projectDetails.productType === "physical";

	const tabTriggerStyles = "w-40 data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3";

	return (
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
					href="/dashboard/projects"
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
							className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusStyle(project.status)}`}
						>
							<span
								className={`inline-block w-1.5 h-1.5 rounded-full ${getStatusDot(project.status)}`}
							></span>
							<p className="capitalize">{project.status}</p>
						</div>
					</div>

					{/* Project Stats */}
					<div className="flex flex-wrap gap-4 w-fit text-sm bg-white bg-opacity-90 border border-[#FFD9C3] px-5 py-2 rounded-lg shadow-md">
						<div>
							<span className="text-[#FD5C02]">Project Budget:</span> $
							{creatorPricing.totalBudget || 0}
						</div>
						<div>
							<span className="text-[#FD5C02]">Creators Required:</span>{" "}
							{creatorPricing.creatorCount} Creators
						</div>
						<div>
							<span className="text-[#FD5C02]">Project Type:</span>{" "}
							{projectDetails.projectType}
						</div>
						<div>
							<span className="text-[#FD5C02]">Product Type:</span>{" "}
							{projectDetails.productType === "physical"
								? "Physical Product"
								: "Virtual Product"}
						</div>
						<div>
							<span className="text-[#FD5C02]">Submissions:</span> 2 Videos • 1
							Pending
						</div>
					</div>
				</div>
			</div>

			{/* Tabs Navigation */}
			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="flex gap-6 mb-3 p-3 mt-6">
					<TabsTrigger
						value="overview"
						className={tabTriggerStyles}
					>
						Project Overview
					</TabsTrigger>
					<TabsTrigger
						value="applications"
						className={tabTriggerStyles}
					>
						Applications
					</TabsTrigger>
					<TabsTrigger
						value="submissions"
						className={tabTriggerStyles}
					>
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

					{projectDetails.projectType === "TikTok Shop" && (
						<>
							<TabsTrigger
								value="analytics"
								className={tabTriggerStyles}
							>
								Analytics
							</TabsTrigger>
							<TabsTrigger value="affiliate-payout" className={tabTriggerStyles}>
							Affiliates Payout
							</TabsTrigger>
						</>
					)}
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
							{projectDetails.productType === "physical"
								? "Physical Product - A tangible item that will be shipped to creators"
								: "Virtual Product – A digital or online service that does not require shipping"}
						</p>
					</div>

					{/* Project Description */}
					<div className="flex gap-32 w-full">
						<h3 className="text-[#667085] font-normal">Project Description:</h3>
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
							{projectRequirements.contentType === "allow-applications"
								? "Product Showcase"
								: projectRequirements.contentType}
						</p>
					</div>

					{/* Duration */}
					<div className="flex gap-28">
						<h3 className="text-[#667085] font-normal w-40">Duration:</h3>
						<p>
							{projectRequirements.duration === "30-seconds"
								? "30 Seconds"
								: projectRequirements.duration}
						</p>
					</div>

					{/* Video Type */}
					<div className="flex gap-28">
						<h3 className="text-[#667085] font-normal w-40">Video Type:</h3>
						<p>
							{projectRequirements.videoType === "client-script"
								? "Client's Script"
								: projectRequirements.videoType}
						</p>
					</div>

					{/* Aspect Ratio */}
					<div className="flex gap-28">
						<h3 className="text-[#667085] font-normal w-40">Aspect Ratio:</h3>
						<p>{projectRequirements.aspectRatio || "16:9 (Horizontal)"}</p>
					</div>

					{/* Client's Script */}
					{projectRequirements.videoType === "client-script" &&
						projectRequirements.script && (
							<div className="flex gap-40 w-full">
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
							<h3 className="text-[#667085] font-normal w-40">Brand Assets:</h3>
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

					{/* Creator Details */}
					<div className="space-y-4">
						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">
								Select Creators:
							</h3>
							<p>{creatorPricing.selectionMethod || "Post Public Brief"}</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">Age Group:</h3>
							<p>{creatorPricing.ageGroup || "18-30"}</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">Gender:</h3>
							<p>{creatorPricing.gender || "Female"}</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">
								Type of Industry:
							</h3>
							<p>{creatorPricing.industry || "Beauty & Wellness"}</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">Language:</h3>
							<p>{creatorPricing.language || "English"}</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">
								No of Creators:
							</h3>
							<p>{creatorPricing.creatorCount || 4} Creators</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">
								Videos per Creator:
							</h3>
							<p>{creatorPricing.videosPerCreator || 1} Video</p>
						</div>

						<div className="flex gap-28">
							<h3 className="text-[#667085] font-normal w-40">Total Videos:</h3>
							<p>
								{creatorPricing.totalVideos ||
									creatorPricing.creatorCount *
										creatorPricing.videosPerCreator ||
									4}{" "}
								Videos
							</p>
						</div>

						{/* Pricing */}
						<div className="mt-8">
							<h2 className="font-semibold text-base mb-2">Pricing</h2>

							<div className="flex gap-28">
								<h3 className="text-[#667085] font-normal w-40">
									Project Budget:
								</h3>
								<p>
									${creatorPricing.budgetPerVideo || 1500} x{" "}
									{creatorPricing.totalVideos || 2}
								</p>
							</div>

							{/* Extras */}
							{(creatorPricing.extras?.music ||
								creatorPricing.extras?.rawFiles ||
								creatorPricing.extras?.captions) && (
								<>
									<div className="flex mt-2">
										<h3 className="text-[#667085] font-normal w-40">Extras:</h3>
									</div>

									{creatorPricing.extras.music && (
										<div className="flex gap-36 ml-2">
											<h3 className="text-[#667085] font-normal w-32">
												Music:
											</h3>
											<p>
												${creatorPricing.extras.musicPrice || 50} x{" "}
												{creatorPricing.totalVideos || 2}
											</p>
										</div>
									)}

									{creatorPricing.extras.rawFiles && (
										<div className="flex gap-36 ml-2">
											<h3 className="text-[#667085] font-normal w-32">
												Raw Files:
											</h3>
											<p>
												${creatorPricing.extras.rawFilesPrice || 0} x{" "}
												{creatorPricing.totalVideos || 2}
											</p>
										</div>
									)}

									{creatorPricing.extras.captions && (
										<div className="flex gap-36 ml-2">
											<h3 className="text-[#667085] font-normal w-32">
												Captions:
											</h3>
											<p>
												${creatorPricing.extras.captionsPrice || 0} x{" "}
												{creatorPricing.totalVideos || 2}
											</p>
										</div>
									)}
								</>
							)}

							{/* Total */}
							<div className="flex gap-28 pt-4 border-b">
								<h3 className="text-[#667085] font-normal w-40 mb-2">Total:</h3>
								<p className="font-medium">
									${creatorPricing.totalAmount || 3100}
								</p>
							</div>
						</div>
					</div>
				</TabsContent>

				{/* Applications Tab */}
				<TabsContent value="applications">
					<div className="p-8 text-center text-gray-500">
						<ProjectApplications />
					</div>
				</TabsContent>

				{/* Submissions Tab */}
				<TabsContent value="submissions">
					<div className="p-8 text-center text-gray-500">
						<ProjectSubmissions projectFormData={project} />
					</div>
				</TabsContent>

				{/* Product Delivery Tab (only shown for physical products) */}
				{isPhysicalProduct && (
					<TabsContent value="product-delivery">
						<div className="p-8 text-gray-500">
							<ProductDelivery />
						</div>
					</TabsContent>
				)}

				{/* Analytics and Affiliate tab for Tiktok shop  */}
				{projectDetails.projectType === "TikTok Shop" &&(
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
				)}
			</Tabs>
		</div>
	);
};

export default ProjectDetailPage;
