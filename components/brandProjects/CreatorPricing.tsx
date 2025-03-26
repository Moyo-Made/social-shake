// pages/index.tsx
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import Image from "next/image";
import { useProjectForm } from "./ProjectFormContext";
import { Creator, CreatorPricing } from "@/types/contestFormData";

export default function CreatorPricingTab() {
	const { formData, updateCreatorPricing } = useProjectForm();
	const { creatorPricing } = formData;

	// Initialize state from context or use default values
	const [selectionMethod, setSelectionMethod] = useState<
		CreatorPricing["selectionMethod"]
	>(creatorPricing.selectionMethod || "Invite Specific Creators");
	const [budget, setBudget] = useState(creatorPricing.budgetPerVideo || 1500);
	const [extras, setExtras] = useState({
		captions: creatorPricing.extras.captions || false,
		music: creatorPricing.extras.music || true,
		rawFiles: creatorPricing.extras.rawFiles || true,
	});
	const [invitedCreatorsCount] = useState(2); // Fixed at 2 for invited creators
const [publicCreatorsCount, setPublicCreatorsCount] = useState(
  creatorPricing.selectionMethod === "Post Public Brief" 
    ? creatorPricing.creatorCount || 1 
    : 1
);
	const [videosPerCreator, setVideosPerCreator] = useState(
		creatorPricing.videosPerCreator || 2
	);
	const [creatorSelectionMode, setCreatorSelectionMode] = useState("all");
	const [ageGroup, setAgeGroup] = useState(creatorPricing.ageGroup || "25-34");
	const [gender, setGender] = useState(creatorPricing.gender || "female");

	// Predefined mock creators
	const [selectedCreators] = useState<Creator[]>([
		{ name: "Colina Demirdjian", avatar: "/icons/colina.svg" },
		{ name: "Tolulope Olu", avatar: "/icons/colina.svg" },
	]);

	// Calculate totals
	const totalVideos = (selectionMethod === "Invite Specific Creators" 
		? invitedCreatorsCount * videosPerCreator
		: publicCreatorsCount) * videosPerCreator;
	const musicTotal = extras.music ? 50 * totalVideos : 0;
	const rawFilesTotal = extras.rawFiles ? 100 * totalVideos : 0;
	const totalBudget = budget * totalVideos;
	const totalAmount = totalBudget + (musicTotal + rawFilesTotal);
	const services = 0.1 * totalAmount;

	// Update context when values change
	const updateContextValues = () => {
		const currentCreatorCount = selectionMethod === "Invite Specific Creators" 
    ? invitedCreatorsCount 
    : publicCreatorsCount;
		updateCreatorPricing({
			selectionMethod,
			selectedCreators,
			ageGroup,
			gender,
			creatorCount: currentCreatorCount,
			videosPerCreator,
			totalVideos,
			budgetPerVideo: budget,
			totalBudget,
			extras: {
				captions: extras.captions,
				captionsPrice: 120,
				captionsTotal: extras.captions ? 120 * totalVideos : 0,
				music: extras.music,
				musicPrice: 50,
				musicTotal,
				rawFiles: extras.rawFiles,
				rawFilesPrice: 100,
				rawFilesTotal,
			},
			extrasTotal: musicTotal + rawFilesTotal,
			totalAmount,
			creator: {
				selectionMethod,
				selectedCreators,
				ageGroup,
				gender,
				creatorCount: currentCreatorCount,
				videosPerCreator,
				totalVideos,
			},
			cost: {
				budgetPerVideo: budget,
				totalBudget,
				extras: {
					music: extras.music,
					musicPrice: 50,
					musicTotal,
					rawFiles: extras.rawFiles,
					rawFilesPrice: 100,
					rawFilesTotal,
				},
				extrasTotal: musicTotal + rawFilesTotal,
				totalAmount,
				commissionPerSale: services,
			},
		});
	};

	// Trigger context update when relevant values change
	React.useEffect(() => {
		updateContextValues();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		selectionMethod,
		totalVideos,
		videosPerCreator,
		budget,
		extras,
		ageGroup,
		gender,
	]);

	return (
		<div className="flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto">
			{/* Left card - Creator selection */}
			<div className="flex-1 h-[40rem]">
				<Card className="border rounded-xl border-orange-500 h-full w-full">
					<CardContent className="pt-6">
						<div className="space-y-3">
							<h2 className="text-base font-medium">
								How do you want to select Creators?
							</h2>

							<Select
								value={selectionMethod}
								onValueChange={(value: CreatorPricing["selectionMethod"]) => {
									setSelectionMethod(value);
								}}
							>
								<SelectTrigger className="w-full border rounded-md">
									<SelectValue placeholder="Select method" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="Invite Specific Creators">
										Invite Specific Creators
									</SelectItem>
									<SelectItem value="Post Public Brief">
										Post Public Brief
									</SelectItem>
								</SelectContent>
							</Select>

							{selectionMethod === "Invite Specific Creators" ? (
								<div className="space-y-4">
									<h3 className="text-base font-medium">
										Invite Specific Creators
									</h3>

									<div className="flex gap-2 flex-wrap">
										<Button
											variant="default"
											className={`flex items-center gap-2 ${
												creatorSelectionMode === "all"
													? "bg-orange-500 text-white"
													: "bg-white text-[#667085] border border-[#667085]"
											} rounded-lg`}
											onClick={() => setCreatorSelectionMode("all")}
										>
											<span className="rounded-lg bg-white w-4 h-4 flex items-center justify-center">
												<span
													className={`block w-2 h-2 rounded-lg ${
														creatorSelectionMode === "all"
															? "bg-orange-500"
															: "bg-white border border-[#667085]"
													}`}
												></span>
											</span>
											Select all Saved Creators
										</Button>

										<Button
											variant="default"
											className={`flex items-center gap-2 ${
												creatorSelectionMode === "search"
													? "bg-orange-500 text-white"
													: "bg-white text-[#667085] border border-[#667085]"
											} rounded-lg`}
											onClick={() => setCreatorSelectionMode("search")}
										>
											<span className="rounded-lg bg-white w-4 h-4 flex items-center justify-center">
												<span
													className={`block w-2 h-2 rounded-lg ${
														creatorSelectionMode === "search"
															? "bg-orange-500"
															: "bg-white border border-[#667085]"
													}`}
												></span>
											</span>
											Search Creators
										</Button>
									</div>

									{creatorSelectionMode === "search" && (
										<div className="relative">
											<Input
												type="text"
												placeholder="Search Creators"
												className="pl-8 border rounded-full"
											/>
											<svg
												className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
												width="15"
												height="15"
												viewBox="0 0 15 15"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<circle
													cx="6.5"
													cy="6.5"
													r="5.5"
													stroke="currentColor"
													strokeWidth="1.5"
												/>
												<path
													d="M10.5 10.5L14 14"
													stroke="currentColor"
													strokeWidth="1.5"
												/>
											</svg>
										</div>
									)}

									<div>
										<h3 className="text-base font-medium mb-4">
											Saved Creators
										</h3>
										<div className="border rounded-lg p-4">
											<div className="flex flex-wrap gap-2">
												{selectedCreators.map((creator, index) => (
													<div
														key={index}
														className="flex items-center border border-[#D0D5DD] gap-1 bg-white rounded-lg px-2 py-1"
													>
														<Image
															src={creator.avatar}
															alt={creator.name}
															width={6}
															height={6}
															className="w-6 h-6 rounded-full"
															onError={(e) => {
																e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=random`;
															}}
														/>
														<span className="text-sm">{creator.name}</span>
														<button className="ml-1 text-gray-500 hover:text-gray-700">
															<X size={14} />
														</button>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<div className="space-y-2">
										<h2 className="text-base font-medium">Age Group</h2>
										<div className="flex flex-wrap gap-2">
											{["18-24", "25-34", "35-50", "50+"].map((age) => (
												<button
													key={age}
													className={`px-4 py-2 rounded-md border flex items-center gap-2 ${
														ageGroup === age
															? "bg-orange-500 text-white"
															: "bg-white"
													}`}
													onClick={() => setAgeGroup(age)}
												>
													<div
														className={`w-4 h-4 rounded-full border flex items-center justify-center ${
															ageGroup === age
																? "border-white"
																: "border-gray-400"
														}`}
													>
														{ageGroup === age && (
															<div className="w-2 h-2 rounded-full bg-white"></div>
														)}
													</div>
													{age}
												</button>
											))}
											<button
												className={`px-4 py-2 rounded-md border flex items-center gap-2 ${
													ageGroup === "all"
														? "bg-orange-500 text-white"
														: "bg-white"
												}`}
												onClick={() => setAgeGroup("all")}
											>
												<div
													className={`w-4 h-4 rounded-full border flex items-center justify-center ${
														ageGroup === "all"
															? "border-white"
															: "border-gray-400"
													}`}
												>
													{ageGroup === "all" && (
														<div className="w-2 h-2 rounded-full bg-white"></div>
													)}
												</div>
												All Age Groups
											</button>
										</div>
									</div>

									<div className="space-y-2">
										<h2 className="text-base font-medium">Gender</h2>
										<div className="flex flex-wrap gap-2">
											{["male", "female", "all"].map((option) => (
												<button
													key={option}
													className={`px-4 py-2 rounded-md border flex items-center gap-2 ${
														gender === option
															? "bg-orange-500 text-white"
															: "bg-white"
													}`}
													onClick={() => setGender(option)}
												>
													<div
														className={`w-4 h-4 rounded-full border flex items-center justify-center ${
															gender === option
																? "border-white"
																: "border-gray-400"
														}`}
													>
														{gender === option && (
															<div className="w-2 h-2 rounded-full bg-white"></div>
														)}
													</div>
													{option === "all"
														? "All Genders"
														: option.charAt(0).toUpperCase() + option.slice(1)}
												</button>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<h2 className="text-base font-medium">
											What type of Industry
										</h2>
										<Select>
											<SelectTrigger className="w-full border rounded-md">
												<SelectValue placeholder="Select Industry" />
											</SelectTrigger>
											<SelectContent className="bg-white">
												<SelectItem value="technology">Technology</SelectItem>
												<SelectItem value="fashion">Fashion</SelectItem>
												<SelectItem value="food">Food & Beverage</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<h2 className="text-base font-medium">Language</h2>
										<Select>
											<SelectTrigger className="w-full border rounded-md">
												<SelectValue placeholder="Select Language of Creator" />
											</SelectTrigger>
											<SelectContent className="bg-white">
												<SelectItem value="english">English</SelectItem>
												<SelectItem value="spanish">Spanish</SelectItem>
												<SelectItem value="french">French</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<h2 className="text-base font-medium">
											Countries allowed for Project
										</h2>
										<Select>
											<SelectTrigger className="w-full border rounded-md">
												<SelectValue placeholder="Select Countries (Multi Select)" />
											</SelectTrigger>
											<SelectContent className="bg-white">
												<SelectItem value="us">United States</SelectItem>
												<SelectItem value="ca">Canada</SelectItem>
												<SelectItem value="uk">United Kingdom</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Right card - Budget and extras */}
			<Card className="flex-1 max-w-72 border border-orange-500 rounded-xl">
				<CardContent className="pt-6">
					<div className="space-y-6">
						<div>
							<h2 className="text-base font-medium mb-2">
								Total Budget per Video
							</h2>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									type="number"
									value={budget}
									onChange={(e) => {
										const value = Number(e.target.value);
										setBudget(value);
									}}
									className="pl-8 border rounded-md"
									min={1500}
								/>
							</div>
							<p className="text-sm text-gray-500 mt-1">
								This is the total amount you intend to spend (Min. $1,500)
							</p>
						</div>

						<div className="border-t pt-4">
							<h2 className="text-base font-medium mb-4">Extras</h2>
							<RadioGroup className="space-y-4">
								<div className="flex items-start gap-2">
									<div
										className={`mt-1 h-4 w-4 rounded-full border border-black flex items-center justify-center cursor-pointer ${extras.captions ? "bg-orange-500 border-orange-500" : "bg-white"}`}
										onClick={() =>
											setExtras({ ...extras, captions: !extras.captions })
										}
									>
										{extras.captions && (
											<div className="h-2 w-2 rounded-full bg-white"></div>
										)}
									</div>
									<div className="flex-1">
										<Label htmlFor="captions" className="text-base font-medium">
											Captions- $120
										</Label>
										<p className="text-sm text-gray-500">
											(Subtitles or text overlays used in the video.)
										</p>
									</div>
								</div>

								<div className="flex items-start gap-2">
									<div
										className={`mt-1 h-4 w-4 rounded-full border border-black flex items-center justify-center cursor-pointer ${extras.music ? "bg-orange-500 border-orange-500" : "bg-white"}`}
										onClick={() =>
											setExtras({ ...extras, music: extras.music })
										}
									>
										{extras.music && (
											<div className="h-2 w-2 rounded-full bg-white"></div>
										)}
									</div>
									<div className="flex-1">
										<Label htmlFor="music" className="text-base font-medium">
											Music- $50
										</Label>
										<p className="text-sm text-gray-500">
											(Background music or sound effects used in the video.)
										</p>
									</div>
								</div>

								<div className="flex items-start gap-2">
									<div
										className={`mt-1 h-4 w-4 rounded-full border border-black flex items-center justify-center cursor-pointer ${extras.rawFiles ? "bg-orange-500 border-orange-500" : "bg-white"}`}
										onClick={() =>
											setExtras({ ...extras, rawFiles: extras.rawFiles })
										}
									>
										{extras.rawFiles && (
											<div className="h-2 w-2 rounded-full bg-white"></div>
										)}
									</div>
									<div className="flex-1">
										<Label htmlFor="rawFiles" className="text-base font-medium">
											Raw Files- $100
										</Label>
										<p className="text-sm text-gray-500">
											Unedited footage or source files from the creator
										</p>
									</div>
								</div>
							</RadioGroup>
						</div>

						<div className="border-t pt-4">
							{selectionMethod === "Invite Specific Creators" ? (
								<div className="flex justify-between mb-2">
									<span>No of Creators:</span>
									<span>{Math.max(2, invitedCreatorsCount)} Creators</span>
								</div>
							) : (
								<div className="flex justify-between items-center mb-2">
									<span>How many Creators:</span>
									<div className="relative flex items-center">
										<Input
											type="number"
											value={publicCreatorsCount}
											onChange={(e) => {
												const min =
													(selectionMethod as CreatorPricing["selectionMethod"]) ===
													"Invite Specific Creators"
														? 2
														: 1;
														setPublicCreatorsCount(Math.max(min, Number(e.target.value)));
											}}
											className="w-16 h-8 px-2 text-center border rounded-md"
											min={1}
										/>
										<div className="absolute right-0 flex flex-col h-full">
											<button
												className="flex-1 px-1 border-l flex items-center justify-center"
												onClick={() =>
													setPublicCreatorsCount((prev) => Math.max(1, prev + 1))
												}
											>
												<svg
													viewBox="0 0 10 6"
													width="10"
													height="6"
													fill="none"
													stroke="currentColor"
												>
													<path d="M1 5L5 1L9 5" strokeWidth="1.5" />
												</svg>
											</button>
											<button
												className="flex-1 px-1 border-l border-t flex items-center justify-center"
												onClick={() =>
													setPublicCreatorsCount((prev) => Math.max(1, prev - 1))
												}
											>
												<svg
													viewBox="0 0 10 6"
													width="10"
													height="6"
													fill="none"
													stroke="currentColor"
												>
													<path d="M9 1L5 5L1 1" strokeWidth="1.5" />
												</svg>
											</button>
										</div>
									</div>
								</div>
							)}
							<div className="flex justify-between items-center mb-2">
								<span>No of Videos per Creator:</span>
								<div className="relative flex items-center">
									<Input
										type="number"
										value={videosPerCreator}
										onChange={(e) =>
											setVideosPerCreator(Number(e.target.value))
										}
										className="w-16 h-8 px-2 text-center border rounded-md"
										min={1}
									/>
									<div className="absolute right-0 flex flex-col h-full">
										<button
											className="flex-1 px-1 border-l flex items-center justify-center"
											onClick={() =>
												setVideosPerCreator((prev) => Math.max(1, prev + 1))
											}
										>
											<svg
												viewBox="0 0 10 6"
												width="10"
												height="6"
												fill="none"
												stroke="currentColor"
											>
												<path d="M1 5L5 1L9 5" strokeWidth="1.5" />
											</svg>
										</button>
										<button
											className="flex-1 px-1 border-l border-t flex items-center justify-center"
											onClick={() =>
												setVideosPerCreator((prev) => Math.max(1, prev - 1))
											}
										>
											<svg
												viewBox="0 0 10 6"
												width="10"
												height="6"
												fill="none"
												stroke="currentColor"
											>
												<path d="M9 1L5 5L1 1" strokeWidth="1.5" />
											</svg>
										</button>
									</div>
								</div>
							</div>
							<div className="flex justify-between mb-4">
								<span>Total Number of Videos:</span>
								<span>{totalVideos} Videos</span>
							</div>
						</div>

						<div className="border-t pt-4 bg-[#FFF4EE] -mx-6 px-6 pb-6">
							<h2 className="text-base font-medium mb-4">Cost Breakdown</h2>

							<div className="flex gap-1 mb-1">
								<span>Total Budget:</span>
								<span className="font-medium">
									${totalBudget.toLocaleString()}
								</span>
							</div>
							<div className="text-sm text-gray-500 mb-4">
								(Based on ${budget.toLocaleString()} per video × {totalVideos}{" "}
								videos)
							</div>

							<div className="flex gap-1 mb-1">
								<span>Extras:</span>
								<span className="font-medium">
									${(musicTotal + rawFilesTotal).toLocaleString()}
								</span>
							</div>
							<div className="text-sm text-gray-500 mb-1">
								Music - ${extras.music ? 50 : 0} × {totalVideos} Videos = $
								{musicTotal}
							</div>
							<div className="text-sm text-gray-500 mb-4">
								Raw Files - ${extras.rawFiles ? 100 : 0} × {totalVideos} Videos
								= ${rawFilesTotal}
							</div>

							<div className="flex gap-1 mb-1">
								<span>Service Fee:</span>
								<span className="font-medium">
									${services.toLocaleString()}
								</span>
							</div>
							<div className="text-sm text-gray-500 mb-4">
								<p>10% of the Total Amount - This is paid to Social Shake</p>
							</div>

							<div className="flex gap-1 text-lg font-bold">
								<span>Total Amount:</span>
								<span>${totalAmount.toLocaleString()}</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
