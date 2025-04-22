"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Incentive, useContestForm } from "../newContest/ContestFormContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Applications from "./Applications";
import AnalyticsDashboard from "./Metrics";
import GMVMetrics from "./GMVMetrics";
import Leaderboard from "./Leaderboard";
import GMVData from "./GMVData";
import {
	BasicFormData,
	ContestType,
	PrizeTimelineFormData,
	RequirementsFormData,
} from "@/types/contestFormData";

interface ContestData {
	basic?: BasicFormData;
	prizeTimeline?: PrizeTimelineFormData;
	requirements?: RequirementsFormData;
	incentives?: Incentive[] | { prizeBreakdown?: string };
	status?: string;
	createdAt?: string;
	contestType?: ContestType;
}

interface ContestDetailPageProps {
	contestId: string;
}

export default function ContestDetailPage({
	contestId,
}: ContestDetailPageProps) {
	const [activeTab, setActiveTab] = useState<string>("contest-overview");
	const [contestData, setContestData] = useState<ContestData | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

	const { formData } = useContestForm();
	const contestType =
		contestData?.contestType ||
		formData?.basic?.contestType?.toLowerCase() ||
		"Leaderboard";

	// Format date for display
	const formatDate = (dateInput?: string | Date): string => {
		if (!dateInput) return "Not Set";
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		return date instanceof Date && !isNaN(date.getTime())
			? date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Not Set";
	};

	// Format status based on dates
	const getContestStatus = (data: ContestData | null): string => {
		if (!data) return "Draft";

		let status = data.status || "Draft";
		const now = new Date();
		const startDate = data.prizeTimeline?.startDate
			? new Date(data.prizeTimeline.startDate)
			: null;
		const endDate = data.prizeTimeline?.endDate
			? new Date(data.prizeTimeline.endDate)
			: null;

		if (status.toLowerCase() === "published" && (!startDate || !endDate)) {
			status = "Draft";
		} else if (
			status.toLowerCase() === "published" ||
			status.toLowerCase() === "active"
		) {
			if (startDate && endDate) {
				if (now < startDate) {
					status = "Scheduled";
				} else if (now >= startDate && now <= endDate) {
					status = "Active";
				} else if (now > endDate) {
					status = "Completed";
				}
			} else {
				status = "Draft";
			}
		}

		return status.charAt(0).toUpperCase() + status.slice(1);
	};

	useEffect(() => {
		const fetchContestData = async () => {
			if (!contestId) {
				setLoading(false);
				setError("Contest ID not found");
				return;
			}

			try {
				setLoading(true);
				const contestRef = doc(db, "contests", contestId.toString());
				const contestSnap = await getDoc(contestRef);

				if (contestSnap.exists()) {
					const data = contestSnap.data() as ContestData;
					setContestData(data);
				} else {
					setError("Contest not found");
				}

				setLoading(false);
			} catch (err) {
				console.error("Error fetching contest data:", err);
				setError("Failed to load contest data");
				setLoading(false);
			}
		};

		fetchContestData();
	}, [contestId]);

	if (loading) {
		return (
			<div className="flex-col mx-auto my-5 flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading contest details...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container px-4 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 flex justify-center items-center h-64">
				<p className="text-red-500">{error}</p>
			</div>
		);
	}

	// Extract contest details from fetched data
	const contestTitle = contestData?.basic?.contestName || "Untitled Contest";
	const contestStatus = getContestStatus(contestData);
	const startDate = formatDate(contestData?.prizeTimeline?.startDate);
	const endDate = formatDate(contestData?.prizeTimeline?.endDate);
	const totalBudget = contestData?.prizeTimeline?.totalBudget || 0;
	const publishedDate = formatDate(contestData?.createdAt);
	const description =
		contestData?.basic?.description || "No description provided.";
	const rules = contestData?.basic?.rules || ["No rules specified."];
	const industry = contestData?.basic?.industry || "Not specified";
	const duration = contestData?.requirements?.duration || "Not specified";
	const videoType = contestData?.requirements?.videoType || "Not specified";
	const clientScript =
		contestData?.requirements?.script || "No script provided.";
	const contentLinksRaw = contestData?.requirements?.contentLinks;
	const contentLinks = Array.isArray(contentLinksRaw)
		? contentLinksRaw
		: typeof contentLinksRaw === "string"
			? [contentLinksRaw]
			: ["No content links provided."];
	const brandAssets =
		contestData?.requirements?.brandAssets || "No brand assets provided.";
	const whoCanJoin = contestData?.requirements?.whoCanJoin || "Not specified";
	const winnerCount = contestData?.prizeTimeline?.winnerCount || 0;
	const positions = contestData?.prizeTimeline?.positions || [];
	const criteria = contestData?.prizeTimeline?.criteria || "Not specified";
	const incentives = Array.isArray(contestData?.incentives)
		? contestData?.incentives
		: [];

	return (
		<div className="container px-4 sm:px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 relative">
			<div className="mb-5">
				<Link
					href="/brand/dashboard/contests"
					className="flex items-center gap-2"
				>
					&larr; <p className="hover:underline">Back to Contests</p>
				</Link>
			</div>
			<div className="mb-6 relative">
				<div className="flex flex-col sm:flex-row gap-3">
					<h1 className="text-xl sm:text-2xl font-bold">{contestTitle}</h1>
					<div
						className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${
							contestStatus === "Active"
								? "bg-[#ABEFC6] text-[#067647]"
								: contestStatus === "Draft"
									? "bg-[#F6F6F6] text-[#667085]"
									: contestStatus === "Completed"
										? "bg-[#FDD849] text-[#1A1A1A]"
										: contestStatus === "Scheduled"
											? "bg-[#DBEAFE] text-[#3B82F6]"
											: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]"
						}`}
					>
						{contestStatus === "Active" ? (
							<CheckCircle size={12} />
						) : (
							<Clock size={12} />
						)}
						<span>{contestStatus}</span>
					</div>
				</div>
				<div className="mt-2 sm:absolute sm:top-1 sm:right-0 text-sm">
					<span className="text-gray-600">Published On</span>
					<p className="font-medium">{publishedDate}</p>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 mb-6 mt-10">
				<div className="flex flex-col w-full">
					<div className="flex flex-col sm:flex-row gap-4 sm:gap-2 mb-6">
						<div className="flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Start Date:</span>
							<p className="text-base">{startDate}</p>
						</div>
						<div className="sm:border-l pl-0 sm:pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">End Date:</span>
							<p className="text-base">{endDate}</p>
						</div>
						<div className="sm:border-l pl-0 sm:pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Total Budget:</span>
							<p className="text-base">${totalBudget}</p>
						</div>
					</div>

					{/* Message Participants Button for Mobile */}
					<div className="mb-4 lg:hidden">
						<Link href="/brand/dashboard/messages">
							<Button className="w-full bg-[#FD5C02] text-white text-base px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
								Message Participants
							</Button>
						</Link>
					</div>

					{/* Mobile Tab Menu Toggle */}
					<div className="md:hidden mb-4">
						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className="flex items-center justify-between w-full p-3 bg-[#FFF4EE] rounded-md"
						>
							<span className="font-medium">
								{activeTab === "contest-overview"
									? "Contest Overview"
									: activeTab === "applications"
										? "Applications"
										: activeTab === "available-metrics"
											? "Available Metrics"
											: contestType === "Leaderboard"
												? "Leaderboard"
												: "GMV"}
							</span>
							<Menu size={20} />
						</button>

						{isMobileMenuOpen && (
							<div className="mt-2 bg-white border rounded-md shadow-lg absolute z-10 w-full left-0 p-2">
								<ul className="space-y-2">
									<li>
										<button
											onClick={() => {
												setActiveTab("contest-overview");
												setIsMobileMenuOpen(false);
											}}
											className={`w-full text-left p-2 rounded-md ${activeTab === "contest-overview" ? "bg-[#FFF4EE] text-[#FD5C02]" : ""}`}
										>
											Contest Overview
										</button>
									</li>
									<li>
										<button
											onClick={() => {
												setActiveTab("applications");
												setIsMobileMenuOpen(false);
											}}
											className={`w-full text-left p-2 rounded-md ${activeTab === "applications" ? "bg-[#FFF4EE] text-[#FD5C02]" : ""}`}
										>
											Applications
										</button>
									</li>
									<li>
										<button
											onClick={() => {
												setActiveTab("available-metrics");
												setIsMobileMenuOpen(false);
											}}
											className={`w-full text-left p-2 rounded-md ${activeTab === "available-metrics" ? "bg-[#FFF4EE] text-[#FD5C02]" : ""}`}
										>
											Available Metrics
										</button>
									</li>
									<li>
										<button
											onClick={() => {
												setActiveTab("leaderboard");
												setIsMobileMenuOpen(false);
											}}
											className={`w-full text-left p-2 rounded-md ${activeTab === "leaderboard" ? "bg-[#FFF4EE] text-[#FD5C02]" : ""}`}
										>
											{contestType === "Leaderboard" ? "Leaderboard" : "GMV"}
										</button>
									</li>
								</ul>
							</div>
						)}
					</div>

					{/* Desktop Tabs */}
					<Tabs
						defaultValue="contest-overview"
						className=""
						onValueChange={(value) => setActiveTab(value)}
						value={activeTab}
					>
						<TabsList className="hidden md:grid grid-cols-4 mb-8 bg-transparent p-0 gap-0 w-full">
							<TabsTrigger
								value="contest-overview"
								className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
							>
								Contest Overview
							</TabsTrigger>
							<TabsTrigger
								value="applications"
								className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
							>
								Applications
							</TabsTrigger>
							<TabsTrigger
								value="available-metrics"
								className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
							>
								Available Metrics
							</TabsTrigger>
							<TabsTrigger
								value="leaderboard"
								className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
							>
								{contestType === "Leaderboard" ? "Leaderboard" : "GMV"}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="contest-overview" className="w-full space-y-6">
							{/* Prize Breakdown Card for Mobile */}
							<div className="lg:hidden mb-6">
								<Card className="bg-[#1A1A1A] text-white py-3 w-full h-auto min-h-36 flex flex-col items-center justify-start">
									<h3 className="text-lg font-medium text-center mb-2">
										Prize Breakdown
									</h3>

									{/* Display prize positions */}
									{positions.length > 0 && (
										<div className="px-4 w-full">
											<ul className="space-y-2 text-sm">
												{positions.map((prize, index) => (
													<li
														key={index}
														className="flex justify-between items-center"
													>
														<span>Position {index + 1}</span>
														<span className="font-medium">${prize}</span>
													</li>
												))}
											</ul>
											<div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
												<span>Total</span>
												<span className="font-medium">${totalBudget}</span>
											</div>
										</div>
									)}

									{/* Display text-based prize breakdown if available */}
									{!Array.isArray(contestData?.incentives) &&
										contestData?.incentives?.prizeBreakdown && (
											<div className="px-4 mt-2 text-sm">
												{contestData.incentives.prizeBreakdown}
											</div>
										)}
								</Card>
							</div>

							{/* Basic Information Section */}
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Contest Type</h3>
								<p className="capitalize">{contestType}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Contest Description
								</h3>
								<p>{description}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Contest Rules</h3>

								{rules}
							</div>

							{/* Contest Requirements Section */}
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Who Can Join</h3>
								<p className="capitalize">{whoCanJoin.replace(/-/g, " ")}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Contest Industry
								</h3>
								<p>{industry.charAt(0).toUpperCase() + industry.slice(1)}</p>

							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Duration</h3>
								<p className="capitalize">{duration.replace(/-/g, " ")}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Video Type</h3>
								<p className="capitalize">{videoType.replace(/-/g, " ")}</p>
							</div>

							{/* Contest Type Specific Criteria */}
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									{contestType === "Leaderboard"
										? "Ranking Criteria"
										: "GMV Criteria"}
								</h3>
								<p className="capitalize">{criteria.replace(/-/g, " ")}</p>
							</div>

							{/* Prize Information */}
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Prize Distribution
								</h3>
								<div>
									<p className="mb-2">Winner Count: {winnerCount}</p>
									{positions.length > 0 && (
										<ul className="list-disc pl-5 space-y-1">
											{positions.map((prize, index) => (
												<li key={index} className="text-base">
													Position {index + 1}: ${prize}
												</li>
											))}
										</ul>
									)}
								</div>
							</div>

							{/* Additional Incentives */}
							{incentives.length > 0 && (
								<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
									<h3 className="text-base text-[#667085] mb-2">
										Additional Incentives
									</h3>
									<ul className="list-disc pl-5 space-y-1">
										{incentives.map((incentive, index) => (
											<li key={index} className="text-base">
												{incentive.name}: ${incentive.worth} -{" "}
												{incentive.description}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Content Creation Guidance */}
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Client&apos;s Script
								</h3>
								<div className="space-y-2">{clientScript}</div>
							</div>

							{contentLinks.length > 0 && (
								<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
									<h3 className="text-base text-[#667085] mb-2">
										Links of Content you like
									</h3>
									<div className="space-y-2">
										{contentLinks.map((link, index) => (
											<Link
												key={index}
												href={link}
												className="text-[#FD5C02] hover:underline break-words"
											>
												<p className="text-base">{link}</p>
											</Link>
										))}
									</div>
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2">
								<h3 className="text-base text-[#667085] mb-2">Brand Assets</h3>
								<Link
									href={brandAssets}
									className="text-[#FD5C02] hover:underline break-words"
								>
									<p className="text-base">{brandAssets}</p>
								</Link>
							</div>
						</TabsContent>

						<TabsContent value="applications" className="w-full">
							{contestData && (
								<Applications
									contestData={{
										requirements: {
											whoCanJoin: contestData.requirements?.whoCanJoin || "Not specified",
										},
									}}
								/>
							)}
						</TabsContent>

						{/* Dynamic Metrics Tab */}
						<TabsContent value="available-metrics">
							{contestType === "Leaderboard" ? (
								<AnalyticsDashboard />
							) : (
								<GMVMetrics />
							)}
						</TabsContent>

						{/* Dynamic Leaderboard Tab */}
						<TabsContent value="leaderboard">
							{contestType === "Leaderboard" ? <Leaderboard /> : <GMVData />}
						</TabsContent>
					</Tabs>
				</div>

				{/* Right column with fixed width - desktop only */}
				<div className="relative hidden lg:block">
					{/* Position the Message Participants button */}
					<div className="absolute top-0 right-0">
						<Link href="/brand/dashboard/messages">
							<Button className="bg-[#FD5C02] text-white text-base px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
								Message Participants
							</Button>
						</Link>
					</div>

					{activeTab === "contest-overview" && (
						<Card className="bg-[#1A1A1A] text-white py-3 w-56 h-auto min-h-36 flex flex-col items-center justify-start mt-20">
							<h3 className="text-lg font-medium text-center mb-2">
								Prize Breakdown
							</h3>

							{/* Display prize positions */}
							{positions.length > 0 && (
								<div className="px-4 w-full">
									<ul className="space-y-2 text-sm">
										{positions.map((prize, index) => (
											<li
												key={index}
												className="flex justify-between items-center"
											>
												<span>Position {index + 1}</span>
												<span className="font-medium">${prize}</span>
											</li>
										))}
									</ul>
									<div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
										<span>Total</span>
										<span className="font-medium">${totalBudget}</span>
									</div>
								</div>
							)}

							{/* Display text-based prize breakdown if available */}
							{!Array.isArray(contestData?.incentives) &&
								contestData?.incentives?.prizeBreakdown && (
									<div className="px-4 mt-2 text-sm">
										{contestData.incentives.prizeBreakdown}
									</div>
								)}
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
