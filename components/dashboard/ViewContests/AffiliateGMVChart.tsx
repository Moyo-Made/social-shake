import React from "react";
import {
	Line,
	XAxis,
	YAxis,
	Tooltip,
	Bar,
	ComposedChart,
	CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AffiliativeGMVChart = () => {
	const data = [
		{
			week: "Dec 3 to Dec 16, 2024 (Week 1)",
			weeklyGMV: 10000,
			accumulativeGMV: 10000,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 2)",
			weeklyGMV: 20000,
			accumulativeGMV: 13400,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 3)",
			weeklyGMV: 11124,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 4)",
			weeklyGMV: 5000,
			accumulativeGMV: 23000,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 5)",
			weeklyGMV: 10000,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 6)",
			weeklyGMV: 13400,
			accumulativeGMV: 13400,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 7)",
			weeklyGMV: 20000,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 8)",
			weeklyGMV: 13400,
			accumulativeGMV: 20000,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 9)",
			weeklyGMV: 15200,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 10)",
			weeklyGMV: 23000,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 11)",
			weeklyGMV: 13400,
			accumulativeGMV: 15200,
		},
		{
			week: "Dec 3 to Dec 16, 2024 (Week 12)",
			weeklyGMV: 20000,
			accumulativeGMV: 15200,
		},
	];

	return (
		<div>
			<Card className="border-none shadow-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-center">Affiliative GMV</CardTitle>
					<div className="flex gap-3 justify-center items-center">
						<div className="flex gap-1 jusify-center items-center">
							<span className="text-[#FD5C02]">•</span>
							<p className="text-[#1A1A1A] text-sm">Weekly GMV</p>
						</div>

						<div className="flex gap-1 items-center">
							<span className="text-[#1A1A1A]">•</span>
							<p className="text-[#1A1A1A] text-sm">Accumulative GMV</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ComposedChart
						width={900}
						height={400}
						data={data}
						margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="week"
							angle={-45}
							textAnchor="end"
							height={100}
							interval={0}
							tick={{ fontSize: 10 }}
						/>
						<YAxis
							yAxisId="left"
							orientation="left"
							stroke="#ff6b00"
							tickFormatter={(value) => `${value.toLocaleString()}`}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							stroke="#000000"
							tickFormatter={(value) => `${value.toLocaleString()}`}
						/>
						<Tooltip
							formatter={(value, name) => [value.toLocaleString(), name]}
							labelStyle={{ fontWeight: "bold" }}
						/>
						<Bar
							yAxisId="left"
							dataKey="weeklyGMV"
							fill="#ff6b00"
							barSize={40}
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="accumulativeGMV"
							stroke="#000000"
							strokeWidth={2}
							dot={{ stroke: "#000000", strokeWidth: 2 }}
						/>
					</ComposedChart>
				</CardContent>
			</Card>

			{/* Creators Metric */}
			<Card className="border-none shadow-none bg-transparent mt-3">
				<CardHeader>
					<CardTitle className="text-center">Creator&apos;s Metric</CardTitle>
					<div className="flex gap-3 justify-center items-center">
						<div className="flex gap-1 jusify-center items-center">
							<span className="text-[#FD5C02]">•</span>
							<p className="text-[#1A1A1A] text-sm">Weekly GMV</p>
						</div>

						<div className="flex gap-1 items-center">
							<span className="text-[#1A1A1A]">•</span>
							<p className="text-[#1A1A1A] text-sm">Accumulative GMV</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ComposedChart
						width={900}
						height={400}
						data={data}
						margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="week"
							angle={-45}
							textAnchor="end"
							height={100}
							interval={0}
							tick={{ fontSize: 10 }}
						/>
						<YAxis
							yAxisId="left"
							orientation="left"
							stroke="#ff6b00"
							tickFormatter={(value) => `${value.toLocaleString()}`}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							stroke="#000000"
							tickFormatter={(value) => `${value.toLocaleString()}`}
						/>
						<Tooltip
							formatter={(value, name) => [value.toLocaleString(), name]}
							labelStyle={{ fontWeight: "bold" }}
						/>
						<Bar
							yAxisId="left"
							dataKey="weeklyGMV"
							fill="#ff6b00"
							barSize={40}
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="accumulativeGMV"
							stroke="#000000"
							strokeWidth={2}
							dot={{ stroke: "#000000", strokeWidth: 2 }}
						/>
					</ComposedChart>
				</CardContent>
			</Card>
		</div>
	);
};

export default AffiliativeGMVChart;
