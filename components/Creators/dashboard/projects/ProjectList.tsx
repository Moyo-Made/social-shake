"use client";

import { useEffect, useState } from "react";
import StatusTabs from "./StatusTabs";
import { useAuth } from "@/context/AuthContext";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import SearchBar from "../contests/SearchBar";
import ProjectCard from "./ProjectCard";
import { ProjectFormData } from "@/types/contestFormData";
import { useQuery } from "@tanstack/react-query";

export default function ProjectList() {
	const { currentUser, isLoading: authLoading } = useAuth();
	const [projects, setProjects] = useState<ProjectFormData[]>([]);
	const [filteredProjects, setFilteredProjects] = useState<ProjectFormData[]>(
		[]
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("All Projects");
	const [sortOption, setSortOption] = useState("latest");

	// Counts for each tab
	const counts = {
		"All Projects": projects.length,
		Applied: projects.filter((project) => project.status === "pending").length,
		"In Progress": projects.filter((p) => p.status === "approved").length,
		Interested: projects.filter((project) => project.status === "interested")
			.length,
		Rejected: projects.filter((project) => project.status === "rejected")
			.length,
		Completed: projects.filter((project) => project.status === "completed")
			.length,
	};

	const { 
		data: projectsData, 
		isLoading, 
		error, 
		refetch,
		isFetching,
		isSuccess
	} = useQuery({
		queryKey: ["user-projects", currentUser?.uid],
		queryFn: async () => {
			if (!currentUser?.uid) {
				throw new Error("User not authenticated");
			}

			const response = await fetch(
				`/api/user-projects?userId=${currentUser.uid}`,
				{
					headers: {
						'Cache-Control': 'no-cache',
					},
				}
			);
			
			if (!response.ok) {
				throw new Error(`Failed to fetch projects: ${response.statusText}`);
			}
			
			const data = await response.json();
			return data;
		},
		enabled: !authLoading && !!currentUser?.uid,
		staleTime: 0, // Always consider data stale
		refetchOnMount: true, // Always refetch when component mounts
		refetchOnWindowFocus: false, // Don't refetch on window focus
		retry: (failureCount, error) => {
			// Retry up to 3 times, but not for auth errors
			if (error.message.includes("not authenticated")) {
				return false;
			}
			return failureCount < 3;
		},
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	// Update state when data changes
	useEffect(() => {
		if (projectsData?.projects) {
			setProjects(projectsData.projects);
		} else if (projectsData && !projectsData.projects) {
			// Handle case where API returns success but no projects array
			setProjects([]);
		}
	}, [projectsData]);

	// Force refetch when user changes (handles navigation scenarios)
	useEffect(() => {
		if (currentUser?.uid && !isLoading && !isFetching) {
			refetch();
		}
	}, [currentUser?.uid, refetch, isLoading, isFetching]);

	useEffect(() => {
		let filtered = [...projects];

		// Filter by status based on active tab
		if (activeTab !== "All Projects") {
			const statusMap: Record<string, string> = {
				Applied: "pending",
				"In Progress": "approved",
				Joined: "joined",
				Interested: "interested",
				Rejected: "rejected",
				Completed: "completed",
			};
			filtered = filtered.filter(
				(project) => project.status === statusMap[activeTab]
			);
		}

		// Filter by search query
		if (searchQuery) {
			filtered = filtered.filter(
				(project) =>
					project.projectDetails?.projectName
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					project.projectDetails?.projectDescription
						?.toLowerCase()
						.includes(searchQuery.toLowerCase())
			);
		}

		// Sort the projects based on the selected option
		const sortProjects = (a: ProjectFormData, b: ProjectFormData) => {
			const getDate = (project: ProjectFormData) => {
				if (project.createdAt && typeof project.createdAt === "object" && "_seconds" in project.createdAt) {
					return new Date(project.createdAt._seconds * 1000);
				}
				return new Date(project.createdAt || 0);
			};

			switch (sortOption) {
				case "latest":
					return getDate(b).getTime() - getDate(a).getTime();
				case "oldest":
					return getDate(a).getTime() - getDate(b).getTime();
				case "popular":
					const popularityA = a.applicantsCount || a.views || 0;
					const popularityB = b.applicantsCount || b.views || 0;
					return popularityB - popularityA;
				default:
					return getDate(b).getTime() - getDate(a).getTime();
			}
		};

		filtered.sort(sortProjects);
		setFilteredProjects(filtered);
	}, [projects, activeTab, searchQuery, sortOption]);

	// Show loading while auth is initializing or while we're loading for the first time
	const isInitialLoading = authLoading || isLoading;
	
	if (isInitialLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<div className="text-center mt-2">Loading projects...</div>
			</div>
		);
	}

	// Show error state with retry option
	if (error && !projects.length) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="text-center">
					<p className="text-lg text-red-600 mb-2">Failed to load projects</p>
					<p className="text-sm text-gray-500 mb-4">
						{error.message || "Something went wrong"}
					</p>
					<button
						onClick={() => refetch()}
						className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
						disabled={isFetching}
					>
						{isFetching ? "Retrying..." : "Try Again"}
					</button>
				</div>
			</div>
		);
	}

	const hasProjects = projects.length > 0;

	return (
		<div className="max-w-6xl mx-auto p-4">
			{hasProjects && (
				<div className="flex justify-between items-center mb-6">
					<SearchBar
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
					/>
					<div className="flex justify-end items-center">
						<span className="mr-2 text-gray-600 text-sm">Sort By</span>
						<Select value={sortOption} onValueChange={setSortOption}>
							<SelectTrigger className="w-[120px] h-9">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent className="bg-[#f7f7f7]">
								<SelectItem value="latest">Latest</SelectItem>
								<SelectItem value="oldest">Oldest</SelectItem>
								<SelectItem value="popular">Most Popular</SelectItem>
								<SelectItem value="relevant">Most Relevant</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			{hasProjects && (
				<StatusTabs
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					counts={counts}
				/>
			)}

			<div className="space-y-4 mt-4">
				{/* Show loading indicator while fetching but we have existing data */}
				{/* {isFetching && projects.length > 0 && (
					<div className="text-center py-2">
						<div className="inline-flex items-center text-sm text-gray-500">
							<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-orange-500 mr-2"></div>
							Updating projects...
						</div>
					</div>
				)} */}

				{/* Only show "no projects" message after successful API call */}
				{isSuccess && projects.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-lg text-gray-600">No projects found</p>
						<p className="text-sm text-gray-500 mt-2">
							Your projects will appear here once you&apos;ve applied or shown
							interest
						</p>
					</div>
				) : isSuccess && filteredProjects.length === 0 && projects.length > 0 ? (
					<div className="text-center py-8">
						<p className="text-lg text-gray-600">No matching projects found</p>
						<p className="text-sm text-gray-500 mt-2">
							Try adjusting your search criteria or tab selection
						</p>
					</div>
				) : (
					filteredProjects.map((project) => (
						<ProjectCard key={project.projectId} project={project} />
					))
				)}
			</div>
		</div>
	);
}