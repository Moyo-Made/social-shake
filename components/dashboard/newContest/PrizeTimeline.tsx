"use client";

import React from "react";
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
import { useContestForm } from "./ContestFormContext";
import { CriteriaType } from "@/types/prizes-timeline";

const PrizeTimeline = () => {
	const { formData, updatePrizeTimelineData } = useContestForm();
	const { totalBudget, winnerCount, positions, startDate, endDate, criteria } =
		formData.prizeTimeline;

	const handleTotalBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updatePrizeTimelineData({ totalBudget: Number(e.target.value) });
	};

	const handleWinnerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const count = Math.min(5, Math.max(1, Number(e.target.value)));
		updatePrizeTimelineData({ winnerCount: count });

		// Create a new array with the current winnerCount
		const newPositions = Array(count)
			.fill(0)
			.map((_, i) => {
				// Preserve existing values if they exist
				return i < positions.length ? positions[i] : 0;
			});
		updatePrizeTimelineData({ positions: newPositions });
	};

	const handlePositionChange = (index: number, value: string) => {
		const numValue = value === "" ? 0 : Number(value);
		const newPositions = [...positions];
		newPositions[index] = numValue;
		updatePrizeTimelineData({ positions: newPositions });
	};

	const handleStartDateChange = (date: Date | undefined) => {
		updatePrizeTimelineData({ startDate: date });
	};

	const handleEndDateChange = (date: Date | undefined) => {
		updatePrizeTimelineData({ endDate: date });
	};

	const handleCriteriaChange = (value: string) => {
		updatePrizeTimelineData({ criteria: value as CriteriaType });
	};

	return (
		<div className="max-w-[44rem] mx-auto">
			<div className="space-y-6">
				{/* Contest Duration*/}
				<div className="border border-[#FFBF9B] rounded-xl p-6">
					<h2 className="text-lg font-medium mb-4">Contest Duration</h2>
					<div className="flex flex-col gap-5">
						<div className="space-x-10 flex">
							<div>
								<Label>Contest Start Date</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full mt-2 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{startDate ? (
												format(startDate, "PPP")
											) : (
												<span>Pick a date</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0 bg-[#f7f7f7]"
										align="start"
									>
										<Calendar
											mode="single"
											selected={startDate}
											onSelect={handleStartDateChange}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div>
								<Label>Contest End Date</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full mt-2 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{endDate ? (
												format(endDate, "PPP")
											) : (
												<span>Pick a date</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0 bg-[#f7f7f7]"
										align="start"
									>
										<Calendar
											mode="single"
											selected={endDate}
											onSelect={handleEndDateChange}
											initialFocus
											disabled={(date) =>
												startDate ? date < startDate : false
											}
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>
						<div className="space-x-4 flex">
							<div>
								<div className="flex gap-2">
									<Label className="text-base">Leaderboard Criteria</Label>
									<p className="text-sm text-gray-500 mt-1 italic">
										(Choose how winners will be ranked)
									</p>
								</div>

								<RadioGroup
									className="flex gap-3 mt-2"
									value={criteria}
									onValueChange={handleCriteriaChange}
								>
									<div
										className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
										data-state={criteria === "views" ? "checked" : "unchecked"}
									>
										<RadioGroupItem value="views" id="views" />
										<Label htmlFor="views">Views</Label>
									</div>

									<div
										className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
										data-state={criteria === "likes" ? "checked" : "unchecked"}
									>
										<RadioGroupItem value="likes" id="likes" />
										<Label htmlFor="likes">Likes</Label>
									</div>

									<div
										className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
										data-state={
											criteria === "impressions" ? "checked" : "unchecked"
										}
									>
										<RadioGroupItem value="impressions" id="impressions" />
										<Label htmlFor="impressions">Impressions</Label>
									</div>

									<div
										className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
										data-state={
											criteria === "gmv-sales" ? "checked" : "unchecked"
										}
									>
										<RadioGroupItem value="gmv-sales" id="gmv-sales" />
										<Label htmlFor="gmv-sales">GMV Sales</Label>
									</div>
								</RadioGroup>
							</div>
						</div>
					</div>
				</div>

				{/* Total Budget & Prize Pool */}
				<div className="border border-[#FFBF9B] rounded-xl p-6">
					<div className="flex gap-20">
						<div className="space-y-4 flex-1">
							<div>
								<Label className="text-base text-[#1A1A1A]">
									Total Budget & Prize Pool
								</Label>
								<Input
									type="number"
									min={1500}
									value={totalBudget}
									onChange={handleTotalBudgetChange}
									placeholder="$ 1,500.00"
									className="w-full mt-2"
								/>
								<p className="text-sm text-gray-500 mt-1">
									This is the total amount you intend to spend (Min: $1,500)
								</p>
							</div>
							<div className="flex gap-2 items-center">
								<Label className="text-base text-[#1A1A1A]">
									How many Winners?
								</Label>
								<Input
									type="number"
									min={1}
									max={5}
									value={winnerCount}
									onChange={handleWinnerCountChange}
									className="w-20"
								/>
							</div>
						</div>
						<div className="space-y-4 flex-1">
							{positions.slice(0, winnerCount).map((value, index) => (
								<div key={index} className="flex items-center gap-2">
									<span className="w-24">
										{index + 1}
										{index === 0
											? "st"
											: index === 1
											? "nd"
											: index === 2
											? "rd"
											: "th"}{" "}
										Position:
									</span>
									<span className="font-medium">$</span>
									<Input
										type="number"
										value={value}
										onChange={(e) =>
											handlePositionChange(index, e.target.value)
										}
										className="w-24"
										placeholder={`${
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
			</div>
		</div>
	);
};

export default PrizeTimeline;
