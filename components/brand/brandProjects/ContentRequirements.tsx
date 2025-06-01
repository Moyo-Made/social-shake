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

const ContentRequirements = () => {
	const { formData, updateProjectRequirementsData } = useProjectForm();
	const {
		contentType,
		platform,
		aspectRatio,
		duration,
		videoType,
		script,
		contentLinks,
		brandAssets,
	} = formData.projectRequirements;
	const { projectType } = formData.projectDetails;
	const [showOtherContentType, setShowOtherContentType] = useState(false);
	const [otherContentType, setOtherContentType] = useState("");
	const [showOtherPlatform, setShowOtherPlatform] = useState(false);
	const [otherPlatform, setOtherPlatform] = useState("");

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

	const updatePlatform = (value: string) => {
		if (platform.includes(value)) {
			updateProjectRequirementsData({
				platform: platform.filter((p) => p !== value),
			});
		} else {
			updateProjectRequirementsData({
				platform: [...platform, value],
			});
		}
	};
	const handleOtherPlatformChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setOtherPlatform(e.target.value);
	};

	const addOtherPlatform = () => {
		if (otherPlatform.trim() !== "") {
			updateProjectRequirementsData({
				platform: [...platform, otherPlatform.trim()],
			});
			setOtherPlatform("");
		}
	};

	const updateAspectRatio = (value: string) => {
		updateProjectRequirementsData({ aspectRatio: value });
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
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none capitalize"
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
						className="flex items-center space-x-2 cursor-pointer capitalize text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
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
						className="flex items-center space-x-2 cursor-pointer capitalize text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={contentType === "tutorials" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="tutorials" id="tutorials" className="" />
						<Label htmlFor="tutorials">Tutorials</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer capitalize text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "trend-participation" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="trend-participation"
							id="trend-participation"
							className=""
						/>
						<Label htmlFor="trend-participation">Trend Participation</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer capitalize text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							contentType === "other" || showOtherContentType
								? "checked"
								: "unchecked"
						}
					>
						<RadioGroupItem value="other" id="other" className="" />
						<Label htmlFor="other">Other</Label>
					</div>

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

			{/* Platform and Aspect Ratio sections now conditionally rendered */}
			{projectType === "UGC Content Only" && (
				<>
					{/* Platform Section */}
					<div>
						<Label className="text-base">
							What Platform is the content for?
						</Label>
						<div className="p-3 border border-orange-200 rounded-lg flex flex-wrap gap-2 mt-2">
							<button
								type="button"
								onClick={() => updatePlatform("youtube-shorts")}
								className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
									platform.includes("youtube-shorts")
										? "bg-[#FD5C02] text-white"
										: "bg-white text-gray-700"
								}`}
							>
								<span className="text-red-600">
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
									</svg>
								</span>
								<span>Youtube Shorts</span>
								{platform.includes("youtube-shorts") && (
									<span className="ml-1 text-gray-400">
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => updatePlatform("instagram-reels")}
								className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
									platform.includes("instagram-reels")
										? "bg-[#FD5C02] text-white"
										: "bg-white text-gray-700"
								}`}
							>
								<span className="text-pink-600">
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
									</svg>
								</span>
								<span>Instagram Reels</span>
								{platform.includes("instagram-reels") && (
									<span className="ml-1 text-gray-400">
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => updatePlatform("facebook")}
								className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
									platform.includes("facebook")
										? "bg-[#FD5C02] text-white"
										: "bg-white text-gray-700"
								}`}
							>
								<span className="text-blue-600">
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
									</svg>
								</span>
								<span>Facebook</span>
								{platform.includes("facebook") && (
									<span className="ml-1 text-gray-400">
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => updatePlatform("tiktok")}
								className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
									platform.includes("tiktok")
										? "bg-[#FD5C02] text-white"
										: "bg-white text-gray-700"
								}`}
							>
								<span className="text-black">
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
									</svg>
								</span>
								<span>Tiktok</span>
								{platform.includes("tiktok") && (
									<span className="ml-1 text-gray-400">
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</span>
								)}
							</button>

							{/* Other Platform button */}
							<button
								type="button"
								onClick={() => setShowOtherPlatform(!showOtherPlatform)}
								className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
									showOtherPlatform
										? "bg-[#FD5C02] text-white border-transparent"
										: "text-[#667085] border-[#667085]"
								}`}
							>
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path
										d="M12 5v14m-7-7h14"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span>Other</span>
							</button>
						</div>
					</div>

					{/* Show input field when Other is selected */}
					{showOtherPlatform && (
						<div className="flex w-full mt-2 gap-2">
							<Input
								type="text"
								placeholder="Enter platform name"
								value={otherPlatform}
								onChange={handleOtherPlatformChange}
								className="flex-1"
							/>
							<Button
								type="button"
								onClick={addOtherPlatform}
								disabled={otherPlatform.trim() === ""}
								className="bg-[#FD5C02] hover:bg-[#e05302] text-white"
							>
								Add
							</Button>
						</div>
					)}

					{/* Display custom platforms as chips */}
					<div className="flex flex-wrap gap-2 mt-2">
						{platform
							.filter(
								(p) =>
									![
										"youtube-shorts",
										"instagram-reels",
										"facebook",
										"tiktok",
									].includes(p)
							)
							.map((p, index) => (
								<div
									key={index}
									className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[#FD5C02] text-white"
								>
									<span>{p}</span>
									<button
										type="button"
										onClick={() => updatePlatform(p)}
										className="ml-1"
									>
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</button>
								</div>
							))}
					</div>

					{/* Aspect Ratio Section */}
					<div>
						<Label className="text-base">Aspect Ratio?</Label>
						<RadioGroup
							className="flex flex-wrap gap-3 mt-2"
							value={aspectRatio}
							onValueChange={updateAspectRatio}
						>
							<div
								className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
								data-state={
									aspectRatio === "Vertical" ? "checked" : "unchecked"
								}
							>
								<RadioGroupItem value="Vertical" id="Vertical" className="" />
								<Label htmlFor="Vertical">9:16 (Vertical)</Label>
							</div>

							<div
								className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
								data-state={
									aspectRatio === "Horizontal" ? "checked" : "unchecked"
								}
							>
								<RadioGroupItem
									value="Horizontal"
									id="Horizontal"
									className=""
								/>
								<Label htmlFor="Horizontal">16:9 (Horizontal)</Label>
							</div>

							<div
								className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
								data-state={aspectRatio === "Square" ? "checked" : "unchecked"}
							>
								<RadioGroupItem value="Square" id="Square" className="" />
								<Label htmlFor="Square">4:5 (Square)</Label>
							</div>
						</RadioGroup>
					</div>
				</>
			)}

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

			{/* Video Type */}
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

			{/* Rest of the component (content links, brand assets) remains the same */}
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

export default ContentRequirements;
