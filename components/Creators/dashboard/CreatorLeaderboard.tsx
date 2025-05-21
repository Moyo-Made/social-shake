"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Creator } from "@/types/creators";
import CountdownTimer from "@/components/brand/brandProfile/dashboard/ViewContests/CountdownTimer";

interface ContestStatus {
	status: "active" | "ended" | "completed";
	statusText: string;
	color: string;
}

interface ContestData {
	basic: {
		contestName: string;
	};
	prizeTimeline: {
		endDate: string;
		startDate: string;
		winnerCount: number;
		totalBudget: number;
		positions: {
			position: number;
			percentage: number;
		}[];
	};
	payoutsProcessed?: boolean;
	payouts?: {
		userId: string;
		position: number;
		amount: number;
		status: "pending" | "completed" | "failed";
		error?: string;
	}[];
}

interface LeaderboardProps {
	contestId: string;
}

const CreatorLeaderboard: React.FC<LeaderboardProps> = ({ contestId }) => {
	const [approvedCreators, setApprovedCreators] = useState<Creator[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [contestData, setContestData] = useState<ContestData | null>(null);
	const [contestStatus, setContestStatus] = useState<ContestStatus>({
		status: "active",
		statusText: "Active",
		color: "bg-green-100 text-green-800",
	});

	// Function to determine contest status
	const getContestStatus = (contestData: ContestData): ContestStatus => {
		const now = new Date();
		const endDate = new Date(contestData.prizeTimeline.endDate);

		if (now < endDate) {
			return {
				status: "active",
				statusText: "Active",
				color: "bg-green-100 text-green-800",
			};
		} else if (contestData.payoutsProcessed) {
			return {
				status: "completed",
				statusText: "Completed",
				color: "bg-blue-100 text-blue-800",
			};
		} else {
			return {
				status: "ended",
				statusText: "Ended (Awaiting Payouts)",
				color: "bg-yellow-100 text-yellow-800",
			};
		}
	};

	// Calculate prize amount for a position
	const calculatePrizeAmount = (position: number): number => {
		if (!contestData) return 0;

		// Position is 1-based but array is 0-based
		const positionIndex = position - 1;

		// Check if the position is within the array bounds
		if (
			positionIndex < 0 ||
			positionIndex >= contestData.prizeTimeline.positions.length
		) {
			return 0;
		}

		// Get the prize amount directly from the positions array
		const amount = contestData.prizeTimeline.positions[positionIndex];
		return typeof amount === "number" ? amount : 0;
	};

	// Get payout status for a user
	const getPayoutStatus = (userId: string) => {
		if (!contestData?.payouts) return null;

		return contestData.payouts.find((payout) => payout.userId === userId);
	};

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	// Fetch contest data
	const fetchContestData = async () => {
		if (!contestId) return;

		try {
			const response = await fetch(`/api/contests?contestId=${contestId}`);
			if (!response.ok) {
				throw new Error("Failed to fetch contest data");
			}

			const data = await response.json();
			setContestData(data.data);

			// Set contest status
			setContestStatus(getContestStatus(data.data));
		} catch (err) {
			console.error("Error fetching contest data:", err);
		}
	};

	useEffect(() => {
		fetchContestData();
	}, [contestId]);

	useEffect(() => {
		const fetchApprovedApplications = async () => {
			if (!contestId) return;

			try {
				setLoading(true);
				// Fetch applications for the contest
				const response = await fetch(
					`/api/contest-submissions?contestId=${contestId}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch applications");
				}

				const data = await response.json();

				// Filter only approved applications
				const approvedApplications = data;

				// If there are no approved applications, set empty array and stop loading
				if (approvedApplications.length === 0) {
					setApprovedCreators([]);
					setLoading(false);
					return;
				}

				// Fetch creator data for each approved application
				const creatorDataArray = await Promise.all(
					approvedApplications.map(
						async (app: { postUrl: string; userId: string }) => {
							try {
								const creatorRes = await fetch(
									`/api/admin/creator-approval?userId=${app.userId}`
								);

								if (creatorRes.ok) {
									const response = await creatorRes.json();

									if (response.creators && response.creators.length > 0) {
										const creator = response.creators[0];

										const formattedPostUrl =
											app.postUrl && !app.postUrl.startsWith("http")
												? `https://${app.postUrl}`
												: app.postUrl;

										// Combine application data with creator data
										return {
											...app,
											creator: creator,
											metrics: {
												// Get metrics from TikTok data
												views:
													creator.tiktokMetrics?.views ||
													creator.creatorProfileData?.tiktokMetrics?.views ||
													creator.tiktokData?.tiktokAverageViews ||
													0,
												likes:
													creator.tiktokMetrics?.likes ||
													creator.creatorProfileData?.tiktokMetrics?.likes ||
													0,
												comments:
													creator.tiktokMetrics?.comments ||
													creator.creatorProfileData?.tiktokMetrics?.comments ||
													0,
												followers:
													creator.tiktokMetrics?.followers?.count ||
													creator.creatorProfileData?.tiktokMetrics?.followers
														?.count ||
													creator.tiktokData?.tiktokFollowers ||
													0,
											},
											position: 0, // Will be calculated later
											profileImage:
												creator.creatorProfileData?.tiktokAvatarUrl ||
												creator.logoUrl ||
												"/icons/default-avatar.svg",
											username:
												creator.creatorProfileData?.tiktokUsername ||
												creator.username ||
												"Unknown",
											fullName:
												`${creator.firstName || ""} ${creator.lastName || ""}`.trim() ||
												creator.creatorProfileData?.tiktokDisplayName ||
												"Unknown Creator",
											tiktokLink:
												formattedPostUrl ||
												creator.socialMedia?.tiktok ||
												creator.creatorProfileData?.tiktokProfileLink ||
												"#",
										};
									}
								}
								return null;
							} catch (err) {
								console.error(
									`Error fetching creator data for user ID ${app.userId}:`,
									err
								);
								return null;
							}
						}
					)
				);

				// Filter out null values and sort by views (you can change the sorting criteria)
				const validCreators = creatorDataArray
					.filter((creator) => creator !== null)
					.sort((a, b) => b.metrics.views - a.metrics.views);

				// Assign positions based on sorting
				const creatorsWithPositions = validCreators.map((creator, index) => ({
					...creator,
					position: index + 1,
				}));

				setApprovedCreators(creatorsWithPositions);
				setLoading(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
				console.error("Error fetching approved applications:", err);
				setLoading(false);
			}
		};

		fetchApprovedApplications();
	}, [contestId]);

	// Badge colors and backgrounds for top positions
	const positionStyles = {
		1: { cardBg: "#FBED7B", borderColor: "#FCD949", badge: "/icons/Gold.svg" },
		2: {
			cardBg: "#EBF1F5",
			borderColor: "#B0C1D1",
			badge: "/icons/Silver.svg",
		},
		3: {
			cardBg: "#F7E6D8",
			borderColor: "#CF9C69",
			badge: "/icons/Bronze.svg",
		},
	};

	// Format numbers to be more readable
	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + "M";
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + "k";
		}
		return num.toString();
	};

	// Check if a creator is a winner
	const isWinner = (position: number) => {
		if (!contestData) return false;
		return position <= (contestData.prizeTimeline.winnerCount || 0);
	};

	// Render payout status badge
	const renderPayoutStatus = (userId: string) => {
		const payout = getPayoutStatus(userId);

		if (!payout) return null;

		switch (payout.status) {
			case "completed":
				return (
					<div className="flex items-center text-green-600">
						<CheckCircle size={16} className="mr-1" />
						<span>Paid</span>
					</div>
				);
			case "pending":
				return (
					<div className="flex items-center text-yellow-600">
						<Clock size={16} className="mr-1" />
						<span>Pending</span>
					</div>
				);
			case "failed":
				return (
					<div className="flex items-center text-red-600">
						<AlertCircle size={16} className="mr-1" />
						<span>Failed</span>
						{payout.error && (
							<span className="ml-1 text-xs">({payout.error})</span>
						)}
					</div>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="w-full max-w-4xl mx-auto text-center py-16">
				<p>Loading creator leaderboard...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full max-w-4xl mx-auto text-center text-red-500 py-16">
				<p>Error loading leaderboard: {error}</p>
			</div>
		);
	}

	if (approvedCreators.length === 0) {
		return (
			<div className="w-full max-w-4xl mx-auto text-center py-16">
				<p>No approved creators found for this contest yet.</p>
			</div>
		);
	}

	// Get top 3 creators for featured display
	const topContestants = approvedCreators.slice(0, 3);

	// Get the rest for the table
	const leaderboardData = approvedCreators;

	const winnerCount = contestData?.prizeTimeline?.winnerCount || 0;

	return (
		<div className="w-full max-w-4xl mx-auto border border-orange-400 rounded-md p-6">
			{/* Contest Status Banner */}
			<div className="flex justify-between items-center mb-4">
				<div
					className={`px-3 py-1 rounded-full text-sm font-medium ${contestStatus.color}`}
				>
					{contestStatus.statusText}
				</div>
			</div>

			{contestData && <CountdownTimer contest={contestData} />}

			{/* Top 3 Cards Section */}
			<div className="flex flex-wrap justify-center gap-4 mb-8">
				{topContestants.map(
					(contestant: {
						position: 1 | 2 | 3;
						userId: string;
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						[key: string]: any;
					}) => (
						<div
							key={contestant.id}
							className="w-72 border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
							style={{
								borderColor: positionStyles[contestant.position].borderColor,
							}}
						>
							{/* Profile Image Section */}
							<div className="h-20 flex justify-center py-4 bg-white">
								<div className="relative h-20">
									<Image
										src={contestant.profileImage}
										alt={contestant.fullName}
										width={80}
										height={80}
										className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm"
									/>
									<div className="absolute -bottom-1 right-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black border-2 border-white">
										<Image
											src={positionStyles[contestant.position].badge}
											alt={`Position ${contestant.position}`}
											width={30}
											height={30}
										/>
									</div>
								</div>
							</div>

							{/* Details Section */}
							<div
								className="pt-3"
								style={{
									backgroundColor: positionStyles[contestant.position].cardBg,
								}}
							>
								<div className="pt-3 pb-1 text-center">
									<div className="flex items-center justify-center gap-2">
										<h3 className="font-bold text-[#101828] text-lg">
											{contestant.fullName}
										</h3>
										<Image
											src="/icons/message.svg"
											alt="Message"
											width={20}
											height={20}
										/>
									</div>
									<p className="text-sm text-[#667085]">
										@{contestant.username}
									</p>

									{/* Prize Amount - Show if contest ended and the creator is a winner */}
									{(contestStatus.status === "ended" ||
										contestStatus.status === "completed") &&
										isWinner(contestant.position) && (
											<div className="mt-1 font-bold text-green-700">
												{formatCurrency(
													calculatePrizeAmount(contestant.position)
												)}
											</div>
										)}

									{/* Payout Status - Show if payouts have been processed */}
									{contestStatus.status === "completed" &&
										isWinner(contestant.position) && (
											<div className="mt-1 flex justify-center">
												{renderPayoutStatus(contestant.userId)}
											</div>
										)}
								</div>

								<div className="flex justify-between px-4 py-2 text-center">
									<div className="flex-1">
										<p className="text-sm text-[#667085]">Views</p>
										<p className="font-semibold text-[#101828]">
											{formatNumber(contestant.metrics.views)}
										</p>
									</div>
									<div className="flex-1">
										<p className="text-sm text-[#667085]">Likes</p>
										<p className="font-semibold text-[#101828]">
											{formatNumber(contestant.metrics.likes)}
										</p>
									</div>
									<div className="flex-1">
										<p className="text-sm text-[#667085]">Comments</p>
										<p className="font-semibold text-[#101828]">
											{formatNumber(contestant.metrics.comments)}
										</p>
									</div>
								</div>
							</div>
							<div className="py-3 text-center border-t border-gray-200 mx-4">
								<a
									href={contestant.tiktokLink}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
								>
									View Post <ArrowRight size={16} className="ml-2" />
								</a>
							</div>
						</div>
					)
				)}
			</div>

			{/* Leaderboard Section with Card Layout */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="flex bg-gray-50 py-3 text-gray-600 text-sm font-medium border-b border-gray-200">
					<div className="w-16 text-center">Position</div>
					<div className="flex-1 mr-5 text-center">Creator</div>
					<div className="w-24 text-center">Views</div>
					<div className="w-24 text-center">Likes</div>
					<div className="w-24 text-center">Comments</div>
					{(contestStatus.status === "ended" ||
						contestStatus.status === "completed") && (
						<div className="w-32 text-center">Prize</div>
					)}
					{contestStatus.status === "completed" && (
						<div className="w-24 text-center">Status</div>
					)}
					<div className="w-24 text-center">Post</div>
				</div>

				{/* Table Rows */}
				{leaderboardData.map((item) => (
					<div
						key={item.id}
						className={`flex py-3 items-center border-b border-gray-200 text-sm hover:bg-gray-50 transition-colors ${
							isWinner(item.position) ? "bg-green-50" : ""
						}`}
					>
						<div className="w-16 text-center font-medium">
							#{item.position}
							{isWinner(item.position) && (
								<span className="ml-1 text-xs text-green-600 font-bold">★</span>
							)}
						</div>
						<div className="flex-1 mr-5 flex items-center gap-2">
							<Image
								src={item.profileImage}
								alt={item.username || ""}
								className="w-8 h-8 rounded-full"
								width={32}
								height={32}
							/>
							<div>
								<div className="font-medium">{item.fullName}</div>
								<div className="text-xs text-gray-500">@{item.username}</div>
							</div>
						</div>
						<div className="w-24 text-center">
							{formatNumber(item.metrics.views)}
						</div>
						<div className="w-24 text-center">
							{formatNumber(item.metrics.likes)}
						</div>
						<div className="w-24 text-center">
							{formatNumber(item.metrics.comments)}
						</div>

						{/* Prize Column - Only visible when contest has ended */}
						{(contestStatus.status === "ended" ||
							contestStatus.status === "completed") && (
							<div className="w-32 text-center font-medium">
								{isWinner(item.position)
									? formatCurrency(calculatePrizeAmount(item.position))
									: "-"}
							</div>
						)}

						{/* Payout Status Column - Only visible when payouts have been processed */}
						{contestStatus.status === "completed" && (
							<div className="w-24 text-center">
								{isWinner(item.position)
									? renderPayoutStatus(item.userId)
									: "-"}
							</div>
						)}

						<div className="w-24 text-center">
							<a
								href={item.tiktokLink}
								target="_blank"
								rel="noopener noreferrer"
								className="text-orange-500 font-medium hover:underline"
							>
								View
							</a>
						</div>
					</div>
				))}
			</div>

			{/* Winner Information Section - Only visible after contest ends */}
			{(contestStatus.status === "ended" ||
				contestStatus.status === "completed") && (
				<div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
					<h3 className="text-lg font-bold mb-2">Contest Results</h3>
					<p className="mb-4">
						This contest has ended. The top {winnerCount}{" "}
						{winnerCount === 1 ? "creator" : "creators"} have won prizes based
						on their performance.
					</p>

					<div className="space-y-2">
						{Array.from({ length: winnerCount }).map((_, index) => {
							const position = index + 1;
							const winner = approvedCreators.find(
								(c) => c.position === position
							);
							const prizeAmount = calculatePrizeAmount(position);

							return winner ? (
								<div
									key={position}
									className="flex justify-between items-center py-2 border-b border-gray-200"
								>
									<div className="flex items-center">
										<div className="font-bold mr-2">#{position}</div>
										<Image
											src={winner.profileImage}
											alt={winner.fullName}
											width={24}
											height={24}
											className="w-6 h-6 rounded-full mr-2"
										/>
										<span>{winner.fullName}</span>
									</div>
									<div className="flex items-center">
										<span className="font-bold mr-4">
											{formatCurrency(prizeAmount)}
										</span>
										{contestStatus.status === "completed" &&
											renderPayoutStatus(winner.userId)}
									</div>
								</div>
							) : (
								<div
									key={position}
									className="py-2 border-b border-gray-200 text-gray-500"
								>
									Position #{position} - No qualifying creator
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Creator onboarding reminder - For all creators in active contests */}
			{contestStatus.status === "active" && (
				<div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
					<h3 className="text-lg font-bold mb-2 text-blue-800">
						Attention Creators!
					</h3>
					<p className="text-blue-700">
						To be eligible to receive prizes if you win, make sure you&apos;ve
						connected your Stripe account. Go to your profile settings to
						complete the Stripe Connect onboarding process.
					</p>
				</div>
			)}
		</div>
	);
};

export default CreatorLeaderboard;
