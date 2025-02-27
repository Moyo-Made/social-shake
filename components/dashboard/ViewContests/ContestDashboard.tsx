"use client";

import { useState, useEffect, SetStateAction } from "react";
import { Search } from "lucide-react";
import {
	Select,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SelectContent } from "@radix-ui/react-select";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ContestDashboard = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [budgetFilter, setBudgetFilter] = useState("");
	const [rankingFilter, setRankingFilter] = useState("");
	const [filteredContests, setFilteredContests] = useState<
		typeof initialContests
	>([]);

	// Sample data for contests
	const initialContests = [
		{
			id: 1,
			status: "Active",
			title: "Best TikTok Ad for XYZ Shoes Flippers",
			totalBudget: 5000,
			startDate: "March 20, 2025",
			endDate: "March 26, 2026",
			rankingMethod: "Total Likes",
			contestants: 20,
			metrics: { views: "1.1k", likes: 304, comments: 50 },
		},
		{
			id: 2,
			status: "Draft",
			title: "Best TikTok Ad for XYZ Shoes Flippers",
			totalBudget: 1500,
			startDate: "Not Set",
			endDate: "Not Set",
			rankingMethod: "Not Set",
			contestants: "-",
			metrics: { views: 0, likes: 0, comments: 0 },
		},
		{
			id: 3,
			status: "Completed",
			title: "Best TikTok Ad for XYZ Shoes Flippers",
			totalBudget: 5000,
			startDate: "March 20, 2025",
			endDate: "March 26, 2025",
			rankingMethod: "Impressions",
			contestants: 33,
			metrics: { views: "20.2k", likes: "4.2k", comments: 200 },
		},
		{
			id: 4,
			status: "Reviewing",
			title: "Best TikTok Ad for XYZ Shoes Flippers",
			totalBudget: 1500,
			startDate: "March 20, 2025",
			endDate: "March 26, 2025",
			rankingMethod: "Impressions",
			applicationType: "Applications",
			applications: 10,
			metrics: { views: 0, likes: 0, comments: 0 },
		},
	];

	// Apply filters whenever any filter changes
	useEffect(() => {
		applyFilters();
	}, [searchTerm, statusFilter, budgetFilter, rankingFilter]);

	// Function to apply all filters
	const applyFilters = () => {
		let result = [...initialContests];

		// Apply search filter
		if (searchTerm) {
			result = result.filter((contest) =>
				contest.title.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Apply status filter
		if (statusFilter && statusFilter !== "all-status") {
			result = result.filter((contest) => contest.status === statusFilter);
		}

		// Apply budget filter
		if (budgetFilter && budgetFilter !== "all-budget") {
			result = result.filter((contest) => {
				const budget = contest.totalBudget;
				if (budgetFilter === "low") return budget < 1000;
				if (budgetFilter === "medium") return budget >= 1000 && budget <= 5000;
				if (budgetFilter === "high") return budget > 5000;
				return true;
			});
		}

		// Apply ranking filter
		if (rankingFilter && rankingFilter !== "all-ranking") {
			result = result.filter((contest) => {
				// Handle "Not Set" case
				if (contest.rankingMethod === "Not Set") return false;

				// Match exact ranking method or check if it contains the filter term
				return (
					contest.rankingMethod === rankingFilter ||
					contest.rankingMethod.includes(rankingFilter)
				);
			});
		}

		setFilteredContests(result);
	};

	// Handle search input change
	const handleSearch = (e: { target: { value: SetStateAction<string> } }) => {
		setSearchTerm(e.target.value);
	};

	// Initialize filtered contests with all contests
	useEffect(() => {
		setFilteredContests(initialContests);
	}, []);

	return (
		<div className="bg-orange-50 p-4 min-h-screen">
			{/* Header with search and filters */}
			<div className="flex justify-between mb-4">
				<div className="relative">
					<Input
						type="text"
						placeholder="Search Contests"
						className="pl-3 pr-10 py-2 rounded-md border border-[#D0D5DD] bg-white focus:outline-gray-400"
						value={searchTerm}
						onChange={handleSearch}
					/>
					<Search className="absolute right-3 top-3 text-gray-400 h-4 w-4" />
				</div>

				<div className="flex gap-2">
					<div className="relative">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full bg-white md:w-32">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent className="md:w-32 px-1 bg-white z-50">
								<SelectItem value="all-status">All</SelectItem>
								<SelectItem value="Active">Active</SelectItem>
								<SelectItem value="Draft">Draft</SelectItem>
								<SelectItem value="Completed">Completed</SelectItem>
								<SelectItem value="Reviewing">Reviewing</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="relative">
						<Select value={budgetFilter} onValueChange={setBudgetFilter}>
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

					<div className="relative">
						<Select value={rankingFilter} onValueChange={setRankingFilter}>
							<SelectTrigger className="w-full bg-white md:w-40">
								<SelectValue placeholder="Ranking Method" />
							</SelectTrigger>
							<SelectContent className="md:w-40 px-1 bg-white z-50">
								<SelectItem value="all-ranking">All</SelectItem>
								<SelectItem value="Impressions">Impressions</SelectItem>
								<SelectItem value="Likes">Likes</SelectItem>
								<SelectItem value="Total Likes">Total Likes</SelectItem>
								<SelectItem value="Engagement">Engagement</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button className="bg-orange-500 text-white px-4 py-1 rounded-md flex items-center">
						<Link href="/dashboard/new-contest">Create New Contest</Link>
						<span className="ml-1 text-lg">+</span>
					</Button>
				</div>
			</div>

			{/* Contest grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{filteredContests.length > 0 ? (
					filteredContests.map((contest) => (
						<Link key={contest.id} href="/dashboard/contests/details">
							<div
								className={`rounded-lg p-4 ${
									contest.status === "Active"
										? "bg-white border border-[#067647]"
										: contest.status === "Draft"
										? "bg-white border border-[#667085]"
										: contest.status === "Completed"
										? "bg-white border border-[#FDD849]"
										: "bg-white border border-[#FC52E4]"
								}`}
							>
								{/* Contest card */}
								<div className="relative">
									<img
										src="/images/contest-thumbnail.png"
										alt="Contest thumbnail"
										className="w-full h-full object-cover rounded-md mb-2"
									/>

									<div
										className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
											contest.status === "Active"
												? "bg-[#ABEFC6] text-[#067647]"
												: contest.status === "Draft"
												? "bg-[#F6F6F6] text-[#667085]"
												: contest.status === "Completed"
												? "bg-[#FDD849] text-[#1A1A1A]"
												: "bg-[#FFE5FB] text-[#FC52E4]"
										}`}
									>
										{contest.status === "Active" ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="12"
												height="12"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="shrink-0"
											>
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										) : (
											<span
												className="inline-block w-1 h-1 rounded-full shrink-0"
												style={{
													backgroundColor:
														contest.status === "Draft"
															? "#667085"
															: contest.status === "Completed"
															? "#1A1A1A"
															: "#FC52E4",
												}}
											></span>
										)}
										{contest.status}
									</div>
								</div>

								<h3 className="text-lg font-medium mb-2">{contest.title}</h3>

								<div className="grid grid-cols-3 gap-4 mb-2">
									<div>
										<p className="text-xs text-[#475467]">Total Budget</p>
										<p className="text-sm">${contest.totalBudget}</p>
									</div>
									<div>
										<p className="text-xs text-[#475467]">Start Date</p>
										<p className="text-sm">{contest.startDate}</p>
									</div>
									<div>
										<p className="text-xs text-[#475467]">End Date</p>
										<p className="text-sm">{contest.endDate}</p>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-4 mt-3">
									<div>
										<p className="text-xs text-[#475467]">Ranking Method</p>
										<p className="text-sm">{contest.rankingMethod}</p>
									</div>
									<div>
										<p className="text-xs text-[#475467]">
											{contest.applicationType || "Contestants"}
										</p>
										<p className="text-sm">
											{contest.applicationType
												? contest.applications
												: contest.contestants}
										</p>
									</div>
									<div>
										<p className="text-xs text-[#475467]">Metrics</p>
										<div className="flex items-center space-x-3 text-sm">
											<span className="flex items-center">
												<Image
													src="/icons/views.svg"
													alt="Views"
													width={20}
													height={20}
													className="mr-1"
												/>
												{contest.metrics.views}
											</span>
											<span className="flex items-center">
												<Image
													src="/icons/likes.svg"
													alt="Likes"
													width={15}
													height={15}
													className="mr-1"
												/>
												{contest.metrics.likes}
											</span>
											<span className="flex items-center">
												<Image
													src="/icons/comments.svg"
													alt="Views"
													width={15}
													height={15}
													className="mr-1"
												/>
												{contest.metrics.comments}
											</span>
										</div>
									</div>
								</div>
							</div>
						</Link>
					))
				) : (
					<div className="col-span-2 text-center py-8 bg-white rounded-lg">
						<p className="text-gray-500">No contests match your filters</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default ContestDashboard;
