"use client";

import { useEffect, useState } from "react";
import ContestCard from "./ContestCard";
import StatusTabs from "./StatusTabs";
import SearchBar from "./SearchBar";
import { useAuth } from "@/context/AuthContext";

interface Contest {
	id: string;
	title: string;
	description: string;
	endDate: string;
	status: string;
	contestType: string;
	creatorCount: number;
	organizationId: string;
	organizationName: string;
	organizationLogo: string;
	joinedAt?: string;
	applicationId?: string;
	interestId?: string;
}

export default function ContestList() {
	const [contests, setContests] = useState<Contest[]>([]);
	const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("All Contests");
	const [isLoading, setIsLoading] = useState(true);

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

	const {currentUser} = useAuth()
	useEffect(() => {
		const fetchContests = async () => {
			setIsLoading(true);
			try {
				// Replace with your actual user ID or get from context/auth
				const userId = currentUser?.uid;
				const response = await fetch(`/api/user-contests?userId=${userId}`);
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
	}, []);

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
					contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					contest.description.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		setFilteredContests(filtered);
	}, [contests, activeTab, searchQuery]);

	return (
		<div className="max-w-6xl mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
				<div className="flex items-center">
					<span className="mr-2 text-gray-600">Sort By</span>
					<button className="flex items-center px-3 py-1 bg-white border border-gray-300 rounded-md text-gray-700">
						Latest
						<svg
							className="ml-2 w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
				</div>
			</div>

			<StatusTabs
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				counts={counts}
			/>

			<div className="space-y-4 mt-4">
				{isLoading ? (
					<div className="text-center py-8">Loading contests...</div>
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
