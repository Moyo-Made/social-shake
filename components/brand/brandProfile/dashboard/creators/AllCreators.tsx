/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Heart, Send, ArrowLeft, Video, X } from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CreatorVideoShowcase from "./CreatorVideoShowcase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import VideoComponent from "./VideoComponent";
import PortfolioVideosTab from "./PortfolioVideoTab";
import PerformanceStatsCard from "./PerformanceStatsCard";
import PricingCard from "./PricingCard";
import { CONTENT_TYPES } from "@/types/contentTypes";
import { NATIONALITIES } from "@/types/nationalities";

// Define types
export interface Creators {
	language: string;
	portfolioVideoUrls: string[] | undefined;
	id: string;
	name: string;
	username: string;
	bio: string;
	avatar: string;
	totalGMV: number;
	avgGMVPerVideo: number;
	avgImpressions?: string;
	pricing: {
		oneVideo: number;
		threeVideos: number;
		fiveVideos: number;
		bulkVideos: number;
		bulkVideosNote?: string;
		aiActorPricing?: number;
	};
	profilePictureUrl: string;
	contentTypes: string[];
	country: string;
	socialMedia?: {
		instagram: string;
		twitter: string;
		facebook: string;
		youtube: string;
	};

	tiktokUrl: string;
	status: string;
	dateOfBirth: string;
	gender: string;
	ethnicity: string;
	contentLinks: string[];
	verificationVideoUrl?: string;
	verifiableIDUrl?: string;
	aboutMeVideoUrl?: string;
	abnNumber?: string;
	creatorProfileData?: {
		createdAt: string;
		firstName: string;
		lastName: string;
		displayUsername: string;
		userType: string;
		userId: string;
		email: string;
		username: string;
		tiktokConnected?: boolean;
		tiktokFollowerCount?: number;
		tiktokUsername?: string;
		tiktokDisplayName?: string;
		tiktokId?: string;
		tiktokProfileLink?: string;
		tiktokEngagementRate?: number;
		tiktokAvatarUrl?: string;
		tiktokMetrics?: {
			followers: {
				count: number;
				insights: any | null;
			};
			videos: {
				count: number;
				recentVideos: any[];
			};
			engagement: {
				rate: number;
				averageLikes: number;
				averageComments: number;
				averageShares: number;
				averageViews: number;
			};
			views: number;
			likes: number;
			comments: number;
			shares: number;
		};
		updatedAt:
			| {
					_seconds: number;
					_nanoseconds: number;
			  }
			| string;
		[key: string]: any; // To allow for any additional fields in creatorProfileData
	};
}

const defaultProfileImg = "";

