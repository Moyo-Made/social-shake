"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

// Updated Payment type to match API response format
interface RawPaymentData {
	id: string;
	paymentId: string;
	userId: string;
	brandEmail: string;
	amount: number;
	contestName: string;
	contestType: string;
	createdAt: string;
	paymentName: string;
	stripeSessionId: string;
	paymentType: string;
	stripePaymentIntentId?: string;
	contestId?: string;
	processedAt?: string;
	stripePaymentStatus: string;
	processedBy?: string;
	status: string;
	updatedAt: string;
}

interface Payment {
	id: string;
	transactionDate: string;
	description: string;
	amount: string;
	type: string;
	status: string;
	paymentDate: string;
	projectCompleted: string;
	brandEmail: string;
	actions: string;
	rawData: RawPaymentData;
}

// Helper function to get type badge styling
const getTypeBadgeStyle = (type: string): string => {
	switch (type.toLowerCase()) {
		case "contest":
			return "text-black";
		case "project":
			return "text-black";
		default:
			return "text-black";
	}
};

// Helper function to get status badge styling
const getStatusBadgeStyle = (status: string): string => {
	switch (status.toLowerCase()) {
		case "processed":
		case "completed":
			return "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] flex items-center";
		case "pending":
		case "pending_capture":
			return "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A] flex items-center";
		case "canceled":
		case "refunded":
			return "bg-[#FFE9E7] border border-[#F04438] text-[#F04438] flex items-center";
		default:
			return "bg-gray-100 text-gray-700";
	}
};

