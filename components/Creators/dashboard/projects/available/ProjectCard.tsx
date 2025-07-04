import React from "react";
import Image from "next/image";
import { ProjectFormData } from "@/types/contestFormData";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getProjectTypeIcon } from "@/types/projects";
import { useQuery } from "@tanstack/react-query";

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

const fetchBrandProfile = async (userId: string): Promise<BrandProfile> => {
	const response = await fetch(`/api/admin/brand-approval?userId=${userId}`);
	
	if (response.ok) {
	  const data = await response.json();
	  return data;
	} else {
	  // Return placeholder for 404 or other errors
	  return {
		id: userId,
		userId: userId,
		email: "Unknown",
		brandName: "Unknown Brand",
		logoUrl: "",
	  };
	}
  };

 const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
	const { projectId, projectDetails, status } = project;

	const { data: brandProfile } = useQuery({
		queryKey: ["brandProfile", project.userId],
		queryFn: () => fetchBrandProfile(project.userId),
		enabled: !!project?.userId,
		staleTime: 10 * 60 * 1000, // 10 minutes - brand profiles don't change often
		gcTime: 15 * 60 * 1000,
		refetchOnWindowFocus: false,
	  });

	const getStatusBadge = () => {
		switch (status) {
			case "pending":
				return (
					<Badge className="bg-yellow-100 text-yellow-800 border-yellow-800">
						• Pending
					</Badge>
				);
			case "active":
				return (
					<Badge className="bg-[#ECFDF3] text-[#067647] border-[#ABEFC6] rounded-full py-1 font-normal">
						✓ Active
					</Badge>
				);
			case "completed":
				return (
					<Badge className="bg-blue-100 text-blue-800 border-blue-800">
						✓ Completed
					</Badge>
				);
			default:
				return null;
		}
	};

	const truncateText = (text: string, maxLength: number) => {
		if (!text) return "";
		return text.length > maxLength
			? `${text.substring(0, maxLength)}...`
			: text;
	};



	return (
		<div className="rounded-lg overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow">
			<div className="relative h-48 w-full">
				{projectDetails.projectThumbnail ? (
					<Image
						src={
							typeof projectDetails.projectThumbnail === "string"
								? projectDetails.projectThumbnail
								: URL.createObjectURL(projectDetails.projectThumbnail)
						}
						alt={projectDetails.projectName}
						fill
						className="object-cover rounded-xl p-2"
					/>
				) : (
					<div className="h-full w-full bg-gray-200 flex items-center justify-center">
						<p className="text-gray-500">No Image</p>
					</div>
				)}
				<div className="absolute top-4 left-4">{getStatusBadge()}</div>
			</div>

			<div className="p-3">
				<h3 className="text-base font-semibold mb-4">
					{projectDetails.projectName}
				</h3>

				<div className="flex justify-between items-center mb-4">
					<div className="flex flex-col items-center gap-2">
						<div className="flex items-center">
							{brandProfile?.logoUrl ? (
								<Image
									className="h-8 w-8 rounded-full mr-2 object-cover"
									src={brandProfile.logoUrl}
									alt={brandProfile.brandName || "Brand"}
									width={32}
									height={32}
								/>
							) : (
								<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
									<span className="text-xs text-gray-500">B</span>
								</div>
							)}

							<p className="text-sm font-medium">
								{brandProfile?.brandName || "Loading..."}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 mb-2 bg-[#FFF4EE] rounded-full py-2 px-4 w-fit">
						<div className="w-6 h-6 rounded-full flex items-center justify-center">
							<Image
								src={getProjectTypeIcon(projectDetails.projectType)}
								alt={projectDetails.projectType}
								width={20}
								height={20}
							/>
						</div>
						<span className="text-sm font-normal">
							{projectDetails.projectType}
						</span>
					</div>
				</div>

				<div className="border-b border-gray-200">
					<p className="text-sm text-gray-600 mb-4">
						{truncateText(projectDetails.projectDescription, 250)}
					</p>
				</div>

				<div className="flex justify-between items-center mt-4 text-sm">
					<div className="flex items-center gap-1.5">
						<Image
							src="/icons/published.svg"
							alt="Calendar Icon"
							width={20}
							height={20}
						/>
						<div className="flex flex-col">
							<p className="text-orange-500">Published</p>
							<p className="font-normal">
								{(() => {
									const createdAt =
										typeof project.createdAt === "object" && "_seconds" in project.createdAt
											? new Date(project.createdAt._seconds * 1000)
											: new Date(project.createdAt ?? "");
									return createdAt.toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									});
								})()}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5">
						<Image
							src="/icons/budget.svg"
							alt="Budget Icon"
							width={20}
							height={20}
						/>
						<div className="flex flex-col">
							<p className="text-orange-500">Budget</p>
							<p className="font-normal ">
								${project.creatorPricing?.totalBudget?.toLocaleString() || 0}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5">
						<Image
							src="/icons/product.svg"
							alt="Product Icon"
							width={20}
							height={20}
						/>
						<div className="flex flex-col">
							<p className="text-orange-500">Product Type</p>
							<p className="font-normal">
								{projectDetails.productType || "Not specified"}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="p-3">
				<Link
					href={`/creator/dashboard/project/${projectId}`}
					className="mt-4 block w-full text-center py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
				>
					Apply Now &rarr;
				</Link>
			</div>
		</div>
	);
};

export default ProjectCard;
