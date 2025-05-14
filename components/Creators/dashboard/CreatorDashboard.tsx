import Image from "next/image";
import { useState, useEffect } from "react";
import EmptyContest from "@/components/brand/brandProfile/dashboard/EmptyContest";
import { OngoingProjectsSection } from "./OngoingProjectsSection";
import ContestsGrid from "./CreatorContestsGrid";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface UserDashboardProps {
	userId: string;
}

interface UserData {
	summary: {
		acceptedProjects: number;
		completedProjects: number;
		activeContestEntries: number;
		winningEntries: number;
	};
	activeProjects: number;
	activeContests: number;
	totalEarnings: number;
	pendingPayout: number;
	projects: Array<{
		projectId: string;
		projectName: string;
		status: string;
		applicationStatus?: string;
		approvedVideos: number;
		totalVideos: number;
		completionPercentage: number;
	}>;
	contests: Array<{
		contestId: string;
		contestName: string;
		status: string;
		submissionCount: number;
		hasWinningEntry: boolean;
	}>;
}

export default function CreatorDashboard({ userId }: UserDashboardProps) {
	const [loading, setLoading] = useState(true);

	const [userData, setUserData] = useState<UserData | null>(null);
	const searchParams = useSearchParams();

	// Add this useEffect to detect TikTok connection success
	useEffect(() => {
		const tiktokStatus = searchParams.get("tiktok");

		if (tiktokStatus === "success") {
			// Use the toast to show connection success
			toast.success("TikTok account successfully connected!");

			// Remove the parameters from URL to prevent multiple refreshes
			const currentUrl = window.location.pathname;
			window.history.replaceState({}, "", currentUrl);
		}

		if (tiktokStatus === "error") {
			// Use the toast to show connection success
			toast.success("Failed to connect TikTok account!");

			// Remove the parameters from URL to prevent multiple refreshes
			const currentUrl = window.location.pathname;
			window.history.replaceState({}, "", currentUrl);
		}
	}, [searchParams]);

	// Fetch User Data
	useEffect(() => {
		const fetchUserData = async () => {
			try {
				setLoading(true);
				const response = await fetch(`/api/creator-stats?userId=${userId}`);
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
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
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
						<p className="text-3xl font-bold mt-2">{userData.activeProjects}</p>
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
						<p className="text-3xl font-bold mt-2">{userData.activeContests}</p>
					</div>
				</div>

				{/* Total Earning Card */}
				<div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
					<Image
						src="/icons/total-amount.svg"
						alt="Total Spend"
						width={50}
						height={50}
					/>
					<div className="flex justify-between items-center">
						<div className="mt-2">
							<h3 className="text-gray-600 text-lg">Total Earnings</h3>
							<p className="text-3xl font-bold mt-2">
								{formatCurrency(userData.pendingPayout)}
							</p>
						</div>
					</div>
				</div>

				{/* Pending Payouts */}
				<div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
					<Image
						src="/icons/pending-pay.svg"
						alt="Pending Payouts"
						width={50}
						height={50}
					/>
					<div className="mt-2">
						<h3 className="text-gray-600 text-lg">Pending Payouts</h3>
						<p className="text-3xl font-bold mt-2">
							{formatCurrency(userData.totalEarnings)}
						</p>
					</div>
				</div>
			</div>

			{/* Contests */}
			<ContestsGrid />

			{/* Ongoing Projects */}
			<OngoingProjectsSection userId={userId} />
		</div>
	);
}