// Helper function to get status icon
const getStatusIcon = (status: string): React.ReactNode => {
	switch (status.toLowerCase()) {
		case "processed":
		case "completed":
			return (
				<svg
					className="w-4 h-4 mr-1"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M5 12L10 17L20 7"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		case "pending":
		case "pending_capture":
			return <div className="w-1 h-1 rounded-full bg-[#1A1A1A] mr-1"></div>;
		case "canceled":
		case "refunded":
			return <div className="w-1 h-1 rounded-full bg-[#F04438] mr-1"></div>;
		default:
			return null;
	}
};

export default function AdminPaymentsDashboard() {
	// All payments from API (no server-side pagination)
	const [allPayments, setAllPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [processingId, setProcessingId] = useState<string | null>(null);

	// Search and filter states
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	
	// Client-side pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(10);

	// Total payments summary
	const [totalPayments, setTotalPayments] = useState({
		totalSpend: "0",
		pendingPayments: "0",
		totalProcessed: "0"
	});

	const hasPayments = allPayments?.length > 0;

	useEffect(() => {
		fetchPayments();
	}, []);

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, typeFilter, statusFilter]);

	const fetchPayments = async () => {
		try {
			setLoading(true);
			
			// Simple API call - no pagination parameters needed
			const response = await axios.get('/api/admin/payments');
			
			// Update states with response data
			setAllPayments(response.data.transactions);
			setTotalPayments(response.data.totals);
			
			setError(null);
		} catch (err) {
			setError("Failed to load payments");
			console.error("Error fetching payments:", err);
		} finally {
			setLoading(false);
		}
	};

	const handlePaymentAction = async (
		paymentId: string,
		action: "capture" | "cancel"
	) => {
		try {
			setProcessingId(paymentId);

			const response = await axios.post("/api/admin/process-payment", {
				paymentId,
				action,
			});

			if (response.data.success) {
				// Refresh payments data after successful action
				fetchPayments();
			}
		} catch (err) {
			console.error(`Error ${action}ing payment:`, err);
			alert(`Failed to ${action} payment. Please try again.`);
		} finally {
			setProcessingId(null);
		}
	};

	// Clear search and filters
	const clearSearch = () => {
		setSearchTerm("");
		setTypeFilter("");
		setStatusFilter("");
		setCurrentPage(1);
	};

	// Handle page change
	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage);
	};

	// Filter payments based on search, type, and status (all client-side)
	const filteredPayments = useMemo(() => {
		if (!hasPayments) return [];

		return allPayments.filter((payment) => {
			// Search term filter (case insensitive)
			const matchesSearch =
				searchTerm === "" ||
				payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
				payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
				payment.amount.toString().includes(searchTerm.toLowerCase());

			// Type filter
			const matchesType =
				typeFilter === "" ||
				typeFilter === "all-types" ||
				payment.type.toLowerCase() === typeFilter.toLowerCase();

			// Status filter
			const matchesStatus =
				statusFilter === "" ||
				statusFilter === "all-statuses" ||
				payment.status.toLowerCase() === statusFilter.toLowerCase();

			return matchesSearch && matchesType && matchesStatus;
		});
	}, [searchTerm, typeFilter, statusFilter, hasPayments, allPayments]);

	// Calculate filtered totals (for display purposes)
	const filteredTotals = useMemo(() => {
		let totalSpend = 0;
		let pendingPayments = 0;
		let totalProcessed = 0;

		filteredPayments.forEach((transaction) => {
			try {
				const amount = parseFloat(transaction.amount.replace(/,/g, ""));

				if (!isNaN(amount)) {
					if (transaction.status === "Pending") {
						pendingPayments += amount;
					} else if (transaction.status === "Processed") {
						totalProcessed += amount;
						totalSpend += amount;
					}
				}
			} catch (error) {
				console.error("Error calculating filtered total:", error);
			}
		});

		return {
			totalSpend: totalSpend.toLocaleString(),
			pendingPayments: pendingPayments.toLocaleString(),
			totalProcessed: totalProcessed.toLocaleString(),
		};
	}, [filteredPayments]);

	// Calculate total pages based on filtered results
	const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

	// Paginate the filtered results - FIXED CALCULATION
	const paginatedPayments = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		console.log(`Page ${currentPage}: showing items ${startIndex} to ${endIndex - 1} of ${filteredPayments.length}`);
		return filteredPayments.slice(startIndex, endIndex);
	}, [filteredPayments, currentPage, itemsPerPage]);

	// Generate pagination buttons
	const renderPaginationButtons = () => {
		const buttons = [];
		const maxVisibleButtons = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
		const endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

		// Adjust start page if needed
		if (endPage - startPage + 1 < maxVisibleButtons) {
			startPage = Math.max(1, endPage - maxVisibleButtons + 1);
		}

		// Previous button
		buttons.push(
			<button
				key="prev"
				className={`px-3 py-1 rounded ${
					currentPage === 1
						? "text-gray-400 cursor-not-allowed"
						: "text-gray-700 hover:bg-gray-100"
				}`}
				onClick={() => handlePageChange(currentPage - 1)}
				disabled={currentPage === 1}
			>
				&lt;
			</button>
		);

		// Page number buttons
		for (let i = startPage; i <= endPage; i++) {
			buttons.push(
				<button
					key={i}
					className={`px-3 py-1 rounded ${
						currentPage === i
							? "bg-orange-500 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
					onClick={() => handlePageChange(i)}
				>
					{i}
				</button>
			);
		}

		// Next button
		buttons.push(
			<button
				key="next"
				className={`px-3 py-1 rounded ${
					currentPage >= totalPages
						? "text-gray-400 cursor-not-allowed"
						: "text-gray-700 hover:bg-gray-100"
				}`}
				onClick={() => handlePageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				&gt;
			</button>
		);

		return buttons;
	};

	// Render loading state
	if (loading) {
		return (
			<div className="w-full flex flex-col items-center justify-center py-5">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p className="mt-4 text-gray-600">Loading payments...</p>
			</div>
		);
	}

	// Render error state
	if (error) {
		return (
			<div className="w-full flex flex-col items-center justify-center py-12">
				<div
					className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
					role="alert"
				>
					<strong className="font-bold">Error: </strong>
					<span className="block sm:inline">{error}</span>
				</div>
				<Button
					className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
					onClick={fetchPayments}
				>
					Try Again
				</Button>
			</div>
		);
	}

	// Determine which totals to show (filtered vs all)
	const displayTotals = searchTerm || typeFilter || statusFilter ? filteredTotals : totalPayments;

	return (
		<div className="max-w-6xl mx-auto p-4">
			{/* Payment Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 mb-8">
				<Card className="py-10 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">
						Total Amount
						{(searchTerm || typeFilter || statusFilter) && " (Filtered)"}
					</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasPayments ? displayTotals.totalSpend : "0"}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">
						Total Pending Amount
						{(searchTerm || typeFilter || statusFilter) && " (Filtered)"}
					</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasPayments ? displayTotals.pendingPayments : "0"}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">
						Total Processed
						{(searchTerm || typeFilter || statusFilter) && " (Filtered)"}
					</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasPayments ? displayTotals.totalProcessed : "0"}
					</h2>
				</Card>
			</div>
			
			<div className="mx-auto">
				{/* Filters Section - Only show if there are payments */}
				{hasPayments && (
					<div className="flex justify-between items-center mb-4">
						{/* Search on the left */}
						<div className="relative">
							<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
								<svg
									className="w-4 h-4 text-gray-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									></path>
								</svg>
							</div>
							<Input
								type="text"
								className="pl-10 pr-4 py-2 w-64"
								placeholder="Search Payments"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>

						{/* Filters on the right */}
						<div className="flex gap-2">
							<Select
								value={typeFilter}
								onValueChange={(value: string) => setTypeFilter(value)}
							>
								<SelectTrigger className="w-48">
									<SelectValue placeholder="Filter by Type" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all-types">All Types</SelectItem>
									<SelectItem value="project">Project</SelectItem>
									<SelectItem value="contest">Contest</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={statusFilter}
								onValueChange={(value: string) => setStatusFilter(value)}
							>
								<SelectTrigger className="w-48">
									<SelectValue placeholder="Filter by Status" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="all-statuses">All Statuses</SelectItem>
									<SelectItem value="Processed">Processed</SelectItem>
									<SelectItem value="Pending">Pending</SelectItem>
									<SelectItem value="Refunded">Refunded</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{/* Results info */}
				{hasPayments && filteredPayments.length > 0 && (
					<div className="mb-4 text-sm text-gray-600">
						Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} results
						{(searchTerm || typeFilter || statusFilter) && ` (filtered from ${allPayments.length} total)`}
					</div>
				)}

				{/* Payment Table */}
				<div className="overflow-hidden rounded-lg border border-gray-200">
					{/* Table Header - Only show if there are payments to display */}
					{hasPayments && paginatedPayments.length > 0 && (
						<div className="grid grid-cols-7 bg-gray-50 p-3 text-[#475467] text-sm font-normal">
							<div className="col-span-1 pl-4">Transaction Date</div>
							<div className="col-span-2">Description</div>
							<div className="col-span-1">Amount</div>
							<div className="col-span-1">Type</div>
							<div className="col-span-1">Status</div>
							<div className="col-span-1">Actions</div>
						</div>
					)}

					{/* Different states based on payments availability and filters */}
					{!hasPayments ? (
						// No payments yet state
						<div className="flex flex-col justify-center items-center py-16">
							<div className="bg-[#FFF4EE] rounded-full p-6 mb-3">
								<svg
									className="w-12 h-12 text-orange-500"
									fill="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-16v6m0 4v.01"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<h2 className="text-xl text-black font-semibold mb-2">
								No Payments Found
							</h2>
							<p className="mb-5 text-gray-500 w-1/2 text-center">
								There are no payments in the system yet. Payments will appear
								here once they are created.
							</p>
							<Button
								className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 text-center"
								onClick={fetchPayments}
							>
								Refresh Payments
							</Button>
						</div>
					) : filteredPayments.length > 0 ? (
						// We have payments that match the filters
						<>
							{paginatedPayments.map((payment, index) => (
								<div
									key={`${payment.id}-${index}`}
									className="grid grid-cols-7 p-3 items-center border-t border-gray-200 text-sm text-[#101828] hover:bg-gray-50"
								>
									<div className="col-span-1 pl-4">
										{payment.transactionDate}
									</div>
									<div className="col-span-2 pr-6">
										<span>{payment.description}</span>
									</div>
									<div className="col-span-1">${payment.amount}</div>
									<div className="col-span-1">
										<span
											className={`text-sm ${getTypeBadgeStyle(payment.type)}`}
										>
											{payment.type}
										</span>
									</div>
									<div className="col-span-1">
										<span
											className={`w-fit px-2 py-1 rounded-full text-xs ${getStatusBadgeStyle(payment.status)}`}
										>
											{getStatusIcon(payment.status)}
											{payment.status}
										</span>
									</div>
									<div className="col-span-1">
										{payment.status === "Pending" ? (
											<div className="flex space-x-2">
												<button
													onClick={() =>
														handlePaymentAction(payment.id, "capture")
													}
													disabled={processingId === payment.id}
													className={`text-green-600 hover:text-green-900 ${
														processingId === payment.id
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
												>
													{processingId === payment.id
														? "Processing..."
														: "Approve"}
												</button>
												<div className="text-gray-600">|</div>
												<button
													onClick={() =>
														handlePaymentAction(payment.id, "cancel")
													}
													disabled={processingId === payment.id}
													className={`text-red-600 hover:text-red-900 ${
														processingId === payment.id
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
												>
													Decline
												</button>
											</div>
										) : (
											<span className="text-gray-400">No actions</span>
										)}
									</div>
								</div>
							))}
							
							{/* Pagination controls */}
							{totalPages > 1 && (
								<div className="flex justify-between items-center p-4 border-t border-gray-200">
									<div className="text-sm text-gray-600">
										Page {currentPage} of {totalPages}
									</div>
									<div className="flex gap-1">{renderPaginationButtons()}</div>
								</div>
							)}
						</>
					) : (
						// We have payments but none match the current filters
						<div className="flex flex-col justify-center items-center py-10">
							<h2 className="text-xl text-black font-semibold mb-2">
								No Search Results
							</h2>
							<p className="mb-3 text-gray-500 w-1/2 text-center">
								We couldn&apos;t find any payments matching your search
								criteria. Try adjusting your search.
							</p>
							<Button
								className="bg-black text-white py-1 px-5 text-center"
								onClick={clearSearch}
							>
								Clear Search
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}