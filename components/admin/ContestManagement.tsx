"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EyeIcon } from "lucide-react";
import { BrandProfile } from "@/types/user";
import {
	BasicFormData,
	ContestType,
	PrizeTimelineFormData,
	RequirementsFormData,
} from "@/types/contestFormData";
import { Incentive } from "../brand/brandProfile/dashboard/newContest/ContestFormContext";
import { ContestStatus } from "@/types/projects";


export interface Contest {
	id: string;
	userId?: string;
	contestId: string;
	basic: BasicFormData;
	requirements: RequirementsFormData;
	prizeTimeline: PrizeTimelineFormData;
	incentives: Incentive[];
	contestType: ContestType;
	status: ContestStatus;
	createdAt: string;
	updatedAt: string;
	participants?: number;
}

interface PaginationInfo {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

interface TabItem {
	id: string;
	label: string;
	status?: ContestStatus | "all" | "pending" | "active" | "rejected" | "completed";
	emptyMessage: string;
}

const ContestManagement: React.FC = () => {
	const router = useRouter();
	const [contests, setContests] = useState<Contest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [brandProfiles, setBrandProfiles] = useState<{
		[key: string]: BrandProfile;
	}>({});
	const [loadingBrands, setLoadingBrands] = useState<{
		[key: string]: boolean;
	}>({});
	const [statusFilter, setStatusFilter] = useState<ContestStatus | "all" | "pending" | "active" | "rejected" | "completed">(
		"all"
	);
	const [pagination, setPagination] = useState<PaginationInfo>({
		total: 0,
		page: 1,
		limit: 10,
		pages: 0,
	});
	const [actionContest, setActionContest] = useState<Contest | null>(null);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [activeTab, setActiveTab] = useState<string>("all-contests");
	const [brandEmail, setBrandEmail] = useState<string>("");

	// Define available tabs with their corresponding status and empty messages
	const tabs: TabItem[] = [
		{
			id: "all-contests",
			label: "All Contests",
			status: "all",
			emptyMessage:
				"No contests have been created yet. As brands create contests, they'll appear here.",
		},
		{
			id: "active-contests",
			label: "Active Contests",
			status: "active",
			emptyMessage:
				"No active contests yet. When brands contests are active, they'll appear here for approval.",
		},
		{
			id: "pending-approval",
			label: "Pending Approval",
			status: "pending",
			emptyMessage:
				"No contests are pending approval. New contests will appear here for review.",
		},
		{
			id: "rejected-contests",
			label: "Rejected Contests",
			status: "rejected",
			emptyMessage:
				"No contests have been rejected. Contests that don't meet certain criteria will appear here.",
		},
		{
			id: "completed-contests",
			label: "Completed Contests",
			status: "completed",
			emptyMessage:
				"No contests have been completed yet. Completed contests will be listed here.",
		},
	];

	useEffect(() => {
		// Clear any cached contest when loading the contest list
		// to ensure we always get fresh data from the API
		localStorage.removeItem("viewingContest");

		fetchContests();
	}, [statusFilter, pagination.page, pagination.limit]);

	// Also ensure your viewContestDetails function is setting the right data
	const viewContestDetails = (contest: Contest) => {
		// Store the complete contest object with ID
		localStorage.setItem("viewingContest", JSON.stringify(contest));
		router.push(`/admin/manage-contests/${contest.id}`);
	};

	// Fetch contests
	const fetchContests = async () => {
		try {
			setLoading(true);
			const statusParam =
				statusFilter !== "all" ? `&status=${statusFilter}` : "";
			const url = `/api/admin/contest-approval?page=${pagination.page}&limit=${pagination.limit}${statusParam}`;

			const response = await fetch(url);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("API error response:", errorText);
				throw new Error(
					`Failed to fetch contests: ${response.status} ${errorText}`
				);
			}

			const data = await response.json();
			setContests(data.contests);
			setPagination(data.pagination);

			// Request brand profile for each contest
			data.contests.forEach((contest: Contest) => {
				if (contest.userId) {
					fetchBrandProfile(contest.userId);
				}
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error fetching contests:", err);
		} finally {
			setLoading(false);
		}
	};

	// In your fetchBrandProfile function:
	const fetchBrandProfile = async (userId: string) => {
		// Skip if we already have this brand profile or it's already loading
		if (brandProfiles[userId] || loadingBrands[userId]) {
			return;
		}

		try {
			setLoadingBrands((prev) => ({ ...prev, [userId]: true }));

			const response = await fetch(
				`/api/admin/brand-approval?userId=${userId}`
			);

			if (response.ok) {
				const data = await response.json();
				setBrandProfiles((prev) => ({
					...prev,
					[userId]: data,
				}));
			} else {
			}
		} catch (error) {
			console.error(
				`Error fetching brand profile for userId ${userId}:`,
				error
			);
			// Set placeholder data on error
		} finally {
			setLoadingBrands((prev) => {
				const updated = { ...prev };
				delete updated[userId];
				return updated;
			});
		}
	};

	// Add this useEffect to track which brand profiles we need to fetch
	useEffect(() => {
		// Get unique brandUserIds from contests
		const uniqueBrandIds = contests
			.filter((contest) => contest.userId)
			.map((contest) => contest.userId as string);

		// Filter to only fetch those we don't already have
		const missingBrandIds = uniqueBrandIds.filter(
			(id) => !brandProfiles[id] && !loadingBrands[id]
		);

		// Fetch all missing brand profiles in parallel
		missingBrandIds.forEach((userId) => {
			fetchBrandProfile(userId);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contests, brandProfiles, loadingBrands]);

	// When a tab is changed, update the status filter
	useEffect(() => {
		const selectedTab = tabs.find((tab) => tab.id === activeTab);
		if (selectedTab && selectedTab.status) {
			setStatusFilter(selectedTab.status);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	// Call fetchContests when dependencies change
	useEffect(() => {
		fetchContests();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter, pagination.page, pagination.limit]);

	// Handle contest action (approve, reject, request info)
	const handleContestAction = async () => {
		if (!actionContest || !actionType) return;

		try {
			// Fetch the brand email if not already set
			let email = brandEmail;
			if (!email) {
				const profile = actionContest.userId
					? brandProfiles[actionContest.userId]
					: undefined;
				if (profile && profile.email) {
					email = profile.email;
				} else {
					const fetchedProfile = actionContest.userId
						? await fetchBrandProfile(actionContest.userId)
						: null;
					if (!fetchedProfile) {
						throw new Error("Could not find brand email for this contest");
					}
				}

				if (!email) {
					throw new Error("Could not find brand email for this contest");
				}
				setBrandEmail(email);
			}

			const response = await fetch("/api/admin/contest-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					brandEmail: email,
					contestId: actionContest.id,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Refresh contests list
			fetchContests();

			// Reset action state
			setActionContest(null);
			setActionType("");
			setActionMessage("");
			setBrandEmail("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing contest action:", err);
		}
	};

	// Filter contests by search term and active tab status
	const filteredContests = contests.filter((contest) => {
		// For the "all-contests" tab, use the explicit status filter selection
		// For other tabs, use the tab's predefined status
		const effectiveStatus =
			activeTab === "all-contests"
				? statusFilter
				: tabs.find((tab) => tab.id === activeTab)?.status || "all";

		// Apply status filter
		const statusMatch =
			effectiveStatus === "all" || contest.status === effectiveStatus;

		// Apply search filter
		const searchMatch =
			contest.basic.contestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			contest.id.toLowerCase().includes(searchTerm.toLowerCase());

		return statusMatch && searchMatch;
	});

	// Get the empty message for the current tab
	const getCurrentTabEmptyMessage = () => {
		const currentTab = tabs.find((tab) => tab.id === activeTab);
		return (
			currentTab?.emptyMessage || "No contests found matching your criteria."
		);
	};

	// Render action modal
	const renderActionModal = () => {
		if (!actionContest) return null;

		let title = "";
		let description = "";
		let placeholder = "";
		let buttonText = "";
		let buttonColor = "";
		let needsMessage = false;

		switch (actionType) {
			case "approve":
				title = "Approve Contest";
				description =
					"Once approved, the contest will be visible to creators and they can participate";
				buttonText = "Approve Contest";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "reject":
				title = "Reject Contest";
				description =
					"Please provide a reason for rejection. This feedback will be shared with the Brand.";
				placeholder = "Type Reason for Rejection";
				buttonText = "Reject Contest";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			case "request_info":
				title = "Request More Information";
				description =
					"Type in the Information you need from the Brand to approve their contest";
				placeholder = "Type Requests";
				buttonText = "Send Request";
				buttonColor = "bg-orange-500 hover:bg-orange-600";
				needsMessage = true;
				break;
			case "suspend":
				title = "Suspend Contest";
				description = "Please provide a reason for suspension.";
				placeholder = "Type Reason for Suspension";
				buttonText = "Suspend Contest";
				buttonColor = "bg-yellow-600 hover:bg-yellow-700";
				needsMessage = true;
				break;
			default:
				return null;
		}

		return (
			<div>
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full">
						<h2 className="text-xl font-semibold mb-4">{title}</h2>
						<p className="mb-4 text-gray-600">{description}</p>

						{needsMessage && (
							<textarea
								className="w-full border border-gray-300 rounded p-2 mb-4"
								rows={4}
								value={actionMessage}
								onChange={(e) => setActionMessage(e.target.value)}
								placeholder={placeholder}
							/>
						)}

						<div className="flex justify-end space-x-2">
							<button
								className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
								onClick={() => {
									setActionContest(null);
									setActionType("");
									setActionMessage("");
									setBrandEmail("");
								}}
							>
								Cancel
							</button>
							<button
								className={`px-4 py-2 text-white rounded ${buttonColor} flex items-center`}
								onClick={handleContestAction}
								disabled={needsMessage && !actionMessage.trim()}
							>
								{buttonText}
								{actionType === "request_info" && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5 ml-2"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
									</svg>
								)}
								{(actionType === "approve" || actionType === "reject") && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5 ml-2"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Handle pagination
	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > pagination.pages) return;
		setPagination({ ...pagination, page: newPage });
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: ContestStatus }) => {
		const statusConfig = {
			pending: {
				color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
				text: "• Pending",
			},
			active: {
				color: "bg-[#ABEFC6] border border-green-100 text-[#067647]",
				text: "✓ Active",
			},
			rejected: {
				color: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]",
				text: "• Rejected",
			},
			completed: {
				color: "bg-[#E0F2FE] border border-[#60A5FA] text-[#1D4ED8]",
				text: "✓ Completed",
			},
			request_edit: {
				color: "bg-[#FFF3CD] border border-[#FFBF47] text-[#856404]",
				text: "• Request Edit",
			},
		};

		const config = statusConfig[status] || statusConfig.pending;

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
			>
				{config.text}
			</span>
		);
	};

	// Render brand info component
	const BrandInfo = ({ userId }: { userId: string }) => {
		const brandProfile = brandProfiles[userId];
		const isLoading = loadingBrands[userId];

		if (isLoading) {
			return (
				<div className="flex items-center">
					<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
						<span className="text-gray-500 font-medium">...</span>
					</div>

					<div className="text-sm text-gray-500">Loading...</div>
				</div>
			);
		}

		if (!brandProfile) {
			return (
				<div className="flex items-center">
					<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
						<span className="text-gray-500 font-medium">?</span>
					</div>
					<div className="text-sm text-gray-500">Unknown Brand</div>
				</div>
			);
		}

		return (
			<div className="flex items-center">
				{brandProfile.logoUrl ? (
					<Image
						className="h-8 w-8 rounded-full mr-2"
						src={brandProfile.logoUrl}
						alt={`${brandProfile.brandName || "Brand"} logo`}
						width={32}
						height={32}
					/>
				) : (
					<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
						<span className="text-[#101828] font-medium">
							{(brandProfile.brandName || "B").charAt(0).toUpperCase()}
						</span>
					</div>
				)}
				<div className="text-[#101828]">
					{brandProfile.brandName || brandProfile.email || "Unknown Brand"}
				</div>
			</div>
		);
	};

	// Render contest table content based on current tab
	const renderContestTable = () => {
		if (loading) {
			return (
				<div className="flex justify-center items-center py-10 h-screen">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				</div>
			);
		}

		if (filteredContests.length === 0) {
			return (
				<div className="text-center py-16 bg-gray-50 rounded-lg">
					<p className="text-gray-500">{getCurrentTabEmptyMessage()}</p>
				</div>
			);
		}

		return (
			<div className="overflow-x-auto shadow-md rounded-lg">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Brand
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Contest Name
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Type
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Created On
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Status
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredContests.map((contest) => (
							<tr key={contest.id}>
								<td className="px-6 py-4 whitespace-nowrap">
									<BrandInfo userId={contest.userId || ""} />
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-[#101828]">{contest.basic.contestName}</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-[#101828]">
									{contest.contestType}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-[#101828]">
									{new Date(contest.createdAt).toLocaleDateString()}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<StatusBadge status={contest.status} />
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div className="flex flex-col space-y-2">
										<button
											className="text-orange-500 hover:underline flex items-center gap-1"
											onClick={() => viewContestDetails(contest)}
										>
											<span>View Contest</span>
											<EyeIcon className="w-4 h-4 text-orange-500" />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<div className="flex flex-col md:flex-row bg-white p-4 w-full max-w-7xl">
			{/* Left sidebar for tabs */}
			<div className="w-full md:w-64 p-6">
				<div className="flex flex-col space-y-2">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`text-left p-3 rounded-md ${
								activeTab === tab.id
									? "text-[#FD5C02] bg-[#FFF4EE] border-b-2 border-[#FC52E4] rounded-none"
									: "text-[#667085] hover:bg-gray-100"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>
			<div className="flex-1 p-4 flex flex-col border border-[#FFD9C3] rounded-lg">
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{error}
						<button
							className="float-right font-bold"
							onClick={() => setError(null)}
						>
							&times;
						</button>
					</div>
				)}

				<div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
					<div className="w-full md:w-1/3">
						<Input
							type="text"
							placeholder="Search by contest name or ID..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{activeTab === "all-contests" && (
						<div>
							<Select
								value={statusFilter}
								onValueChange={(value) =>
									setStatusFilter(value as ContestStatus | "all")
								}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Select Status" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="request_edit">Info Requested</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				{renderContestTable()}

				{/* Pagination */}
				{!loading && pagination.pages > 1 && filteredContests.length > 0 && (
					<div className="flex justify-center mt-6">
						<nav className="flex items-center">
							<button
								onClick={() => handlePageChange(pagination.page - 1)}
								disabled={pagination.page === 1}
								className={`px-3 py-1 rounded-l border ${
									pagination.page === 1
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-orange-600 hover:bg-blue-50"
								}`}
							>
								Previous
							</button>

							<div className="flex">
								{Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
									(page) => (
										<button
											key={page}
											onClick={() => handlePageChange(page)}
											className={`px-3 py-1 border-t border-b ${
												pagination.page === page
													? "bg-orange-600 text-white"
													: "bg-white text-orange-600 hover:bg-orange-50"
											}`}
										>
											{page}
										</button>
									)
								)}
							</div>

							<button
								onClick={() => handlePageChange(pagination.page + 1)}
								disabled={pagination.page === pagination.pages}
								className={`px-3 py-1 rounded-r border ${
									pagination.page === pagination.pages
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-orange-600 hover:bg-orange-50"
								}`}
							>
								Next
							</button>
						</nav>
					</div>
				)}

				{/* Action Modal */}
				{renderActionModal()}
			</div>
		</div>
	);
};

export default ContestManagement;
