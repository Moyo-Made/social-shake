"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	ContestDurationProps,
	CriteriaType,
	LeaderboardCriteriaProps,
	PrizePoolProps,
} from "@/types/prizes-timeline";

const PrizePoolSection: React.FC<PrizePoolProps> = ({
	totalBudget,
	setTotalBudget,
	winnerCount,
	setWinnerCount,
	positions,
	setPositions,
}) => {
	useEffect(() => {
		// Create a new array with the current winnerCount
		const newPositions = Array(winnerCount)
			.fill(0)
			.map((_, i) => {
				// Preserve existing values if they exist
				return i < positions.length ? positions[i] : 0;
			});

		if (
			newPositions.length !== positions.length ||
			!newPositions.every(
				(val, i) => i >= positions.length || val === positions[i]
			)
		) {
			setPositions(newPositions);
		}
	}, [winnerCount, setPositions]);

	const handlePositionChange = (index: number, value: string) => {
		const numValue = value === "" ? 0 : Number(value);
		const newPositions = [...positions];
		newPositions[index] = numValue;
		setPositions(newPositions);
	};

	return (
		<div className="border border-[#FFBF9B] rounded-xl p-6">
			<div className="flex gap-10">
				<div className="space-y-4">
					<div>
						<Label>Total Budget & Prize Pool</Label>
						<Input
							type="number"
							min={1500}
							value={totalBudget}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setTotalBudget(Number(e.target.value))
							}
							placeholder="$ 1,500.00"
							className="mt-2"
						/>
						<p className="text-sm text-gray-500 mt-1">
							This is the total amount you intend to spend (Min: $1,500)
						</p>
					</div>

					<div>
						<Label>How many Winners?</Label>
						<Input
							type="number"
							min={1}
							max={5}
							value={winnerCount}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setWinnerCount(Math.min(5, Math.max(1, Number(e.target.value))))
							}
							className="w-20 mt-2"
						/>
					</div>
				</div>

				<div className="space-y-4">
					{positions.map((value, index) => (
						<div key={index} className="flex items-center">
							<Label className="w-32">
								{index + 1}
								{index === 0
									? "st"
									: index === 1
									? "nd"
									: index === 2
									? "rd"
									: "th"}{" "}
								Position:
							</Label>
							<Input
								type="number"
								value={value || ""}
								onChange={(e) => handlePositionChange(index, e.target.value)}
								className="w-32"
								placeholder={`$ ${
									index === 0
										? "1000"
										: index === 1
										? "300"
										: index === 2
										? "100"
										: "50"
								}`}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

const ContestDurationSection: React.FC<ContestDurationProps> = ({
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}) => {
	return (
		<div className="border border-[#FFBF9B] rounded-lg p-6 space-y-6">
			<Label>Contest Duration</Label>
			<div className="flex gap-4">
				<div className="space-y-2">
					<Label>Contest Start Date</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="w-[240px] justify-start text-left font-normal"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{startDate ? (
									format(startDate, "PPP")
								) : (
									<span>Pick a date</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="bg-[#f7f7f7] w-auto p-0">
							<Calendar
								mode="single"
								selected={startDate}
								onSelect={setStartDate}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
				</div>

				<div className="space-y-2">
					<Label>Contest End Date</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className=" w-[240px] justify-start text-left font-normal"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="bg-[#f7f7f7] w-auto p-0">
							<Calendar
								mode="single"
								selected={endDate}
								onSelect={setEndDate}
								initialFocus
								disabled={(date) => (startDate ? date < startDate : false)}
							
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	);
};

const LeaderboardCriteriaSection: React.FC<LeaderboardCriteriaProps> = ({
	criteria,
	setCriteria,
}) => {
	return (
		<div className="border border-[#FFBF9B] rounded-lg p-6">
			<Label>Leaderboard Criteria</Label>
			<p className="text-sm text-gray-500 mb-4">
				(Choose how winners will be ranked)
			</p>
			<RadioGroup
				value={criteria}
				onValueChange={(value) => setCriteria(value as CriteriaType)}
				className="flex gap-4"
			>
				<div
					className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
					data-state={criteria === "views" ? "checked" : "unchecked"}
				>
					<RadioGroupItem value="views" id="views" />
					<Label htmlFor="views">Views</Label>
				</div>
				<div
					className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
					data-state={criteria === "likes" ? "checked" : "unchecked"}
				>
					<RadioGroupItem value="likes" id="likes" />
					<Label htmlFor="likes">Likes</Label>
				</div>
				<div
					className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
					data-state={criteria === "impressions" ? "checked" : "unchecked"}
				>
					<RadioGroupItem value="impressions" id="impressions" />
					<Label htmlFor="impressions">Impressions</Label>
				</div>
			</RadioGroup>
		</div>
	);
};

interface ContestFormData {
	totalBudget: number;
	winnerCount: number;
	positions: number[];
	startDate: Date | undefined;
	endDate: Date | undefined;
	criteria: CriteriaType;
}

const PrizeTimeline: React.FC = () => {
	const [formData, setFormData] = useState<ContestFormData>({
		totalBudget: 1500,
		winnerCount: 5,
		positions: [1000, 300, 100, 50, 50],
		startDate: undefined,
		endDate: undefined,
		criteria: "views",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Handle form submission
		console.log(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-4">
			<PrizePoolSection
				totalBudget={formData.totalBudget}
				setTotalBudget={(value) =>
					setFormData({ ...formData, totalBudget: value })
				}
				winnerCount={formData.winnerCount}
				setWinnerCount={(value) =>
					setFormData({ ...formData, winnerCount: value })
				}
				positions={formData.positions}
				setPositions={(positions) => setFormData({ ...formData, positions })}
			/>

			<ContestDurationSection
				startDate={formData.startDate}
				setStartDate={(date) => setFormData({ ...formData, startDate: date })}
				endDate={formData.endDate}
				setEndDate={(date) => setFormData({ ...formData, endDate: date })}
			/>

			<LeaderboardCriteriaSection
				criteria={formData.criteria}
				setCriteria={(criteria) => setFormData({ ...formData, criteria })}
			/>
		</form>
	);
};

export default PrizeTimeline;
