import Image from "next/image";
import { useEffect } from "react";
import EmptyContest from "@/components/brand/brandProfile/dashboard/EmptyContest";
import { OngoingProjectsSection } from "./OngoingProjectsSection";
import ProjectInvitationsSection from "./ProjectInvitation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface UserDashboardProps {
	userId: string;
}

interface UserData {
	totalProjectsParticipated: number;
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

interface EarningsData {
	totalEarnings: number;
	pendingPayout: number;
	completedPayouts: Array<{
		id: string;
		payoutId: string;
		amount: number;
		date: string;
		status: string;
		contestId?: string;
		projectId?: string;
		position?: number;
		paymentMethod?: string;
	}>;
	pendingPayouts: Array<{
		id: string;
		payoutId?: string;
		amount: number;
		date: string;
		status: string;
		contestId?: string;
		projectId?: string;
		position?: number;
		failureReason?: string;
		estimatedProcessingDate?: string;
		note?: string;
	}>;
	stripeData?: {
		availableBalance: number;
		connectReserved: number;
		recentCharges: Array<{
			id: string;
			amount: number;
			date: string;
			status: string;
		}>;
		recentPayouts: Array<{
			id: string;
			amount: number;
			date: string;
			status: string;
		}>;
		processingPayments?: number;
		metrics?: {
			totalTransactions: number;
			averageEarningsPerTransaction: number;
			thisMonthEarnings: number;
			hasStripeAccount: boolean;
			dataIncludesStripe: boolean;
		};
	};
	lastUpdated: string;
}

// API functions
const fetchUserData = async (userId: string): Promise<UserData> => {
	const response = await fetch(`/api/creator-stats?userId=${userId}`);
	const data = await response.json();

	if (!data.success) {
		throw new Error(data.error || "Failed to fetch user data");
	}

	return data.data;
};

const fetchEarningsData = async (userId: string): Promise<EarningsData> => {
	const response = await fetch(
		`/api/creator-earnings?userId=${userId}&includeStripe=true`
	);
	const data = await response.json();

	if (!data.success) {
		throw new Error(data.error || "Failed to fetch earnings data");
	}

	return data.data;
};

const LoadingState = () => (
	<div className="flex flex-col justify-center items-center h-screen">
		<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
		<p>Loading dashboard..</p>
	</div>
);

const CreatorDashboard = ({ userId }: UserDashboardProps) => {
	const searchParams = useSearchParams();

	// Fetch user data with React Query
	const {
		data: userData,
		isLoading: userDataLoading,
		error: userDataError,
		refetch: refetchUserData,
	} = useQuery({
		queryKey: ["user-dashboard", userId],
		queryFn: () => fetchUserData(userId),
		enabled: !!userId, // Only run if userId exists
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	// Fetch earnings data with React Query
	const {
		data: earningsData,
		isLoading: earningsDataLoading,
		error: earningsDataError,
		refetch: refetchEarningsData,
	} = useQuery({
		queryKey: ["user-earnings", userId],
		queryFn: () => fetchEarningsData(userId),
		enabled: !!userId, // Only run if userId exists
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		// Add these options to improve caching behavior
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	});

	// Combined loading state - only show loading if we don't have cached data
	const loading =
		(userDataLoading || earningsDataLoading) && (!userData || !earningsData);
	const error = userDataError || earningsDataError;

	// Add this useEffect to detect TikTok connection success
	useEffect(() => {
		const tiktokStatus = searchParams.get("tiktok");

		if (tiktokStatus === "success") {
			toast.success("TikTok account successfully connected!");
			// Use Next.js router instead of direct window manipulation
			const url = new URL(window.location.href);
			url.searchParams.delete("tiktok");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams]);

	// Handle refresh functionality
	const handleRefresh = async () => {
		try {
			await Promise.all([refetchUserData(), refetchEarningsData()]);
			toast.success("Dashboard data refreshed!");
		} catch {
			toast.error("Failed to refresh data");
		}
	};

	if (loading) {
		return <LoadingState />;
	}

	if (error) {
		return (
			<div className="text-center p-8">
				<p className="text-red-500 mb-4">
					Error:{" "}
					{error instanceof Error ? error.message : "Something went wrong"}
				</p>
				<button
					onClick={handleRefresh}
					className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
				>
					Retry
				</button>
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
		<div className="max-w-6xl px-4 py-6">
			{/* Project Invitations Section  */}
			<ProjectInvitationsSection userId={userId} />
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
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
							{userData.totalProjectsParticipated}
						</p>
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
								{formatCurrency(earningsData ? earningsData.totalEarnings : 0)}
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
							{formatCurrency(
								earningsData
									? earningsData.pendingPayout +
											(earningsData.stripeData?.processingPayments
												? parseFloat(
														earningsData.stripeData.processingPayments
															.toString()
															.replace("$", "")
													)
												: 0)
									: 0
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Ongoing Projects */}
			<OngoingProjectsSection userId={userId} />
		</div>
	);
};

export default CreatorDashboard;
