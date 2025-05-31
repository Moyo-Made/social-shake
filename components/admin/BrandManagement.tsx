"use client";

import React, { useState, useEffect } from "react";
import { BrandStatus } from "@/types/user";
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
import { Brand } from "@/types/brand";



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
		| BrandStatus
		| "all"
		| "pending"
		| "approved"
		| "rejected"
		| "suspended";
	emptyMessage: string;
}

const BrandManagement: React.FC = () => {
	const router = useRouter();
	const [brands, setBrands] = useState<Brand[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<
		BrandStatus | "all" | "pending" | "approved" | "rejected" | "suspended"
	>("all");
	const [pagination, setPagination] = useState<PaginationInfo>({
		total: 0,
		page: 1,
		limit: 10,
		pages: 0,
	});
	const [actionBrand, setActionBrand] = useState<Brand | null>(null);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [activeTab, setActiveTab] = useState<string>("all-brands");

	// Define available tabs with their corresponding status and empty messages
	const tabs: TabItem[] = [
		{
			id: "all-brands",
			label: "All Brands",
			status: "all",
			emptyMessage:
				"No brands have been registered yet. As brands register, they'll appear here.",
		},
		{
			id: "pending-verifcation",
			label: "Pending Verification",
			status: "pending",
			emptyMessage:
				"No brands are currently awaiting verification. When brands register, they'll appear here for approval.",
		},
		{
			id: "verified-brands",
			label: "Verified Brands",
			status: "approved",
			emptyMessage:
				"No brands have been verified yet. Once you approve brands, they'll appear in this section.",
		},
		{
			id: "rejected-brands",
			label: "Rejected Brands",
			status: "rejected",
			emptyMessage:
				"No brands have been rejected. Brands that don't meet verification criteria will appear here.",
		},
		{
			id: "suspended-brands",
			label: "Suspended Brands",
			status: "suspended",
			emptyMessage:
				"No brands have been suspended. Suspended brands will be listed here.",
		},
	];

	// Fetch brands
	const fetchBrands = async () => {
		try {
			setLoading(true);
			const url = `/api/admin/brand-approval?page=${pagination.page}&limit=${pagination.limit}`;

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Failed to fetch brands");
			}

			const data = await response.json();
			setBrands(data.brands);
			setPagination(data.pagination);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error fetching brands:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBrands();
	}, [statusFilter, pagination.page, pagination.limit]);

	// When a tab is changed, update the status filter
	useEffect(() => {
		const selectedTab = tabs.find((tab) => tab.id === activeTab);
		if (selectedTab && selectedTab.status) {
			setStatusFilter(selectedTab.status);
		}
	}, [activeTab]);

	// Handle brand action (approve, reject, request info)
	const handleBrandAction = async () => {
		if (!actionBrand || !actionType) return;

		try {
			const response = await fetch("/api/admin/brand-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					brandEmail: actionBrand.id,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Refresh brands list
			fetchBrands();

			// Reset action state
			setActionBrand(null);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing brand action:", err);
		}
	};

	// Filter brands by search term and active tab status
  const filteredBrands = brands.filter((brand) => {
    // For the "all-brands" tab, use the explicit status filter selection
    // For other tabs, use the tab's predefined status
    const effectiveStatus = 
      activeTab === "all-brands" ? statusFilter : 
      tabs.find((tab) => tab.id === activeTab)?.status || "all";
    
    // Apply status filter
    const statusMatch = effectiveStatus === "all" || brand.status === effectiveStatus;
    
    // Apply search filter
    const searchMatch = 
      brand.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

	// Get the empty message for the current tab
	const getCurrentTabEmptyMessage = () => {
		const currentTab = tabs.find((tab) => tab.id === activeTab);
		return (
			currentTab?.emptyMessage || "No brands found matching your criteria."
		);
	};

	// Render action modal
	const renderActionModal = () => {
		if (!actionBrand) return null;

		let title = "";
		let description = "";
		let placeholder = "";
		let buttonText = "";
		let buttonColor = "";
		let needsMessage = false;

		switch (actionType) {
			case "approve":
				title = "Approve Brand";
				description =
					"Once approved, the brand will receive a notification and can start creating projects and contests";
				buttonText = "Yes, Approve Brand";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "reject":
				title = "Reject Brand";
				description =
					"Please provide a reason for rejection. This feedback will be shared with the Brand.";
				placeholder = "Type Reason for Rejection";
				buttonText = "Reject Brand";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			case "request_info":
				title = "Request More Information";
				description =
					"Type in the Information you need from the Brand to go ahead with Verification";
				placeholder = "Type Requests";
				buttonText = "Send";
				buttonColor = "bg-orange-500 hover:bg-orange-600";
				needsMessage = true;
				break;
			case "suspend":
				title = "Suspend Brand";
				description = "Please provide a reason for suspension.";
				placeholder = "Type Reason for Suspension";
				buttonText = "Suspend Brand";
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
									setActionBrand(null);
									setActionType("");
									setActionMessage("");
								}}
							>
								Cancel
							</button>
							<button
								className={`px-4 py-2 text-white rounded ${buttonColor} flex items-center`}
								onClick={handleBrandAction}
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

	// Navigate to brand details page
	const viewBrandDetails = (brand: Brand) => {
		router.push(`/admin/manage-users/brands/${brand.userId}`);
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: BrandStatus }) => {
		const statusConfig = {
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
				color: "bg-blue-100 text-blue-800",
				text: "Info Requested",
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

	// Render brand table content based on current tab
	const renderBrandTable = () => {
		if (loading) {
			return (
				<div className="flex justify-center items-center py-10 h-screen">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				</div>
			);
		}

		if (filteredBrands.length === 0) {
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
								Brand
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
								Email Address
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
						{filteredBrands.map((brand) => (
							<tr key={brand.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(brand.createdAt).toLocaleDateString()}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center">
										{brand.logoUrl ? (
											<Image
												className="h-10 w-10 rounded-full mr-3"
												src={brand.logoUrl}
												alt={`${brand.brandName} logo`}
												width={40}
												height={40}
											/>
										) : (
											<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
												<span className="text-gray-500 font-medium">
													{brand.brandName.charAt(0).toUpperCase()}
												</span>
											</div>
										)}
										<div>
											<div className="font-medium text-gray-900">
												{brand.brandName}
											</div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{brand.id}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<StatusBadge status={brand.status} />
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div className="flex items-center space-x-2">
										<button
											className="text-orange-500 hover:underline flex items-center gap-1"
											onClick={() => viewBrandDetails(brand)}
										>
											<span>View Brand</span>
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
			<div className=" p-6">
				<div className="flex flex-col space-y-2 w-full md:w-60">
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

					{activeTab === "all-brands" && (
						<div>
							<Select
								value={statusFilter}
								onValueChange={(value) =>
									setStatusFilter(value as BrandStatus | "all" | "pending" | "approved" | "rejected" | "suspended")
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

				{renderBrandTable()}

				{/* Pagination */}
				{!loading && pagination.pages > 1 && filteredBrands.length > 0 && (
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
								{Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
									(page) => (
										<button
											key={page}
											onClick={() => handlePageChange(page)}
											className={`px-3 py-1 border-t border-b ${
												pagination.page === page
													? "bg-orange-600 text-white"
													: "bg-white text-orange-600 hover:bg-blue-50"
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

export default BrandManagement;
