import Image from "next/image";
import { useState, useEffect } from "react";
import EmptyContest from "@/components/brand/brandProfile/dashboard/EmptyContest";
import { OngoingProjectsSection } from "./OngoingProjectsSection";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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
		payoutId: string;
		amount: number;
		date: string;
		status: string;
	}>;
	pendingPayouts: Array<{
		payoutId: string;
		amount: number;
		date: string;
		status: string;
	}>;
}

const LoadingState = () => (
	<div className="flex flex-col justify-center items-center h-screen">
		<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
		<p>Loading dashboard..</p>
	</div>
);


// Create the actual dashboard component separately
const DashboardContent = ({ userId }: UserDashboardProps) => {
	const [loading, setLoading] = useState(true);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
	const searchParams = useSearchParams();
	const { currentUser } = useAuth();

	// Add this useEffect to detect TikTok connection success
	useEffect(() => {
		const tiktokStatus = searchParams.get("tiktok");

		if (tiktokStatus === "success") {
			toast.success("TikTok account successfully connected!");
			const currentUrl = window.location.pathname;
			window.history.replaceState({}, "", currentUrl);
		}

		if (tiktokStatus === "error") {
			toast.error("Failed to connect TikTok account!");
			const currentUrl = window.location.pathname;
			window.history.replaceState({}, "", currentUrl);
		}
	}, [searchParams]);


	// Fetch User Data and Earnings Data
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch basic user data
				const userResponse = await fetch(`/api/creator-stats?userId=${userId}`);
				const userData = await userResponse.json();

				// Fetch earnings data from our new endpoint
				const earningsResponse = await fetch(
					`/api/creator-earnings?userId=${userId}`
				);
				const earningsData = await earningsResponse.json();

				if (userData.success) {
					setUserData(userData.data);
				} else {
					console.error("Error fetching user data:", userData.error);
				}

				if (earningsData.success) {
					setEarningsData(earningsData.data);
				} else {
					console.error("Error fetching earnings data:", earningsData.error);
				}
			} catch (error) {
				console.error("Failed to fetch dashboard data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [userId, currentUser?.uid]);

	if (loading) {
		return <LoadingState />;
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
							{formatCurrency(earningsData ? earningsData.pendingPayout : 0)}
						</p>
					</div>
				</div>
			</div>

			{/* Ongoing Projects */}
			<OngoingProjectsSection userId={userId} />
		</div>
	);
};

// Properly use dynamic import for the dashboard component
import dynamic from "next/dynamic";

const CreatorDashboard = dynamic(() => Promise.resolve(DashboardContent), {
	ssr: false,
	loading: () => <LoadingState />,
});

export default CreatorDashboard;