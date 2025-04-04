"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const ProjectAnalytics = () => {
	// Mock data for Project analytics table
	const projectAnalyticsData = [
		{
			position: "#1",
			username: "Colina42rf",
			totalSales: "20",
			profileImage: "/icons/colina.svg",
			totalVideos: "$4200",
			commissionEarned: "$420",
			conversionRate: "3.4%",
			totalClicks: "200",
		},
		{
			position: "#2",
			username: "Madev7",
			totalSales: "20",
			profileImage: "/icons/colina.svg",
			totalVideos: "$4200",
			commissionEarned: "$420",
			conversionRate: "7.2%",
			totalClicks: "420",
		},
		{
			position: "#3",
			username: "Colina42rf",
			totalSales: "20",
			profileImage: "/icons/colina.svg",
			totalVideos: "$4200",
			commissionEarned: "$420",
			conversionRate: "3.4%",
			totalClicks: "400",
		},
		{
			position: "#4",
			username: "Colina42rf",
			totalSales: "20",
			profileImage: "/icons/colina.svg",
			totalVideos: "$4200",
			commissionEarned: "$420",
			conversionRate: "7.2%",
			totalClicks: "200",
		},
		{
			position: "#5",
			username: "Colina42rf",
			totalSales: "20",
			profileImage: "/icons/colina.svg",
			totalVideos: "$4200",
			commissionEarned: "$420",
			conversionRate: "3.4%",
			totalClicks: "420",
		},
	];

	const [searchQuery, setSearchQuery] = useState("");
	const [weekFilter, setWeekFilter] = useState("");
	const [filteredData, setFilteredData] = useState(projectAnalyticsData);

	// Handle search input
	const handleSearch = (e: { target: { value: string } }) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);

		// Filter data based on search query
		if (query.trim() === "") {
			setFilteredData(projectAnalyticsData);
		} else {
			const filtered = projectAnalyticsData.filter((item) =>
				item.username.toLowerCase().includes(query)
			);
			setFilteredData(filtered);
		}
	};

	// Handle week filter change
	const handleWeekChange = (value: string) => {
		setWeekFilter(value);
		// In a real application, you would fetch or filter data based on the selected week
		// For this example, we're just updating the state
	};

	return (
		<div className="w-[65rem] mx-auto">
			{/* Filters Section */}
			<div className="flex justify-between items-center mb-4">
				{/* Search on the left */}
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<svg
							className="w-4 h-4 text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							></path>
						</svg>
					</div>
					<Input
						type="text"
						className="pl-10 pr-4 py-2 w-64"
						placeholder="Search creator..."
						value={searchQuery}
						onChange={handleSearch}
					/>
				</div>

				{/* Sort by week on the right */}
				<div>
					<Select value={weekFilter} onValueChange={handleWeekChange}>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="Sort by week" />
						</SelectTrigger>
						<SelectContent className="bg-[#f7f7f7]">
							<SelectItem value="This Week">This Week</SelectItem>
							<SelectItem value="Last Week">Last Week</SelectItem>
							<SelectItem value="Two Weeks Ago">Two Weeks Ago</SelectItem>
							<SelectItem value="Last Month">Last Month</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Project Analytics Table */}
			<div className="flex bg-gray-50 border rounded-t-lg py-3 text-[#475467] text-sm font-normal border-b border-gray-200">
				<div className="flex-1 text-center">Position</div>
				<div className="flex-1 mr-5 text-center">Creator Username</div>
				<div className="flex-1 text-center">Total Sales</div>
				<div className="flex-1 text-center">Total Video(s) GMV</div>
				<div className="flex-1 text-center">Commision Earned</div>
				<div className="flex-1 text-center">Conversion Rate</div>
				<div className="flex-1 text-center">Total Clicks</div>
			</div>

			{/* Table Rows */}
			{filteredData.map((item, index) => (
				<div
					key={index}
					className="flex py-3 items-center border border-gray-200 text-sm text-[#101828]"
				>
					<div className="flex-1 text-center font-medium">{item.position}</div>
					<div className="flex-1 mr-5 flex justify-start items-center gap-2">
						<Image
							src={item.profileImage}
							alt={item.username}
							className="w-8 h-8 rounded-full"
							width={8}
							height={8}
						/>
						<span className="underline font-medium">{item.username}</span>
					</div>
					<div className="flex-1 text-center">{item.totalSales}</div>
					<div className="flex-1 text-center">{item.totalVideos}</div>
					<div className="flex-1 text-center">{item.commissionEarned}</div>
					<div className="flex-1 text-center">{item.conversionRate}</div>
					<div className="flex-1 text-center">{item.totalClicks}</div>
				</div>
			))}
		</div>
	);
};

export default ProjectAnalytics;
