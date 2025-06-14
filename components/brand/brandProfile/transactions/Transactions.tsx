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
import TransactionModal from "./TransactionModal";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// Define Transaction type
type TransactionStatus = "Processed" | "Pending" | "Refunded";
type TransactionType = "Project" | "Contest";

interface Transaction {
	id: string;
	transactionDate: string;
	description: string;
	amount: string;
	type: TransactionType;
	status: TransactionStatus;
	paymentDate: string;
	projectCompleted: string;
	actions: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rawData?: any; // Optional raw data for debugging
}

interface TotalTransactions {
	totalSpend: string;
	pendingPayments: string;
	totalProcessed: string;
	dataSource?: string; // Added to track if data comes from Stripe or Firestore
}

// Helper function to get type badge styling
const getTypeBadgeStyle = (type: TransactionType): string => {
	switch (type) {
		case "Project":
			return "bg-orange-500 text-white";
		case "Contest":
			return "bg-pink-400 text-white";
		default:
			return "bg-gray-200 text-gray-700";
	}
};

// Helper function to get status badge styling
const getStatusBadgeStyle = (status: TransactionStatus): string => {
	switch (status) {
		case "Processed":
			return "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] flex items-center";
		case "Pending":
			return "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A] flex items-center";
		case "Refunded":
			return "bg-[#FFE9E7] border border-[#F04438] text-[#F04438] flex items-center";
		default:
			return "bg-gray-100 text-gray-700";
	}
};

// Helper function to get status icon
const getStatusIcon = (status: TransactionStatus): React.ReactNode => {
	switch (status) {
		case "Processed":
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
		case "Pending":
			return <div className="w-1 h-1 rounded-full bg-[#1A1A1A] mr-1"></div>;
		case "Refunded":
			return <div className="w-1 h-1 rounded-full bg-[#F04438] mr-1"></div>;
		default:
			return null;
	}
};

// Interface for pagination state
interface PaginationState {
	currentPage: number;
	hasMore: boolean;
	cursor: string | null;
	totalCount: number;
}

