import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import EmptyContest from "@/components/brand/brandProfile/dashboard/EmptyContest";

interface UserDashboardProps {
	userId: string;
}

export default function UserDashboard({ userId }: UserDashboardProps) {
	const [loading, setLoading] = useState(true);
	interface UserData {
		summary: {
			activeProjects: number;
			activeContests: number;
		};
		totalSpend: number;
		projects: Array<{
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
		contests: Array<{
			basic?: {
				contestName: string;
			};
		}>;
	}

	const creatorMessages = [
		{
			id: 1,
			profileIcon: "/icons/colina.svg",
			creatorName: "Travis Barker",
			time: "2 hours ago",
			message: "I just submitted my entry for the contest!",
		},

		{
			id: 2,
			profileIcon: "/icons/colina.svg",
			creatorName: "Travis Barker",
			time: "2 hours ago",
			message: "Hey, when is the payment processing?",
		},
		{
			id: 3,
			profileIcon: "/icons/colina.svg",
			creatorName: "Travis Barker",
			time: "2 hours ago",
			message: "I just submitted my entry for the contest!",
		},
	];
	const [userData, setUserData] = useState<UserData | null>(null);
	// const [dateRange, setDateRange] = useState("All Time");

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

	return (
		<div className="max-w-6xl px-4 py-8">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
				<div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
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
				</div>

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
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
									Project Name
								</th>
								<th className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
									Project Type
								</th>
								<th className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
									Total Amount
								</th>
								<th className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
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
								.slice(0, 5) // Limit to 5 projects for the dashboard
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
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{formatCurrency(
													project.creatorPricing?.budgetPerVideo || 0
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
											<a
												href={`/brand/dashboard/projects/${project.projectId}`}
												className="text-orange-500 hover:underline"
											>
												View Project
											</a>
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Latest Contest Section */}
			{userData.contests.length > 0 && (
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
						<div className="p-6">
							<h3 className="text-2xl font-bold text-gray-800">
								{userData.contests[0]?.basic?.contestName || "Contest Name"}
							</h3>
						</div>

						{/* Leaderboard */}
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
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
										Likes
									</th>
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
										Comments
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{/* Sample leaderboard data - in a real app, you would fetch this data */}
								{[1, 2, 3, 4, 5].map((position) => (
									<tr key={position}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											#{position}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<div className="flex-shrink-0 h-10 w-10">
													<Image
														className="h-10 w-10 rounded-full"
														src="/icons/colina.svg"
														alt="Creator avatar"
														width={40}
														height={40}
													/>
												</div>
												<div className="ml-4">
													<div className="text-sm font-medium text-gray-900">
														<a href="#" className="underline">
															Colina42rf
														</a>
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											12.5k
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											2.2k
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											500
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<div>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-gray-800">
						Creator Messages
					</h2>
					<div className="flex bg-orange-500 w-fit rounded-full px-2 py-1 text-white">
						<p className="text-sm">4 New</p>
						<Image
							src="/icons/star.svg"
							alt="New Messages"
							width={10}
							height={10}
							className="ml-1"
						/>
					</div>
				</div>
			</div>

			<div className="mb-12">
				{creatorMessages.map((message) => (
					<div
						key={message.id}
						className="bg-[#FFF4EE] border border-[#6670854D] rounded-xl px-7 py-6 mb-4"
					>
						<div className="flex justify-between mb-4">
							<div className="flex gap-2">
								<Image
									src={message.profileIcon}
									alt="Profile Icon"
									width={40}
									height={40}
									className="rounded-full"
								/>
								<div className="flex flex-col">
									<p className="text-sm font-medium text-gray-800">
										{message.creatorName}
									</p>
									<p className="text-xs text-orange-500 hover:underline">
										View profile
									</p>
								</div>
							</div>
							<p className="text-xs text-gray-800">{message.time}</p>
						</div>

						<p className="text-sm text-gray-600">{message.message}</p>

						<div className="flex justify-end mt-4">
							<Button className="bg-orange-500 hover:bg-orange-600 text-white py-1 px-3 rounded-full text-sm">
								Reply
								<Image
									src="/icons/messageIcon.svg"
									alt="Reply"
									width={15}
									height={15}
								/>
							</Button>
						</div>
					</div>
				))}
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
						href="/brand/dashboard/projects"
						className="bg-black text-white py-2 px-6 rounded-lg flex items-center justify-center"
					>
						Approve Payments +
					</Link>
				</div>
			</div>
		</div>
	);
}
