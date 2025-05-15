"use client";

import React, { useState, useEffect } from "react";
import { CreatorStatus } from "@/types/user";
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
import Link from "next/link";
import { Creator } from "@/types/creators";

// For the complete response structure
interface CreatorsResponse {
	creators: Creator[];
	pagination: PaginationInfo;
}

// Define PaginationInfo interface that was missing
interface PaginationInfo {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

interface TabItem {
	id: string;
	label: string;
	status?:
		| CreatorStatus
		| "all"
		| "pending"
		| "approved"
		| "rejected"
		| "suspended"
		| "info_requested";
	emptyMessage: string;
}

const CreatorManagement: React.FC = () => {
	const router = useRouter();
	const [creators, setCreators] = useState<Creator[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<
		| CreatorStatus
		| "all"
		| "pending"
		| "approved"
		| "rejected"
		| "suspended"
		| "info_requested"
	>("all");
	const [pagination, setPagination] = useState<PaginationInfo>({
		total: 0,
		page: 1,
		limit: 10,
		pages: 0,
	});
	const [actionCreator, setActionCreator] = useState<Creator | null>(null);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [activeTab, setActiveTab] = useState<string>("all-creators");

	// Define available tabs with their corresponding status and empty messages
	const tabs: TabItem[] = [
		{
			id: "all-creators",
			label: "All Creators",
			status: "all",
			emptyMessage:
				"No creators have been registered yet. As creators register, they'll appear here.",
		},
		{
			id: "pending-verification",
			label: "Pending Verification",
			status: "pending",
			emptyMessage:
				"No creators are currently awaiting verification. When creators register, they'll appear here for approval.",
		},
		{
			id: "verified-creators",
			label: "Verified Creators",
			status: "approved",
			emptyMessage:
				"No creators have been verified yet. Once you approve creators, they'll appear in this section.",
		},
		{
			id: "rejected-creators",
			label: "Rejected Creators",
			status: "rejected",
			emptyMessage:
				"No creators have been rejected. Creators that don't meet verification criteria will appear here.",
		},
		{
			id: "suspended-creators",
			label: "Suspended Creators",
			status: "suspended",
			emptyMessage:
				"No creators have been suspended. Suspended creators will be listed here.",
		},
		{
			id: "info-requested-creators",
			label: "Info Requested",
			status: "info_requested",
			emptyMessage:
				"No creators currently have info requested. Creators requiring additional information will appear here.",
		},
	];

	// Fetch creators
	const fetchCreators = async () => {
		try {
			setLoading(true);
			let url = `/api/admin/creator-approval?page=${pagination.page}&limit=${pagination.limit}`;

			// Only add status filter if not 'all'
			if (statusFilter !== "all") {
				url += `&status=${statusFilter}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Failed to fetch creators");
			}

			const data: CreatorsResponse = await response.json();

			// Use data.creators from the updated CreatorsResponse interface
			setCreators(data.creators);
			setPagination(data.pagination);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error fetching creators:", err);
		} finally {
			setLoading(false);
		}
	};

	const getProfilePictureUrl = (creator: Creator) => {
		if (!creator) return null;

		// First try the Tiktok profile picture if available
		if (creator.creatorProfileData?.tiktokAvatarUrl) {
			return creator.creatorProfileData?.tiktokAvatarUrl;
		}

		// Then check for logoUrl
		if (creator.logoUrl) {
			return creator.logoUrl;
		}

		return null;
	};

	const getTikTokProfileUrl = (creator: Creator) => {
		// First check for direct TikTok username - common approach is to construct URL
		if (creator.creatorProfileData?.tiktokUsername) {
			return `https://www.tiktok.com/@${creator.creatorProfileData?.tiktokUsername}`;
		}

		// Then check for TikTok URL in socialMedia object
		if (creator.socialMedia?.tiktok) {
			return creator.socialMedia.tiktok;
		}

		// // Check if there's a TikTok URL in profileData
		// if (creator.profileData?.tiktokUrl) {
		// 	return creator.profileData.tiktokUrl;
		// }

		return null;
	};

	// Fetch creators when status filter, page, or limit changes
	useEffect(() => {
		fetchCreators();
	}, [statusFilter, pagination.page, pagination.limit]);

	// When a tab is changed, update the status filter and reset page
	useEffect(() => {
		const selectedTab = tabs.find((tab) => tab.id === activeTab);
		if (selectedTab && selectedTab.status) {
			setStatusFilter(selectedTab.status);
			setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when changing tabs
		}
	}, [activeTab]);

	// Handle creator action (approve, reject, request info)
	const handleCreatorAction = async () => {
		if (!actionCreator || !actionType) return;

		try {
			// Use email for creatorEmail parameter according to API expectation
			const creatorEmail = actionCreator.email;

			const response = await fetch("/api/admin/creator-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					creatorEmail,
					userId: actionCreator.userId,
					verificationId: actionCreator.verificationId,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to perform action");
			}

			// Refresh creators list
			fetchCreators();

			// Reset action state
			setActionCreator(null);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing creator action:", err);
		}
	};

	// Filter creators by search term
	const filteredCreators = creators?.filter((creator) => {
		if (!creator) return false;

		// Apply search filter
		return (
			creator.creator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	// Get the empty message for the current tab or status filter
	const getCurrentTabEmptyMessage = () => {
		// When on the all-creators tab with a status filter other than "all"
		if (activeTab === "all-creators" && statusFilter !== "all") {
			// Find the tab that corresponds to the current status filter
			const statusTab = tabs.find((tab) => tab.status === statusFilter);
			if (statusTab) {
				return statusTab.emptyMessage;
			}
		}

		// Otherwise use the message for the active tab
		const currentTab = tabs.find((tab) => tab.id === activeTab);
		return (
			currentTab?.emptyMessage || "No creators found matching your criteria."
		);
	};

	// Render action modal
	const renderActionModal = () => {
		if (!actionCreator) return null;

		let title = "";
		let description = "";
		let placeholder = "";
		let buttonText = "";
		let buttonColor = "";
		let needsMessage = false;

		switch (actionType) {
			case "approve":
				title = "Approve Creator";
				description =
					"Once approved, the creator will receive a notification and can start creating projects and contests";
				buttonText = "Yes, Approve Creator";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "reject":
				title = "Reject Creator";
				description =
					"Please provide a reason for rejection. This feedback will be shared with the Creator.";
				placeholder = "Type Reason for Rejection";
				buttonText = "Reject Creator";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			case "request_info":
				title = "Request More Information";
				description =
					"Type in the Information you need from the Creator to go ahead with Verification";
				placeholder = "Type Requests";
				buttonText = "Send";
				buttonColor = "bg-orange-500 hover:bg-orange-600";
				needsMessage = true;
				break;
			case "suspend":
				title = "Suspend Creator";
				description = "Please provide a reason for suspension.";
				placeholder = "Type Reason for Suspension";
				buttonText = "Suspend Creator";
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
									setActionCreator(null);
									setActionType("");
									setActionMessage("");
								}}
							>
								Cancel
							</button>
							<button
								className={`px-4 py-2 text-white rounded ${buttonColor} flex items-center`}
								onClick={handleCreatorAction}
								disabled={needsMessage && !actionMessage.trim()}
							>
								{buttonText}
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

	// Navigate to creator details page
	const viewCreatorDetails = (creator: Creator) => {
		router.push(`/admin/manage-users/creators/${creator.userId}`);
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: string }) => {
		const statusConfig: Record<string, { color: string; text: string }> = {
			pending: {
				color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
				text: "• Pending",
			},
			approved: {
				color: "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647]",
				text: "✓ Verified",
			},
			rejected: {
				color: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]",
				text: "• Rejected",
			},
			suspended: {
				color: "bg-[#FFE5FB] border border-[#FC52E4] text-[#FC52E4]",
				text: "• Suspended",
			},
			info_requested: {
				color: "bg-blue-100 border border-blue-400 text-blue-800",
				text: "• Info Requested",
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

	// Render creator table content based on current tab
	const renderCreatorTable = () => {
		if (loading) {
			return (
				<div className="flex justify-center items-center py-10">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				</div>
			);
		}

		if (!filteredCreators || filteredCreators.length === 0) {
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
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
								Date Joined
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
								Creator
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
								TikTok Profile
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 ">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredCreators.map((creator) => (
							<tr key={creator.id || creator.verificationId}>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{creator.createdAt
										? new Date(creator.createdAt).toLocaleDateString()
										: "N/A"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center">
										{getProfilePictureUrl(creator) ? (
											<Image
												className="h-10 w-10 object-cover rounded-full mr-3"
												src={getProfilePictureUrl(creator) || ""}
												alt={`${creator.creator} logo`}
												width={40}
												height={40}
											/>
										) : (
											<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
												<span className="text-gray-500 font-medium">
													{creator.creatorProfileData?.tiktokUsername ||
														(creator.creator &&
															creator.creator.charAt(0).toUpperCase())}
												</span>
											</div>
										)}
										<div>
											<div className="font-medium text-gray-900">
												{creator.creatorProfileData?.tiktokDisplayName ||
													creator.creator}
											</div>
											<div className="text-sm text-gray-500">
												{creator.email}
											</div>
										</div>
									</div>
								</td>

								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{getTikTokProfileUrl(creator) ? (
										<Link
											href={getTikTokProfileUrl(creator) || ""}
											className="text-blue-500 hover:underline"
											target="_blank"
											rel="noopener noreferrer"
										>
											<p className="text-orange-500 hover:underline">
												View TikTok
											</p>
										</Link>
									) : (
										<span className="text-gray-400">No TikTok</span>
									)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<StatusBadge status={creator.status} />
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div className="flex flex-col space-y-2">
										<button
											className="text-orange-500 hover:underline flex items-center gap-1"
											onClick={() => viewCreatorDetails(creator)}
										>
											<span>View Creator</span>
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
		<div className="flex flex-col md:flex-row bg-white p-4">
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

				<div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0 ">
					<div className="w-full md:w-1/3">
						<Input
							type="text"
							placeholder="Search by name or email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{activeTab === "all-creators" && (
						<div>
							<Select
								value={statusFilter}
								onValueChange={(value) =>
									setStatusFilter(
										value as
											| CreatorStatus
											| "all"
											| "pending"
											| "approved"
											| "rejected"
											| "suspended"
											| "info_requested"
									)
								}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Select Status" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="approved">Verified</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
									<SelectItem value="suspended">Suspended</SelectItem>
									<SelectItem value="info_requested">Info Requested</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				{renderCreatorTable()}

				{/* Pagination */}
				{!loading && pagination.pages > 1 && (
					<div className="flex justify-center mt-6">
						<nav className="flex items-center">
							<button
								onClick={() => handlePageChange(pagination.page - 1)}
								disabled={pagination.page === 1}
								className={`px-3 py-1 rounded-l border ${
									pagination.page === 1
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: "bg-white text-orange-600 hover:bg-orange-50"
								}`}
							>
								Previous
							</button>

							<div className="flex">
								{Array.from(
									{ length: Math.min(5, pagination.pages) },
									(_, i) => {
										// Calculate which page numbers to show
										let pageNum;
										if (pagination.pages <= 5) {
											// Show all pages if 5 or fewer
											pageNum = i + 1;
										} else {
											// Show a window of pages around current page
											const start = Math.max(1, pagination.page - 2);
											const end = Math.min(pagination.pages, start + 4);
											pageNum = start + i;
											if (pageNum > end) return null;
										}

										return (
											<button
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`px-3 py-1 border-t border-b ${
													pagination.page === pageNum
														? "bg-orange-600 text-white"
														: "bg-white text-orange-600 hover:bg-orange-50"
												}`}
											>
												{pageNum}
											</button>
										);
									}
								).filter(Boolean)}
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

export default CreatorManagement;
