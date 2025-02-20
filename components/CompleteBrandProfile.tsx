"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa6";

const BrandProfileForm = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [selected, setSelected] = useState("");

	const handleDrag = (e: {
		preventDefault: () => void;
		stopPropagation: () => void;
		type: string;
	}) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			setSelectedFile(e.dataTransfer.files[0]);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	return (
		<>
			<div className="w-full border-t border-[#1A1A1A]" />
			<div className="w-full max-w-2xl mx-auto p-12 font-satoshi mb-12">
				<div className="space-y-6">
					<div className="space-y-2">
						<h1 className="text-xl md:text-2xl font-bold">
							Complete Your Brand Profile
						</h1>
						<p className="text-[#000] text-sm md:text-base font-normal">
							Help us understand your brand better by answering a few quick
							questions. This will allow us to tailor your experience and
							connect you with the best creators for your campaigns.
						</p>
					</div>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								What&#39;s the name of your brand or company?
							</Label>
							<Input placeholder="Social Shake" />
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm md:text-base font-medium">
									Phone Number
								</Label>
								<Input placeholder="234523563" />
							</div>
							<div className="space-y-2">
								<Label className="text-sm md:text-base font-medium">
									Company Email Address
								</Label>
								<Input placeholder="info@social-shake.com" type="email" />
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								Company Address
							</Label>
							<Input placeholder="50 Pitt Street, Sydney Harbour Marriott, Australia" />
						</div>

						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								Do you have a website? Share the URL.
							</Label>
							<Input placeholder="www.social-shake.com" />
						</div>

						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								What is your industry type?
							</Label>
							<Select>
								<SelectTrigger>
									<SelectValue placeholder="Select Industry" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="tech">Technology</SelectItem>
									<SelectItem value="retail">Retail</SelectItem>
									<SelectItem value="food">Food & Beverage</SelectItem>
									<SelectItem value="fashion">Fashion</SelectItem>
									<SelectItem value="health">Health & Wellness</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								Upload your Brand Logo
							</Label>
							<div
								className={cn(
									"border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
									dragActive
										? "border-[#FD5C02] bg-orange-50"
										: "border-gray-300",
									selectedFile && "border-green-500 bg-green-50"
								)}
								onDragEnter={handleDrag}
								onDragLeave={handleDrag}
								onDragOver={handleDrag}
								onDrop={handleDrop}
								onClick={() => document.getElementById("file-upload")?.click()}
							>
								{selectedFile ? (
									<p className="text-green-600">
										Selected: {selectedFile.name}
									</p>
								) : (
									<>
										<div className="bg-white border border-gray-200 rounded-lg py-1 px-2 w-12 mx-auto mb-2">
											<Image
												src="/icons/upload.svg"
												alt="Upload"
												width={40}
												height={40}
											/>
										</div>
										<p className="text-gray-600 text-sm md:text-base">
											<span className="text-[#FD5C02]">Click to upload</span> or
											drag and drop
										</p>
										<p className="text-sm text-gray-500 mt-1">
											PNG or JPG (800x400px)
										</p>
									</>
								)}
								<input
									id="file-upload"
									type="file"
									className="hidden"
									accept="image/png, image/jpeg"
									onChange={handleFileChange}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm md:text-base font-medium">
								What is your Primary Marketing Goal?
							</Label>
							<RadioGroup
								className="flex flex-wrap gap-3"
								value={selected}
								onValueChange={setSelected}
							>
								<div
									className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
									data-state={
										selected === "brand-awareness" ? "checked" : "unchecked"
									}
								>
									<RadioGroupItem
										value="brand-awareness"
										id="brand-awareness"
										className=""
									/>
									<Label htmlFor="brand-awareness">
										Increase brand awareness
									</Label>
								</div>
								<div
									className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
									data-state={
										selected === "drive-sales" ? "checked" : "unchecked"
									}
								>
									<RadioGroupItem value="drive-sales" id="drive-sales" />
									<Label htmlFor="drive-sales" className="cursor-pointer">
										Drive sales
									</Label>
								</div>
								<div
									className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
									data-state={
										selected === "audience-engagement" ? "checked" : "unchecked"
									}
								>
									<RadioGroupItem
										value="audience-engagement"
										id="audience-engagement"
									/>
									<Label
										htmlFor="audience-engagement"
										className="cursor-pointer"
									>
										Build audience engagement
									</Label>
								</div>
								<div
									className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
									data-state={
										selected === "user-interaction" ? "checked" : "unchecked"
									}
								>
									<RadioGroupItem
										value="user-interaction"
										id="user-interaction"
									/>
									<Label htmlFor="user-interaction" className="cursor-pointer">
										Increase User Interaction
									</Label>
								</div>
								<div className="flex items-center space-x-2 ">
									<RadioGroupItem value="other" id="other" />
									<Label htmlFor="other" className="cursor-pointer">
										Other:
									</Label>
									<Input
										placeholder="Please specify"
										className="w-40"
										disabled={selected !== "other"}
									/>
								</div>
							</RadioGroup>
							<div className="space-y-2">
								<Label className="text-sm md:text-base font-medium">
									Social Media Handles
								</Label>
								<div className="relative">
									<Image
										src="/icons/tiktok.svg"
										alt="Tiktok"
										width={4}
										height={4}
										className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
									/>
									<Input placeholder="social_shake" className="pl-8" />
								</div>
								<div className="relative">
									<Image
										src="/icons/ig.svg"
										alt="Instagram"
										width={4}
										height={4}
										className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
									/>
									<Input placeholder="social_shake" className="pl-8" />
								</div>
								<div className="relative">
									<Image
										src="/icons/facebook.svg"
										alt="Facebook"
										width={4}
										height={4}
										className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
									/>
									<Input placeholder="social_shake" className="pl-8" />
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-sm md:text-base font-medium">
									Who is your target audience?
								</Label>
								<Input placeholder="Tech Enthusiasts" type="text" />
							</div>
						</div>
					</div>
					{/* Submit Button */}
					<div className="flex justify-end">
						<Button className="flex justify-end bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal">
							<Link href="/signup-complete" className="flex">
								<p>Submit Registration</p>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1" />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default BrandProfileForm;
