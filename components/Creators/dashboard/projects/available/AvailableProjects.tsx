"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProjectCard from "./ProjectCard";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ProjectFormData } from "@/types/contestFormData";

const CreatorProjectDashboard: React.FC = () => {
	const { currentUser } = useAuth();
	const [projects, setProjects] = useState<ProjectFormData[]>([]);
	const [filteredProjects, setFilteredProjects] = useState<ProjectFormData[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [lastDocId, setLastDocId] = useState<string | null>(null);

	// Search and filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [projectType, setProjectType] = useState("all");
	const [productType, setProductType] = useState("all");
	const [sortBy, setSortBy] = useState("newest");
	const [budgetRange, setBudgetRange] = useState("all");

	const fetchProjects = async (reset = true) => {
		if (!currentUser?.uid) return;

		try {
			setLoading(true);

			let url = `/api/projects`;
			if (!reset && lastDocId) {
				url += `?startAfter=${lastDocId}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Failed to fetch projects");
			}

			const data = await response.json();

			if (reset) {
				setProjects(data.data);
			} else {
				setProjects((prev) => [...prev, ...data.data]);
			}

			setHasMore(data.pagination.hasMore);
			setLastDocId(data.pagination.lastDocId);
			setError(null);
		} catch (err) {
			setError("Error loading projects. Please try again.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	// Apply filters whenever filter values change
	useEffect(() => {
		if (projects.length > 0) {
			applyFilters();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery, projectType, productType, sortBy, budgetRange, projects]);

	useEffect(() => {
		if (currentUser?.uid) {
			fetchProjects();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.uid]);

	const applyFilters = () => {
		let result = [...projects];

		// Apply search query filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter((project) => {
				const nameMatch = project.projectDetails.projectName
					?.toLowerCase()
					.includes(query);

				// Handle project description correctly whether it's a string or an array
				let descriptionMatch = false;
				const description = project.projectDetails.projectDescription;

				if (Array.isArray(description)) {
					// If it's an array, check if any element includes the query
					descriptionMatch = description.some(
						(desc) =>
							typeof desc === "string" && desc.toLowerCase().includes(query)
					);
				} else if (typeof description === "string") {
					// If it's a string, check if it includes the query
					descriptionMatch = description.toLowerCase().includes(query);
				}

				return nameMatch || descriptionMatch;
			});
		}

		// Apply project type filter
		if (projectType !== "all") {
			result = result.filter(
				(project) => project.projectDetails.projectType === projectType
			);
		}

		// Apply product type filter
		if (productType !== "all") {
			result = result.filter(
				(project) => project.projectDetails.productType === productType
			);
		}

		// Apply budget range filter
		if (budgetRange !== "all") {
			switch (budgetRange) {
				case "under1000":
					result = result.filter(
						(project) => (project.creatorPricing?.totalBudget || 0) < 1000
					);
					break;
				case "1000to5000":
					result = result.filter((project) => {
						const budget = project.creatorPricing?.totalBudget || 0;
						return budget >= 1000 && budget <= 5000;
					});
					break;
				case "over5000":
					result = result.filter(
						(project) => (project.creatorPricing?.totalBudget || 0) > 5000
					);
					break;
			}
		}

		// Apply sorting
		switch (sortBy) {
			case "newest":
				result.sort(
					(a, b) =>
						new Date(
							typeof b.createdAt === "object" && "_seconds" in b.createdAt
								? b.createdAt._seconds * 1000
								: (b.createdAt as string | number) || 0
						).getTime() -
						new Date(
							typeof a.createdAt === "object" && "_seconds" in a.createdAt
								? a.createdAt._seconds * 1000
								: new Date(a.createdAt || 0).getTime()
						).getTime()
				);
				break;
			case "oldest":
				result.sort(
					(a, b) =>
						new Date(
							typeof a.createdAt === "object" && "_seconds" in a.createdAt
								? a.createdAt._seconds * 1000
								: a.createdAt || 0
						).getTime() -
						new Date(
							typeof b.createdAt === "object" && "_seconds" in b.createdAt
								? b.createdAt._seconds * 1000
								: b.createdAt || 0
						).getTime()
				);
				break;
			case "budget-high":
				result.sort(
					(a, b) =>
						(b.creatorPricing?.totalBudget || 0) -
						(a.creatorPricing?.totalBudget || 0)
				);
				break;
			case "budget-low":
				result.sort(
					(a, b) =>
						(a.creatorPricing?.totalBudget || 0) -
						(b.creatorPricing?.totalBudget || 0)
				);
				break;
		}

		setFilteredProjects(result);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		applyFilters();
	};

	const loadMore = () => {
		fetchProjects(false);
	};

	const hasAvailableProjects = projects.length > 0;

	return (
		<div className="container mx-auto px-4 py-8">
			{hasAvailableProjects && (
				<div className="flex flex-col space-y-6">
					{/* Search and filter section - Matches the layout shown in the image */}
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						{/* Search input */}
						<form onSubmit={handleSearch} className="relative md:col-span-1">
							<Input
								placeholder="Search Projects"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 pr-4 py-2 w-full"
							/>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
						</form>

						{/* Filters */}
						<div className="md:col-span-1">
							<Select value={projectType} onValueChange={setProjectType}>
								<SelectTrigger>
									<SelectValue placeholder="Project Type" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="UGC Content Only">
										UGC Content Only
									</SelectItem>

									<SelectItem value="Creator-Posted UGC">
										Creator-Posted UGC
									</SelectItem>
									<SelectItem value="TikTok Shop">TikTok Shop</SelectItem>
									<SelectItem value="Spark Ads">Spark Ads</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="md:col-span-1">
							<Select value={productType} onValueChange={setProductType}>
								<SelectTrigger>
									<SelectValue placeholder="Product Type" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Products</SelectItem>
									<SelectItem value="Virtual">Virtual Product</SelectItem>
									<SelectItem value="Physical">Physical Product</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="md:col-span-1">
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger>
									<SelectValue placeholder="Sort By" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="newest">Newest First</SelectItem>
									<SelectItem value="oldest">Oldest First</SelectItem>
									<SelectItem value="budget-high">
										Budget: High to Low
									</SelectItem>
									<SelectItem value="budget-low">
										Budget: Low to High
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="md:col-span-1">
							<Select value={budgetRange} onValueChange={setBudgetRange}>
								<SelectTrigger>
									<SelectValue placeholder="Budget Range" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Budgets</SelectItem>
									<SelectItem value="under1000">Under $1,000</SelectItem>
									<SelectItem value="1000to5000">$1,000 - $5,000</SelectItem>
									<SelectItem value="over5000">Over $5,000</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Project listings */}
					{renderProjectList()}
				</div>
			)}
		</div>
	);

	function renderProjectList() {
		if (loading && projects.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
					<p className="text-gray-500 mt-4">Loading projects...</p>
				</div>
			);
		}

		if (error) {
			return (
				<div className="text-center py-12">
					<p className="text-red-500">{error}</p>
					<Button className="mt-4" onClick={() => fetchProjects()}>
						Try Again
					</Button>
				</div>
			);
		}

		if (filteredProjects.length === 0) {
			return (
				<div className="text-center py-12">
					<p className="text-gray-500">
						{projects.length === 0
							? "No projects found."
							: "No projects match your filters."}
					</p>
					{projects.length > 0 && (
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => {
								setSearchQuery("");
								setProjectType("all");
								setProductType("all");
								setSortBy("newest");
								setBudgetRange("all");
							}}
						>
							Clear Filters
						</Button>
					)}
				</div>
			);
		}

		if (loading && projects.length > 0) {
			return (
				<>
					<div className="relative">
						<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
							<div className="flex flex-col items-center">
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
								<p className="text-gray-500 mt-2">Updating projects...</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6 opacity-50">
							{filteredProjects.map((project, index) => (
								<ProjectCard
									key={project.projectId || `project-${index}`}
									project={project}
								/>
							))}
						</div>
					</div>
				</>
			);
		}

		return (
			<>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
					{filteredProjects.map((project, index) => (
						<ProjectCard
							key={project.projectId || `project-${index}`}
							project={project}
						/>
					))}
				</div>

				{hasMore && (
					<div className="flex justify-center mt-8">
						<Button variant="outline" onClick={loadMore} disabled={loading}>
							{loading ? (
								<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary" />
							) : (
								"Load More"
							)}
						</Button>
					</div>
				)}
			</>
		);
	}
};

export default CreatorProjectDashboard;
