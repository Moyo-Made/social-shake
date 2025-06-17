import React, { useEffect, useRef, useState } from "react";
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
import { categories } from "@/types/categories";
import { countries as allCountries } from "@/types/countries";
import { topLanguages } from "@/types/languages";

export default function TikTokShopCreatorPricingTab() {
	const { formData, updateCreatorPricing } = useProjectForm();
	const { creatorPricing } = formData;
	const {
		savedCreators,
		allCreators,
		isLoadingSaved,
		isLoadingAll,
		error,
		searchCreators,
	} = useSavedCreators();

	// Initialize state from context or use default values
	const [selectionMethod, setSelectionMethod] = useState<
		CreatorPricing["selectionMethod"]
	>(creatorPricing.selectionMethod || "Invite Specific Creators");
	const [creatorPayment, setCreatorPayment] = useState(
		creatorPricing.budgetPerVideo || 0
	);
	const [affiliateCommission, setAffiliateCommission] = useState(
		creatorPricing.cost.commissionPerSale || ""
	);
	const [publicCreatorsCount, setPublicCreatorsCount] = useState(
		creatorPricing.selectionMethod === "Post Public Brief"
			? creatorPricing.creatorCount || 1
			: 1
	);
	const [videosPerCreator, setVideosPerCreator] = useState(
		creatorPricing.videosPerCreator || 2
	);
	const [creatorSelectionMode, setCreatorSelectionMode] = useState("search");
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
	const [invitedCreatorsCount, setInvitedCreatorsCount] = useState(
		selectedCreators.length || 2
	);
	const [searchQuery, setSearchQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);

	const isCreatorSaved = (creatorId: string) => {
		return savedCreators.some((creator) => creator.id === creatorId);
	};

	const getBestPricing = (
		creator: {
			pricing?: {
				oneVideo?: number;
				threeVideos?: number;
				fiveVideos?: number;
				bulkVideos?: number;
			};
		},
		videoCount: number
	) => {
		const pricing = creator.pricing || {};

		// 1 video - use set price
		if (videoCount === 1 && pricing.oneVideo) {
			return {
				pricePerVideo: pricing.oneVideo,
				tier: "per video",
				totalPrice: pricing.oneVideo,
				available: true,
			};
		}

		// 2 videos - multiply price of 1 x 2
		if (videoCount === 2 && pricing.oneVideo) {
			return {
				pricePerVideo: pricing.oneVideo,
				tier: "per video",
				totalPrice: pricing.oneVideo * 2,
				available: true,
			};
		}

		// 3 videos - use fixed price
		if (videoCount === 3 && pricing.threeVideos) {
			return {
				pricePerVideo: pricing.threeVideos / 3,
				tier: "3-video package",
				totalPrice: pricing.threeVideos,
				available: true,
			};
		}

		// 4 videos - multiply price of 1 x 4
		if (videoCount === 4 && pricing.oneVideo) {
			return {
				pricePerVideo: pricing.oneVideo,
				tier: "per video",
				totalPrice: pricing.oneVideo * 4,
				available: true,
			};
		}

		// 5 videos - use fixed price
		if (videoCount === 5 && pricing.fiveVideos) {
			return {
				pricePerVideo: pricing.fiveVideos / 5,
				tier: "5-video package",
				totalPrice: pricing.fiveVideos,
				available: true,
			};
		}

		// 6 videos only - use bulk pricing
		if (videoCount === 6 && pricing.bulkVideos) {
			return {
				pricePerVideo: pricing.bulkVideos,
				tier: "bulk rate",
				totalPrice: pricing.bulkVideos * 6,
				available: true,
			};
		}

		// No pricing available
		return {
			pricePerVideo: 0,
			tier: "custom quote",
			totalPrice: 0,
			available: false,
		};
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsCountryDropdownOpen(false);
			}
		};

		if (isCountryDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isCountryDropdownOpen]);

	const handleCountrySelect = (countryCode: string) => {
		if (!countries.includes(countryCode)) {
			setCountries([...countries, countryCode]);
		}
	};

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
					pricing: creator.pricing, // Include the pricing property
				}));
				setSelectedCreators(mappedCreators as Creator[]);
			} else if (creatorSelectionMode === "search") {
				// In search mode, only include creators that are actually selected
				const filteredCreators = savedCreators
					.filter((creator) => selectedCreatorIds.includes(creator.id))
					.map((creator) => ({
						name: creator.name,
						avatar: creator.profilePictureUrl,
						id: creator.id,
						pricing: creator.pricing, // Include the pricing property
					}));
				setSelectedCreators(filteredCreators);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Calculate the number of creators based on the selection method
	const creators =
		selectionMethod === "Invite Specific Creators"
			? invitedCreatorsCount
			: publicCreatorsCount;

	// Calculate totals
	const totalVideos = creators * videosPerCreator;

	const totalPayment =
		selectionMethod === "Invite Specific Creators"
			? selectedCreators.reduce((total, creator) => {
					return total + getBestPricing(creator, videosPerCreator).totalPrice;
				}, 0)
			: creatorPayment * totalVideos;

	const totalAmount = totalPayment;

	// Update context when values change
	const updateContextValues = () => {
		const currentCreatorCount =
			selectionMethod === "Invite Specific Creators"
				? selectedCreators.length || invitedCreatorsCount
				: publicCreatorsCount;

		const creatorPayments: Record<
			string,
			{
				pricePerVideo: number;
				totalAmount: number;
				videosOrdered: number;
				pricingTier: string;
				needsCustomQuote: boolean;
			}
		> = {};

		if (selectionMethod === "Invite Specific Creators") {
			selectedCreators.forEach((creator) => {
				const pricing = getBestPricing(creator, videosPerCreator);
				creatorPayments[creator.id] = {
					pricePerVideo: pricing.pricePerVideo,
					totalAmount: pricing.totalPrice, // ← This is your "Your order" amount
					videosOrdered: videosPerCreator,
					pricingTier: pricing.tier,
					needsCustomQuote: !pricing.available,
				};
			});
		}

		updateCreatorPricing({
			selectionMethod,
			selectedCreators,
			ageGroup,
			gender,
			industry,
			language,
			creatorCount: currentCreatorCount,
			videosPerCreator,
			totalVideos,
			budgetPerVideo: creatorPayment,
			totalBudget: totalPayment,
			totalAmount,
			creator: {
				selectionMethod:
					selectionMethod === "Invite Specific Creators"
						? "Invite Specific Creators"
						: "Post Public Brief",
				selectedCreators,
				ageGroup,
				gender,
				creatorCount: currentCreatorCount,
				videosPerCreator,
				totalVideos,
				industry,
				language,
				countries,
			},
			cost: {
				budgetPerVideo: creatorPayment,
				totalBudget: totalPayment,
				totalAmount,
				commissionPerSale: affiliateCommission,
			},
			creatorPayments,
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
		creatorPayment,
		ageGroup,
		gender,
		industry,
		language,
		countries,
		creators,
		affiliateCommission,
		selectedCreators,
	]);

	useEffect(() => {
		setInvitedCreatorsCount(selectedCreators.length);
	}, [selectedCreators]);

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

			// Find the creator from the appropriate list based on current mode
			const creatorsList =
				creatorSelectionMode === "search" ? allCreators : savedCreators;
			const creator = creatorsList.find((c) => c.id === creatorId);

			if (creator) {
				const newCreator = {
					name: creator.name,
					avatar: creator.profilePictureUrl,
					id: creator.id,
					pricing: creator.pricing,
				};

				setSelectedCreators((prevCreators) => [
					...prevCreators,
					newCreator as Creator,
				]);
			}
		}
	};

	// Function to get filtered creators based on search
	const getFilteredCreators = () => {
		// Don't try to filter if data is still loading
		if (isLoadingAll && creatorSelectionMode === "search") {
			return { creators: [], totalCount: 0, totalPages: 0 };
		}

		if (isLoadingSaved && creatorSelectionMode === "all") {
			return { creators: [], totalCount: 0, totalPages: 0 };
		}

		let allCreators;
		if (creatorSelectionMode === "all") {
			allCreators = searchCreators(searchQuery, false);
		} else {
			allCreators = searchCreators(searchQuery, true);
		}

		// Calculate pagination
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;

		return {
			creators: allCreators.slice(startIndex, endIndex),
			totalCount: allCreators.length,
			totalPages: Math.ceil(allCreators.length / itemsPerPage),
		};
	};

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
								onValueChange={(value) =>
									setSelectionMethod(
										value as "Invite Specific Creators" | "Post Public Brief"
									)
								}
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

									<div>
										{isLoadingAll && creatorSelectionMode === "search" ? (
											<p className="text-gray-500">Loading all creators...</p>
										) : isLoadingSaved && creatorSelectionMode === "all" ? (
											<p className="text-gray-500">Loading saved creators...</p>
										) : error ? (
											<p className="text-red-500">{error}</p>
										) : (
											(() => {
												const filteredData = getFilteredCreators();
												return filteredData.creators.length > 0 ? (
													<>
														<div className="flex flex-wrap gap-2">
															{filteredData.creators.map((creator) => (
																<div
																	key={creator.id}
																	className={`flex items-center justify-between border gap-2 bg-white rounded-lg cursor-pointer px-2 py-1 min-w-0 ${
																		selectedCreatorIds.includes(creator.id)
																			? "border-orange-500"
																			: "border-[#D0D5DD]"
																	}`}
																	onClick={() =>
																		toggleCreatorSelection(creator.id)
																	}
																>
																	<div className="flex items-center gap-1 min-w-0">
																		<Image
																			src={creator.profilePictureUrl}
																			alt={creator.name}
																			width={24}
																			height={24}
																			className="w-6 h-6 rounded-full object-fill flex-shrink-0"
																		/>
																		<span className="text-sm truncate">
																			{creator.name}
																		</span>
																		{creatorSelectionMode === "search" &&
																			isCreatorSaved(creator.id) && (
																				<span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-[10px] flex-shrink-0">
																					Saved
																				</span>
																			)}
																	</div>
																</div>
															))}
														</div>

														{/* Pagination Controls */}
														{filteredData.totalPages > 1 && (
															<div className="flex items-center justify-between mt-4 pt-4 pb-6">
																<div className="text-sm text-gray-500">
																	Showing {(currentPage - 1) * itemsPerPage + 1}{" "}
																	to{" "}
																	{Math.min(
																		currentPage * itemsPerPage,
																		filteredData.totalCount
																	)}{" "}
																	of {filteredData.totalCount} creators
																</div>
																<div className="flex items-center gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			setCurrentPage((prev) =>
																				Math.max(1, prev - 1)
																			)
																		}
																		disabled={currentPage === 1}
																		className="px-3 py-1"
																	>
																		Previous
																	</Button>
																	<span className="text-sm">
																		Page {currentPage} of{" "}
																		{filteredData.totalPages}
																	</span>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			setCurrentPage((prev) =>
																				Math.min(
																					filteredData.totalPages,
																					prev + 1
																				)
																			)
																		}
																		disabled={
																			currentPage === filteredData.totalPages
																		}
																		className="px-3 py-1"
																	>
																		Next
																	</Button>
																</div>
															</div>
														)}
													</>
												) : (
													<p className="text-gray-500">
														{creatorSelectionMode === "search"
															? "No creators found."
															: "No saved creators found."}
													</p>
												);
											})()
										)}
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
										<Select value={industry} onValueChange={setIndustry}>
											<SelectTrigger className="w-full border rounded-md">
												<SelectValue placeholder="Select Industry" />
											</SelectTrigger>
											<SelectContent className="bg-white">
												{categories.map((category) => (
													<SelectItem
														key={category.value}
														value={category.value}
													>
														{category.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<h2 className="text-base font-medium">Language</h2>
										<Select value={language} onValueChange={setLanguage}>
											<SelectTrigger className="w-full border rounded-md">
												<SelectValue placeholder="Select Language of Creator" />
											</SelectTrigger>
											<SelectContent className="bg-white">
												{topLanguages.map((language) => (
													<SelectItem key={language.code} value={language.code}>
														{language.name}
													</SelectItem>
												))}
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

											{isCountryDropdownOpen && (
												<div
													ref={dropdownRef}
													className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg"
												>
													<div className="py-1">
														{/* Add Select All option */}
														{/* Add Select All/Deselect All option */}
														<div
															className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
															onClick={() => {
																if (countries.length === allCountries.length) {
																	// If all countries are selected, deselect all
																	setCountries([]);
																} else {
																	// If not all countries are selected, select all
																	const allCountryNames = allCountries.map(
																		(country) => country.name
																	);
																	setCountries(allCountryNames);
																}
															}}
														>
															<div className="flex items-center gap-2">
																<div
																	className={`w-4 h-4 border rounded flex items-center justify-center ${
																		countries.length === allCountries.length
																			? "bg-orange-500 border-orange-500"
																			: "border-gray-400"
																	}`}
																>
																	{countries.length === allCountries.length && (
																		<div className="w-2 h-2 rounded bg-white"></div>
																	)}
																</div>
																<span className="font-medium">
																	{countries.length === allCountries.length
																		? "Deselect All Countries"
																		: "Select All Countries"}
																</span>
															</div>
														</div>

														{/* Existing countries mapping */}
														{allCountries.map((country) => (
															<div
																key={country.code}
																className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
																onClick={() =>
																	handleCountrySelect(country.name)
																}
															>
																<div className="flex items-center gap-2">
																	<div
																		className={`w-4 h-4 border rounded flex items-center justify-center ${
																			countries.includes(country.name)
																				? "bg-orange-500 border-orange-500"
																				: "border-gray-400"
																		}`}
																	>
																		{countries.includes(country.name) && (
																			<div className="w-2 h-2 rounded bg-white"></div>
																		)}
																	</div>
																	{country.name}
																</div>
															</div>
														))}
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
			<Card className="flex-1 max-w-96 border border-orange-500 rounded-xl h-fit">
				<CardContent className="pt-6">
					<div className="space-y-3">
						<div>
							<h2 className="text-base font-medium mb-2">
								Creator Payment per Video
							</h2>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									type="number"
									value={creatorPayment}
									onChange={(e) => setCreatorPayment(Number(e.target.value))}
									className="pl-8 border rounded-md"
									min={1500}
								/>
							</div>
							<p className="text-sm text-gray-500 mt-1">
								This is the total amount you intend to spend
							</p>
						</div>

						<div>
							<h2 className="text-base font-medium mb-2">
								Affiliate Commission per Sale
							</h2>
							<div className="relative">
								<Input
									type="text"
									value={affiliateCommission}
									onChange={(e) => setAffiliateCommission(e.target.value)}
									className="pl-3 border rounded-md"
									placeholder="10%"
								/>
							</div>
							<p className="text-sm text-gray-500 mt-1">
								This is the percentage of sales the creator earns for each sale
								made through their video.
							</p>
						</div>

						<div className="border-t pt-4">
							{selectionMethod === "Invite Specific Creators" ? (
								<div className="flex justify-between mb-2">
									<span>No of Creators:</span>
									<span>{creators} Creators</span>
								</div>
							) : (
								<div className="flex justify-between items-center mb-2">
									<span>How many Creators:</span>
									<div className="relative flex items-center">
										<Input
											type="number"
											value={publicCreatorsCount}
											onChange={(e) =>
												setPublicCreatorsCount(Number(e.target.value))
											}
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

						{selectionMethod === "Invite Specific Creators" &&
							selectedCreators.length > 0 && (
								<div className="mb-4 space-y-1">
									<h3 className="text-sm font-medium mb-2">
										Selected Creators:
									</h3>
									{selectedCreators.map((creator) => (
										<div
											key={creator.id}
											className="border-b border-gray-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0"
										>
											<div className="flex items-center gap-2 mb-2">
												<Image
													src={creator.avatar}
													alt={creator.name}
													width={20}
													height={20}
													className="w-5 h-5 rounded-full object-cover"
												/>
												<span className="font-medium text-sm">
													{creator.name}
												</span>
											</div>

											<div className="space-y-1 text-sm pl-7">
												{/* Single Video */}
												<div className="flex justify-between">
													<span className="text-gray-600">1 video :</span>
													<span>
														{creator.pricing.oneVideo
															? `$${creator.pricing.oneVideo}`
															: "N/A"}
													</span>
												</div>

												{/* 3 Video Package */}
												<div className="flex justify-between">
													<span className="text-gray-600">3 videos :</span>
													<div className="text-right">
														<span>
															{creator.pricing.threeVideos
																? `$${creator.pricing.threeVideos}`
																: "N/A"}
														</span>
													</div>
												</div>

												{/* 5 Video Package */}
												<div className="flex justify-between">
													<span className="text-gray-600">5 videos :</span>
													<div className="text-right">
														<span>
															{creator.pricing.fiveVideos
																? `$${creator.pricing.fiveVideos}`
																: "N/A"}
														</span>
													</div>
												</div>

												{/* Bulk video package */}
												<div className="flex justify-between">
													<span className="text-gray-600">Bulk videos :</span>
													<div className="text-right">
														<span>
															{creator.pricing.bulkVideos
																? `$${creator.pricing.bulkVideos}`
																: "N/A"}
														</span>
													</div>
												</div>

												{/* Current Selection Highlight */}
												{getBestPricing(creator, videosPerCreator).available ? (
													<div
														className={`flex justify-between border mt-2 p-2 rounded-md ${
															getBestPricing(creator, videosPerCreator).tier ===
															"per video"
																? "border-orange-500 bg-orange-50"
																: "border-green-500 bg-green-50"
														}`}
													>
														<span>Your order ({videosPerCreator} videos):</span>
														<span
															className={
																getBestPricing(creator, videosPerCreator)
																	.tier === "per video"
																	? "text-orange-600"
																	: "text-green-600"
															}
														>
															$
															{
																getBestPricing(creator, videosPerCreator)
																	.totalPrice
															}
														</span>
													</div>
												) : (
													<div className="flex justify-between border border-gray-300 mt-2 p-2 rounded-md bg-gray-50 text-sm">
														<span>Your order ({videosPerCreator} videos):</span>
														<span className="text-gray-600">
															Contact for pricing
														</span>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}

						<div className="border-t pt-4 bg-[#FFF4EE] -mx-6 px-6 pb-6">
							<h2 className="text-base font-medium mb-4">
								{selectionMethod === "Invite Specific Creators"
									? "Estimated Cost"
									: "Budget Breakdown"}
							</h2>

							<div className="flex gap-1 mb-1">
								<span>
									{selectionMethod === "Invite Specific Creators"
										? "Estimated Total:"
										: "Fixed Fee Total:"}
								</span>
								<span className="font-medium">
									${totalPayment.toLocaleString()}
								</span>
							</div>
							<div className="text-sm text-gray-500 mb-4">
								{selectionMethod === "Invite Specific Creators"
									? "*Payment made only for approved videos via secure escrow"
									: `(Based on $${creatorPayment.toLocaleString()} per video × ${totalVideos} videos)`}
							</div>

							<div className="flex gap-1 text-lg font-bold">
								<span>
									{selectionMethod === "Invite Specific Creators"
										? "Estimated Amount:"
										: "Total Amount:"}
								</span>
								<span>${totalAmount.toLocaleString()}</span>
							</div>
							<div className="text-sm text-gray-500 mb-4">
								<p>* Affiliate commission is paid separately based on sales.</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
