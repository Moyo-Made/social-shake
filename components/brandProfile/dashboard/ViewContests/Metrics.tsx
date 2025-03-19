import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import {
	XAxis,
	YAxis,
	ResponsiveContainer,
	Tooltip,
	AreaChart,
	Area,
	CartesianGrid,
} from "recharts";
import Image from "next/image";

export default function AnalyticsDashboard() {
	// Mock data for the metrics
	const metricsData = {
		totalContestants: 20,
		totalViews: 9420,
		totalLikes: 5850,
		totalComments: 3135,
	};

	// Mock data for the chart
	const chartData = [
		{ day: "Monday", views: 9800, likes: 4800, comments: 1200 },
		{ day: "Tuesday", views: 10000, likes: 4900, comments: 1500 },
		{ day: "Wednesday", views: 10400, likes: 5200, comments: 2500 },
		{ day: "Thursday", views: 11000, likes: 5000, comments: 2000 },
		{ day: "Friday", views: 11800, likes: 5500, comments: 3000 },
		{ day: "Saturday", views: 12000, likes: 6000, comments: 3500 },
		{ day: "Sunday", views: 13500, likes: 6500, comments: 5000 },
	];

	const [activeTab, setActiveTab] = useState("7days");

	return (
		<div className="w-full max-w-7xl -mt-10 p-6 bg-white rounded-lg shadow-sm">
			{/* Metrics Cards */}
			<div className="grid grid-cols-4 gap-4 mb-8">
				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-contestants.svg"
						alt="Total Contestants"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Contestants</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalContestants}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-views.svg"
						alt="Total Views"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Views</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalViews.toLocaleString()}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-likes.svg"
						alt="Total Likes"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Likes</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalLikes.toLocaleString()}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-comments.svg"
						alt="Total Comments"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Comments</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalComments.toLocaleString()}
					</h2>
				</Card>
			</div>

			<div className="w-full bg-white p-4 rounded-lg">
				{/* Period selector tabs */}
				<div className="flex justify-between items-center">
					<div className="flex space-x-4 text-sm text-gray-500">
						<button
							className={`${activeTab === "7days" ? "text-black" : ""}`}
							onClick={() => setActiveTab("7days")}
						>
							7 Days
						</button>
						<span>|</span>
						<button
							className={`${activeTab === "30days" ? "text-black" : ""}`}
							onClick={() => setActiveTab("30days")}
						>
							30 Days
						</button>
						<span>|</span>
						<button
							className={`${activeTab === "2month" ? "text-black" : ""}`}
							onClick={() => setActiveTab("2month")}
						>
							2 Month
						</button>
					</div>

					{/* Legend */}
					<div className="flex items-center space-x-4">
						<div className="flex items-center">
							<div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
							<span className="text-xs text-gray-700">Total Views</span>
						</div>
						<div className="flex items-center">
							<div className="w-2 h-2 rounded-full bg-pink-500 mr-2"></div>
							<span className="text-xs text-gray-700">Total Likes</span>
						</div>
						<div className="flex items-center">
							<div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
							<span className="text-xs text-gray-700">Total Comments</span>
						</div>
					</div>
				</div>

				{/* Chart */}
				<div className="h-64 mt-6">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={chartData}
							margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
									<stop offset="95%" stopColor="#F97316" stopOpacity={0.01} />
								</linearGradient>
								<linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#EC4899" stopOpacity={0.15} />
									<stop offset="95%" stopColor="#EC4899" stopOpacity={0.01} />
								</linearGradient>
								<linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#FBBF24" stopOpacity={0.15} />
									<stop offset="95%" stopColor="#FBBF24" stopOpacity={0.01} />
								</linearGradient>
							</defs>
							<XAxis
								dataKey="day"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: "#888" }}
								dy={10}
							/>

							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: "#888" }}
								domain={[0, 20000]}
								ticks={[0, 2000, 5000, 10000, 15000, 20000]}
								tickFormatter={(value) =>
									value === 0
										? "0"
										: value === 20000
										? "20k"
										: `${value / 1000}k`
								}
							/>
							<CartesianGrid
								vertical={false}
								strokeDasharray="3 3"
								opacity={0.1}
							/>
							<Tooltip
								contentStyle={{
									borderRadius: "4px",
									border: "none",
									boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)",
								}}
								formatter={(value) => [`${value.toLocaleString()}`, ""]}
								labelFormatter={(label) => `${label}`}
							/>
							<Area
								type="monotone"
								dataKey="views"
								stroke="#F97316"
								strokeWidth={2}
								fill="url(#colorViews)"
								dot={false}
								activeDot={{ r: 4, fill: "#F97316" }}
							/>
							<Area
								type="monotone"
								dataKey="likes"
								stroke="#EC4899"
								strokeWidth={2}
								fill="url(#colorLikes)"
								dot={false}
								activeDot={{ r: 4, fill: "#EC4899" }}
							/>
							<Area
								type="monotone"
								dataKey="comments"
								stroke="#FBBF24"
								strokeWidth={2}
								fill="url(#colorComments)"
								dot={false}
								activeDot={{ r: 4, fill: "#FBBF24" }}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}
