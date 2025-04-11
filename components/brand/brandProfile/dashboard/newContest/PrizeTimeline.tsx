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
import { useContestForm } from "./ContestFormContext";
import { CriteriaType } from "@/types/prizes-timeline";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PrizeTimeline = () => {
	const { formData, updatePrizeTimelineData } = useContestForm();
	const { totalBudget, winnerCount, positions, startDate, endDate, criteria } =
		formData.prizeTimeline;
		
	// Use local state to track input values
	const [budgetInputValue, setBudgetInputValue] = useState(totalBudget.toString());
	const [winnerInputValue, setWinnerInputValue] = useState(winnerCount.toString());
	const [positionInputValues, setPositionInputValues] = useState(
		positions.map(pos => pos === 0 ? "" : pos.toString())
	);
	const [budgetError, setBudgetError] = useState<string | null>(null);

	// Calculate current sum of position values
	const calculatePositionsSum = () => {
		return positions.reduce((sum, pos) => sum + pos, 0);
	};

	// Check if sum of position values equals total budget
	const validateBudgetAllocation = () => {
		const positionsSum = calculatePositionsSum();
		
		if (positionsSum === 0) {
			// Don't show error if no position values have been set yet
			setBudgetError(null);
			return;
		}
		
		if (positionsSum !== totalBudget) {
			if (positionsSum < totalBudget) {
				const remaining = totalBudget - positionsSum;
				setBudgetError(`You still have $${remaining} left to allocate across winner positions.`);
			} else {
				const excess = positionsSum - totalBudget;
				setBudgetError(`The allocated prize amount exceeds your budget by $${excess}. Please adjust your prize values.`);
			}
		} else {
			setBudgetError(null);
		}
	};

	// Update local state when form data changes externally
	useEffect(() => {
		setBudgetInputValue(totalBudget.toString());
		setWinnerInputValue(winnerCount.toString());
		setPositionInputValues(
			positions.map(pos => pos === 0 ? "" : pos.toString())
		);
	}, [totalBudget, winnerCount, positions]);

	// Validate budget allocation whenever positions or total budget changes
	useEffect(() => {
		validateBudgetAllocation();
	});

	const handleTotalBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// Store raw input in local state
		setBudgetInputValue(value);
		
		// Skip update if the field is empty
		if (value === "") {
			return;
		}
		
		// Remove leading zeros
		const sanitizedValue = value.replace(/^0+/, "");
		const numericValue = Number(sanitizedValue);
		
		// Only update if it's a valid number
		if (!isNaN(numericValue)) {
			updatePrizeTimelineData({
				totalBudget: numericValue,
			});
		}
	};
	
	// Handle focus out event for budget
	const handleBudgetBlur = () => {
		if (budgetInputValue === "" || isNaN(Number(budgetInputValue)) || Number(budgetInputValue) < 1500) {
			setBudgetInputValue("1500");
			updatePrizeTimelineData({ totalBudget: 1500 });
		}
	};

	const handleWinnerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// Store raw input in local state
		setWinnerInputValue(value);
		
		// Skip update if the field is empty
		if (value === "") {
			return;
		}
		
		// Remove leading zeros
		const sanitizedValue = value.replace(/^0+/, "") || "1"; // Default to "1" if empty after sanitizing
		const count = Number(sanitizedValue);
		
		// Ensure minimum value is 1
		const validCount = isNaN(count) || count < 1 ? 1 : count;
		updatePrizeTimelineData({ winnerCount: validCount });

		// Create a new array with the current winnerCount
		const newPositions = Array(validCount)
			.fill(0)
			.map((_, i) => {
				// Preserve existing values if they exist
				return i < positions.length ? positions[i] : 0;
			});
		updatePrizeTimelineData({ positions: newPositions });
		
		// Update position input values array
		setPositionInputValues(prevValues => {
			const newValues = [...prevValues];
			while (newValues.length < validCount) {
				newValues.push("");
			}
			return newValues.slice(0, validCount);
		});
	};
	
	// Handle focus out event for winner count
	const handleWinnerCountBlur = () => {
		if (winnerInputValue === "" || isNaN(Number(winnerInputValue)) || Number(winnerInputValue) < 1) {
			setWinnerInputValue("1");
			updatePrizeTimelineData({ winnerCount: 1 });
		}
	};

	const handlePositionChange = (index: number, value: string) => {
		// Update local state
		const newPositionInputValues = [...positionInputValues];
		newPositionInputValues[index] = value;
		setPositionInputValues(newPositionInputValues);
		
		// Skip update if empty
		if (value === "") {
			return;
		}
		
		// Remove leading zeros
		const sanitizedValue = value.replace(/^0+/, "");
		const numValue = sanitizedValue === "" ? 0 : Number(sanitizedValue);
		
		// Only update if it's a valid number
		if (!isNaN(numValue)) {
			const newPositions = [...positions];
			newPositions[index] = numValue;
			updatePrizeTimelineData({ positions: newPositions });
		}
	};
	
	// Handle focus out event for position inputs
	const handlePositionBlur = (index: number) => {
		const newPositions = [...positions];
		if (positionInputValues[index] === "" || isNaN(Number(positionInputValues[index]))) {
			newPositions[index] = 0;
			updatePrizeTimelineData({ positions: newPositions });
		}
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
		<div className="max-w-[44rem] mx-auto bg-white">
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
									type="text"
									inputMode="numeric"
									value={budgetInputValue}
									onChange={handleTotalBudgetChange}
									onBlur={handleBudgetBlur}
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
									type="text" 
									inputMode="numeric"
									value={winnerInputValue}
									onChange={handleWinnerCountChange}
									onBlur={handleWinnerCountBlur}
									className="w-20"
								/>
							</div>
						</div>
						<div className="space-y-4 flex-1">
							{positions.slice(0, winnerCount).map((_, index) => (
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
										type="text"
										inputMode="numeric"
										value={positionInputValues[index] || ""}
										onChange={(e) =>
											handlePositionChange(index, e.target.value)
										}
										onBlur={() => handlePositionBlur(index)}
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
							
							{/* Budget allocation error message */}
							{budgetError && (
								<Alert className="mt-4 bg-[#FFF5F5] border-[#FFBFBF] text-[#E60000]">
									<AlertDescription>
										{budgetError}
									</AlertDescription>
								</Alert>
							)}
							
							{/* Success message when budget is perfectly allocated */}
							{calculatePositionsSum() > 0 && !budgetError && (
								<Alert className="mt-4 bg-[#F0FFF4] border-[#C6F6D5] text-[#38A169]">
									<AlertDescription>
										Great! Your prize pool is perfectly allocated.
									</AlertDescription>
								</Alert>
							)}
							
							{/* Display budget summary */}
							<div className="mt-4 text-sm">
								<div className="flex justify-between font-medium">
									<span>Total Budget:</span>
									<span>${totalBudget}</span>
								</div>
								<div className="flex justify-between">
									<span>Allocated:</span>
									<span>${calculatePositionsSum()}</span>
								</div>
								<div className="flex justify-between mt-1 pt-1 border-t">
									<span>Remaining:</span>
									<span className={totalBudget - calculatePositionsSum() < 0 ? "text-[#E60000]" : ""}>
										${totalBudget - calculatePositionsSum()}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PrizeTimeline;