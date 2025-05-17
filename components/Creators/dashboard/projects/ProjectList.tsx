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

export default function ProjectList() {
	const { currentUser } = useAuth();
	const [projects, setProjects] = useState<ProjectFormData[]>([]);
	const [filteredProjects, setFilteredProjects] = useState<ProjectFormData[]>(
		[]
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("All Projects");
	const [isLoading, setIsLoading] = useState(true);
	const [sortOption, setSortOption] = useState("latest");

	// Counts for each tab
	const counts = {
		"All Projects": projects.length,
		Applied: projects.filter((project) => project.status === "pending").length,
		"In Progress": projects.filter(p => p.status === "approved").length,
		Interested: projects.filter((project) => project.status === "interested")
			.length,
		Rejected: projects.filter((project) => project.status === "rejected")
			.length,
		Completed: projects.filter((project) => project.status === "completed")
			.length,
	};

	useEffect(() => {
		const fetchProjects = async () => {
			// Only fetch if we have a user
			if (!currentUser) {
				setIsLoading(false); // Stop loading if no user
				return;
			}

			setIsLoading(true);
			try {
				const userId = currentUser.uid;
				console.log("Fetching projects for user ID:", userId);
				const response = await fetch(`/api/user-projects?userId=${userId}`);
				console.log("Response status:", response);
				if (!response.ok) {
					throw new Error("Failed to fetch projects");
				}
				const data = await response.json();
				console.log("API response:", data);
				setProjects(data.projects);
			} catch (error) {
				console.error("Error fetching projects:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchProjects();
	}, [currentUser]);

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
					project.projectDetails.projectName
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					project.projectDetails.projectDescription
						?.toLowerCase()
						.includes(searchQuery.toLowerCase())
			);
		}

		// Sort the projects based on the selected option
		switch (sortOption) {
			case "latest":
				filtered.sort((a, b) => {
					const dateA =
						a.createdAt &&
						typeof a.createdAt === "object" &&
						"_seconds" in a.createdAt
							? new Date(a.createdAt._seconds * 1000)
							: new Date(a.createdAt || 0);
					const dateB =
						b.createdAt &&
						typeof b.createdAt === "object" &&
						"_seconds" in b.createdAt
							? new Date(b.createdAt._seconds * 1000)
							: new Date(b.createdAt || 0);
					return dateB.getTime() - dateA.getTime(); // Newest first
				});
				break;
			case "oldest":
				filtered.sort((a, b) => {
					const dateA =
						a.createdAt &&
						typeof a.createdAt === "object" &&
						"_seconds" in a.createdAt
							? new Date(a.createdAt._seconds * 1000)
							: new Date(a.createdAt || 0);
					const dateB =
						b.createdAt &&
						typeof b.createdAt === "object" &&
						"_seconds" in b.createdAt
							? new Date(b.createdAt._seconds * 1000)
							: new Date(b.createdAt || 0);
					return dateA.getTime() - dateB.getTime(); // Oldest first
				});
				break;
			case "popular":
				filtered.sort((a, b) => {
					// Sort by applicants count or views if available
					const popularityA = a.applicantsCount || a.views || 0;
					const popularityB = b.applicantsCount || b.views || 0;
					return popularityB - popularityA; // Higher count first
				});
				break;
			default:
				// Default to latest if no valid option is selected
				filtered.sort((a, b) => {
					const dateA =
						a.createdAt &&
						typeof a.createdAt === "object" &&
						"_seconds" in a.createdAt
							? new Date(a.createdAt._seconds * 1000)
							: new Date(a.createdAt || 0);
					const dateB =
						b.createdAt &&
						typeof b.createdAt === "object" &&
						"_seconds" in b.createdAt
							? new Date(b.createdAt._seconds * 1000)
							: new Date(b.createdAt || 0);
					return dateB.getTime() - dateA.getTime();
				});
		}

		setFilteredProjects(filtered);
	}, [projects, activeTab, searchQuery, sortOption, currentUser]);

	const hasProjects = projects.length > 0;

	return (
		<div className="max-w-6xl mx-auto p-4">
				<SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
			<div className="flex justify-between items-center mb-6">
				{hasProjects && (
					<div className="flex items-center">
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
				)}
			</div>

			{hasProjects && (
				<StatusTabs
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					counts={counts}
				/>
			)}

			<div className="space-y-4 mt-4">
				{isLoading ? (
					<div className="flex flex-col justify-center items-center">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
						<div className="text-center">Loading projects...</div>
					</div>
				) : projects.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-lg text-gray-600">No projects found</p>
						<p className="text-sm text-gray-500 mt-2">Your projects will appear here once you&apos;ve applied or shown interest</p>
					</div>
				) : filteredProjects.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-lg text-gray-600">No matching projects found</p>
						<p className="text-sm text-gray-500 mt-2">Try adjusting your search criteria or tab selection</p>
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