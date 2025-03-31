"use client";

import { useState, useEffect, SetStateAction } from "react";
import { Search } from "lucide-react";
import {
	Select,
	SelectItem,
	SelectTrigger,
	SelectContent,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

interface Project {
	id: string;
	status: string;
	title: string;
	projectType: string;
	budget: number;
	creatorsRequired: number;
	creatorsApplied: number;
	description: string;
	thumbnailUrl: string;
	submissions: {
		videos: number;
		pending: number;
	};
	rawData: {
		projectDetails?: {
			projectName?: string;
			projectType?: string;
			projectDescription?: string | string[];
			projectThumbnail?: string;
		};
		creatorPricing?: {
			budgetPerVideo?: number;
			creatorCount?: number;
		};
		status?: string;
		creatorApplications?: unknown[];
		submissions?: unknown[];
		pendingSubmissions?: unknown[];
		[key: string]: unknown;
	};
}

const ProjectDashboard = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string | null>(null);
	const [budgetFilter, setBudgetFilter] = useState<string | null>(null);
	const [projectTypeFilter, setProjectTypeFilter] = useState<string | null>(
		null
	);
	const [viewType, setViewType] = useState("grid"); // 'grid' or 'list'
	const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	// Set up auth state listener to get current user ID
	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user && user.uid) {
				setCurrentUserId(user.uid);
			} else {
				setCurrentUserId(null);
				setProjects([]);
				setFilteredProjects([]);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	// Fetch projects from Firebase when user ID changes
	useEffect(() => {
		if (!currentUserId) {
			// If no user is logged in or ID isn't available, don't fetch
			setProjects([]);
			setFilteredProjects([]);
			setLoading(false);
			return;
		}

		const fetchProjects = async () => {
			try {
				setLoading(true);
				console.log("Fetching projects for user ID:", currentUserId);

				// Create a reference to the projects collection
				const projectsRef = collection(db, "projects");

				// Create a query filtered by the current user's ID
				const projectsQuery = query(
					projectsRef,
					where("userId", "==", currentUserId),
					orderBy("createdAt", "desc")
				);

				const querySnapshot = await getDocs(projectsQuery);
				console.log(`Found ${querySnapshot.size} projects for this user`);

				// Format the data to match our component's expected structure
				const projectsData = querySnapshot.docs.map((doc) => {
					const data = doc.data();

					// Determine status based on the status field or default to Draft
					const rawStatus = data.status || "Draft";
					// Make first letter of each word uppercase for display
					const status = rawStatus
						.split(" ")
						.map(
							(word: string) =>
								word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
						)
						.join(" ");

					// Extract description, which could be a string or array
					const description = Array.isArray(
						data.projectDetails?.projectDescription
					)
						? data.projectDetails.projectDescription.join(" ")
						: data.projectDetails?.projectDescription || "";

					// Get thumbnail URL from the project details or use placeholder
					const thumbnailUrl = data.projectDetails?.projectThumbnail;

					return {
						id: doc.id,
						status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize status
						title: data.projectDetails?.projectName || "Untitled Project",
						projectType: data.projectDetails?.projectType || "UGC Content Only",
						budget: data.creatorPricing?.budgetPerVideo || 0,
						creatorsRequired: data.creatorPricing?.creatorCount || 0,
						creatorsApplied: data.creatorApplications?.length || 0,
						description: description,
						thumbnailUrl: thumbnailUrl,
						submissions: {
							videos: data.submissions?.length || 0,
							pending: data.pendingSubmissions?.length || 0,
						},
						// Store the raw data for any additional needs
						rawData: data,
					};
				});

				setProjects(projectsData);
				setFilteredProjects(projectsData);
				setLoading(false);
			} catch (err: unknown) {
				console.error("Error fetching projects:", err);
				setError(`Failed to load projects: ${(err as Error).message}`);
				setLoading(false);
			}
		};

		fetchProjects();
	}, [currentUserId]);

	// Apply filters whenever filter states change
	useEffect(() => {
		// Define applyFilters inside the effect
		const applyFilters = () => {
			let result = [...projects];

			// Apply search filter
			if (searchTerm) {
				result = result.filter((project) =>
					project.title.toLowerCase().includes(searchTerm.toLowerCase())
				);
			}

			// Apply status filter
			if (statusFilter) {
				result = result.filter((project) => project.status === statusFilter);
			}

			// Apply budget filter
			if (budgetFilter) {
				result = result.filter((project) => {
					const budget = project.budget;
					if (budgetFilter === "low") return budget < 1000;
					if (budgetFilter === "medium")
						return budget >= 1000 && budget <= 5000;
					if (budgetFilter === "high") return budget > 5000;
					return true;
				});
			}

			// Apply project type filter
			if (projectTypeFilter) {
				result = result.filter(
					(project) => project.projectType === projectTypeFilter
				);
			}

			setFilteredProjects(result);
		};

		applyFilters();
	}, [searchTerm, statusFilter, budgetFilter, projectTypeFilter, projects]);

	// Handle search input change
	const handleSearch = (e: { target: { value: SetStateAction<string> } }) => {
		setSearchTerm(e.target.value);
	};

	// Handle filter changes
	const handleStatusFilterChange = (value: SetStateAction<string | null>) => {
		setStatusFilter(value === "all-status" ? null : value);
	};

	const handleBudgetFilterChange = (value: SetStateAction<string | null>) => {
		setBudgetFilter(value === "all-budget" ? null : value);
	};

	const handleProjectTypeFilterChange = (
		value: SetStateAction<string | null>
	) => {
		setProjectTypeFilter(value === "all-type" ? null : value);
	};

	const handleImageError = (
		e: React.SyntheticEvent<HTMLImageElement, Event>
	) => {
		e.currentTarget.style.display = "none"; // Hide broken image
	};

	// Function to determine status style
	const getStatusStyle = (status: string) => {
		// Normalize the status by converting to lowercase for comparison
		const normalizedStatus = status.toLowerCase();

		switch (normalizedStatus) {
			case "accepting pitches":
				return "bg-[#FFF9E5] text-[#3B82F6] border border-[#FFD700]";
			case "ongoing project":
				return "bg-[#FFE5FB] text-[#FC52E4] border border-[#FC52E4]";
			case "completed":
				return "bg-[#ABEFC6] text-[#067647] border border-[#067647]";
			case "draft":
				return "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]";
			default:
				return "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]";
		}
	};

	// Function to determine status dot color
	const getStatusDot = (status: string) => {
		const normalizedStatus = status.toLowerCase();

		switch (normalizedStatus) {
			case "accepting pitches":
				return "bg-[#3B82F6]";
			case "ongoing project":
				return "bg-[#FC52E4]";
			case "completed":
				return "bg-[#067647]";
			case "draft":
				return "bg-[#667085]";
			default:
				return "bg-[#667085]";
		}
	};

	// Function to get the right icon for project type
	const getProjectTypeIcon = (projectType: string) => {
		switch (projectType) {
			case "UGC Videos Only":
				return "/icons/ugc.svg";
			case "Creator-Posted UGC":
				return "/icons/creator-posted.svg";
			case "UGC Content Only":
				return "/icons/ugc.svg";
			case "Spark Ads":
				return "/icons/ad.svg";
			case "TikTok Shop":
				return "/icons/tiktok-shop.svg";
			default:
				return "/icons/default.svg";
		}
	};

	return (
		<div className="bg-gray-50 p-6 min-h-screen w-full">
			{/* Header with search and filters */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
				<div className="relative w-full md:w-auto">
					<Input
						type="text"
						placeholder="Search Projects"
						className="pl-10 pr-4 py-2 rounded-md border border-gray-300 w-full md:w-80"
						value={searchTerm}
						onChange={handleSearch}
					/>
					<Search className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
				</div>

				<div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
					{/* Status Filter */}
					<div className="relative w-full md:w-auto">
						<Select
							value={statusFilter || ""}
							onValueChange={handleStatusFilterChange}
						>
							<SelectTrigger className="w-full bg-white md:w-40">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent className="md:w-40 px-1 bg-white z-50">
								<SelectItem value="all-status">All</SelectItem>
								<SelectItem value="Draft">Draft</SelectItem>
								<SelectItem value="Accepting Pitches">
									Accepting Pitches
								</SelectItem>
								<SelectItem value="Ongoing Project">Ongoing Project</SelectItem>
								<SelectItem value="Completed">Completed</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Total Budget Filter */}
					<div className="relative w-full md:w-auto">
						<Select
							value={budgetFilter || ""}
							onValueChange={handleBudgetFilterChange}
						>
							<SelectTrigger className="w-full bg-white md:w-40">
								<SelectValue placeholder="Total Budget" />
							</SelectTrigger>
							<SelectContent className="md:w-40 px-1 bg-white z-50">
								<SelectItem value="all-budget">All</SelectItem>
								<SelectItem value="low">Under $1,000</SelectItem>
								<SelectItem value="medium">$1,000 - $5,000</SelectItem>
								<SelectItem value="high">Over $5,000</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Project Type Filter */}
					<div className="relative w-full md:w-auto">
						<Select
							value={projectTypeFilter || ""}
							onValueChange={handleProjectTypeFilterChange}
						>
							<SelectTrigger className="w-full bg-white md:w-40">
								<SelectValue placeholder="Project Type" />
							</SelectTrigger>
							<SelectContent className="md:w-40 px-1 bg-white z-50">
								<SelectItem value="all-type">All</SelectItem>
								<SelectItem value="UGC Content Only">
									UGC Content Only
								</SelectItem>
								<SelectItem value="UGC Videos Only">UGC Videos Only</SelectItem>
								<SelectItem value="Creator-Posted UGC">
									Creator-Posted UGC
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Create New Project Button */}
					<Button className="bg-orange-500 text-white px-4 py-1 rounded-md flex items-center w-full md:w-auto justify-center">
						<Link href="/dashboard/projects/new">Create New Project</Link>
						<span className="ml-1 text-lg">+</span>
					</Button>
				</div>
			</div>

			{/* View Type Toggle */}
			<div className="flex justify-end mb-4">
				<div className="bg-white rounded-md border border-gray-300 p-1 flex">
					<button
						className={`px-3 py-1 rounded ${viewType === "grid" ? "bg-gray-200" : ""}`}
						onClick={() => setViewType("grid")}
					>
						Grid
					</button>
					<button
						className={`px-3 py-1 rounded ${viewType === "list" ? "bg-gray-200" : ""}`}
						onClick={() => setViewType("list")}
					>
						List
					</button>
				</div>
			</div>

			{/* Loading state */}
			{loading && (
				<div className="text-center py-12">
					<p className="text-gray-500">Loading projects...</p>
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="text-center py-12">
					<p className="text-red-500">Error loading projects: {error}</p>
					<button
						className="mt-4 bg-orange-500 text-white font-medium py-2 px-4 rounded-md"
						onClick={() => window.location.reload()}
					>
						Retry
					</button>
				</div>
			)}

			{/* Empty state */}
			{!loading && !error && filteredProjects.length === 0 && (
				<div className="text-center py-12">
					<p className="text-gray-500">
						{currentUserId
							? "No projects found. Create your first project with the button above!"
							: "Please log in to view your projects"}
					</p>
				</div>
			)}

			{/* Projects display - Grid View */}
			{!loading &&
				!error &&
				filteredProjects.length > 0 &&
				viewType === "grid" && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{filteredProjects.map((project) => (
							<div
								key={project.id}
								className="bg-white border border-[#D2D2D2] p-5 rounded-xl shadow-sm overflow-hidden"
							>
								{/* Project Type Badge */}
								<div className="flex items-center gap-2 mb-3 bg-[#FFF4EE] rounded-full py-2 px-4 w-fit">
									<div className="w-6 h-6 rounded-full flex items-center justify-center">
										<Image
											src={getProjectTypeIcon(project.projectType)}
											alt={project.projectType}
											width={20}
											height={20}
										/>
									</div>
									<span className="text-sm font-medium">
										{project.projectType}
									</span>
								</div>

								<div className="mb-4">
									<h3 className="text-3xl font-bold mb-3">
										{project.title || "Untitled Project"}
									</h3>

									{/* Status Badge - Redesigned to match images */}
									<div className="flex justify-between items-center mb-4">
										<div className="text-gray-500 text-lg">Status:</div>
										<div
											className={`px-6 py-2 rounded-full flex items-center gap-2 ${getStatusStyle(project.status)}`}
										>
											<span
												className={`inline-block w-2 h-2 rounded-full ${getStatusDot(project.status)}`}
											></span>
											{project.status}
										</div>
									</div>

									{/* Project Description */}
									<p className="text-base text-[#667085] mb-6 line-clamp-3">
										{project.description}
									</p>

									{/* Project Thumbnail */}
									{project.thumbnailUrl && (
										<div className="relative mb-6 rounded-xl overflow-hidden">
											<Image
												src={project.thumbnailUrl}
												alt={`${project.title} thumbnail`}
												className="w-full h-48 object-cover"
												width={500}
												height={300}
												onError={handleImageError}
												priority={true}
											/>
										</div>
									)}
								</div>

								{/* Project Details Section */}
								<div className="border-t border-gray-200 pt-4">
									<div className="grid grid-cols-2 gap-4 mb-6">
										{/* Project Budget */}
										<div className="flex items-start gap-2">
											<div className="text-orange-500 text-2xl mt-1">$</div>
											<div>
												<p className="text-orange-500 font-medium">
													Project Budget
												</p>
												<p className="text-lg font-semibold">
													${project.budget}/Creator
												</p>
											</div>
										</div>

										{/* Creators Required */}
										<div>
											<p className="text-orange-500 font-medium">
												Creators Required
											</p>
											<p className="text-lg font-semibold">
												{project.creatorsRequired} Creators
											</p>
										</div>

										{/* Conditional third section based on status */}
										{project.status === "Accepting Pitches" ||
										project.status === "Completed" ? (
											<div className="col-span-2">
												<p className="text-orange-500 font-medium">
													Creators Applied
												</p>
												<p className="text-lg font-semibold">
													{project.creatorsApplied} Applied
												</p>
											</div>
										) : (
											project.status === "Ongoing Project" && (
												<div className="col-span-2">
													<p className="text-orange-500 font-medium">
														Submissions
													</p>
													<p className="text-lg font-semibold">
														{project.submissions.videos} Videos •{" "}
														{project.submissions.pending} Pending
													</p>
												</div>
											)
										)}
									</div>

									{/* Action Button */}
									{project.status === "Draft" ? (
										<Link
											href={`/dashboard/projects/edit/${project.id}`}
											className="w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-md flex items-center justify-center gap-2"
										>
											Edit Project
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M5 12H19M19 12L12 5M19 12L12 19"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</Link>
									) : (
										<Link
											href={`/dashboard/projects/${project.id}`}
											className="w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-md flex items-center justify-center gap-2"
										>
											View Project
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M5 12H19M19 12L12 5M19 12L12 19"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
				)}

			{/* Projects display - List View */}
			{!loading &&
				!error &&
				filteredProjects.length > 0 &&
				viewType === "list" && (
					<div className="space-y-4">
						{filteredProjects.map((project) => (
							<div
								key={project.id}
								className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row"
							>
								<div className="relative w-full md:w-72 h-48 md:h-64">
									{project.thumbnailUrl ? (
										<Image
											src={project.thumbnailUrl}
											alt={`${project.title} thumbnail`}
											className="w-full h-64 object-cover"
											width={500}
											height={300}
											onError={handleImageError}
											priority={true}
										/>
									) : (
										<div className="w-full h-64 flex items-center justify-center bg-gray-200">
											<p className="text-gray-500">No image available</p>
										</div>
									)}
								</div>

								<div className="p-6 flex-1">
									<div className="flex flex-col md:flex-row justify-between items-start mb-4">
										<div>
											<h3 className="text-xl font-semibold mb-2">
												{project.title || "Untitled Project"}
											</h3>
											{/* Project Type Badge */}
											<div className="flex items-center gap-2 mb-3 bg-[#FFF4EE] rounded-full py-2 px-4 w-fit">
												<div className="w-6 h-6 rounded-full flex items-center justify-center">
													<Image
														src={getProjectTypeIcon(project.projectType)}
														alt={project.projectType}
														width={20}
														height={20}
													/>
												</div>
												<span className="text-sm font-medium">
													{project.projectType}
												</span>
											</div>
										</div>

										{/* Status Badge */}
										<div
											className={`px-4 py-2 rounded-full flex items-center gap-2 ${getStatusStyle(project.status)}`}
										>
											<span
												className={`inline-block w-2 h-2 rounded-full ${getStatusDot(project.status)}`}
											></span>
											{project.status}
										</div>
									</div>

									<p className="text-sm text-gray-600 mb-6 line-clamp-2">
										{project.description}
									</p>

									<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
										{/* Project Budget */}
										<div className="flex items-start gap-2">
											<div className="text-orange-500 text-2xl mt-1">$</div>
											<div>
												<p className="text-orange-500 font-medium">
													Project Budget
												</p>
												<p className="text-lg font-semibold">
													${project.budget}/Creator
												</p>
											</div>
										</div>

										{/* Creators Required */}
										<div>
											<p className="text-orange-500 font-medium">
												Creators Required
											</p>
											<p className="text-lg font-semibold">
												{project.creatorsRequired} Creators
											</p>
										</div>

										{/* Conditional third section based on status */}
										{project.status === "Accepting Pitches" ||
										project.status === "Completed" ? (
											<div>
												<p className="text-orange-500 font-medium">
													Creators Applied
												</p>
												<p className="text-lg font-semibold">
													{project.creatorsApplied} Applied
												</p>
											</div>
										) : (
											project.status === "Ongoing Project" && (
												<div>
													<p className="text-orange-500 font-medium">
														Submissions
													</p>
													<p className="text-lg font-semibold">
														{project.submissions.videos} Videos •{" "}
														{project.submissions.pending} Pending
													</p>
												</div>
											)
										)}
									</div>

									{/* Action Button */}
									{project.status === "Draft" ? (
										<Link
											href={`/dashboard/projects/edit/${project.id}`}
											className="inline-block py-3 px-6 bg-orange-500 text-white font-medium rounded-md items-center justify-center gap-2"
										>
											Edit Project
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
												className="inline ml-2"
											>
												<path
													d="M5 12H19M19 12L12 5M19 12L12 19"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</Link>
									) : (
										<Link
											href={`/dashboard/projects/${project.id}`}
											className="inline-block py-3 px-6 bg-orange-500 text-white font-medium rounded-md items-center justify-center gap-2"
										>
											View Project
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
												className="inline ml-2"
											>
												<path
													d="M5 12H19M19 12L12 5M19 12L12 19"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
				)}
		</div>
	);
};

export default ProjectDashboard;