"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Applications from "./Applications";
import AnalyticsDashboard from "./Metrics";
import Leaderboard from "./Leaderboard";
import { Button } from "@/components/ui/button";
import { useContestForm } from "../newContest/ContestFormContext";
import GMVMetrics from "./GMVMetrics";
import GMVData from "./GMVData";


export default function ContestDetailPage() {
	const [activeTab, setActiveTab] = useState("contest-overview");

	const { formData } = useContestForm();
    const contestType = formData.basic.contestType || "leaderboard";
	console.log("Contest Type in Detail Page:", contestType);

	// Mock data
	const contestData = {
		title: "Best TikTok Ad for XYZ Shoes Flippers",
		status: "Active",
		publishedOn: "March 20, 2025",
		startDate: "March 20, 2025",
		endDate: "March 20, 2025",
		totalBudget: "$1,500",
		description:
			"We're looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!",
		rules: [
			"Content must meet all brand guidelines (duration, aspect ratio, tone).",
			"Only original content will be accepted—no copyrighted material.",
			"Winners will be determined based on leaderboard rankings (views/likes).",
			"The brand reserves the right to request revisions or disqualify incomplete entries.",
		],
		industry: "Skincare",
		duration: "30 Seconds",
		videoType: "Client's Script",
		clientScript: [
			"[Upbeat music playing]",
			'[Excited tone] "STOP scrolling! You NEED to see this!"',
			"[Cut to close-up of XYZ Shoes being unboxed]",
			'"These are the new XYZ Shoes, and they are an absolute game-changer!"',
		],
		contentLinks: [
			"https://www.tiktok.com/@xyzshoes",
			"https://www.tiktok.com/@xyzshoes",
			"https://www.tiktok.com/@xyzshoes",
		],
		brandAssets: "https://www.xyzshoes.com/brand-assets",
	};

	return (
		<div className="container px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-6 my-5 relative">
			<div className="mb-6 relative">
				<div className="flex gap-3">
					<h1 className="text-2xl font-bold">{contestData.title}</h1>
					<div className="inline-flex items-center gap-1 px-2 py-1 mt-1 bg-[#ABEFC6] text-[#067647] rounded-full text-xs">
						<CheckCircle size={12} />
						<span>Active</span>
					</div>
				</div>
				<div className="absolute top-1 right-0 text-sm">
					<span className="text-gray-600">Published On</span>
					<p className="font-medium">{contestData.publishedOn}</p>
				</div>
			</div>

			<div className="flex gap-6 mb-6 mt-10">
				<div className="flex flex-col w-full">
					<div className="flex gap-2 mb-6">
						<div className="flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Start Date:</span>
							<p className="text-base">{contestData.startDate}</p>
						</div>
						<div className="border-l pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">End Date:</span>
							<p className="text-base">{contestData.endDate}</p>
						</div>
						<div className="border-l pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Total Budget:</span>
							<p className="text-base">{contestData.totalBudget}</p>
						</div>
					</div>

					<Tabs
						defaultValue="contest-overview"
						className=""
						onValueChange={(value) => setActiveTab(value)}
					>
						<TabsList className="grid grid-cols-4 mb-8 bg-transparent p-0 gap-0 w-[85%] ">
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
								{contestType === "leaderboard" ? "Leaderboard" : "GMV Data"}
								
							</TabsTrigger>
						</TabsList>

						<TabsContent value="contest-overview" className="w-full space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4 ">
								<h3 className="text-base text-[#667085] mb-2">
									Contest Description
								</h3>
								<p>{contestData.description}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Contest Rules</h3>
								<ul className="list-disc pl-5 space-y-1">
									{contestData.rules.map((rule, index) => (
										<li key={index} className="text-base">
											{rule}
										</li>
									))}
								</ul>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Contest Industry:
								</h3>
								<p>{contestData.industry}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Duration:</h3>
								<p>{contestData.duration}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Video Type</h3>
								<p>{contestData.videoType}</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Client&apos;s Script
								</h3>
								<div className="space-y-2">
									{contestData.clientScript.map((line, index) => (
										<p key={index} className="text-base">
											{line}
										</p>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">
									Links of Content you like
								</h3>
								<div className="space-y-2">
									{contestData.contentLinks.map((line, index) => (
										<Link
											key={index}
											href={line}
											className="text-[#FD5C02] hover:underline"
										>
											<p className="text-base">{line}</p>
										</Link>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2">
								<h3 className="text-base text-[#667085] mb-2">Brand Assets</h3>
								<Link
									href={contestData.brandAssets}
									className="text-[#FD5C02] hover:underline"
								>
									<p className="text-base">{contestData.brandAssets}</p>
								</Link>
							</div>
						</TabsContent>

						<TabsContent value="applications" className="w-full">
							<Applications />
						</TabsContent>

						{/* Dynamic Metrics Tab */}
						<TabsContent value="available-metrics">
							{contestType === "leaderboard" ? (
								<AnalyticsDashboard />
							) : (
								<GMVMetrics />
							)}
						</TabsContent>

						{/* Dynamic Leaderboard Tab */}
						<TabsContent value="leaderboard">
							{contestType === "leaderboard" ? (
								<Leaderboard />
							) : (
								<GMVData />
							)}
						</TabsContent>
					</Tabs>
				</div>

				{/* Right column with fixed width */}
				<div className=" relative">
					{/* Position the Message Participants button */}
					<div className="absolute top-0 right-0">
						<Link href="/dashboard/messages">
							<Button className="bg-[#FD5C02] text-white text-base px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
								Message Participants
							</Button>
						</Link>
					</div>
					
					{activeTab === "contest-overview" && (
						<Card className="bg-[#1A1A1A] text-white py-3 w-56 h-36 flex justify-center mt-20  ">
							<h3 className="text-lg font-medium text-center">
								Prize Breakdown
							</h3>
						</Card>
					)}
				</div> 
			</div>
		</div>
	);
}