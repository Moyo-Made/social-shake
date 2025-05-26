/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Heart, Send, ArrowLeft } from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CreatorVideoShowcase from "./CreatorVideoShowcase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Define types
export interface Creators {
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
					})
				);

				// Filter out creators with undefined totalGMV
				const filteredCreators = mappedCreators.filter(
					(creator: { totalGMV: undefined } | null) =>
						creator !== null &&
						creator.totalGMV !== undefined &&
						typeof creator.totalGMV === "number"
				);

				setCreators(filteredCreators);
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

	// Empty state for saved creators or while loading
	const EmptyState = ({ message }: { message: string }) => (
		<div className="flex flex-col items-center justify-center py-8 md:py-16">
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
			<div className="container mx-auto p-3 md:p-4 max-w-7xl">
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
									${selectedCreator.pricing.oneVideo} <span className="font-normal text-sm text-gray-500">per video</span>
								</p>
								
								
							</div>
							<div className="flex gap-3">
								<Button
									onClick={() => handleSendMessage(selectedCreator)}
									className="bg-orange-500 hover:bg-orange-600 text-white"
								>
									<Send size={16} className="mr-2" />
									Send Message
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
						<TabsList className="grid w-full grid-cols-3  ">
							<TabsTrigger value="profile" className="text-sm md:text-base">
								Profile Info
							</TabsTrigger>
							<TabsTrigger value="videos" className="text-sm md:text-base">
								Video Library
							</TabsTrigger>
							<TabsTrigger value="portfolio" className="text-sm md:text-base">
								Portfolio Links
							</TabsTrigger>
						</TabsList>

						{/* Profile Info Tab */}
						<TabsContent value="profile" className="mt-6">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Basic Info Card */}
								<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
									<h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
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

										<div>
											<Label className="text-sm font-medium text-gray-500">
												Languages
											</Label>
											<p className="mt-1 text-sm md:text-base">English</p>
										</div>
									</div>
								</div>

								{/* Stats & Pricing Card */}
								<div className="space-y-6">
									{/* Stats Card */}
									<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
										<h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
											<svg
												className="w-5 h-5 mr-2 text-orange-500"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
											</svg>
											Performance Stats
										</h3>

										<div className="grid grid-cols-3 gap-4">
											<div className="text-center p-3 bg-orange-50 rounded-lg">
												<p className="text-lg md:text-xl font-bold text-orange-600">
													0
												</p>
												<p className="text-xs md:text-sm text-gray-600">
													Total Projects
												</p>
											</div>
											<div className="text-center p-3 bg-blue-50 rounded-lg">
												<p className="text-lg md:text-xl font-bold text-blue-600">
													0+
												</p>
												<p className="text-xs md:text-sm text-gray-600">
													Total Views
												</p>
											</div>
											<div className="text-center p-3 bg-green-50 rounded-lg">
												<p className="text-lg md:text-xl font-bold text-green-600">
													0
												</p>
												<p className="text-xs md:text-sm text-gray-600">
													Contests Won
												</p>
											</div>
										</div>
									</div>

									{/* Pricing Card */}
									<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
										<h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
											<svg
												className="w-5 h-5 mr-2 text-orange-500"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
													clipRule="evenodd"
												/>
											</svg>
											Video Pricing
										</h3>

										<div className="space-y-3">
											<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
												<span className="font-medium">1 Video</span>
												<span className="font-bold text-orange-600">
													${selectedCreator.pricing.oneVideo}
												</span>
											</div>
											<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
												<span className="font-medium">3 Videos</span>
												<span className="font-bold text-orange-600">
													${selectedCreator.pricing.threeVideos}
												</span>
											</div>
											<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
												<span className="font-medium">5 Videos</span>
												<span className="font-bold text-orange-600">
													${selectedCreator.pricing.fiveVideos}
												</span>
											</div>
											<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
												<span className="font-medium">Bulk Videos</span>
												<span className="font-bold text-orange-600">
													${selectedCreator.pricing.bulkVideos}
												</span>
											</div>
											{selectedCreator.pricing.bulkVideosNote && (
												<p className="text-xs text-gray-500 mt-2">
													{selectedCreator.pricing.bulkVideosNote}
												</p>
											)}
										</div>
									</div>
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
								<h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
									<svg
										className="w-5 h-5 mr-2 text-orange-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
											clipRule="evenodd"
										/>
									</svg>
									Portfolio & Social Links
								</h3>

								<div className="space-y-6">
									{/* Social Media Links */}
									<div>
										<h4 className="font-semibold mb-3">Social Media</h4>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{selectedCreator.tiktokUrl && (
												<a
													href={selectedCreator.tiktokUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
												>
													<div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
														<span className="text-white text-xs font-bold">
															TT
														</span>
													</div>
													<div>
														<p className="font-medium">TikTok</p>
														<p className="text-sm text-gray-500">
															@
															{selectedCreator.tiktokUrl.split("@")[1] ||
																"View Profile"}
														</p>
													</div>
												</a>
											)}
										</div>
									</div>

									{/* Content Links */}
									{selectedCreator.contentLinks &&
										selectedCreator.contentLinks.length > 0 && (
											<div>
												<h4 className="font-semibold mb-3">
													Portfolio Content
												</h4>
												<div className="space-y-3">
													{selectedCreator.contentLinks.map((link, index) => (
														<a
															key={index}
															href={link}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
														>
															<div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
																<svg
																	className="w-4 h-4 text-orange-600"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path
																		fillRule="evenodd"
																		d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
																		clipRule="evenodd"
																	/>
																</svg>
															</div>
															<div>
																<p className="font-medium">
																	Portfolio Item {index + 1}
																</p>
																<p className="text-sm text-gray-500 truncate max-w-xs">
																	{link}
																</p>
															</div>
														</a>
													))}
												</div>
											</div>
										)}

									{/* Empty state for portfolio */}
									{(!selectedCreator.contentLinks ||
										selectedCreator.contentLinks.length === 0) &&
										!selectedCreator.socialMedia?.instagram && (
											<div className="text-center py-8">
												<svg
													className="mx-auto h-12 w-12 text-gray-400 mb-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
													/>
												</svg>
												<p className="text-gray-500">
													No portfolio links available
												</p>
												<p className="text-sm text-gray-400 mt-1">
													The creator hasn&apos;t added any portfolio content
													yet
												</p>
											</div>
										)}
								</div>
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

									<div className="space-y-2 md:space-y-3 mt-3 md:mt-4">
										<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
											<div className="flex items-center">
												<span className="text-orange-500 mr-1 md:mr-2">$</span>
												<span className="text-xs md:text-sm">
													Total GMV{" "}
													<span className="text-gray-500">(Last 30 days)</span>
												</span>
											</div>
											<span className="font-medium text-sm md:text-base">
												${creator.totalGMV || 0}
											</span>
										</div>

										<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
											<div className="flex items-center">
												<span className="text-orange-500 mr-1 md:mr-2">$</span>
												<span className="text-xs md:text-sm">
													Avg. GMV per Video
												</span>
											</div>
											<span className="font-medium text-sm md:text-base">
												${creator.avgGMVPerVideo || 0}
											</span>
										</div>

										<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
											<div className="flex items-center">
												<span className="text-orange-500 mr-1 md:mr-2">
													<svg
														className="w-4 h-4 md:w-5 md:h-5"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
														<path
															fillRule="evenodd"
															d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
															clipRule="evenodd"
														/>
													</svg>
												</span>
												<span className="text-xs md:text-sm">
													Avg. Impressions per Video
												</span>
											</div>
											<span className="font-medium text-sm md:text-base">
												{creator.avgImpressions || "0"}
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
						placeholder="Search Creators"
						className="w-full p-2 pl-8 pr-4 border border-gray-300 rounded-md text-sm md:text-base"
					/>
					<svg
						className="absolute left-2 top-2.5 h-4 w-4 text-gray-500"
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

					<div className="relative">
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
					</div>

					<div className="relative">
						<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
							Nationality
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
					</div>

					<div className="relative">
						<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
							Gender
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
					</div>

					<div className="relative">
						<button className="px-3 py-1.5 md:px-4 md:py-2 border bg-white rounded-md flex items-center text-xs md:text-sm">
							Budget Range
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
					</div>
				</div>
			</div>

			{creators.length === 0 ? (
				<EmptyState message="No Creators Found" />
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					{creators.map((creator) => (
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

								<div className="space-y-2 md:space-y-3 mt-3 md:mt-4">
									<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
										<div className="flex items-center">
											<span className="text-orange-500 mr-1 md:mr-2">$</span>
											<span className="text-xs md:text-sm">
												Total GMV{" "}
												<span className="text-gray-500">(Last 30 days)</span>
											</span>
										</div>
										<span className="font-medium text-sm md:text-base">
											${creator.totalGMV || 0}
										</span>
									</div>

									<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
										<div className="flex items-center">
											<span className="text-orange-500 mr-1 md:mr-2">$</span>
											<span className="text-xs md:text-sm">
												Avg. GMV per Video
											</span>
										</div>
										<span className="font-medium text-sm md:text-base">
											${creator.avgGMVPerVideo || 0}
										</span>
									</div>

									<div className="flex justify-between items-center bg-[#FFF4EE] py-1.5 md:py-2 px-2 md:px-3 rounded-lg">
										<div className="flex items-center">
											<span className="text-orange-500 mr-1 md:mr-2">
												<svg
													className="w-4 h-4 md:w-5 md:h-5"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
													<path
														fillRule="evenodd"
														d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
														clipRule="evenodd"
													/>
												</svg>
											</span>
											<span className="text-xs md:text-sm">
												Avg. Impressions per Video
											</span>
										</div>
										<span className="font-medium text-sm md:text-base">
											{creator.avgImpressions || "0"}
										</span>
									</div>
								</div>

								<div className="mt-8 bg-[#FFF4EE] p-4 rounded-lg">
									<div className="flex justify-center items-center mb-4 bg-white rounded-lg px-4 py-2">
										<svg
											className="w-5 h-5 mr-2 text-orange-500"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
												clipRule="evenodd"
											/>
										</svg>
										<span className="font-medium">Videos</span>
									</div>

									<div className="space-y-3">
										<div className="flex justify-between">
											<span>1 Video</span>
											<span className="font-medium">
												${creator.pricing.oneVideo}
											</span>
										</div>

										<div className="flex justify-between">
											<span>3 Videos</span>
											<span className="font-medium">
												${creator.pricing.threeVideos}
											</span>
										</div>

										<div className="flex justify-between">
											<span>5 Videos</span>
											<span className="font-medium">
												${creator.pricing.fiveVideos}
											</span>
										</div>

										<div className="flex justify-between">
											<span>Bulk Videos</span>
											<span className="font-medium">
												${creator.pricing.bulkVideos}
											</span>
										</div>
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
		</div>
	);
};

export default CreatorMarketplace;
