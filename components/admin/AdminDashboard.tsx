"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Briefcase, DollarSign, Award, Building } from "lucide-react";

interface StatsData {
	totalUsers: number;
  totalBrands: number;
  totalCreators: number;
	pendingBrands: number;
	pendingCreators: number;
	activeProjects: number;
	pendingProjects: number;
	activeContests: number;
	pendingContests: number;
	pendingPayouts: number;
	totalRevenue: string;
	recentActivities: {
		id: string;
		type: string;
		action: string;
		name: string;
		time: string;
	}[];
}

export default function AdminDashboard() {
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState<StatsData>({
		totalUsers: 0,
    totalBrands: 0,
    totalCreators: 0,
		pendingBrands: 0,
		pendingCreators: 0,
		activeProjects: 0,
		pendingProjects: 0,
		activeContests: 0,
		pendingContests: 0,
		pendingPayouts: 0,
		totalRevenue: "0.00",
		recentActivities: [],
	});

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				setIsLoading(true);
				const response = await fetch("/api/admin/stats");

				if (!response.ok) {
					throw new Error(`Error fetching stats: ${response.statusText}`);
				}

				const data = await response.json();
				setStats(data);
				setError(null);
			} catch (err) {
				console.error("Failed to fetch dashboard stats:", err);
				setError(
					"Failed to load dashboard statistics. Please try refreshing the page."
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStats();

		// Optional: Set up a refresh interval (e.g., every 5 minutes)
		const interval = setInterval(fetchStats, 5 * 60 * 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="">
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Title section */}
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-gray-900">
						Dashboard Overview
					</h1>
					<p className="mt-1 text-sm text-gray-500">Welcome back, Admin</p>
				</div>

				{/* Error message */}
				{error && (
					<div className="mb-8 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
						<p>{error}</p>
					</div>
				)}

				{/* Loading state */}
				{isLoading ? (
					<div className="flex justify-center items-center h-64">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
					</div>
				) : (
					<>
						{/* Stats cards */}
						<div className="flex flex-wrap gap-5 mb-8">
	
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
											<Building className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Total Brands
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.totalBrands}
											</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-5 py-3">
									<Link
										href="/admin/manage-users/brands"
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
									>
										View all brands
									</Link>
								</div>
							</div>

							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
											<Users className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Total Creators
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.totalCreators}
											</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-5 py-3">
									<Link
										href="/admin/manage-users/creators"
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
									>
										View all creators
									</Link>
								</div>
							</div>
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-green-500 rounded-md p-3">
											<Award className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Active Contests
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.activeContests}
											</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-5 py-3">
									<Link
										href="/admin/campaigns/contests"
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
									>
										View active contests
									</Link>
								</div>
							</div>
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-green-500 rounded-md p-3">
											<Briefcase className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Active Projects
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.activeProjects}
											</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-5 py-3">
									<Link
										href="/admin/campaigns/projects"
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
									>
										View active projects
									</Link>
								</div>
							</div>
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
											<Briefcase className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Pending Approvals
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.pendingBrands +
													stats.pendingCreators +
													stats.pendingProjects +
													stats.pendingContests}
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-red-500 rounded-md p-3">
											<DollarSign className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Pending Payouts
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												{stats.pendingPayouts}
											</p>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-5 py-3">
									<Link
										href="/admin/contest-payouts"
										className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
									>
										Process payouts
									</Link>
								</div>
							</div>
							<div className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0 bg-green-500 rounded-md p-3">
											<DollarSign className="h-6 w-6 text-white" />
										</div>
										<div className="ml-5">
											<p className="text-sm font-medium text-gray-500 truncate">
												Total Revenue
											</p>
											<p className="mt-1 text-3xl font-semibold text-gray-900">
												${stats.totalRevenue}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Main content area */}
						<div className="">
							{/* Recent activity section */}
							<div className="bg-white overflow-hidden shadow rounded-lg lg:col-span-2">
								<div className="px-4 py-5 sm:p-6">
									<h3 className="text-lg font-medium text-gray-900">
										Recent Activity
									</h3>
									<div className="mt-6 flow-root">
										{stats.recentActivities.length > 0 ? (
											<ul className="-my-5 divide-y divide-gray-200">
												{stats.recentActivities.map((activity) => (
													<li key={activity.id} className="py-5">
														<div className="flex items-center space-x-4">
															<div className="flex-shrink-0">
																{activity.type === "User" ? (
																	<div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
																		<Users className="h-5 w-5 text-indigo-600" />
																	</div>
																) : activity.type === "Contest" ? (
																	<div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
																		<Award className="h-5 w-5 text-green-600" />
																	</div>
																) : activity.type === "Project" ? (
																	<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
																		<Briefcase className="h-5 w-5 text-blue-600" />
																	</div>
																) : (
																	<div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
																		<DollarSign className="h-5 w-5 text-red-600" />
																	</div>
																)}
															</div>
															<div className="min-w-0 flex-1">
																<p className="text-sm font-medium text-gray-900 truncate">
																	{activity.action}
																</p>
																<p className="text-sm text-gray-500 truncate">
																	{activity.name}
																</p>
															</div>
															<div className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">
																{activity.time}
															</div>
														</div>
													</li>
												))}
											</ul>
										) : (
											<p className="text-gray-500 text-center py-4">
												No recent activities found
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</>
				)}
			</main>
		</div>
	);
}
