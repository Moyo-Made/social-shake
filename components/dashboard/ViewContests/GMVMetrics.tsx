import { Card } from "@/components/ui/card";
import Image from "next/image";
import React from "react";
import AffiliativeGMVChart from "./AffiliateGMVChart";

// Mock data for the metrics
const metricsData = {
	totalAffiliate: "$1,290,00",
	totalSales: "1,132",
	totalCreators: "1,405",
	totalCreatorsSales: 900,
};

const GMVMetrics = () => {
	return (
		<div className=" max-w-7xl -mt-10 p-6 bg-white rounded-lg shadow-sm">
			{/* Metrics Cards */}
			<div className="grid grid-cols-4 gap-4 mb-8 mt-5">
				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-affiliate.svg"
						alt="Total Affiliate"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Contestants</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalAffiliate}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-sales.svg"
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
						src="/icons/total-creators.svg"
						alt="Total Creators"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Total Likes</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalCreators.toLocaleString()}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
					<Image
						src="/icons/total-creator-sales.svg"
						alt="Total Creators Sales"
						width={40}
						height={40}
					/>
					<p className="text-xs text-[#475467] mb-1 mt-2">Creators Sales</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						{metricsData.totalCreatorsSales.toLocaleString()}
					</h2>
				</Card>

			</div>
				<AffiliativeGMVChart />


		</div>
	);
};

export default GMVMetrics;
