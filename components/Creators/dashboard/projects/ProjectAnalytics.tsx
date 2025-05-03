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

export default function ProjectAnalytics() {
	// Mock data for the metrics
	const metricsData = {
		totalClicks: 20,
		totalSales: 9420,
		commissionEarned: 5850,
		totalAmountPaidOut: 3135,
	};

	// Mock data for the chart
	const chartData = [
		{ day: "Monday", clicks: 9800, commission: 4800, sales: 1200 },
		{ day: "Tuesday", clicks: 10000, commission: 4900, sales: 1500 },
		{ day: "Wednesday", clicks: 10400, commission: 5200, sales: 2500 },
		{ day: "Thursday", clicks: 11000, commission: 5000, sales: 2000 },
		{ day: "Friday", clicks: 11800, commission: 5500, sales: 3000 },
		{ day: "Saturday", clicks: 12000, commission: 6000, sales: 3500 },
		{ day: "Sunday", clicks: 13500, commission: 6500, sales: 5000 },
	];

	const [activeTab, setActiveTab] = useState("7days");

	const availableAmount = 1275;
	const minimumPayoutAmount = 1000;

	return (
		<div className="w-full max-w-8xl bg-white rounded-lg shadow-sm">
			<Card className="p-6 bg-white rounded-lg shadow-sm mb-4">
				<div className="flex justify-between items-center">
					<div className="text-sm text-start">
						<p>Available for Payout</p>
						<h2 className="text-2xl text-[#101828] font-semibold">
							${availableAmount.toLocaleString()}
						</h2>
						<p className="text-sm text-gray-500 mb-1 mt-2">
							Minimum payment request amount: $
							{minimumPayoutAmount.toLocaleString()}
						</p>
					</div>

					<div>
						{availableAmount >= minimumPayoutAmount && (
							<button className="bg-orange-500 text-white px-4 py-2 rounded-lg">
								Request Payout
							</button>
						)}
					</div>
				</div>
			</Card>

			{/* Metrics Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/clicks.svg"
						alt="Total Clicks"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Clicks</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalClicks}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/salesIcon.svg"
						alt="Total Sales"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Sales</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalSales.toLocaleString()}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/commission-earned.svg"
						alt="Commission Earned"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Commission Earned</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${metricsData.commissionEarned.toLocaleString()}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/paid-out.svg"
						alt="Total Amount Paid Out"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Amount Paid Out</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${metricsData.totalAmountPaidOut.toLocaleString()}
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
							<span className="text-xs text-gray-700">Total Clicks</span>
						</div>
						<div className="flex items-center">
							<div className="w-2 h-2 rounded-full bg-pink-500 mr-2"></div>
							<span className="text-xs text-gray-700">Total Commission</span>
						</div>
						<div className="flex items-center">
							<div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
							<span className="text-xs text-gray-700">Total Sales</span>
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
								dataKey="clicks"
								stroke="#F97316"
								strokeWidth={2}
								fill="url(#colorViews)"
								dot={false}
								activeDot={{ r: 4, fill: "#F97316" }}
							/>
							<Area
								type="monotone"
								dataKey="commission"
								stroke="#EC4899"
								strokeWidth={2}
								fill="url(#colorLikes)"
								dot={false}
								activeDot={{ r: 4, fill: "#EC4899" }}
							/>
							<Area
								type="monotone"
								dataKey="sales"
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
