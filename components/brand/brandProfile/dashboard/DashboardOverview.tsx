import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import EmptyContest from "./EmptyContest";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/SocketContext";
import { Input } from "@/components/ui/input";
import { ContestFormData } from "@/types/contestFormData";
import dynamic from "next/dynamic";

interface UserDashboardProps {
	userId: string;
}

// Define the Creators interface properly
interface Creators {
	id: string;
	name: string;
	avatar: string;
	username: string;
	bio: string;
	totalGMV: number;
	avgGMVPerVideo: number;
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
	tiktokUrl: string;
	status: string;
	dateOfBirth: string;
	gender: string;
	ethnicity: string;
	contentLinks: string[];
	socialMedia?: Record<string, string>;
	verifiableIDUrl?: string;
}

// Define ContestParticipant interface
interface ContestParticipant {
	id: string;
	userId: string;
	contestId: string;
	postUrl: string;
	status: string;
	position?: number;
	profileImage?: string;
	username?: string;
	fullName?: string;
	metrics?: {
		views: number;
		likes: number;
		comments: number;
		followers?: number;
	};
}

const LoadingState = () => (
	<div className="flex flex-col justify-center items-center h-screen">
		<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
		<p>Loading dashboard..</p>
	</div>
);

const UserDashboard = dynamic(
	() =>
		Promise.resolve(({ userId }: UserDashboardProps) => {
			const [loading, setLoading] = useState(true);
			interface UserData {
				summary: {
					activeProjects: number;
					activeContests: number;
				};
				totalSpend: number;
				projects: Array<{
					timestamp: string | number | Date;
					createdAt: string | Date;
					projectId: string;
					status: string;
					projectDetails?: {
						projectName: string;
					};
					projectType?: {
						type: string;
					};
					creatorPricing?: {
						budgetPerVideo: number;
					};
				}>;
				contests: Array<ContestFormData>;
			}

			interface CreatorMessage {
				id: string;
				sender: string;
				content: string;
				timestamp: string | Date;
				senderInfo?: {
					name: string;
					avatar: string;
					username?: string;
					bio?: string;
				};
				conversationId: string;
				isRead?: boolean;
			}

			const [creatorMessages, setCreatorMessages] = useState<CreatorMessage[]>(
				[]
			);
			const [loadingMessages, setLoadingMessages] = useState(true);
			const [replyText, setReplyText] = useState("");
			const [activeReply, setActiveReply] = useState<string | null>(null);
			const { sendMessage: socketSendMessage, socket } = useSocket();
			const [userData, setUserData] = useState<UserData | null>(null);
			const [selectedCreator, setSelectedCreator] = useState<Creators | null>(
				null
			);

			// Add state for latest contest and leaderboard data
			const [latestContest, setLatestContest] =
				useState<ContestFormData | null>(null);

			const [leaderboardData, setLeaderboardData] = useState<
				ContestParticipant[]
			>([]);
			const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

			const activeProjects =
				userData &&
				userData.projects.filter(
					(project) =>
						project.status === "active" ||
						project.status === "accepting pitches"
				).length > 0;

			// function to calculate time ago
			const timeAgo = (timestamp: string | number | Date) => {
				if (!timestamp) return "just now";

				const now = new Date();
				const messageTime = new Date(timestamp);
				const diffMs = now.getTime() - messageTime.getTime();
				const diffMins = Math.round(diffMs / 60000);
				const diffHours = Math.round(diffMs / 3600000);
				const diffDays = Math.round(diffMs / 86400000);

				if (diffMins < 1) return "just now";
				if (diffMins < 60)
					return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
				if (diffHours < 24)
					return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
				return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
			};

			const fetchCreatorMessages = async () => {
				if (!userId) return;

				try {
					setLoadingMessages(true);
					// Fetch creator messages from the new specialized endpoint
					const response = await fetch(
						`/api/creator-messages?userId=${userId}&limit=4`
					);

					if (!response.ok) {
						throw new Error("Failed to fetch creator messages");
					}

					const data = await response.json();
					if (data.messages) {
						// The new endpoint already returns messages in the desired format
						setCreatorMessages(data.messages);
					}
				} catch (error) {
					console.error("Error fetching creator messages:", error);
				} finally {
					setLoadingMessages(false);
				}
			};

			//  function to handle reply
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const handleSendReply = async (conversationId: string, id: string) => {
				if (!replyText.trim() || !conversationId || !userId) return;

				try {
					// Use socket to send message
					if (socketSendMessage) {
						socketSendMessage(conversationId, replyText);
					} else {
						// Fallback to API if socket not available
						await fetch("/api/messages", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								conversationId,
								sender: userId,
								content: replyText,
							}),
						});
					}

					// Clear reply text and close reply input
					setReplyText("");
					setActiveReply(null);

					// Remove the specific message from creatorMessages
					setCreatorMessages((prevMessages) =>
						prevMessages.filter(
							(message) => message.conversationId !== conversationId
						)
					);
				} catch (error) {
					console.error("Error sending reply:", error);
				}
			};

			// Function to fetch contest leaderboard data
			const fetchLeaderboardData = async (contestId: string) => {
				if (!contestId) return;

				try {
					setLoadingLeaderboard(true);

					// Fetch applications for the contest
					const response = await fetch(
						`/api/contest-applications?contestId=${contestId}`
					);

					if (!response.ok) {
						throw new Error("Failed to fetch applications");
					}

					const data = await response.json();

					// Filter only approved applications
					const approvedApplications = data.filter(
						(app: { status: string }) => app.status.toLowerCase() === "approved"
					);

					// If there are no approved applications, set empty array and stop loading
					if (approvedApplications.length === 0) {
						setLeaderboardData([]);
						setLoadingLeaderboard(false);
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

											// Combine application data with creator data
											return {
												...app,
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
														creator.creatorProfileData?.tiktokMetrics
															?.comments ||
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
													"/icons/colina.svg",
												username:
													creator.creatorProfileData?.tiktokUsername ||
													creator.username ||
													"Unknown",
												fullName:
													`${creator.firstName || ""} ${creator.lastName || ""}`.trim() ||
													creator.creatorProfileData?.tiktokDisplayName ||
													"Unknown Creator",
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

					// Filter out null values and sort by views
					const validCreators = creatorDataArray
						.filter((creator) => creator !== null)
						.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));

					// Assign positions based on sorting
					const creatorsWithPositions = validCreators.map((creator, index) => ({
						...creator,
						position: index + 1,
					}));

					setLeaderboardData(creatorsWithPositions);
				} catch (err) {
					console.error("Error fetching leaderboard data:", err);
				} finally {
					setLoadingLeaderboard(false);
				}
			};

			// Fetch the latest contest and its data
			const fetchLatestContest = async () => {
				try {
					// Use the contest API to fetch the user's contests, ordered by creation date
					const response = await fetch(
						`/api/contests?creatorId=${userId}&orderBy=createdAt&orderDirection=desc&limit=1`
					);

					if (!response.ok) {
						throw new Error(
							`Failed to fetch latest contest: ${response.status}`
						);
					}

					const result = await response.json();

					// Check if any contests were returned
					if (result.success && result.data && result.data.length > 0) {
						const latestContest = result.data[0];
						setLatestContest(latestContest);

						// Fetch leaderboard data for the latest contest
						if (latestContest.contestId) {
							fetchLeaderboardData(latestContest.contestId);
						}
					} else {
						console.log("No contests found for this user");
						setLatestContest(null);
					}
				} catch (error) {
					console.error("Error fetching latest contest:", error);
				}
			};

			useEffect(() => {
				fetchCreatorMessages();

				// Listen for new messages via socket if available
				if (socket) {
					const handleNewMessage = (message: CreatorMessage) => {
						// Only refetch if the message is from someone else (a creator)
						if (message.sender !== userId) {
							fetchCreatorMessages();
						}
					};

					const handleUnreadCountsUpdate = () => {
						// Refetch messages when unread counts change
						fetchCreatorMessages();
					};

					socket.on("new-message", handleNewMessage);
					socket.on("unread-counts-update", handleUnreadCountsUpdate);

					return () => {
						socket.off("new-message", handleNewMessage);
						socket.off("unread-counts-update", handleUnreadCountsUpdate);
					};
				}
			}, [userId, socket]);

			useEffect(() => {
				const fetchUserData = async () => {
					try {
						setLoading(true);
						const response = await fetch(`/api/user-stats?userId=${userId}`);
						const data = await response.json();

						if (data.success) {
							setUserData(data.data);
						} else {
							console.error("Error fetching user data:", data.error);
						}
					} catch (error) {
						console.error("Failed to fetch user data:", error);
					} finally {
						setLoading(false);
					}
				};

				fetchUserData();
			}, [userId]);

			// Effect to fetch latest contest when userData changes
			useEffect(() => {
				if (userData?.contests && userData.contests.length > 0) {
					fetchLatestContest();
				}
			}, [userData]);

			if (loading) {
				return (
					<div className="flex flex-col justify-center items-center h-64">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
						<p>Loading dashboard..</p>
					</div>
				);
			}

			if (!userData) {
				return (
					<div className="text-center p-8">
						<EmptyContest userId={userId} />
					</div>
				);
			}

			// Format currency
			const formatCurrency = (amount: string | number | bigint) => {
				const numericAmount =
					typeof amount === "string" ? parseFloat(amount) : amount;
				return new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
					maximumFractionDigits: 0,
				}).format(numericAmount);
			};

			// Format number for metrics (views, likes, comments)
			const formatNumber = (num: number) => {
				if (num >= 1000000) {
					return (num / 1000000).toFixed(1) + "M";
				} else if (num >= 1000) {
					return (num / 1000).toFixed(1) + "k";
				}
				return num.toString();
			};

			// Fix the handleViewProfile function
			const handleViewProfile = async (creator: {
				id: string;
				name: string;
				avatar: string;
				username: string;
				bio: string;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
			}) => {
				// Create a proper Creators object with required fields
				const creatorObj: Creators = {
					id: creator.id,
					name: creator.name,
					avatar: creator.avatar,
					username: creator.username || "",
					bio: creator.bio || "",
					totalGMV: 0,
					avgGMVPerVideo: 0,
					pricing: {
						oneVideo: 0,
						threeVideos: 0,
						fiveVideos: 0,
						bulkVideos: 0,
						bulkVideosNote: "",
					},
					profilePictureUrl: "",
					contentTypes: [],
					country: "",
					tiktokUrl: "",
					status: "",
					dateOfBirth: "",
					gender: "",
					ethnicity: "",
					contentLinks: [],
				};

				// Set the initial creator object
				setSelectedCreator(creatorObj);

				try {
					// Fetch complete creator details
					const response = await fetch(
						`/api/admin/creator-approval?status=approved`
					);
					if (!response.ok) throw new Error("Failed to fetch creator details");

					const data = await response.json();
					// Find the creator with matching ID

					const fullCreatorData = data.creators.find(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(c: any) => c.userId === creator.id
					);

					if (fullCreatorData) {
						// Update the creator with full details
						setSelectedCreator((prev) => {
							if (!prev) return null;

							return {
								...prev,
								bio: fullCreatorData.bio || prev.bio,
								contentTypes: fullCreatorData.contentTypes || [],
								pricing: {
									oneVideo: fullCreatorData.pricing?.oneVideo || 0,
									threeVideos: fullCreatorData.pricing?.threeVideos || 0,
									fiveVideos: fullCreatorData.pricing?.fiveVideos || 0,
									bulkVideos: fullCreatorData.pricing?.bulkVideos || 0,
									bulkVideosNote: fullCreatorData.pricing?.bulkVideosNote || "",
								},
								socialMedia: fullCreatorData.socialMedia || {},
								country: fullCreatorData.country || "",
								gender: fullCreatorData.gender || "",
								ethnicity: fullCreatorData.ethnicity || "",
							};
						});
					}
				} catch (error) {
					console.error("Error fetching creator details:", error);
				}
			};

			// Function to close the creator profile modal
			const handleCloseProfile = () => {
				setSelectedCreator(null);
			};

			return (
				<div className="max-w-6xl px-4 py-8">
					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
						{/* Active Projects Card */}
						<div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
							<Image
								src="/icons/total-projects.svg"
								alt="Total Projects"
								width={50}
								height={50}
							/>
							<div className="mt-2">
								<h3 className="text-gray-600 text-lg">Active Projects</h3>
								<p className="text-3xl font-bold mt-2">
									{userData.summary.activeProjects}
								</p>
							</div>
						</div>

						{/* Active Contests Card */}
						{/* <div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
							<Image
								src="/icons/total-contests.svg"
								alt="Total Contests"
								width={50}
								height={50}
							/>
							<div className="mt-2">
								<h3 className="text-gray-600 text-lg">Active Contests</h3>
								<p className="text-3xl font-bold mt-2">
									{userData.summary.activeContests}
								</p>
							</div>
						</div> */}

						{/* Total Spend Card */}
						<div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
							<Image
								src="/icons/total-amount.svg"
								alt="Total Spend"
								width={50}
								height={50}
							/>
							<div className="flex justify-between items-center">
								<div className="mt-2">
									<h3 className="text-gray-600 text-lg">Total Spend</h3>
									<p className="text-3xl font-bold mt-2">
										{formatCurrency(userData.totalSpend)}
									</p>
								</div>
								<div>
									{/* <select 
                className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option>Date Range</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>This Year</option>
                <option>All Time</option>
              </select> */}
								</div>
							</div>
						</div>
					</div>

					{/* Active Projects Section */}

					<div className="mb-12">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-semibold text-gray-800">
								Active Projects
							</h2>
							<Link
								href="/brand/dashboard/projects"
								className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-md"
							>
								View All Projects
							</Link>
						</div>

						<div className="bg-white rounded-lg shadow overflow-hidden">
							{activeProjects ? (
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
												Project Name
											</th>
											<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
												Project Type
											</th>
											<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{userData.projects
											.filter(
												(project) =>
													project.status === "active" ||
													project.status === "accepting pitches"
											)
											.sort((a, b) => {
												// Sort by creation date (most recent first)
												// Assuming there's a createdAt, dateCreated, or timestamp field
												const dateA = new Date(
													a.createdAt || a.timestamp || 0
												);
												const dateB = new Date(
													b.createdAt || b.timestamp || 0
												);
												return dateB.getTime() - dateA.getTime(); // Most recent first
											})
											.slice(0, 5) // Take top 5 most recent
											.map((project, index) => (
												<tr key={project.projectId || index}>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">
															{project.projectDetails?.projectName ||
																"Untitled Project"}
														</div>
														
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-500">
															{project.projectType?.type || "UGC Content Only"}
														</div>
													</td>
													{/* <td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">
															{formatCurrency(
																project.creatorPricing?.budgetPerVideo || 0
															)}
														</div>
													</td> */}
													<td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
														<Link
															href={`/brand/dashboard/projects/${project.projectId}`}
															className="text-orange-500 hover:underline"
														>
															View Project
														</Link>
													</td>
												</tr>
											))}
									</tbody>
								</table>
							) : (
								<div className="p-6 text-center">
									<p className="text-gray-500">No active projects yet</p>
								</div>
							)}
						</div>
					</div>
					{/* Latest Contest Section */}
					{latestContest && (
						<div className="mb-12">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-2xl font-semibold text-gray-800">
									Latest Contest
								</h2>
								<Link
									href="/brand/dashboard/contests"
									className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-md"
								>
									View All Contests
								</Link>
							</div>

							{/* Contest Info */}
							<div className="bg-white rounded-lg shadow overflow-hidden mb-4">
								<div className="flex justify-between p-4">
									<h3 className="text-lg font-semibold text-gray-800">
										{latestContest.basic?.contestName || "Contest Name"}
									</h3>

									<div className="">
										<Link
											href={`/brand/dashboard/contests/${latestContest.contestId}`}
											className="text-orange-500 text-sm font-medium hover:underline"
										>
											View Contest Details
										</Link>
									</div>
								</div>

								{/* Leaderboard */}
								{loadingLeaderboard ? (
									<div className="flex flex-col justify-center items-center py-8 h-screen">
										<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
										<p className="ml-2">Loading leaderboard...</p>
									</div>
								) : leaderboardData.length > 0 ? (
									<>
										<h4 className="px-4 text-base font-medium text-gray-800 mb-1">
											Contest Leaderboard
										</h4>
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
														Position
													</th>
													<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
														Creator Username
													</th>
													<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
														Views
													</th>
													<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
														Likes
													</th>
													<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
														Comments
													</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{leaderboardData.slice(0, 5).map((participant) => (
													<tr key={participant.id}>
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
															#{participant.position}
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<div className="flex items-center">
																<div className="flex-shrink-0 h-10 w-10">
																	<Image
																		className="h-10 w-10 rounded-full"
																		src={
																			participant.profileImage ||
																			"/icons/colina.svg"
																		}
																		alt="Creator avatar"
																		width={40}
																		height={40}
																	/>
																</div>
																<div className="ml-4">
																	<div className="text-sm font-medium text-gray-900">
																		<p>@{participant.username}</p>
																	</div>
																</div>
															</div>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
															{formatNumber(participant.metrics?.views || 0)}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
															{formatNumber(participant.metrics?.likes || 0)}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
															{formatNumber(participant.metrics?.comments || 0)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</>
								) : (
									<div className="px-6 py-8 text-center text-gray-600">
										<p>No leaderboard data available yet for this contest.</p>
										<p className="text-sm mt-2">
											Creators will appear here once their applications are
											approved and their content is posted.
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Creator Messages Section */}
					<div>
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-semibold text-gray-800">
								Creator Messages
							</h2>
							{creatorMessages.length > 0 && (
								<div className="flex bg-orange-500 w-fit rounded-full px-2 py-1 text-white">
									<p className="text-sm">{creatorMessages.length} New</p>
									<Image
										src="/icons/star.svg"
										alt="New Messages"
										width={10}
										height={10}
										className="ml-1"
									/>
								</div>
							)}
						</div>
					</div>

					<div className="mb-12">
						{loadingMessages ? (
							<div className="flex flex-col justify-center items-center h-32">
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
								<p className="mt-2">Loading messages...</p>
							</div>
						) : creatorMessages.length === 0 ? (
							<div className="bg-[#FFF4EE] border border-[#6670854D] rounded-xl px-7 py-6 mb-4 text-center">
								<p className="text-gray-600">No new messages from creators</p>
							</div>
						) : (
							creatorMessages.map((message) => (
								<div
									key={message.id}
									className="bg-[#FFF4EE] border border-[#6670854D] rounded-xl px-7 py-6 mb-4"
								>
									<div className="flex justify-between mb-4">
										<div className="flex gap-2">
											<Image
												src={message.senderInfo?.avatar || "/icons/colina.svg"}
												alt="Profile Icon"
												width={40}
												height={40}
												className="rounded-full"
											/>
											<div className="flex flex-col">
												<p className="text-sm font-medium text-gray-800">
													{message.senderInfo?.name || "Unknown Creator"}
												</p>
												<button
													onClick={() =>
														message.senderInfo &&
														handleViewProfile({
															id: message.sender,
															name: message.senderInfo.name,
															avatar: message.senderInfo.avatar,
															username: message.senderInfo.username || "",
															bio: message.senderInfo.bio || "",
														})
													}
													className="text-xs text-orange-500 hover:underline"
												>
													View profile
												</button>
											</div>
										</div>
										<p className="text-xs text-gray-800">
											{timeAgo(message.timestamp)}
										</p>
									</div>

									<p className="text-sm text-gray-600">{message.content}</p>

									<div className="flex justify-end mt-4">
										{activeReply === message.id ? (
											<div className="w-full">
												<div className="flex gap-2 mt-2 w-full">
													<Input
														type="text"
														value={replyText}
														onChange={(e) => setReplyText(e.target.value)}
														className="flex-1 border border-gray-300  rounded-full px-4 py-2 text-sm"
														placeholder="Type your reply..."
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																handleSendReply(
																	message.conversationId,
																	message.id
																);
															}
														}}
													/>
													<Button
														onClick={() =>
															handleSendReply(
																message.conversationId,
																message.id
															)
														}
														className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
														disabled={!replyText.trim()}
													>
														Send
													</Button>
													<Button
														onClick={() => {
															setActiveReply(null);
															setReplyText("");
														}}
														className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full"
													>
														Cancel
													</Button>
												</div>
											</div>
										) : (
											<div className="flex gap-2">
												<Button
													onClick={() => setActiveReply(message.id)}
													className="bg-orange-500 hover:bg-orange-600 text-white py-1 px-3 rounded-full text-sm flex items-center"
												>
													Reply
													<Image
														src="/icons/messageIcon.svg"
														alt="Reply"
														width={15}
														height={15}
														className="-ml-1"
													/>
												</Button>
												<Link
													href={`/brand/dashboard/messages?conversation=${message.conversationId}`}
												>
													<Button className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-full text-sm">
														View Chat
													</Button>
												</Link>
											</div>
										)}
									</div>
								</div>
							))
						)}

						{creatorMessages.length > 0 && (
							<div className="flex justify-center mt-4">
								<Link href="/brand/dashboard/messages">
									<Button className="bg-transparent hover:bg-gray-100 text-orange-500 border border-orange-500 py-2 px-4 rounded-md">
										View All Messages
									</Button>
								</Link>
							</div>
						)}
					</div>

					<div>
						<h2 className="text-2xl font-semibold">Quick Actions</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
							<Link
								href="/brand/dashboard/projects"
								className="bg-black text-white py-2 px-6 rounded-lg flex items-center justify-center"
							>
								Create New Project +
							</Link>

							<Link
								href="/brand/dashboard/projects"
								className="bg-black text-white py-2 px-6 rounded-lg flex items-center justify-center"
							>
								Approve Project Application +
							</Link>

							<Link
								href="/brand/dashboard/transactions"
								className="bg-black text-white py-2 px-6 rounded-lg flex items-center justify-center"
							>
								Approve Payments +
							</Link>
						</div>
					</div>

					{/* Creator Profile Modal */}
					{selectedCreator && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
							<div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
								<div className="flex justify-between items-center mb-4">
									<h2 className="text-xl font-semibold">Creator Profile</h2>
									<button
										onClick={handleCloseProfile}
										className="text-gray-500 hover:text-gray-700"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>

								<div className="flex items-center mb-6">
									<Image
										src={selectedCreator.avatar || "/placeholder.jpg"}
										alt={`${selectedCreator.name}'s profile picture`}
										width={50}
										height={50}
										className="rounded-full mr-4"
									/>
									<div>
										<h3 className="text-base font-medium">
											{selectedCreator.name}
										</h3>
										{selectedCreator.username && (
											<p className="text-sm text-gray-600">
												@{selectedCreator.username}
											</p>
										)}
									</div>
								</div>

								{/* Creator profile content here */}
								<div className="space-y-4">
									<div className="border-t pt-4">
										<h4 className="font-medium text-base mb-2">Creator Bio</h4>
										<p className="text-gray-700">
											{selectedCreator.bio || "No bio available."}
										</p>
									</div>

									{selectedCreator.contentTypes &&
										selectedCreator.contentTypes.length > 0 && (
											<div>
												<h4 className="font-medium text-base mb-2">
													Content Types
												</h4>
												<div className="flex flex-wrap gap-2">
													<span className="bg-gray-100 px-3 py-1 rounded-full text-sm">
														{selectedCreator.contentTypes}
													</span>
												</div>
											</div>
										)}

									<div>
										<h4 className="font-medium text-base mb-2">Pricing</h4>
										<div className="grid grid-cols-4 gap-4">
											<div className="bg-gray-100 p-3 rounded-lg">
												<p className="text-sm text-gray-600">One Video</p>
												<p className="text-base font-bold">
													${selectedCreator.pricing?.oneVideo || 0}
												</p>
											</div>
											<div className="bg-gray-100 p-3 rounded-lg">
												<p className="text-sm text-gray-600">Three Videos</p>
												<p className="text-base font-bold">
													${selectedCreator.pricing?.threeVideos || 0}
												</p>
											</div>
											<div className="bg-gray-100 p-3 rounded-lg">
												<p className="text-sm text-gray-600">Five Videos</p>
												<p className="text-base font-bold">
													${selectedCreator.pricing?.fiveVideos || 0}
												</p>
											</div>
											<div className="bg-gray-100 p-3 rounded-lg">
												<p className="text-sm text-gray-600">Bulk Videos</p>
												<p className="text-base font-bold">
													${selectedCreator.pricing?.bulkVideos || 0}
												</p>
											</div>
										</div>
									</div>

									<div className="flex justify-end space-x-3 mt-6">
										<Button
											onClick={() => {
												// Navigate to messages with this creator
												window.location.href = `/brand/dashboard/messages?creator=${selectedCreator.id}`;
											}}
											className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md"
										>
											Message Creator
										</Button>
										<Button
											onClick={handleCloseProfile}
											className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md"
										>
											Close
										</Button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			);
		}),
	{
		ssr: false,
		loading: () => <LoadingState />,
	}
);

export default UserDashboard;
