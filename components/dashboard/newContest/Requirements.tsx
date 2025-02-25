"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import React, { useEffect } from "react";
import { useContestForm } from "./ContestFormContext";

const Requirements = () => {
	const { formData, updateRequirementsData } = useContestForm();
	const { whoCanJoin, duration, videoType, script, contentLinks, brandAssets } = formData.requirements;

	const updateWhoCanJoin = (value: string) => {
		updateRequirementsData({ whoCanJoin: value });
	};

	const updateDuration = (value: string) => {
		updateRequirementsData({ duration: value });
	};

	const updateVideoType = (value: string) => {
		updateRequirementsData({ videoType: value });
	};

	const updateScript = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		updateRequirementsData({ script: e.target.value });
	};

	const addNewLink = () => {
		const newLinks = [...contentLinks, ""];
		updateRequirementsData({ contentLinks: newLinks });
	};

	const removeLink = (index: number) => {
		if (index === 0) return;
		const newLinks = contentLinks.filter((_, i) => i !== index);
		updateRequirementsData({ contentLinks: newLinks });
	};

	const updateLink = (index: number, value: string) => {
		const newLinks = [...contentLinks];
		newLinks[index] = value;
		updateRequirementsData({ contentLinks: newLinks });
	};

	const updateBrandAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateRequirementsData({ brandAssets: e.target.value });
	};

	return (
		<div className="flex flex-col space-y-5">
			<div className="flex flex-col">
				<Label className="text-base">Who Can Join Your Contest ?</Label>
				<span className="text-sm text-[#1A1A1A] mt-1 italic">
					(Choose whether creators need to apply for approval or if all creators
					are pre-approved to participate.)
				</span>

				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={whoCanJoin}
					onValueChange={updateWhoCanJoin}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							whoCanJoin === "allow-applications" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="allow-applications"
							id="allow-applications"
							className=""
						/>
						<Label htmlFor="allow-applications">Allow Applications</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							whoCanJoin === "allow-all-creators" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="allow-all-creators"
							id="allow-all-creators"
							className=""
						/>
						<Label htmlFor="allow-all-creators">Allow All Creators</Label>
					</div>
				</RadioGroup>
			</div>

			<div>
				<Label className="text-base">Duration ?</Label>
				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={duration}
					onValueChange={updateDuration}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={duration === "15-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="15-seconds" id="15-seconds" className="" />
						<Label htmlFor="15-seconds">15 Seconds</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={duration === "30-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="30-seconds" id="30-seconds" className="" />
						<Label htmlFor="30-seconds">30 Seconds</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={duration === "60-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="60-seconds" id="60-seconds" className="" />
						<Label htmlFor="60-seconds">60 Seconds</Label>
					</div>
				</RadioGroup>
			</div>

			<div className="flex flex-col">
				<Label className="text-base">Video Type ?</Label>
				<span className="text-sm text-[#1A1A1A] mt-1 italic">
					(Choose whether creators should follow your script or create their
					own)
				</span>

				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={videoType}
					onValueChange={updateVideoType}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#000]"
						data-state={videoType === "client-script" ? "checked" : "unchecked"}
					>
						<RadioGroupItem
							value="client-script"
							id="client-script"
							className="data-[state=checked]:bg-[#FD5C02] border border-gray-100 text-white"
						/>
						<Label htmlFor="client-script" className="text-[#1A1A1A]">
							Client&#39;s Script
						</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer"
						data-state={videoType === "creator-script" ? "checked" : "unchecked"}
					>
						<RadioGroupItem
							value="creator-script"
							id="creator-script"
							className="data-[state=checked]:bg-[#FD5C02] border border-gray-100 text-white"
						/>
						<Label htmlFor="creator-script" className="text-[#1A1A1A]">
							Creator&#39;s Script
						</Label>
					</div>
				</RadioGroup>

				<div className="mt-2">
					<Label className="text-[15px]">Write your Script</Label>
					<Textarea
						className="mt-1 placeholder:text-[#667085] font-normal"
						rows={5}
						placeholder="We're looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!"
						value={script}
						onChange={updateScript}
					/>
				</div>
			</div>

			<div className="space-y-4">
				<Label className="text-base">Links of Contents you like</Label>

				{contentLinks.map((link, index) => (
					<div key={index} className="flex gap-2">
						<Input
							type="text"
							value={link}
							onChange={(e) => updateLink(index, e.target.value)}
							placeholder="https://vt.tiktok.com/ZS6KEanvB/"
							className="flex-1"
						/>
						<div className="flex gap-2">
							{index === contentLinks.length - 1 && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={addNewLink}
								>
									<Plus className="h-4 w-4" />
								</Button>
							)}
							{index !== 0 && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeLink(index)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
				))}
			</div>

			<div className="space-y-2">
				<Label className="text-base">Brand Assets</Label>
				<div className="flex gap-2">
					<Input
						type="text"
						placeholder="https://drive.google.com/file/d/1l31B5fb21SJf5P9LWNKW-pAF7kN7knTX/view?usp=sharing"
						value={brandAssets}
						onChange={updateBrandAssets}
					/>
					
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon">
									<HelpCircle className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Paste the Link of a folder containing your brand assets</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<p className="text-sm text-[#475467]">Paste the Link of a folder containing your brand assets</p>
			</div>
		</div>
	);
};

export default Requirements;