import React, { useState } from "react";
import Image from "next/image";

type ContestType = "leaderboard" | "gmv";

interface ContestTypeProps {
	onTypeSelect: (type: ContestType) => void;
	defaultSelected?: ContestType;
}

const ContestTypeSelector: React.FC<ContestTypeProps> = ({
	onTypeSelect,
	defaultSelected = "leaderboard",
}) => {
	const [selectedType, setSelectedType] =
		useState<ContestType>(defaultSelected);

	const handleSelect = (type: ContestType) => {
		setSelectedType(type);
		onTypeSelect(type);
	};

	return (
		<div className="w-full max-w-3xl mx-auto mt-4">
			<h2 className="text-base font-medium text-gray-700 mb-2">Contest Type</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Leaderboard Contest */}
				<div
					className={`
            relative rounded-lg p-5 cursor-pointer transition-all duration-200 
            ${
							selectedType === "leaderboard"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300"
						}
          `}
					onClick={() => handleSelect("leaderboard")}
				>
					<div className="absolute top-4 left-4">
						<div
							className={`w-4 h-4 rounded-full flex items-center justify-center ${
								selectedType === "leaderboard"
									? "border-2 border-orange-500"
									: "border border-gray-300"
							}`}
						>
							{selectedType === "leaderboard" && (
								<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
							)}
						</div>
					</div>

					<div className="mt-6 flex flex-col items-start">
						<div className="mb-2 mt-6">
							<Image
								src="/icons/trophy.svg"
								alt="Trophy"
								width={35}
								height={35}
								
							/>
						</div>

						<h3 className="text-lg text-start font-semibold mb-1">
							Leaderboard Contest
						</h3>

						<p className="text-sm text-[#667085] text-start">
							Compete for the top spot! Creators are ranked based on views,
							likes, or impressions, and the highest-performing entries win the
							prizes.
						</p>
					</div>
				</div>

				{/* GMV Contest */}
				<div
					className={`
            relative rounded-lg p-5 cursor-pointer transition-all duration-200
            ${
							selectedType === "gmv"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300"
						}
          `}
					onClick={() => handleSelect("gmv")}
				>
					<div className="absolute top-4 left-4">
						<div
							className={`w-4 h-4 rounded-full flex items-center justify-center ${
								selectedType === "gmv"
									? "border-2 border-orange-500"
									: "border border-gray-300"
							}`}
						>
							{selectedType === "gmv" && (
								<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
							)}
						</div>
					</div>

					<div className="mt-6 flex flex-col items-start">
						<div className="mb-2 mt-4 ">
							<Image
								src="/icons/money-bag.svg"
								alt="Money Bag"
								width={35}
								height={35}
								
							/>
						</div>
						<h3 className="text-lg font-semibold mb-1">GMV Contest</h3>
						<p className="text-sm text-[#667085] text-start">
							Drive sales and earn rewards! Creators are ranked based on the
							total Gross Merchandise Value (GMV) they generate, with top
							performers winning prizes.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ContestTypeSelector;