const Transactions: React.FC = () => {
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");

	// Add loading and error states
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// State to hold the real data
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [totalTransactions, setTotalTransactions] = useState<TotalTransactions>(
		{
			totalSpend: "0",
			pendingPayments: "0",
			totalProcessed: "0",
		}
	);
	
	// Updated pagination state
	const [pagination, setPagination] = useState<PaginationState>({
		currentPage: 1,
		hasMore: false,
		cursor: null,
		totalCount: 0,
	});
	
	// Store cursor history for going back
	const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
	
	const [pageSize] = useState<number>(10); // Fixed at 10 items per page
	const { currentUser } = useAuth();

	// Whether the user has any transactions
	const hasTransactions = transactions.length > 0;

	const fetchTransactions = async (
		cursor: string | null = null,
		pageNumber: number = 1
	) => {
		// Don't try to fetch if there's no user
		if (!currentUser) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Build the URL with proper parameters that match your API
			let url = `/api/transactions?userId=${currentUser.uid}&pageSize=${pageSize}`;
			
			// Add cursor if provided
			if (cursor) {
				url += `&cursor=${encodeURIComponent(cursor)}`;
			}

			console.log('Fetching URL:', url); // Debug log

			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to fetch transactions");
			}

			const data = await response.json();
			console.log('API Response:', data); // Debug log

			// Update state with the fetched data
			setTransactions(data.transactions || []);
			setTotalTransactions(
				data.totals || {
					totalSpend: "0",
					pendingPayments: "0",
					totalProcessed: "0",
				}
			);

			// Update pagination state properly
			setPagination({
				currentPage: pageNumber,
				hasMore: data.pagination?.hasMore || false,
				cursor: data.pagination?.cursor || null,
				totalCount: data.pagination?.totalCount || 0,
			});

			setLoading(false);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error("Error fetching transactions:", error);
			setError(
				error.message || "An error occurred while fetching transactions"
			);
			setLoading(false);
		}
	};

	// Updated next page function
	const goToNextPage = () => {
		if (pagination.hasMore && pagination.cursor) {
			// Add current cursor to history before moving forward
			setCursorHistory(prev => [...prev, pagination.cursor]);
			fetchTransactions(pagination.cursor, pagination.currentPage + 1);
		}
	};

	// Updated previous page function
	const goToPreviousPage = () => {
		if (pagination.currentPage > 1 && cursorHistory.length > 1) {
			// Get the previous cursor from history
			const newHistory = [...cursorHistory];
			newHistory.pop(); // Remove current cursor
			const previousCursor = newHistory[newHistory.length - 1];
			
			setCursorHistory(newHistory);
			fetchTransactions(previousCursor, pagination.currentPage - 1);
		}
	};

	// Reset pagination when component mounts or user changes
	useEffect(() => {
		if (currentUser) {
			// Reset pagination state
			setPagination({
				currentPage: 1,
				hasMore: false,
				cursor: null,
				totalCount: 0,
			});
			setCursorHistory([null]);
			fetchTransactions(null, 1);
		}
	}, [currentUser]);

	const handleViewTransaction = (transaction: Transaction): void => {
		setSelectedTransaction(transaction);
		setModalOpen(true);
	};

	// Clear search and filters
	const clearSearch = () => {
		setSearchTerm("");
		setTypeFilter("");
		setStatusFilter("");
	};

	// Filter transactions based on search, type, and status
	const filteredTransactions = useMemo(() => {
		// If there are no transactions at all, return empty array
		if (!hasTransactions) return [];

		return transactions.filter((transaction) => {
			// Search term filter (case insensitive)
			const matchesSearch =
				searchTerm === "" ||
				transaction.description
					.toLowerCase()
					.includes(searchTerm.toLowerCase()) ||
				transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
				transaction.amount.toLowerCase().includes(searchTerm.toLowerCase());

			// Type filter
			const matchesType =
				typeFilter === "" ||
				typeFilter === "all-types" ||
				transaction.type === typeFilter;

			// Status filter
			const matchesStatus =
				statusFilter === "" ||
				statusFilter === "all-statuses" ||
				transaction.status === statusFilter;

			return matchesSearch && matchesType && matchesStatus;
		});
	}, [searchTerm, typeFilter, statusFilter, hasTransactions, transactions]);

	// Render loading state
	if (loading) {
		return (
			<div className="w-full flex flex-col items-center justify-center py-12 h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p className="mt-4 text-gray-600">Loading transactions...</p>
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
					onClick={() => {
						// Reset everything and retry
						setPagination({
							currentPage: 1,
							hasMore: false,
							cursor: null,
							totalCount: 0,
						});
						setCursorHistory([null]);
						fetchTransactions(null, 1);
					}}
				>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div>
			{/* Affiliate Payout Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 mb-8 mx-10">
				<Card className="py-10 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">Total Spend</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasTransactions ? totalTransactions.totalSpend : "0"}
					</h2>
					
				</Card>

				<Card className="py-4 px-5 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">Total Pending Amount</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasTransactions ? totalTransactions.pendingPayments : "0"}
					</h2>
				</Card>

				<Card className="py-4 px-5 flex flex-col items-center justify-center border border-[#6670854D] shadow-none">
					<p className="text-lg text-[#000] mb-1 mt-2">Total Processed</p>
					<h2 className="text-2xl text-[#101828] font-semibold">
						${hasTransactions ? totalTransactions.totalProcessed : "0"}
					</h2>
				</Card>
			</div>
			<div className="mx-10">
				{/* Filters Section - Only show if there are transactions */}
				{hasTransactions && (
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
								placeholder="Search Transactions"
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
									<SelectItem value="Project">Project</SelectItem>
									<SelectItem value="Contest">Contest</SelectItem>
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

				{/* Transaction Table */}
				<div className="overflow-hidden rounded-lg border border-gray-200">
					{/* Table Header - Only show if there are transactions */}
					{hasTransactions && (
						<div className="grid grid-cols-7 bg-gray-50 p-3 text-[#475467] text-sm font-normal">
							<div className="col-span-1 pl-4">Transaction Date</div>
							<div className="col-span-2">Description</div>
							<div className="col-span-1">Amount</div>
							<div className="col-span-1">Type</div>
							<div className="col-span-1">Status</div>
							<div className="col-span-1">Actions</div>
						</div>
					)}

					{/* Different states based on transactions availability and filters */}
					{!hasTransactions ? (
						// No transactions yet state
						<div className="flex flex-col justify-center items-center py-16">
							<div className="bg-[#FFF4EE] rounded-full p-6 mb-3">
								<Image
									src="/icons/money-bag.svg"
									alt="Bag Icon"
									width={50}
									height={50}
									className=""
								/>
							</div>
							<h2 className="text-xl text-black font-semibold mb-2">
								No Transactions Yet
							</h2>
							<p className="mb-5 text-gray-500 w-1/2 text-center">
								You haven&apos;t made any transactions yet. Your transaction
								history will appear here once you make your first transaction.
							</p>
							<Button className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 text-center">
								<Link href="/brand/dashboard/projects/new">
									Create a New Project +
								</Link>
							</Button>
						</div>
					) : filteredTransactions.length > 0 ? (
						// We have transactions that match the filters
						filteredTransactions.map((item, index) => (
							<div
								key={`${item.id}-${index}`} // Better key for React
								className="grid grid-cols-7 p-3 items-center border-t border-gray-200 text-sm text-[#101828] hover:bg-gray-50"
							>
								<div className="col-span-1 pl-4">{item.transactionDate}</div>
								<div className="col-span-2 pr-4">{item.description} </div>
								<div className="col-span-1">${item.amount}</div>
								<div className="col-span-1">
									<span
										className={`px-4 py-1 rounded-full text-sm ${getTypeBadgeStyle(item.type)}`}
									>
										{item.type === "Contest" ? "Contests" : item.type}
									</span>
								</div>
								<div className="col-span-1">
									<span
										className={`w-fit px-2 py-1 rounded-full text-xs ${getStatusBadgeStyle(item.status)}`}
									>
										{getStatusIcon(item.status)}
										{item.status}
									</span>
								</div>
								<div className="col-span-1">
									<button
										className="text-orange-500 hover:underline"
										onClick={() => handleViewTransaction(item)}
									>
										{item.actions}
									</button>
								</div>
							</div>
						))
					) : (
						// We have transactions but none match the current filters
						<div className="flex flex-col justify-center items-center py-10">
							<h2 className="text-xl text-black font-semibold mb-2">
								No Search Results
							</h2>
							<p className="mb-3 text-gray-500 w-1/2 text-center">
								We couldn&apos;t find any transactions matching your search
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

			{/* Pagination Controls - Only show if there are transactions */}
			{hasTransactions && (
				<div className="flex justify-between items-center mt-4 mx-10 pb-5">
					<div className="text-sm text-gray-500">
						Page {pagination.currentPage}
						{pagination.totalCount > 0 && (
							<span> (Total: {pagination.totalCount} transactions)</span>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							onClick={goToPreviousPage}
							disabled={pagination.currentPage <= 1}
							className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
						>
							Previous
						</Button>
						<Button
							onClick={goToNextPage}
							disabled={!pagination.hasMore}
							className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
						>
							Next
						</Button>
					</div>
				</div>
			)}

			{/* Transaction Modal */}
			{selectedTransaction && (
				<TransactionModal
					transaction={selectedTransaction}
					isOpen={modalOpen}
					onClose={() => setModalOpen(false)}
				/>
			)}
		</div>
	);
};

export default Transactions;