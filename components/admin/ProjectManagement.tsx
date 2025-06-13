"use client";

import React, { useState, useEffect } from "react";
import { ProjectStatus } from "@/types/projects";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Eye, Users, Globe, UserCheck, Calendar } from "lucide-react";
import { BrandProfile } from "@/types/user";

interface Project {
	id: string;
	userId?: string;
	projectId: string;
	projectDetails: {
		projectName: string;
		projectDescription?: string;
		projectThumbnail?: string;
		projectType?: string;
	};
	creatorPricing: {
		selectionMethod: "Invite Specific Creators" | "Post Public Brief";
		selectedCreators?: Array<{
			name: string;
			avatar: string;
			id: string;
		}>;
		creatorCount?: number;
		totalVideos?: number;
		totalAmount?: number;
		totalBudget?: number;
	};
	status: ProjectStatus;
	applicationStatus?: string;
	metrics?: {
		views: number;
		applications: number;
		participants: number;
		submissions: number;
	};
	createdAt: string;
	updatedAt: string;
	participants?: number;
	applicantsCount?: number;
}

interface PaginationInfo {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

interface TabItem {
	id: string;
	label: string;
	status?: ProjectStatus | "all" | "ongoing" | "completed";
	selectionMethod?: "Invite Specific Creators" | "Post Public Brief" | "all";
	emptyMessage: string;
}

const ProjectManagement: React.FC = () => {
	const router = useRouter();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [brandProfiles, setBrandProfiles] = useState<{
		[key: string]: BrandProfile;
	}>({});
	const [loadingBrands, setLoadingBrands] = useState<{
		[key: string]: boolean;
	}>({});
	const [statusFilter, setStatusFilter] = useState<
		ProjectStatus | "all" | "ongoing" | "completed"
	>("all");
	const [pagination, setPagination] = useState<PaginationInfo>({
		total: 0,
		page: 1,
		limit: 10,
		pages: 0,
	});
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [activeTab, setActiveTab] = useState<string>("all-projects");

	// Enhanced tabs with proper filtering
	const tabs: TabItem[] = [
		{
			id: "all-projects",
			label: "All Projects",
			status: "all",
			selectionMethod: "all",
			emptyMessage: "No projects have been created yet. As brands create projects, they'll appear here.",
		},
		// {
		// 	id: "public",
		// 	label: "Public Briefs",
		// 	status: "all",
		// 	selectionMethod: "Post Public Brief",
		// 	emptyMessage: "No public briefs yet. Public projects where any creator can apply will appear here.",
		// },
		{
			id: "invite-only",
			label: "Invite Only",
			status: "all",
			selectionMethod: "Invite Specific Creators",
			emptyMessage: "No invite-only projects yet. Projects where brands invite specific creators will appear here.",
		},
		{
			id: "ongoing-projects",
			label: "Ongoing Projects",
			status: "ongoing",
			selectionMethod: "all",
			emptyMessage: "No ongoing projects. Active projects will appear here.",
		},
		{
			id: "completed-projects",
			label: "Completed Projects",
			status: "completed",
			selectionMethod: "all",
			emptyMessage: "No completed projects yet. Finished projects will be listed here.",
		},
	];

	useEffect(() => {
		localStorage.removeItem("viewingProject");
		fetchProjects();
	}, [statusFilter, pagination.page, pagination.limit]);

	const viewProjectDetails = (project: Project) => {
		localStorage.setItem("viewingProject", JSON.stringify(project));
		router.push(`/admin/manage-projects/${project.id}`);
	};

	// Fetch projects
	const fetchProjects = async () => {
		try {
			setLoading(true);
			const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
			const url = `/api/admin/project-approval?page=${pagination.page}&limit=${pagination.limit}${statusParam}`;

			const response = await fetch(url);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error("API error response:", errorText);
				throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
			}
			
			const data = await response.json();
			setProjects(data.projects);
			setPagination(data.pagination);

			data.projects.forEach((project: Project) => {
				if (project.userId) {
					fetchBrandProfile(project.userId);
				}
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error fetching projects:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchBrandProfile = async (userId: string) => {
		if (brandProfiles[userId] || loadingBrands[userId]) {
			return;
		}

		try {
			setLoadingBrands((prev) => ({ ...prev, [userId]: true }));
			const response = await fetch(`/api/admin/brand-approval?userId=${userId}`);

			if (response.ok) {
				const data = await response.json();
				setBrandProfiles((prev) => ({
					...prev,
					[userId]: data,
				}));
			}
		} catch (error) {
			console.error(`Error fetching brand profile for userId ${userId}:`, error);
		} finally {
			setLoadingBrands((prev) => {
				const updated = { ...prev };
				delete updated[userId];
				return updated;
			});
		}
	};

	useEffect(() => {
		const uniqueBrandIds = projects
			.filter((project) => project.userId)
			.map((project) => project.userId as string);

		const missingBrandIds = uniqueBrandIds.filter(
			(id) => !brandProfiles[id] && !loadingBrands[id]
		);

		missingBrandIds.forEach((userId) => {
			fetchBrandProfile(userId);
		});
	}, [projects, brandProfiles, loadingBrands]);

	useEffect(() => {
		const selectedTab = tabs.find((tab) => tab.id === activeTab);
		if (selectedTab && selectedTab.status && selectedTab.status !== "all") {
			setStatusFilter(selectedTab.status as ProjectStatus | "all" | "ongoing" | "completed");
		} else if (activeTab === "all-projects") {
			setStatusFilter("all");
		}
	}, [activeTab]);

	// Fixed filtering logic
	const filteredProjects = projects.filter((project) => {
		const selectedTab = tabs.find((tab) => tab.id === activeTab);
		
		// Status filter - handle ongoing projects properly
		let statusMatch = true;
		if (selectedTab?.status && selectedTab.status !== "all") {
			if (selectedTab.status === "ongoing") {
				// Ongoing projects are those with status "active" or "invite"
				statusMatch = project.status === "active" || project.status === "invite";
			} else {
				statusMatch = project.status === selectedTab.status;
			}
		}

		// Selection method filter - this is the key fix
		let selectionMethodMatch = true;
		if (selectedTab?.selectionMethod && selectedTab.selectionMethod !== "all") {
			selectionMethodMatch = project.creatorPricing?.selectionMethod === selectedTab.selectionMethod;
		}

		// Search filter
		const searchMatch =
			!searchTerm ||
			project.projectDetails.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			project.id.toLowerCase().includes(searchTerm.toLowerCase());

		return statusMatch && selectionMethodMatch && searchMatch;
	});

	const getCurrentTabEmptyMessage = () => {
		const currentTab = tabs.find((tab) => tab.id === activeTab);
		return currentTab?.emptyMessage || "No projects found matching your criteria.";
	};

	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > pagination.pages) return;
		setPagination({ ...pagination, page: newPage });
	};

	// Enhanced Status Badge
	const StatusBadge = ({ status, applicationStatus }: { 
		status: ProjectStatus; 
		applicationStatus?: string;
	}) => {
		let displayText = "";
		let colorClass = "";

		switch (status) {
			case "active":
			case "invite":
				displayText = applicationStatus === "open" ? "🔄 Ongoing - Open" : "🔄 Ongoing";
				colorClass = "bg-blue-100 border border-blue-300 text-blue-800";
				break;
			case "completed":
				displayText = "✅ Completed";
				colorClass = "bg-green-100 border border-green-300 text-green-800";
				break;
			case "rejected":
				displayText = "❌ Rejected";
				colorClass = "bg-red-100 border border-red-300 text-red-800";
				break;
			case "pending":
				displayText = "⏳ Pending";
				colorClass = "bg-yellow-100 border border-yellow-300 text-yellow-800";
				break;
			default:
				displayText = `• ${status}`;
				colorClass = "bg-gray-100 border border-gray-300 text-gray-800";
		}

		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
				{displayText}
			</span>
		);
	};



	// Enhanced Brand Info
	const BrandInfo = ({ userId }: { userId: string }) => {
		const brandProfile = brandProfiles[userId];
		const isLoading = loadingBrands[userId];

		if (isLoading) {
			return (
				<div className="flex items-center">
					<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 animate-pulse">
						<span className="text-gray-500 font-medium">...</span>
					</div>
					<div className="text-sm text-gray-500">Loading...</div>
				</div>
			);
		}

		if (!brandProfile) {
			return (
				<div className="flex items-center">
					<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
						<span className="text-gray-500 font-medium">?</span>
					</div>
					<div className="text-sm text-gray-500">Unknown Brand</div>
				</div>
			);
		}

		return (
			<div className="flex items-center">
				{brandProfile.logoUrl ? (
					<Image
						className="h-8 w-8 rounded-full mr-2 object-cover"
						src={brandProfile.logoUrl}
						alt={`${brandProfile.brandName || "Brand"} logo`}
						width={32}
						height={32}
					/>
				) : (
					<div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 flex items-center justify-center mr-2">
						<span className="text-white font-medium text-sm">
							{(brandProfile.brandName || "B").charAt(0).toUpperCase()}
						</span>
					</div>
				)}
				<div>
					<div className="text-[#101828] font-medium">
						{brandProfile.brandName || "Unknown Brand"}
					</div>
					<div className="text-xs text-gray-500">
						{brandProfile.email}
					</div>
				</div>
			</div>
		);
	};

	const renderProjectTable = () => {
		if (loading) {
			return (
				<div className="flex justify-center items-center py-10 h-screen">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				</div>
			);
		}

		if (filteredProjects.length === 0) {
			return (
				<div className="text-center py-16 bg-gray-50 rounded-lg">
					<div className="mb-4">
						{activeTab.includes("public") ? (
							<Globe className="w-12 h-12 text-gray-400 mx-auto mb-2" />
						) : activeTab.includes("invite") ? (
							<UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
						) : (
							<Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
						)}
					</div>
					<p className="text-gray-500">{getCurrentTabEmptyMessage()}</p>
				</div>
			);
		}

		return (
			<div className="overflow-x-auto shadow-md rounded-lg">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Brand
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Project Name
							</th>
							
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Status
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Date
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredProjects.map((project) => (
							<tr key={project.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap">
									<BrandInfo userId={project.userId || ""} />
								</td>
								<td className="px-6 py-4">
									<div className="max-w-xs">
										<div className="text-[#101828] font-medium mb-1">
											{project.projectDetails.projectName}
										</div>
										
									</div>
								</td>
								
								<td className="px-6 py-4 whitespace-nowrap">
									<StatusBadge 
										status={project.status} 
										applicationStatus={project.applicationStatus}
									/>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									<div className="flex items-center gap-1">
										<Calendar className="w-3 h-3" />
										<span>
											{new Date(project.createdAt).toLocaleDateString()}
										</span>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<button
										className="text-orange-500 hover:text-orange-700 flex items-center gap-1 text-sm font-medium"
										onClick={() => viewProjectDetails(project)}
									>
										<Eye className="w-4 h-4" />
										<span>View Details</span>
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<div className="flex flex-col md:flex-row bg-white p-4 w-full max-w-7xl">
			{/* Left sidebar for tabs */}
			<div className="w-full md:w-64 p-6">
				<div className="flex flex-col space-y-2">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`text-left p-3 rounded-md transition-all duration-200 ${
								activeTab === tab.id
									? "text-[#FD5C02] bg-[#FFF4EE] border-l-4 border-[#FD5C02] font-medium"
									: "text-[#667085] hover:bg-gray-100 hover:text-gray-900"
							}`}
						>
							<div className="flex items-center gap-2">
								{tab.id.includes("public") && <Globe className="w-4 h-4" />}
								{tab.id.includes("invite") && <UserCheck className="w-4 h-4" />}
								{tab.id.includes("all") && <Users className="w-4 h-4" />}
								<span>{tab.label}</span>
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="flex-1 p-4 flex flex-col border border-[#FFD9C3] rounded-lg">
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{error}
						<button
							className="float-right font-bold"
							onClick={() => setError(null)}
						>
							&times;
						</button>
					</div>
				)}

				<div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
					<div className="w-full md:w-1/3">
						<Input
							type="text"
							placeholder="Search by project name or ID..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
						/>
					</div>

					{activeTab === "all-projects" && (
						<div>
							<Select
								value={statusFilter}
								onValueChange={(value: ProjectStatus | "all" | "ongoing" | "completed") => setStatusFilter(value)}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Select Status" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="ongoing">Ongoing</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				{renderProjectTable()}

				{/* Enhanced Pagination */}
				{!loading && pagination.pages > 1 && filteredProjects.length > 0 && (
					<div className="flex justify-center mt-6">
						<nav className="flex items-center space-x-1">
							<button
								onClick={() => handlePageChange(pagination.page - 1)}
								disabled={pagination.page === 1}
								className={`px-3 py-2 rounded-l-md border ${
									pagination.page === 1
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-orange-600 hover:bg-orange-50 border-orange-300"
								}`}
							>
								Previous
							</button>

							<div className="flex">
								{Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
									const pageNumber = i + 1;
									return (
										<button
											key={pageNumber}
											onClick={() => handlePageChange(pageNumber)}
											className={`px-3 py-2 border-t border-b ${
												pagination.page === pageNumber
													? "bg-orange-600 text-white border-orange-600"
													: "bg-white text-orange-600 hover:bg-orange-50 border-orange-300"
											}`}
										>
											{pageNumber}
										</button>
									);
								})}
							</div>

							<button
								onClick={() => handlePageChange(pagination.page + 1)}
								disabled={pagination.page === pagination.pages}
								className={`px-3 py-2 rounded-r-md border ${
									pagination.page === pagination.pages
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-orange-600 hover:bg-orange-50 border-orange-300"
								}`}
							>
								Next
							</button>
						</nav>
					</div>
				)}
			</div>
		</div>
	);
};

export default ProjectManagement;