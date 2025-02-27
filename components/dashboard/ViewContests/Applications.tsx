import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Check, Search } from "lucide-react";

const Applications = () => {
	// Sample data for creators
	const initialCreators = [
		{
			id: 1,
			username: "ColineDzf",
			handle: "@colinedzfr",
			date: "March 14, 2025",
			status: "Pending",
			avatarSrc: "https://i.pravatar.cc/150?img=1",
		},
		{
			id: 2,
			username: "OlumaWeb",
			handle: "@olumawebb",
			date: "March 22, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=2",
		},
		{
			id: 3,
			username: "tripalmez94",
			handle: "@tripalmezKek",
			date: "March 24, 2025",
			status: "Rejected",
			avatarSrc: "https://i.pravatar.cc/150?img=3",
		},
		{
			id: 4,
			username: "ColineDzf",
			handle: "@colinedzfr",
			date: "March 14, 2025",
			status: "Pending",
			avatarSrc: "https://i.pravatar.cc/150?img=4",
		},
		{
			id: 5,
			username: "OlumaWeb",
			handle: "@olumawebb",
			date: "March 22, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=5",
		},
		{
			id: 6,
			username: "tripalmez94",
			handle: "@tripalmezKek",
			date: "March 24, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=6",
		},
	];

	// State for filtering and search
	const [creators, setCreators] = useState(initialCreators);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortOrder, setSortOrder] = useState("");

	// Handle search input
	const handleSearch = (e: { target: { value: string } }) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);

		filterCreators(query, statusFilter);
	};

	// Handle status filter
	const handleStatusFilter = (value: React.SetStateAction<string>) => {
		setStatusFilter(value);
		filterCreators(searchQuery, value);
	};

	// Handle sorting
	const handleSort = (value: React.SetStateAction<string>) => {
		setSortOrder(value);

		const sortedCreators = [...creators];

		if (value === "date-asc") {
			sortedCreators.sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
			);
		} else if (value === "date-desc") {
			sortedCreators.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);
		} else if (value === "name-asc") {
			sortedCreators.sort((a, b) => a.username.localeCompare(b.username));
		} else if (value === "name-desc") {
			sortedCreators.sort((a, b) => b.username.localeCompare(a.username));
		}

		setCreators(sortedCreators);
	};

	// Filter creators based on search query and status
	const filterCreators = (
		query: string,
		status: React.SetStateAction<string>
	) => {
		let filtered = initialCreators;

		if (query) {
			filtered = filtered.filter(
				(creator) =>
					creator.username.toLowerCase().includes(query) ||
					creator.handle.toLowerCase().includes(query)
			);
		}

		if (status && status !== "All") {
			filtered = filtered.filter((creator) => creator.status === status);
		}

		setCreators(filtered);
	};

	// Get button styling based on status
	const getStatusStyles = (status: string) => {
		switch (status) {
			case "Pending":
				return "bg-yellow-100 text-yellow-800 border border-yellow-200";
			case "Approved":
				return "bg-green-100 text-green-800 border border-green-200";
			case "Rejected":
				return "bg-red-100 text-red-800 border border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border border-gray-200";
		}
	};

	// Get action button styling
	const getActionButtonStyle = (status: string) => {
		return status === "Pending" ? "text-orange-500" : "text-orange-500";
	};

	// Get action button text
	const getActionText = (status: string) => {
		return status === "Pending" ? "Review Application" : "View Application";
	};

	// Render status indicator
	const renderStatusIndicator = (status: string) => {
		if (status === "Approved") {
			return <Check size={12} className="mr-1 text-green-600" />;
		} else if (status === "Pending") {
			return <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />;
		} else if (status === "Rejected") {
			return <div className="w-2 h-2 bg-red-400 rounded-full mr-1" />;
		}
		return null;
	};

	// Define header columns for more direct alignment
	const headerColumns = [
		"Creator Username",
		"Tiktok Profile",
		"Application Date",
		"Status",
		"",
	];

	return (
		<div className="w-full mx-auto bg-white p-4 rounded-lg">
			<div className="flex justify-between mb-6">
				<div className="relative w-64">
					<Input
						type="text"
						placeholder="Search Creator"
						value={searchQuery}
						onChange={handleSearch}
						className="pl-8 pr-4 py-2 border rounded-md"
					/>
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
				</div>
				<div className="flex gap-2">
					<Select value={statusFilter} onValueChange={handleStatusFilter}>
						<SelectTrigger className="w-32">
							<div className="flex items-center">
								{statusFilter ? <SelectValue /> : <span>Status</span>}
							</div>
						</SelectTrigger>
						<SelectContent className="bg-white">
							<SelectItem value="All">All</SelectItem>
							<SelectItem value="Pending">Pending</SelectItem>
							<SelectItem value="Approved">Approved</SelectItem>
							<SelectItem value="Rejected">Rejected</SelectItem>
						</SelectContent>
					</Select>

					<Select value={sortOrder} onValueChange={handleSort}>
						<SelectTrigger className="w-36">
							<div className="flex items-center">
								{sortOrder ? <SelectValue /> : <span>Sort by Date</span>}
							</div>
						</SelectTrigger>
						<SelectContent className="bg-white">
							<SelectItem value="date-desc">Date (Newest)</SelectItem>
							<SelectItem value="date-asc">Date (Oldest)</SelectItem>
							<SelectItem value="name-asc">Name (A-Z)</SelectItem>
							<SelectItem value="name-desc">Name (Z-A)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Table with column headers directly underneath */}
			<div className="overflow-hidden border rounded-md">
				{/* Column Headers */}
				<div className="grid grid-cols-5 gap-4 bg-gray-50 p-3 border-b">
					{headerColumns.map((header, index) => (
						<div key={index} className="text-gray-600 font-medium">
							{header}
						</div>
					))}
				</div>

				{/* Table Body */}
				<div className="bg-white">
					{creators.map((creator) => (
						<div
							key={creator.id}
							className="grid grid-cols-5 gap-4 p-3 border-b items-center"
						>
							<div className="flex items-center">
								<div className="h-8 w-8 rounded-full overflow-hidden mr-2">
									<img src={creator.avatarSrc} alt={creator.username} />
								</div>
								<span>{creator.username}</span>
							</div>
							<div className="text-orange-500">{creator.handle}</div>
							<div>{creator.date}</div>
							<div>
								<div
									className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles(
										creator.status
									)}`}
								>
									{renderStatusIndicator(creator.status)}
									<span>{creator.status}</span>
								</div>
							</div>
							<div>
								<Button
									variant="link"
									className={getActionButtonStyle(creator.status)}
								>
									{getActionText(creator.status)}
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Applications;
