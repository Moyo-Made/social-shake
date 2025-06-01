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
import React, { useState } from "react";
import { useProjectForm } from "./ProjectFormContext";

const TikTokShopContentRequirements = () => {
	const { formData, updateProjectRequirementsData } = useProjectForm();
	const {
		contentType,
		duration,
		videoType,
		script,
		contentLinks,
		brandAssets,
	} = formData.projectRequirements;
	const [showOtherContentType, setShowOtherContentType] = useState(false);
	const [otherContentType, setOtherContentType] = useState("");

	const updateContentType = (value: string) => {
		if (value === "other") {
			setShowOtherContentType(true);
		} else {
			setShowOtherContentType(false);
			updateProjectRequirementsData({ contentType: value });
		}
	};

	const handleOtherContentTypeChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setOtherContentType(e.target.value);
		updateProjectRequirementsData({ contentType: e.target.value });
	};

	const updateDuration = (value: string) => {
		updateProjectRequirementsData({ duration: value });
	};

	const updateVideoType = (value: string) => {
		updateProjectRequirementsData({ videoType: value });
	};

	const updateScript = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		updateProjectRequirementsData({ script: e.target.value });
	};

	const addNewLink = () => {
		const newLinks = [...contentLinks, ""];
		updateProjectRequirementsData({ contentLinks: newLinks });
	};

	const removeLink = (index: number) => {
		if (index === 0) return;
		const newLinks = contentLinks.filter((_, i) => i !== index);
		updateProjectRequirementsData({ contentLinks: newLinks });
	};

	const updateLink = (index: number, value: string) => {
		const newLinks = [...contentLinks];
		newLinks[index] = value;
		updateProjectRequirementsData({ contentLinks: newLinks });
	};

	const updateBrandAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateProjectRequirementsData({ brandAssets: e.target.value });
	};

	return (
		<div className="flex flex-col space-y-5 bg-white px-8 py-6 border border-[#FFBF9B] rounded-lg">
			<div className="flex flex-col">
				<Label className="text-base">What type of Content do you want?</Label>

				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={contentType}
					onValueChange={updateContentType}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "product-showcase" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="product-showcase"
							id="product-showcase"
							className=""
						/>
						<Label htmlFor="product-showcase">Product Showcase</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "testimonials" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="testimonials"
							id="testimonials"
							className=""
						/>
						<Label htmlFor="testimonials">Testimonials</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={contentType === "tutorials" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="tutorials" id="tutorials" className="" />
						<Label htmlFor="tutorials">Tutorials</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "trend-participation" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="trend-participation"
							id="trend-participation"
							className=""
						/>
						<Label htmlFor="trend-participation">Testimonials</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "other" || showOtherContentType
								? "checked"
								: "unchecked"
						}
					>
						<RadioGroupItem value="other" id="other" className="" />
						<Label htmlFor="other">Other</Label>
					</div>

					{/* Add this below the RadioGroup */}
					{showOtherContentType && (
						<div className="mt-2">
							<Input
								type="text"
								placeholder="Specify other content type"
								value={otherContentType}
								onChange={handleOtherContentTypeChange}
								className="w-full"
							/>
						</div>
					)}
				</RadioGroup>
			</div>

			{/* Duration */}
			<div>
				<Label className="text-base">Duration?</Label>
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
						data-state={
							videoType === "creator-script" ? "checked" : "unchecked"
						}
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

				{videoType === "client-script" && (
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
				)}
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
				<p className="text-sm text-[#475467]">
					Paste the Link of a folder containing your brand assets
				</p>
			</div>
		</div>
	);
};

export default TikTokShopContentRequirements;
