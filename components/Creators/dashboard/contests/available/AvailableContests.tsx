"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ContestCard } from "./ContestCard";
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
import { ContestFormData } from "@/types/contestFormData";

const CreatorContestDashboard: React.FC = () => {
	const { currentUser } = useAuth();
	const [contests, setContests] = useState<ContestFormData[]>([]);
	const [filteredContests, setFilteredContests] = useState<ContestFormData[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [lastDocId, setLastDocId] = useState<string | null>(null);

	// Search and filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [industryType, setIndustryType] = useState("all");
	const [participationType, setParticipationType] = useState("all");
	const [sortBy, setSortBy] = useState("newest");
	const [budgetRange, setBudgetRange] = useState("all");

	const fetchActiveContests = async (reset = true) => {
		if (!currentUser?.uid) return;

		try {
			setLoading(true);

			// Build the API URL for active contests using our dedicated endpoint
			let url = `/api/contests`;

			// Add pagination parameter if needed
			if (!reset && lastDocId) {
				url += `?startAfter=${lastDocId}`;
			} else {
				url += "?";
			}

			// Add sorting parameter
			url += `&orderBy=createdAt&orderDirection=desc`;

			// Set default limit
			url += `&limit=12`;

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Failed to fetch contests");
			}

			const data = await response.json();

			if (reset) {
				setContests(data.data);
			} else {
				setContests((prev) => [...prev, ...data.data]);
			}

			setHasMore(data.pagination.hasMore);
			setLastDocId(data.pagination.lastDocId);
			setError(null);
		} catch (err) {
			setError("Error loading contests. Please try again.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	// Apply filters whenever filter values change
	useEffect(() => {
		if (contests.length > 0) {
			applyFilters();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		searchQuery,
		industryType,
		participationType,
		sortBy,
		budgetRange,
		contests,
	]);

	useEffect(() => {
		if (currentUser?.uid) {
			fetchActiveContests();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.uid]);

	const applyFilters = () => {
		let result = [...contests];

		// Apply search query filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(contest) =>
					contest.basic.contestName?.toLowerCase().includes(query) ||
					contest.basic.description?.toLowerCase().includes(query)
			);
		}

		// Apply industry filter
		if (industryType !== "all") {
			result = result.filter(
				(contest) => contest.basic.industry === industryType
			);
		}

		// Apply participation type filter
		if (participationType !== "all") {
			result = result.filter(
				(contest) => contest.requirements.videoType === participationType
			);
		}

		// Apply budget range filter
		if (budgetRange !== "all") {
			switch (budgetRange) {
				case "under1000":
					result = result.filter(
						(contest) => (contest.prizeTimeline.totalBudget || 0) < 1000
					);
					break;
				case "1000to5000":
					result = result.filter((contest) => {
						const budget = contest.prizeTimeline.totalBudget || 0;
						return budget >= 1000 && budget <= 5000;
					});
					break;
				case "over5000":
					result = result.filter(
						(contest) => (contest.prizeTimeline.totalBudget || 0) > 5000
					);
					break;
			}
		}

		// Apply sorting
		switch (sortBy) {
			case "newest":
				result.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				break;
			case "oldest":
				result.sort(
					(a, b) =>
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
				);
				break;
			case "budget-high":
				result.sort(
					(a, b) =>
						(b.prizeTimeline.totalBudget || 0) -
						(a.prizeTimeline.totalBudget || 0)
				);
				break;
			case "budget-low":
				result.sort(
					(a, b) =>
						(a.prizeTimeline.totalBudget || 0) -
						(b.prizeTimeline.totalBudget || 0)
				);
				break;
			case "participants":
				result.sort(
					(a, b) => (b.participantsCount || 0) - (a.participantsCount || 0)
				);
				break;
		}

		setFilteredContests(result);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		applyFilters();
	};

	const loadMore = () => {
		fetchActiveContests(false);
	};

	const hasAvailableContests = contests.length > 0;

	return (
		<div className="container mx-auto px-4 py-8">
			{hasAvailableContests && (
				<div className="flex flex-col space-y-6">
					{/* Search and filter section */}
					<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
						{/* Search input */}
						<form onSubmit={handleSearch} className="relative lg:col-span-1">
							<Input
								placeholder="Search Contest"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 pr-4 py-2 w-full"
							/>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
						</form>

						{/* Filters */}
						<div className="lg:col-span-1">
							<Select value={industryType} onValueChange={setIndustryType}>
								<SelectTrigger>
									<SelectValue placeholder="Industry Type" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Industries</SelectItem>
									<SelectItem value="technology">Technology</SelectItem>
									<SelectItem value="healthcare">Healthcare</SelectItem>
									<SelectItem value="finance">Finance</SelectItem>
									<SelectItem value="retail">Retail</SelectItem>
									<SelectItem value="education">Education</SelectItem>
									<SelectItem value="entertainment">Entertainment</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="lg:col-span-1">
							<Select
								value={participationType}
								onValueChange={setParticipationType}
							>
								<SelectTrigger>
									<SelectValue placeholder="Participation Type" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="individual">Individual</SelectItem>
									<SelectItem value="team">Team</SelectItem>
									<SelectItem value="both">Both</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="lg:col-span-1">
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
									<SelectItem value="participants">
										Most Participants
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="lg:col-span-1">
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

					{/* Contest listings */}
					{renderContestList()}
				</div>
			)}
		</div>
	);

	function renderContestList() {
		if (loading && contests.length === 0) {
			return (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
				</div>
			);
		}

		if (error) {
			return (
				<div className="text-center py-12">
					<p className="text-red-500">{error}</p>
					<Button className="mt-4" onClick={() => fetchActiveContests()}>
						Try Again
					</Button>
				</div>
			);
		}

		if (filteredContests.length === 0) {
			return (
				<div className="text-center py-12">
					<p className="text-gray-500">
						{contests.length === 0
							? "No active contests found."
							: "No contests match your filters."}
					</p>
					{contests.length > 0 && (
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => {
								setSearchQuery("");
								setIndustryType("all");
								setParticipationType("all");
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

		return (
			<>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
					{filteredContests.map((contest) => (
						<ContestCard key={contest.contestId} contest={contest} />
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

export default CreatorContestDashboard;
