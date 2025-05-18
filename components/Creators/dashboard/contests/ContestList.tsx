"use client";

import { useEffect, useState } from "react";
import ContestCard from "./ContestCard";
import StatusTabs from "./StatusTabs";
import SearchBar from "./SearchBar";
import { useAuth } from "@/context/AuthContext";
import { Contest } from "@/types/contests";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export default function ContestList() {
	const { currentUser } = useAuth();
	const [contests, setContests] = useState<Contest[]>([]);
	const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("All Contests");
	const [isLoading, setIsLoading] = useState(true);
	const [sortOption, setSortOption] = useState("latest");

	// Counts for each tab
	const counts = {
		"All Contests": contests.length,
		Applied: contests.filter((contest) => contest.status === "pending").length,
		Joined: contests.filter((contest) => contest.status === "joined").length,
		Interested: contests.filter((contest) => contest.status === "interested")
			.length,
		Rejected: contests.filter((contest) => contest.status === "rejected")
			.length,
		Completed: contests.filter((contest) => contest.status === "completed")
			.length,
	};

	useEffect(() => {
		const fetchContests = async () => {
			// Only fetch if we have a user
			if (!currentUser) {
				setIsLoading(false); // Stop loading if no user
				return;
			}

			setIsLoading(true);
			try {
				const userId = currentUser.uid;
				console.log("Fetching contests for user ID:", userId);
				const response = await fetch(`/api/user-contests?userId=${userId}`);
				console.log("Response status:", response);
				if (!response.ok) {
					throw new Error("Failed to fetch contests");
				}
				const data = await response.json();
				console.log("API response:", data);
				setContests(data.contests);
			} catch (error) {
				console.error("Error fetching contests:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchContests();
	}, [currentUser]);

	useEffect(() => {
		let filtered = [...contests];

		// Filter by status based on active tab
		if (activeTab !== "All Contests") {
			const statusMap: Record<string, string> = {
				Applied: "pending",
				Joined: "joined",
				Interested: "interested",
				Rejected: "rejected",
				Completed: "completed",
			};
			filtered = filtered.filter(
				(contest) => contest.status === statusMap[activeTab]
			);
		}

		// Filter by search query
		if (searchQuery) {
			filtered = filtered.filter(
				(contest) =>
					contest.basic?.contestName
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					contest.basic?.description
						?.toLowerCase()
						.includes(searchQuery.toLowerCase())
			);
		}

		// Sort the contests based on the selected option
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
			// case "relevant":
			// 	filtered.sort((a, b) => {
			// 		// Calculate relevance score based on multiple factors
			// 		// This is a simple example - you can customize this based on your needs
			// 		const scoreA = currentUser ? calculateRelevanceScore(a, currentUser) : 0;
			// 		const scoreB = currentUser ? calculateRelevanceScore(b, currentUser) : 0;
			// 		return scoreB - scoreA; // Higher score first
			// 	});
			// 	break;
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

		setFilteredContests(filtered);
	}, [contests, activeTab, searchQuery, sortOption, currentUser]);

	const hasContests = contests.length > 0;

	return (
		<div className="max-w-6xl mx-auto p-4">
			{hasContests && (
				<div className="flex justify-between items-center mb-6">
					<SearchBar
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
					/>
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
				</div>
			)}

			{hasContests && (
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
						<div className="text-center">Loading contests...</div>
					</div>
				) : filteredContests.length === 0 ? (
					<div className="text-center py-8">No contests found</div>
				) : (
					filteredContests.map((contest) => (
						<ContestCard key={contest.id} contest={contest} />
					))
				)}
			</div>
		</div>
	);
}
