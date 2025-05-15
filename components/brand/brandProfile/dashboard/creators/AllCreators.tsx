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
			<div className="container mx-auto p-3 md:p-4 max-w-4xl">
				{showAlert && <AlertNotification />}

				<div className="pt-4 md:pt-6 border-t mt-4 md:mt-6">
					<button
						onClick={handleBackToList}
						className="px-3 py-1.5 md:px-4 md:py-2 hover:underline flex items-center text-sm md:text-base"
					>
						<ArrowLeft size={16} className="mr-1 md:mr-2" />
						Back to {isSavedCreatorsPage ? "Saved Creators" : "All Creators"}
					</button>
				</div>

				<div className="overflow-hidden">
					<div className="p-4 md:p-6 bg-white border border-[#FDE5D7] rounded-lg mt-3 md:mt-5">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
							<div className="flex flex-col md:flex-row md:items-center gap-4">
								<div className="h-24 w-24 md:h-32 md:w-32 lg:h-40 lg:w-40 rounded-full overflow-hidden border-4 border-orange-100 mx-auto md:mx-0">
									<Image
										src={
											selectedCreator.creatorProfileData?.tiktokAvatarUrl ||
											selectedCreator.profilePictureUrl
										}
										alt={selectedCreator.name}
										className="h-full w-full object-cover"
										width={160}
										height={160}
									/>
								</div>
								<div className="text-center md:text-left">
									<h2 className="text-xl md:text-2xl font-bold">
										{selectedCreator.creatorProfileData?.tiktokDisplayName ||
											selectedCreator.name}
									</h2>
									<p className="text-gray-600 text-sm md:text-base">
										{Array.isArray(selectedCreator.contentTypes)
											? selectedCreator.contentTypes.join(", ")
											: selectedCreator.contentTypes ||
												"No content type specified"}
									</p>
									<p className="text-gray-500 text-sm md:text-base">
										@{selectedCreator.username}
									</p>
								</div>
							</div>
							<div className="flex flex-col items-center md:items-start gap-2">
								<div className="flex gap-1 text-sm">
									<p className="text-[#667085]">Video Pricing:</p>
									<p className="font-normal">
										${selectedCreator.pricing.oneVideo}/Video
									</p>
								</div>
								<div className="flex gap-3">
									<button
										onClick={() => handleSendMessage(selectedCreator)}
										className="px-3 py-1.5 md:px-4 md:py-2 bg-orange-500 text-white rounded-md flex items-center text-sm md:text-base"
									>
										<Send size={16} className="mr-1 md:mr-2" />
										Send Message
									</button>
									<button
										onClick={() => handleSaveCreator(selectedCreator)}
										className={`p-2 rounded-full ${
											isCreatorSaved(selectedCreator.id)
												? "bg-pink-500 text-white"
												: "bg-[#FFF4EE] text-[#000000]"
										}`}
									>
										<Heart
											size={20}
											fill={
												isCreatorSaved(selectedCreator.id) ? "white" : "none"
											}
										/>
									</button>
								</div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
						<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
							<h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
								Profile
							</h3>

							<div className="space-y-3 md:space-y-4 text-sm md:text-base">
								<div className="grid grid-cols-2 gap-2 md:gap-4">
									<div>
										<p className="text-gray-500">TikTok Username</p>
										<p>
											{selectedCreator.tiktokUrl.split("@")[1] ||
												"Not specified"}
										</p>
									</div>

									<div>
										<p className="text-gray-500">Nationality</p>
										<p>{selectedCreator.country || "Not specified"}</p>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2 md:gap-4">
									<div>
										<p className="text-gray-500">Member Since:</p>
										<p>
											{new Date().toLocaleDateString("en-US", {
												month: "long",
												year: "numeric",
											})}
										</p>
									</div>

									<div>
										<p className="text-gray-500">Ratings</p>
										<div className="flex items-center">
											<span className="text-yellow-500">★</span>
											<span className="ml-1">New Creator</span>
										</div>
									</div>
								</div>

								<div>
									<p className="text-gray-500 mb-1 md:mb-2">Creator Bio</p>
									<p className="text-sm md:text-base">
										{selectedCreator.bio || "No bio available."}
									</p>
								</div>

								<div>
									<p className="text-gray-500 mb-1 md:mb-2">Languages</p>
									<p>English</p>
								</div>

								<div className="grid grid-cols-3 gap-2 md:gap-4 pt-2 md:pt-4">
									<div className="text-center md:text-start">
										<p className="text-lg md:text-xl font-medium">0</p>
										<p className="text-gray-500 text-xs md:text-sm">
											Total Projects
										</p>
									</div>
									<div className="text-center md:text-start">
										<p className="text-lg md:text-xl font-medium">0+</p>
										<p className="text-gray-500 text-xs md:text-sm">
											Total Views
										</p>
									</div>
									<div className="text-center md:text-start">
										<p className="text-lg md:text-xl font-medium">0</p>
										<p className="text-gray-500 text-xs md:text-sm">
											Contests Won
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
							<h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
								Portfolio Videos
							</h3>
							<div className="grid grid-cols-2 gap-2 md:gap-4">
								{selectedCreator.contentLinks &&
								selectedCreator.contentLinks.length > 0 ? (
									selectedCreator.contentLinks
										.slice(0, 4)
										.map((link, index) => (
											<div
												key={index}
												className="rounded-lg relative aspect-square"
											>
												<Image
													src="/icons/Vid.svg" // Placeholder image
													alt={`Creator Video ${index + 1}`}
													className="w-full h-full object-cover"
													width={200}
													height={200}
												/>
												<a
													href={link}
													target="_blank"
													rel="noopener noreferrer"
													className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-40 transition-all"
												>
													<div className="text-white font-medium">View</div>
												</a>
											</div>
										))
								) : (
									<div className="col-span-2 flex items-center justify-center h-40 bg-gray-50 rounded-lg">
										<p className="text-gray-500">
											No portfolio videos available
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
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
