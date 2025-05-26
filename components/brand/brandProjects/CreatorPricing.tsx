import React, { useEffect, useState } from "react";
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
import { X } from "lucide-react";
import Image from "next/image";
import { useProjectForm } from "./ProjectFormContext";
import { Creator, CreatorPricing } from "@/types/contestFormData";
import { useSavedCreators } from "@/hooks/useSavedCreators";

export default function CreatorPricingTab() {
	const { formData, updateCreatorPricing } = useProjectForm();
	const { creatorPricing } = formData;
	const {
		savedCreators,
		allCreators,
		isLoading,
		error,
		searchCreators,
	} = useSavedCreators();

	// Initialize state from context or use default values
	const [selectionMethod, setSelectionMethod] = useState<
		CreatorPricing["selectionMethod"]
	>(creatorPricing.selectionMethod || "Invite Specific Creators");
	const [budget, setBudget] = useState(creatorPricing.budgetPerVideo || 0);
	const [budgetValue, setBudgetValue] = useState(budget ? budget.toString() : "");
	const [, setBudgetError] = useState("");
	
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
	const [industry, setIndustry] = useState(
		creatorPricing.creator?.industry || ""
	);
	const [language, setLanguage] = useState(
		creatorPricing.creator?.language || ""
	);
	const [countries, setCountries] = useState<string[]>(
		creatorPricing.creator?.countries
			? Array.isArray(creatorPricing.creator.countries)
				? creatorPricing.creator.countries
				: [creatorPricing.creator.countries]
			: []
	);
	const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

	const [selectedCreators, setSelectedCreators] = useState<Creator[]>(
		creatorPricing.selectedCreators || []
	);
	const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>(
		(creatorPricing.selectedCreators || []).map((creator) => creator.id)
	);
	const [invitedCreatorsCount, setInvitedCreatorsCount] = useState(selectedCreators.length || 2);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (savedCreators && savedCreators.length > 0) {
			if (creatorSelectionMode === "all") {
				// Select all saved creators when "all" mode is selected
				const allCreatorIds = savedCreators.map((creator) => creator.id);
				setSelectedCreatorIds(allCreatorIds);

				// Map savedCreators to selectedCreators format
				const mappedCreators = savedCreators.map((creator) => ({
					name: creator.name,
					avatar: creator.profilePictureUrl,
					id: creator.id,
					price: creator.pricing?.oneVideo || 0, // Use oneVideo price if available
				}));
				setSelectedCreators(mappedCreators);
			} else if (creatorSelectionMode === "search") {
				// In search mode, only include creators that are actually selected
				const filteredCreators = savedCreators
					.filter((creator) => selectedCreatorIds.includes(creator.id))
					.map((creator) => ({
						name: creator.name,
						avatar: creator.profilePictureUrl,
						id: creator.id,
						price: creator.pricing?.oneVideo || "",
					}));
				setSelectedCreators(filteredCreators);
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (creatorSelectionMode === "all") {
			// In "all" mode, select all saved creators
			const allCreatorIds = savedCreators.map((creator) => creator.id);
			setSelectedCreatorIds(allCreatorIds);

			// Map savedCreators to selectedCreators format
			const mappedCreators = savedCreators.map((creator) => ({
				name: creator.name,
				avatar: creator.profilePictureUrl,
				id: creator.id,
				price: creator.pricing?.oneVideo || "", // Use oneVideo price if available
			}));

			setSelectedCreators(mappedCreators);
		}
		// When switching to search mode, maintain current selections
	}, [creatorSelectionMode, savedCreators]);

	// Function to toggle selection of a creator
	const toggleCreatorSelection = (creatorId: string) => {
		if (selectedCreatorIds.includes(creatorId)) {
			// Remove creator if already selected
			setSelectedCreatorIds((prevIds) =>
				prevIds.filter((id) => id !== creatorId)
			);
			setSelectedCreators((prevCreators) =>
				prevCreators.filter((creator) => creator.id !== creatorId)
			);
		} else {
			// Add creator if not already selected
			setSelectedCreatorIds((prevIds) => [...prevIds, creatorId]);

			// Find the creator from either allCreators or savedCreators
			const creatorsList =
				creatorSelectionMode === "search" ? allCreators : savedCreators;
			const creator = creatorsList.find((c) => c.id === creatorId);

			if (creator) {
				const newCreator = {
					name: creator.name,
					avatar: creator.profilePictureUrl,
					id: creator.id,
					price: creator.pricing?.oneVideo || "",
				};

				setSelectedCreators((prevCreators) => [...prevCreators, newCreator]);
			}
		}
	};
	// Function to filter creators based on search query
	// Function to get filtered creators based on search
	const getFilteredCreators = () => {
		// When in "all" mode, only show saved creators
		// When in "search" mode, search all creators
		return searchCreators(searchQuery, creatorSelectionMode === "search");
	};

	// Handle budget value change
	const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Allow empty string for clearing the input field
		if (e.target.value === "") {
			setBudgetValue("");
			return;
		}

		// Parse the input value as number
		const inputValue = e.target.value;
		setBudgetValue(inputValue);

		const numValue = Number(inputValue);

		// Validate only that it's a positive number
		if (numValue < 0) {
			setBudgetError("Price per video must be a positive number");
		} else {
			setBudgetError("");
			setBudget(numValue);
		}
	};

