import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon } from "lucide-react";
import React from "react";
import { useContestForm } from "./ContestFormContext";
import { format } from "date-fns";
import { CriteriaType } from "@/types/prizes-timeline";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const GMVPrizeTimeline = () => {
	const { formData, updatePrizeTimelineData } = useContestForm();
	const { startDate, endDate, criteria } = formData.prizeTimeline;

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
		<div className="max-w-[44rem] mx-auto ">
			<div className="space-y-6">
				{/* Contest Duration*/}
				<div className="bg-white border border-[#FFBF9B] rounded-xl p-6">
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

				{/* Incentives */}
				<div className="bg-white border border-[#FFBF9B] rounded-xl p-6">
					{/* Incentive #1 */}
					<Card className="shadow-none border-none">
						<CardHeader className="relative pb-2">
							<span className="absolute top-2 right-2 text-orange-500 font-normal">
								Incentive #1
							</span>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="incentive-name-1" className="text-base mb-1">
										Incentive Name
									</Label>
									<Input
										id="incentive-name-1"
										placeholder="Miami Trip for 2"
										className="mt-1"
									/>
								</div>
								<div>
									<Label htmlFor="milestone-1" className="text-base mb-1">
										Milestone to Qualify
									</Label>
									<Input
										id="milestone-1"
										placeholder="$5,000 GMV"
										className="mt-1"
									/>
								</div>
							</div>
							<div className="mt-4">
								<Label htmlFor="milestone-1" className="text-base mb-1">
									List and Describe your Incentives
								</Label>
								<Textarea
									rows={5}
									placeholder={`• Includes flight and 3-night stay in a luxury resort\n• Gift Cards\n• Apple Ipad`}
									className="mt-1"
								/>
							</div>
						</CardContent>
					</Card>
					<div className="bg-[#66708566] h-0.5 mt-2 mb-2 w-[90%] mx-auto" />
					{/* Incentive #2 */}
					<Card className="border-none shadow-none">
						<CardHeader className="relative pb-2">
							<span className="absolute top-2 right-2 text-orange-500 font-normal">
								Incentive #2
							</span>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="incentive-name-2" className="text-base mb-1">
										Incentive Name
									</Label>
									<Input
										id="incentive-name-2"
										placeholder="Miami Trip for 2"
										className="mt-1"
									/>
								</div>
								<div>
									<Label htmlFor="milestone-2" className="text-base mb-1">
										Milestone to Qualify
									</Label>
									<Input
										id="milestone-2"
										placeholder="$5,000 GMV"
										className="mt-1"
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default GMVPrizeTimeline;