const CreatorMarketplace = () => {
	const router = useRouter();
	const pathname = usePathname();
	const { currentUser } = useAuth();

	const isSavedCreatorsPage = pathname === "/brand/dashboard/creators/saved";

	const [selectedCreator, setSelectedCreator] = useState<Creators | null>(null);
	const [showAlert, setShowAlert] = useState<boolean>(false);
	const [savedCreators, setSavedCreators] = useState<Creators[]>([]);
	const [alertMessage, setAlertMessage] = useState<string>("");
	const [creators, setCreators] = useState<Creators[]>([]);
	const [isClient, setIsClient] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPlayingVideo, setCurrentPlayingVideo] = useState<string | null>(
		null
	);
	const [selectedVideo, setSelectedVideo] = useState<{
		url: string;
		index: number;
		creatorName: string;
	} | null>(null);
	const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(
		[]
	);
	const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
	const [selectedNationalities, setSelectedNationalities] = useState<string[]>(
		[]
	);

	const [searchTerm, setSearchTerm] = useState("");

	const handleSearchChange = (e: {
		target: { value: React.SetStateAction<string> };
	}) => {
		setSearchTerm(e.target.value);
	};

	const clearSearch = () => {
		setSearchTerm("");
	};

	// Fetch creators from Firebase
	useEffect(() => {
		const fetchCreators = async () => {
			try {
				setIsLoading(true);

				// Fetch from API endpoint instead of direct Firebase access
				const url = `/api/admin/creator-approval?status=approved`;
				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error: ${response.status}`);
				}

				const data = await response.json();

				// Map the API response data to our Creator interface
				const mappedCreators = data.creators.map(
					(creator: {
						userId: string;
						firstName?: string;
						lastName?: string;
						username?: string;
						bio?: string;
						totalGMV?: number;
						avgGMVPerVideo?: number;

						pricing: {
							oneVideo?: number;
							threeVideos?: number;
							fiveVideos?: number;
							bulkVideos?: number;
							bulkVideosNote?: string;
							aiActorPricing?: number;
						};
						logoUrl?: string;
						contentTypes?: string[];
						country?: string;
						socialMedia?: {
							tiktok?: string;
						};
						status?: string;
						dateOfBirth?: string;
						gender?: string;
						ethnicity?: string;
						contentLinks?: string[];
						verificationVideoUrl?: string;
						verifiableIDUrl?: string;
						creatorProfileData?: {
							tiktokAvatarUrl?: string;
							tiktokDisplayName?: string;
						};
						abnNumber?: string;
						aboutMeVideoUrl?: string;
						portfolioVideoUrls?: string[];
					}) => ({
						id: creator.userId,
						name: `${creator.firstName || ""} ${creator.lastName || ""}`.trim(),
						username: creator.username || "",
						bio: creator.bio || "",
						totalGMV: creator.totalGMV || 0,
						avgGMVPerVideo: creator.avgGMVPerVideo || 0,
						avgImpressions: "0",
						pricing: {
							oneVideo: creator.pricing?.oneVideo || 0,
							threeVideos: creator.pricing?.threeVideos || 0,
							fiveVideos: creator.pricing?.fiveVideos || 0,
							bulkVideos: creator.pricing?.bulkVideos || 0,
							bulkVideosNote: creator.pricing?.bulkVideosNote || "",
							aiActorPricing: creator.pricing?.aiActorPricing || 0,
						},
						profilePictureUrl: creator.logoUrl || defaultProfileImg,
						creatorProfileData: {
							tiktokAvatarUrl:
								creator.creatorProfileData?.tiktokAvatarUrl || "",
							tiktokDisplayName:
								creator.creatorProfileData?.tiktokDisplayName || "",
						},
						contentTypes: creator.contentTypes || [],
						country: creator.country || "",
						socialMedia: creator.socialMedia || {
							instagram: "",
							twitter: "",
							facebook: "",
							youtube: "",
						},
						tiktokUrl: creator.socialMedia?.tiktok || "",
						status: creator.status || "pending",
						dateOfBirth: creator.dateOfBirth || "",
						gender: creator.gender || "",
						ethnicity: creator.ethnicity || "",
						contentLinks: creator.contentLinks || [],
						verificationVideoUrl: creator.verificationVideoUrl || "",
						verifiableIDUrl: creator.verifiableIDUrl || "",
						abnNumber: creator.abnNumber,
						aboutMeVideoUrl: creator.aboutMeVideoUrl,
						portfolioVideoUrls: creator.portfolioVideoUrls || [],
					})
				);

				// Use mappedCreators directly as the filtered and mapped data
				setCreators(mappedCreators);
			} catch (err) {
				console.error("Error fetching creators:", err);
				setError("Failed to load creators. Please try again later.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchCreators();
	}, []);

	// Ensure we only access localStorage after component mounts on client
	useEffect(() => {
		setIsClient(true);
		// Load saved creators from localStorage (more persistent than sessionStorage)
		const savedCreatorsData = localStorage.getItem("savedCreators");
		if (savedCreatorsData) {
			try {
				setSavedCreators(JSON.parse(savedCreatorsData));
			} catch (e) {
				console.error("Error parsing saved creators:", e);
				localStorage.removeItem("savedCreators");
			}
		}
	}, []);

	// Save to localStorage whenever savedCreators changes
	useEffect(() => {
		if (
			isClient &&
			(savedCreators.length > 0 || localStorage.getItem("savedCreators"))
		) {
			localStorage.setItem("savedCreators", JSON.stringify(savedCreators));
		}
	}, [savedCreators, isClient]);

	const openVideoModal = (
		videoUrl: string,
		index: number,
		creatorName: string
	) => {
		setSelectedVideo({ url: videoUrl, index, creatorName });
	};

	const closeVideoModal = () => {
		setSelectedVideo(null);
	};

	const handleViewProfile = (creator: Creators): void => {
		setSelectedCreator(creator);
	};

	const handleBackToList = (): void => {
		setSelectedCreator(null);
	};

	const handleSendMessage = async (creator: Creators) => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		try {
			// Show loading indicator or disable button here if needed

			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: currentUser.uid,
					creatorId: creator.id,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
					},
					creatorData: {
						name: creator.name,
						avatar: creator.profilePictureUrl,
						username: creator.username,
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create conversation");
			}

			// Navigate to chat page with this conversation
			router.push(
				`/brand/dashboard/messages?conversation=${data.conversationId}`
			);
		} catch (error) {
			console.error("Error creating conversation:", error);
			alert("Failed to start conversation. Please try again.");
		}
	};

	const isCreatorSaved = (creatorId: string): boolean => {
		return savedCreators.some((creator) => creator.id === creatorId);
	};

	const handleSaveCreator = (creator: Creators): void => {
		if (!isCreatorSaved(creator.id)) {
			const newSavedCreators = [...savedCreators, creator];
			setSavedCreators(newSavedCreators);
			// Immediately update localStorage to ensure consistency
			if (isClient) {
				localStorage.setItem("savedCreators", JSON.stringify(newSavedCreators));
			}
			setAlertMessage("Profile saved to your favorites!");
		} else {
			const updatedSavedCreators = savedCreators.filter(
				(saved) => saved.id !== creator.id
			);
			setSavedCreators(updatedSavedCreators);
			// Immediately update localStorage to ensure consistency
			if (isClient) {
				localStorage.setItem(
					"savedCreators",
					JSON.stringify(updatedSavedCreators)
				);
			}
			setAlertMessage("Profile removed from your favorites!");
		}
		setShowAlert(true);
		setTimeout(() => setShowAlert(false), 3000);
	};

	const handleNavigateToSaved = (): void => {
		router.push("/brand/dashboard/creators/saved");
	};

	const handleNavigateToMarketplace = (): void => {
		router.push("/brand/dashboard/creators/all");
	};

	// Filter creators based on selected content types
	const filteredCreators = creators.filter((creator) => {
		// Search term filter - search across multiple fields
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase().trim();
			const matchesSearch =
				creator.name.toLowerCase().includes(searchLower) ||
				creator.username.toLowerCase().includes(searchLower) ||
				(creator.bio && creator.bio.toLowerCase().includes(searchLower)) ||
				(creator.creatorProfileData?.tiktokDisplayName &&
					creator.creatorProfileData.tiktokDisplayName
						.toLowerCase()
						.includes(searchLower)) ||
				(creator.country &&
					creator.country.toLowerCase().includes(searchLower)) ||
				(Array.isArray(creator.contentTypes) &&
					creator.contentTypes.some((type) =>
						type.toLowerCase().includes(searchLower)
					));

			if (!matchesSearch) return false;
		}

		// Content type filter
		if (selectedContentTypes.length > 0) {
			const creatorContentTypes = Array.isArray(creator.contentTypes)
				? creator.contentTypes
				: [];

			const matchesContentType = selectedContentTypes.some((selectedType) =>
				creatorContentTypes.includes(selectedType)
			);

			if (!matchesContentType) return false;
		}

		// Gender filter
		if (selectedGenders.length > 0) {
			if (!selectedGenders.includes(creator.gender)) return false;
		}

		// Nationality filter
		if (selectedNationalities.length > 0) {
			if (!selectedNationalities.includes(creator.country)) return false;
		}

		return true;
	});

	// Empty state for saved creators or while loading
	const EmptyState = ({ message }: { message: string }) => (
		<div className="flex flex-col items-center justify-center py-8 md:py-16 h-screen">
			<div className="">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
			</div>
			<h3 className="mt-2 text-center">
				{isLoading ? "Loading Creators..." : message}
			</h3>
			<p className="text-gray-500 mb-6 text-center max-w-md text-sm md:text-base px-4">
				{isLoading
					? ""
					: isSavedCreatorsPage
						? "You haven't saved any creators to your favorites yet. Browse creators and click the heart icon to save creators."
						: "No creators found. Please check back later or try different search criteria."}
			</p>
			{!isLoading && isSavedCreatorsPage && (
				<button
					onClick={handleNavigateToMarketplace}
					className="px-4 py-2 bg-orange-500 text-white rounded-md font-medium text-sm md:text-base"
				>
					Browse Creators
				</button>
			)}
		</div>
	);

	// Alert notification component
	const AlertNotification = () => (
		<div className="fixed top-4 right-4 z-50 max-w-xs md:max-w-md">
			<Alert className="bg-green-50 border-green-200">
				<AlertTitle>Success</AlertTitle>
				<AlertDescription>{alertMessage}</AlertDescription>
			</Alert>
		</div>
	);

	// Show error state
	if (error) {
		return (
			<div className="container mx-auto p-3 md:p-4">
				<div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
					<h3 className="font-medium text-red-800 mb-2">Error</h3>
					<p className="text-red-600">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Detail profile view
	if (selectedCreator) {
		return (
			<div className="container mx-auto h-screen md:w-[65rem]">
				{showAlert && <AlertNotification />}

				{/* Back button */}
				<div className="pt-4 md:pt-6 border-t mt-4 md:mt-6">
					<Button
						variant="ghost"
						onClick={handleBackToList}
						className="px-0 hover:bg-transparent"
					>
						<ArrowLeft size={16} className="mr-2" />
						Back to {isSavedCreatorsPage ? "Saved Creators" : "All Creators"}
					</Button>
				</div>

				{/* Header Section */}
				<div className="bg-white border border-[#FDE5D7] rounded-lg mt-5 p-4 md:p-6">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
						<div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
							<div className="h-12 w-12 sm:h-16 sm:w-16 md:h-28 md:w-28 rounded-full overflow-hidden border-4 border-orange-100 mx-auto sm:mx-0 flex-shrink-0">
								<Image
									src={
										selectedCreator.creatorProfileData?.tiktokAvatarUrl ||
										selectedCreator.profilePictureUrl
									}
									alt={selectedCreator.name}
									className="h-full w-full object-cover"
									width={100}
									height={100}
								/>
							</div>
							<div className="text-center sm:text-left flex-1">
								<h2 className="text-lg md:text-xl font-semibold">
									{selectedCreator.creatorProfileData?.tiktokDisplayName ||
										selectedCreator.name}
								</h2>

								<p className="text-gray-500 text-sm md:text-base mb-1">
									@{selectedCreator.username}
								</p>
								<div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
									<span>
										{selectedCreator.country || "Location not specified"}
									</span>
									<span>•</span>
									<span className="flex items-center">
										<span className="text-yellow-500 mr-1">★</span>
										New Creator
									</span>
								</div>
							</div>
						</div>

						{/* Action buttons */}
						<div className="flex flex-col sm:flex-row items-center gap-3 lg:items-end lg:flex-col lg:gap-2">
							<div className="text-center lg:text-right">
								<p className="text-sm text-gray-500">Starting from</p>

								<p className="text-base font-bold text-orange-500">
									${selectedCreator.pricing.oneVideo}{" "}
									<span className="font-normal text-sm text-gray-500">
										per video
									</span>
								</p>
							</div>
							<div className="flex gap-3">
								<Button
									onClick={() => handleSendMessage(selectedCreator)}
									className="bg-orange-500 hover:bg-orange-600 text-white"
								>
									Send Message
									<Send size={16} className="" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handleSaveCreator(selectedCreator)}
									className={
										isCreatorSaved(selectedCreator.id)
											? "bg-pink-500 border-pink-500 hover:bg-pink-600"
											: "hover:bg-pink-50 hover:border-pink-200"
									}
								>
									<Heart
										size={20}
										className={
											isCreatorSaved(selectedCreator.id)
												? "text-white"
												: "text-gray-600"
										}
										fill={
											isCreatorSaved(selectedCreator.id)
												? "currentColor"
												: "none"
										}
									/>
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Tabs Section */}
				<div className="mt-6">
					<Tabs defaultValue="profile" className="w-full">
						<TabsList className="grid w-full grid-cols-3 shadow-none">
							<TabsTrigger
								value="profile"
								className="relative text-sm md:text-base data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-2 data-[state=active]:after:right-2 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-[#FD5C02] data-[state=active]:after:rounded-full data-[state=inactive]:after:absolute data-[state=inactive]:after:bottom-0 data-[state=inactive]:after:left-2 data-[state=inactive]:after:right-2 data-[state=inactive]:after:h-[3px] data-[state=inactive]:after:bg-gray-300 data-[state=inactive]:after:rounded-full after:content-['']"
							>
								Profile Info
							</TabsTrigger>
							<TabsTrigger
								value="videos"
								className="relative text-sm md:text-base data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-2 data-[state=active]:after:right-2 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-[#FD5C02] data-[state=active]:after:rounded-full data-[state=inactive]:after:absolute data-[state=inactive]:after:bottom-0 data-[state=inactive]:after:left-2 data-[state=inactive]:after:right-2 data-[state=inactive]:after:h-[3px] data-[state=inactive]:after:bg-gray-300 data-[state=inactive]:after:rounded-full after:content-['']"
							>
								Video Library
							</TabsTrigger>
							<TabsTrigger
								value="portfolio"
								className="relative text-sm md:text-base data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-2 data-[state=active]:after:right-2 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-[#FD5C02] data-[state=active]:after:rounded-full data-[state=inactive]:after:absolute data-[state=inactive]:after:bottom-0 data-[state=inactive]:after:left-2 data-[state=inactive]:after:right-2 data-[state=inactive]:after:h-[3px] data-[state=inactive]:after:bg-gray-300 data-[state=inactive]:after:rounded-full after:content-['']"
							>
								Portfolio Videos
							</TabsTrigger>
						</TabsList>

						{/* Profile Info Tab */}
						<TabsContent value="profile" className="mt-6">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Basic Info Card */}
								<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6 h-fit">
									<h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
										<svg
											className="w-5 h-5 mr-2 text-orange-500"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
												clipRule="evenodd"
											/>
										</svg>
										Basic Information
									</h3>

									<div className="space-y-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<Label className="text-sm font-medium text-gray-500">
													TikTok Username
												</Label>
												<p className="mt-1 text-sm md:text-base">
													{selectedCreator.tiktokUrl.split("@")[1] ||
														"Not specified"}
												</p>
											</div>
											<div>
												<Label className="text-sm font-medium text-gray-500">
													Content Type
												</Label>
												<p className="text-gray-600 text-sm md:text-base">
													{Array.isArray(selectedCreator.contentTypes)
														? selectedCreator.contentTypes.join(", ")
														: selectedCreator.contentTypes ||
															"No content type specified"}
												</p>
											</div>
											<div>
												<Label className="text-sm font-medium text-gray-500">
													Nationality
												</Label>
												<p className="mt-1 text-sm md:text-base">
													{selectedCreator.country || "Not specified"}
												</p>
											</div>
											{selectedCreator.abnNumber && (
												<div>
													<Label className="text-sm font-medium text-gray-500">
														Australian Business Number
													</Label>
													<p className="mt-1 text-sm md:text-base max-w-sm break-words">
														{selectedCreator.abnNumber}
													</p>
												</div>
											)}
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<Label className="text-sm font-medium text-gray-500">
													Member Since
												</Label>
												<p className="mt-1 text-sm md:text-base">
													{new Date().toLocaleDateString("en-US", {
														month: "long",
														year: "numeric",
													})}
												</p>
											</div>
											<div>
												<Label className="text-sm font-medium text-gray-500">
													Gender
												</Label>
												<p className="mt-1 text-sm md:text-base">
													{selectedCreator.gender || "Not specified"}
												</p>
											</div>
										</div>

										<div>
											<Label className="text-sm font-medium text-gray-500">
												Bio
											</Label>
											<p className="mt-1 text-sm md:text-base leading-relaxed">
												{selectedCreator.bio || "No bio available."}
											</p>
										</div>

										{selectedCreator.language && (
											<div>
												<Label className="text-sm font-medium text-gray-500">
													Languages
												</Label>
												<p className="mt-1 text-sm md:text-base">
													{selectedCreator.language}
												</p>
											</div>
										)}
									</div>
								</div>

								{/* Stats & Pricing Card */}
								<div className="space-y-6">
									{/* Stats Card */}
									<PerformanceStatsCard userId={selectedCreator.id} />

									<PricingCard selectedCreator={selectedCreator} />
								</div>
							</div>
						</TabsContent>

						{/* Video Library Tab */}
						<TabsContent value="videos" className="mt-6">
							<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
								<CreatorVideoShowcase
									userId={selectedCreator.id}
									creatorName={selectedCreator.name}
									showHeader={true}
								/>
							</div>
						</TabsContent>

						{/* Portfolio Links Tab */}
						<TabsContent value="portfolio" className="mt-6">
							<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
								<PortfolioVideosTab
									portfolioVideoUrls={selectedCreator.portfolioVideoUrls || []}
								/>
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="container mx-auto p-3 md:p-4">
				<EmptyState message="Loading Creators" />
			</div>
		);
	}

	// Saved Creators View
	if (isSavedCreatorsPage) {
		return (
			<div className="container mx-auto p-3 md:p-4">
				{showAlert && <AlertNotification />}

				{!isClient || savedCreators.length === 0 ? (
					<EmptyState message="No Saved Creators" />
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 ">
						{savedCreators.map((creator) => (
							<Card key={creator.id} className="overflow-hidden">
								<CardHeader className="pb-0">
									<div className="flex justify-between items-start">
										<div className="flex items-center">
											<div className="w-12 h-12 md:w-20 md:h-20 rounded-full overflow-hidden mr-3 md:mr-4">
												<Image
													src={
														creator.creatorProfileData?.tiktokAvatarUrl ||
														creator.profilePictureUrl
													}
													alt={creator.name}
													className="w-full h-full object-cover"
													width={100}
													height={100}
												/>
											</div>
											<div>
												<h3 className="text-base md:text-lg font-bold">
													{creator.creatorProfileData?.tiktokDisplayName ||
														creator.name}
												</h3>
												<p className="text-orange-500 text-sm md:text-base">
													@{creator.username}
												</p>
											</div>
										</div>
										<button
											onClick={() => handleSaveCreator(creator)}
											className="p-2 rounded-full bg-pink-500 text-white"
										>
											<Heart size={18} fill="white" />
										</button>
									</div>
								</CardHeader>

								<CardContent className="pt-3 md:pt-4 text-sm md:text-base">
									<p className="text-gray-600 line-clamp-2 h-10 md:h-12">
										{creator.bio || "No bio available"}
									</p>
									<VideoComponent
										videoId={creator.id}
										currentPlayingVideo={currentPlayingVideo}
										setCurrentPlayingVideo={setCurrentPlayingVideo}
										creator={{
											...creator,
											aboutMeVideoUrl: creator.aboutMeVideoUrl || "",
										}}
										onClick={() =>
											openVideoModal(
												creator.aboutMeVideoUrl || "",
												0,
												creator.name
											)
										}
									/>

									<div className="mt-8 bg-[#FFF4EE] p-4 rounded-lg">
										<div className="flex justify-center items-center mb-4 bg-white rounded-lg px-4 py-2">
											<Video size={24} className="text-orange-500 mr-2" />
											<span className="font-medium">Videos</span>
										</div>

										<div className="space-y-3">
											<div className="flex justify-between">
												<span>1 Video</span>
												<span className="font-medium">
													{creator.pricing.oneVideo &&
													creator.pricing.oneVideo > 0
														? `$${creator.pricing.oneVideo}`
														: "N/A"}
												</span>
											</div>

											<div className="flex justify-between">
												<span>3 Videos</span>
												<span className="font-medium">
													{creator.pricing.threeVideos &&
													creator.pricing.threeVideos > 0
														? `$${creator.pricing.threeVideos}`
														: "N/A"}
												</span>
											</div>

											<div className="flex justify-between">
												<span>5 Videos</span>
												<span className="font-medium">
													{creator.pricing.fiveVideos &&
													creator.pricing.fiveVideos > 0
														? `$${creator.pricing.fiveVideos}`
														: "N/A"}
												</span>
											</div>

											<div className="flex justify-between">
												<span>Bulk Rate (6 videos)</span>
												<span className="font-medium">
													{creator.pricing.bulkVideos &&
													creator.pricing.bulkVideos > 0
														? `$${creator.pricing.bulkVideos}`
														: "N/A"}
												</span>
											</div>
										</div>
									</div>

									<div className="mt-8 bg-[#FFF4EE] p-4 rounded-lg">
										<div className="flex gap-2 justify-center items-center mb-4 bg-white rounded-lg px-4 py-2">
											<Image
												src="/icons/ai-actor.svg"
												alt="AI Actor"
												width={24}
												height={24}
											/>
											<span className="font-medium">AI Actor</span>
										</div>
										<div className="flex justify-between">
											<span>Per Usage</span>
											<span className="font-medium">
												{creator.pricing.aiActorPricing &&
												creator.pricing.aiActorPricing > 0
													? `$${creator.pricing.aiActorPricing}`
													: "N/A"}
											</span>
										</div>
									</div>
								</CardContent>

								<CardFooter>
									<button
										onClick={() => handleViewProfile(creator)}
										className="w-full py-1.5 md:py-2 bg-orange-500 text-white rounded-md font-medium text-sm md:text-base"
									>
										View Profile
									</button>
								</CardFooter>
							</Card>
						))}
					</div>
				)}

				{/* Video Modal */}
				{selectedVideo && (
					<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
						<div className="relative w-full max-w-3xl max-h-full">
							{/* Close Button */}
							<button
								onClick={closeVideoModal}
								className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors z-10"
							>
								<X className="w-6 h-6" />
							</button>

							{/* Video Player */}
							<div className="bg-black rounded-lg overflow-hidden">
								<video
									className="w-full h-auto max-h-[80vh]"
									controls
									autoPlay
									src={selectedVideo.url}
								>
									<source src={selectedVideo.url} type="video/mp4" />
									<source src={selectedVideo.url} type="video/mov" />
									<source src={selectedVideo.url} type="video/quicktime" />
									Your browser does not support the video tag.
								</video>
							</div>

							{/* Video Info */}
							<div className="mt-4 text-center">
								<h4 className="text-white text-lg font-medium">
									{selectedVideo.creatorName}&apos;s Introduction Video
								</h4>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	// Main listing view (Marketplace)
	return (
		<div className="container mx-auto p-3 md:p-4">
			{showAlert && <AlertNotification />}

			<div className="mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
				<div className="relative w-full md:w-64">
					<input
						type="text"
						placeholder="Search creators..."
						value={searchTerm}
						onChange={handleSearchChange}
						className="w-full p-2 pl-8 pr-10 border border-gray-300 rounded-md text-sm md:text-base"
					/>
					<svg
						className="absolute left-2 top-3 h-4 w-4 text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					{searchTerm && (
						<button
							onClick={clearSearch}
							className="absolute right-2 top-3 h-4 w-4 text-gray-500 hover:text-gray-700"
						>
							<X size={16} />
						</button>
					)}
				</div>

				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={handleNavigateToSaved}
						className="px-3 py-1.5 md:px-4 md:py-2 bg-orange-500 text-white rounded-md flex items-center text-xs md:text-sm"
					>
						<Heart size={16} className="mr-1 md:mr-2" />
						Saved Creators{" "}
						{savedCreators.length > 0 && `(${savedCreators.length})`}
					</button>

					{/* <div className="relative">
						<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
							Rating
							<svg
								className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
					</div> */}

					<Popover>
						<PopoverTrigger asChild>
							<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
								Content Type
								{selectedContentTypes.length > 0 && (
									<span className="ml-1 bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">
										{selectedContentTypes.length}
									</span>
								)}
								<svg
									className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-64 bg-white">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<h4 className="font-medium text-sm">Content Types</h4>
									{selectedContentTypes.length > 0 && (
										<button
											onClick={() => setSelectedContentTypes([])}
											className="text-xs text-orange-500 hover:text-orange-600"
										>
											Clear All
										</button>
									)}
								</div>
								<div className="space-y-3 max-h-64 overflow-y-auto">
									{CONTENT_TYPES.map((contentType) => (
										<div
											key={contentType}
											className="flex items-center space-x-2"
										>
											<Checkbox
												id={contentType}
												checked={selectedContentTypes.includes(contentType)}
												onCheckedChange={(checked) => {
													if (checked) {
														setSelectedContentTypes((prev) => [
															...prev,
															contentType,
														]);
													} else {
														setSelectedContentTypes((prev) =>
															prev.filter((type) => type !== contentType)
														);
													}
												}}
											/>
											<label
												htmlFor={contentType}
												className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
											>
												{contentType}
											</label>
										</div>
									))}
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<Popover>
						<PopoverTrigger asChild>
							<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
								Gender
								{selectedGenders.length > 0 && (
									<span className="ml-1 bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">
										{selectedGenders.length}
									</span>
								)}
								<svg
									className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-64 bg-white">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<h4 className="font-medium text-sm">Gender</h4>
									{selectedGenders.length > 0 && (
										<button
											onClick={() => setSelectedGenders([])}
											className="text-xs text-orange-500 hover:text-orange-600"
										>
											Clear All
										</button>
									)}
								</div>
								<div className="space-y-3">
									{["Male", "Female"].map((gender) => (
										<div key={gender} className="flex items-center space-x-2">
											<Checkbox
												id={gender}
												checked={selectedGenders.includes(gender)}
												onCheckedChange={(checked) => {
													if (checked) {
														setSelectedGenders((prev) => [...prev, gender]);
													} else {
														setSelectedGenders((prev) =>
															prev.filter((g) => g !== gender)
														);
													}
												}}
											/>
											<label
												htmlFor={gender}
												className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
											>
												{gender}
											</label>
										</div>
									))}
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<Popover>
						<PopoverTrigger asChild>
							<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
								Nationality
								{selectedNationalities.length > 0 && (
									<span className="ml-1 bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">
										{selectedNationalities.length}
									</span>
								)}
								<svg
									className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-64 bg-white">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<h4 className="font-medium text-sm">Nationality</h4>
									{selectedNationalities.length > 0 && (
										<button
											onClick={() => setSelectedNationalities([])}
											className="text-xs text-orange-500 hover:text-orange-600"
										>
											Clear All
										</button>
									)}
								</div>
								<div className="space-y-3 max-h-64 overflow-y-auto">
									{NATIONALITIES.map((nationality) => (
										<div
											key={nationality}
											className="flex items-center space-x-2"
										>
											<Checkbox
												id={nationality}
												checked={selectedNationalities.includes(nationality)}
												onCheckedChange={(checked) => {
													if (checked) {
														setSelectedNationalities((prev) => [
															...prev,
															nationality,
														]);
													} else {
														setSelectedNationalities((prev) =>
															prev.filter((n) => n !== nationality)
														);
													}
												}}
											/>
											<label
												htmlFor={nationality}
												className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
											>
												{nationality}
											</label>
										</div>
									))}
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{filteredCreators.length === 0 ? (
				<EmptyState
					message={
						selectedContentTypes.length > 0 ||
						selectedGenders.length > 0 ||
						selectedNationalities.length > 0
							? "No creators found with selected filters"
							: "No Creators Found"
					}
				/>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					{filteredCreators.map((creator) => (
						<Card key={creator.id} className="overflow-hidden">
							<CardHeader className="pb-0">
								<div className="flex justify-between items-start">
									<div className="flex items-center">
										<div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden mr-3 md:mr-4">
											<Image
												src={
													creator.creatorProfileData?.tiktokAvatarUrl ||
													creator.profilePictureUrl
												}
												alt={creator.name}
												className="w-full h-full object-cover"
												width={64}
												height={64}
											/>
										</div>
										<div>
											<h3 className="text-base md:text-lg font-bold">
												{creator.creatorProfileData?.tiktokDisplayName ||
													creator.name}
											</h3>
											<p className="text-orange-500 text-sm md:text-base">
												@{creator.username}
											</p>
										</div>
									</div>
									<button
										onClick={() => handleSaveCreator(creator)}
										className={`p-2 rounded-full ${
											isCreatorSaved(creator.id)
												? "bg-pink-500 text-white"
												: "bg-[#FFF4EE] text-[#000000]"
										}`}
									>
										<Heart
											size={18}
											fill={isCreatorSaved(creator.id) ? "white" : "none"}
										/>
									</button>
								</div>
							</CardHeader>

							<CardContent className="pt-3 md:pt-4 text-sm md:text-base">
								<p className="text-gray-600 line-clamp-2 h-10 md:h-12">
									{creator.bio || "No bio available"}
								</p>
								<VideoComponent
									videoId={creator.id}
									currentPlayingVideo={currentPlayingVideo}
									setCurrentPlayingVideo={setCurrentPlayingVideo}
									creator={{
										...creator,
										aboutMeVideoUrl: creator.aboutMeVideoUrl || "",
									}}
									onClick={() =>
										openVideoModal(
											creator.aboutMeVideoUrl || "",
											0,
											creator.name
										)
									}
								/>

								<div className="mt-8 bg-[#FFF4EE] p-4 rounded-lg">
									<div className="flex justify-center items-center mb-4 bg-white rounded-lg px-4 py-2">
										<Video size={24} className="text-orange-500 mr-2" />
										<span className="font-medium">Videos</span>
									</div>

									<div className="space-y-3">
										<div className="flex justify-between">
											<span>1 Video</span>
											<span className="font-medium">
												{creator.pricing.oneVideo &&
												creator.pricing.oneVideo > 0
													? `$${creator.pricing.oneVideo}`
													: "N/A"}
											</span>
										</div>

										<div className="flex justify-between">
											<span>3 Videos</span>
											<span className="font-medium">
												{creator.pricing.threeVideos &&
												creator.pricing.threeVideos > 0
													? `$${creator.pricing.threeVideos}`
													: "N/A"}
											</span>
										</div>

										<div className="flex justify-between">
											<span>5 Videos</span>
											<span className="font-medium">
												{creator.pricing.fiveVideos &&
												creator.pricing.fiveVideos > 0
													? `$${creator.pricing.fiveVideos}`
													: "N/A"}
											</span>
										</div>

										<div className="flex justify-between">
											<span>Bulk Rate (6 videos)</span>
											<span className="font-medium">
												{creator.pricing.bulkVideos &&
												creator.pricing.bulkVideos > 0
													? `$${creator.pricing.bulkVideos}`
													: "N/A"}
											</span>
										</div>
									</div>
								</div>

								<div className="mt-8 bg-[#FFF4EE] p-4 rounded-lg">
									<div className="flex justify-center gap-2 items-center mb-4 bg-white rounded-lg px-4 py-2">
										<Image
											src="/icons/ai-actor.svg"
											alt="AI Actor"
											width={24}
											height={24}
										/>
										<span className="font-medium">AI Actor</span>
									</div>
									<div className="flex justify-between">
										<span>Per Usage</span>
										<span className="font-medium">
											{creator.pricing.aiActorPricing &&
											creator.pricing.aiActorPricing > 0
												? `$${creator.pricing.aiActorPricing}`
												: "N/A"}
										</span>
									</div>
								</div>
							</CardContent>

							<CardFooter>
								<button
									onClick={() => handleViewProfile(creator)}
									className="w-full py-1.5 md:py-2 bg-orange-500 text-white rounded-md font-medium text-sm md:text-base"
								>
									View Profile
								</button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			{/* Video Modal */}
			{selectedVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
					<div className="relative w-full max-w-3xl max-h-full">
						{/* Close Button */}
						<button
							onClick={closeVideoModal}
							className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors z-10"
						>
							<X className="w-6 h-6" />
						</button>

						{/* Video Player */}
						<div className="bg-black rounded-lg overflow-hidden">
							<video
								className="w-full h-auto max-h-[80vh]"
								controls
								autoPlay
								src={selectedVideo.url}
							>
								<source src={selectedVideo.url} type="video/mp4" />
								<source src={selectedVideo.url} type="video/mov" />
								<source src={selectedVideo.url} type="video/quicktime" />
								Your browser does not support the video tag.
							</video>
						</div>

						{/* Video Info */}
						<div className="mt-4 text-center">
							<h4 className="text-white text-lg font-medium">
								{selectedVideo.creatorName}&apos;s Introduction Video
							</h4>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CreatorMarketplace;