// Calculate totals
const totalVideos = selectionMethod === "Invite Specific Creators" 
    ? invitedCreatorsCount * videosPerCreator 
    : publicCreatorsCount * videosPerCreator;

const totalBudget = budget * totalVideos;
const services = 0.1 * totalBudget;
const totalAmount = totalBudget; // Total amount should equal total budget, not include service fee

	// Update context when values change
	const updateContextValues = () => {
		const currentCreatorCount =
			selectionMethod === "Invite Specific Creators"
				? selectedCreators.length || invitedCreatorsCount
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
			totalAmount,
			creator: {
				selectionMethod,
				selectedCreators,
				ageGroup,
				gender,
				creatorCount: currentCreatorCount,
				videosPerCreator,
				totalVideos,
				industry,
				language,
				countries: countries,
			},
			cost: {
				budgetPerVideo: budget,
				totalBudget,
				totalAmount,
				serviceFee: services,
				commissionPerSale: "",
			},
		});
	};

	// Trigger context update when relevant values change
	useEffect(() => {
		updateContextValues();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		selectionMethod,
		totalVideos,
		videosPerCreator,
		budget,
		ageGroup,
		gender,
		industry,
		language,
		countries,
		selectedCreators,
	]);

	useEffect(() => {
		setInvitedCreatorsCount(selectedCreators.length);
	}, [selectedCreators]);

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
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
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

									{isLoading ? (
										<p className="text-gray-500">Loading creators...</p>
									) : error ? (
										<p className="text-red-500">{error}</p>
									) : getFilteredCreators().length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{getFilteredCreators().map((creator) => (
												<div
													key={creator.id}
													className={`flex items-center border gap-1 bg-white rounded-lg cursor-pointer px-2 py-1 ${
														selectedCreatorIds.includes(creator.id)
															? "border-orange-500"
															: "border-[#D0D5DD]"
													}`}
													onClick={() => toggleCreatorSelection(creator.id)}
												>
													<Image
														src={creator.profilePictureUrl}
														alt={creator.name}
														width={24}
														height={24}
														className="w-6 h-6 rounded-full object-fill"
													
													/>
													<span className="text-sm">{creator.name}</span>
													<button
														className="ml-1 text-gray-500 hover:text-gray-700 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															toggleCreatorSelection(creator.id);
														}}
													>
													
													</button>
												</div>
											))}
										</div>
									) : (
										<p className="text-gray-500">
											{creatorSelectionMode === "search"
												? "No creators found."
												: "No saved creators found."}
										</p>
									)}
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
										<div className="flex flex-wrap gap-2 capitalize">
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
										<Select
											value={industry}
											onValueChange={(value) => setIndustry(value)}
										>
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
										<Select
											value={language}
											onValueChange={(value) => setLanguage(value)}
										>
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
										<div className="relative">
											{/* Display selected countries */}
											<div
												className="w-full border rounded-md py-2 px-3 flex flex-wrap gap-1 min-h-10 cursor-pointer"
												onClick={() =>
													setIsCountryDropdownOpen(!isCountryDropdownOpen)
												}
											>
												{countries.length > 0 ? (
													countries.map((country) => (
														<div
															key={country}
															className="bg-orange-100 text-orange-700 rounded-md px-2 py-1 text-sm flex items-center gap-1"
														>
															{country === "us"
																? "United States"
																: country === "ca"
																	? "Canada"
																	: country === "uk"
																		? "United Kingdom"
																		: country}
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setCountries(
																		countries.filter((c) => c !== country)
																	);
																}}
																className="text-orange-700 hover:text-orange-900"
															>
																<X size={14} />
															</button>
														</div>
													))
												) : (
													<span className="text-gray-500">
														Select Countries (Multi Select)
													</span>
												)}
											</div>

											{/* Custom dropdown */}
											{isCountryDropdownOpen && (
												<div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
													<div className="py-1">
														<div
															className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
															onClick={() => {
																if (!countries.includes("us")) {
																	setCountries([...countries, "us"]);
																}
																// Uncomment below to close after selection
																setIsCountryDropdownOpen(false);
															}}
														>
															<div className="flex items-center gap-2">
																<div
																	className={`w-4 h-4 border rounded flex items-center justify-center ${
																		countries.includes("us")
																			? "bg-orange-500 border-orange-500"
																			: "border-gray-400"
																	}`}
																>
																	{countries.includes("us") && (
																		<div className="w-2 h-2 rounded bg-white"></div>
																	)}
																</div>
																United States
															</div>
														</div>
														<div
															className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
															onClick={() => {
																if (!countries.includes("ca")) {
																	setCountries([...countries, "ca"]);
																}
															}}
														>
															<div className="flex items-center gap-2">
																<div
																	className={`w-4 h-4 border rounded flex items-center justify-center ${
																		countries.includes("ca")
																			? "bg-orange-500 border-orange-500"
																			: "border-gray-400"
																	}`}
																>
																	{countries.includes("ca") && (
																		<div className="w-2 h-2 rounded bg-white"></div>
																	)}
																</div>
																Canada
															</div>
														</div>
														<div
															className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
															onClick={() => {
																if (!countries.includes("uk")) {
																	setCountries([...countries, "uk"]);
																}
															}}
														>
															<div className="flex items-center gap-2">
																<div
																	className={`w-4 h-4 border rounded flex items-center justify-center ${
																		countries.includes("uk")
																			? "bg-orange-500 border-orange-500"
																			: "border-gray-400"
																	}`}
																>
																	{countries.includes("uk") && (
																		<div className="w-2 h-2 rounded bg-white"></div>
																	)}
																</div>
																United Kingdom
															</div>
														</div>
													</div>
												</div>
											)}
										</div>
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
							<h2 className="text-base font-medium mb-2">Price per Video</h2>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									type="text"
									value={budgetValue}
									onChange={handleBudgetChange}
									className="pl-8 border rounded-md"
								/>
							</div>
							<p className="text-sm text-gray-500 mt-1">
								This is the price per video for the selected creator(s)
							</p>
						</div>

						<div className="border-t pt-4">
							{selectionMethod === "Invite Specific Creators" ? (
								<div className="flex justify-between mb-2">
									<span>No of Creators:</span>
									<span>{invitedCreatorsCount} Creators</span>
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
												setPublicCreatorsCount(
													Math.max(min, Number(e.target.value))
												);
											}}
											className="w-16 h-8 px-2 text-center border rounded-md"
											min={1}
										/>
										<div className="absolute right-0 flex flex-col h-full">
											<button
												className="flex-1 px-1 border-l flex items-center justify-center"
												onClick={() =>
													setPublicCreatorsCount((prev) =>
														Math.max(1, prev + 1)
													)
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
													setPublicCreatorsCount((prev) =>
														Math.max(1, prev - 1)
													)
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
