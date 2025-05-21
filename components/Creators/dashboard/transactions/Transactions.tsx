/* eslint-disable @typescript-eslint/no-explicit-any */
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
import Link from "next/link";
import {
	CalendarIcon,
	DownloadIcon,
	SettingsIcon,
	InfoIcon,
	Loader2,
} from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
	WithdrawalModal,
	ConfirmationModal,
	TransactionModal,
	Transaction,
	WithdrawalDetailsModal,
} from "./WithdrawModal";
import { generateTransactionReportPDF } from "./GeneratePDFs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// Define Transaction type
type TransactionStatus = "Withdrawn" | "Processing" | "Processed";

// Helper function to get status badge styling
const getStatusBadgeStyle = (status: TransactionStatus): string => {
	switch (status) {
		case "Withdrawn":
			return "bg-green-50 text-sm text-green-700 border border-green-200 rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		case "Processing":
			return "bg-[#FFF0C3] text-sm text-[#1A1A1A] border border-[#FDD849] rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		case "Processed":
			return "bg-blue-50 text-sm text-blue-700 border border-blue-200 rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		default:
			return "bg-gray-100 text-gray-700";
	}
};

// Helper function to get status icon
const getStatusIcon = (status: TransactionStatus): React.ReactNode => {
	switch (status) {
		case "Withdrawn":
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
		case "Processing":
			return <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mr-1"></div>;
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
		default:
			return null;
	}
};

// Configuration for API delays
const API_DELAY_MS = 1500; // 1.5 second delay before making API calls

const Transactions: React.FC = () => {
	// Transaction state and modals
	const [transactionModalOpen, setTransactionModalOpen] =
		useState<boolean>(false);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	// Withdrawal flow states
	const [withdrawalModalOpen, setWithdrawalModalOpen] =
		useState<boolean>(false);
	const [confirmationModalOpen, setConfirmationModalOpen] =
		useState<boolean>(false);
	const [withdrawalInfo, setWithdrawalInfo] = useState<any>(null);

	// Filter states
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [date, setDate] = useState<Date | undefined>(new Date());

	// Loading states
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isInitializing, setIsInitializing] = useState<boolean>(true); // New state for initial loading
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [loadingError, setLoadingError] = useState<string | null>(null);

	// Pagination
	const [hasMore, setHasMore] = useState<boolean>(false);
	const [lastId, setLastId] = useState<string | null>(null);

	// Financial data
	const [availableBalance, setAvailableBalance] = useState<string>("0");
	const [processingPayments, setProcessingPayments] = useState<string>("0");
	const [totalEarnings, setTotalEarnings] = useState<string>("0");
	const [withdrawalDetailsModalOpen, setWithdrawalDetailsModalOpen] =
		useState<boolean>(false);
	// Transaction data
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [transactionDetails, setTransactionDetails] = useState<any>(null);

	const { currentUser } = useAuth();

	// Fetch transactions on component mount with delay
	useEffect(() => {
		const initializeData = async () => {
			setIsInitializing(true);
			
			// Add delay before fetching data to allow other components to load
			await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
			
			try {
				await fetchBalanceData();
				await fetchTransactions();
			} catch (error) {
				console.error("Error initializing data:", error);
			} finally {
				setIsInitializing(false);
			}
		};
		
		initializeData();
	}, []);

	// Fetch balance data
	const fetchBalanceData = async () => {
		try {
			const response = await fetch("/api/creator-transactions/balance?userId=" + currentUser?.uid);

			if (!response.ok) {
				throw new Error("Failed to fetch balance data");
			}

			const data = await response.json();
			setAvailableBalance(data.availableBalance);
			setProcessingPayments(data.processingPayments);
			setTotalEarnings(data.totalEarnings);
		} catch (error) {
			console.error("Error fetching balance:", error);
			setLoadingError("Failed to load balance data. Please try again.");
		}
	};

	// Fetch transactions
	const fetchTransactions = async (resetList = true) => {
		setIsLoading(true);
		setLoadingError(null);

		try {
			let url = currentUser
				? `/api/creator-transactions?userId=${currentUser.uid}`
				: "/api/creator-transactions";

			// Add pagination params if needed
			if (!resetList && lastId) {
				url += `&startAfter=${lastId}`;
			} else if (!resetList) {
				url += `?startAfter=${lastId}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Failed to fetch transactions");
			}

			const data = await response.json();

			if (resetList) {
				setTransactions(data.transactions);
			} else {
				setTransactions([...transactions, ...data.transactions]);
			}

			setHasMore(data.hasMore);
			setLastId(data.lastId);
		} catch (error) {
			console.error("Error fetching transactions:", error);
			setLoadingError("Failed to load transactions. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch transaction details with delay
	const fetchTransactionDetails = async (transactionId: string) => {
		try {
			// Add a small delay before fetching transaction details
			await new Promise(resolve => setTimeout(resolve, 500));
			
			const response = await fetch(
				`/api/creator-transactions/${transactionId}`
			);

			if (!response.ok) {
				throw new Error("Failed to fetch transaction details");
			}

			const data = await response.json();
			return data.transaction;
		} catch (error) {
			console.error("Error fetching transaction details:", error);
			toast("Failed to load transaction details");
			return null;
		}
	};

	const handleExportReport = () => {
		// Generate the PDF with the current filtered transactions
		generateTransactionReportPDF(filteredTransactions, {
			totalEarnings,
			processingPayments,
			availableBalance,
		});
	};

	const handleViewTransaction = async (
		transaction: Transaction
	): Promise<void> => {
		setSelectedTransaction(transaction);

		// Get full transaction details
		const details = await fetchTransactionDetails(transaction.id);
		setTransactionDetails(details);

		// Show different modals based on transaction status
		if (transaction.status === "Withdrawn") {
			setWithdrawalDetailsModalOpen(true);
		} else {
			setTransactionModalOpen(true);
		}
	};

	// Handle initiating withdrawal
	const handleWithdraw = () => {
		setWithdrawalModalOpen(true);
	};

	// Handle withdrawal form submission
	const handleWithdrawalSubmit = (info: any) => {
		setWithdrawalInfo(info);
		setWithdrawalModalOpen(false);
		setConfirmationModalOpen(true);
	};

	// Handle withdrawal confirmation with delay
	const handleConfirmWithdrawal = async () => {
		// Close the confirmation modal
		setConfirmationModalOpen(false);
		setIsSubmitting(true);

		try {
			// Add delay before processing withdrawal
			await new Promise(resolve => setTimeout(resolve, 800));
			
			const response = await fetch("/api/transactions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: parseFloat(withdrawalInfo.amount),
					paymentMethod: withdrawalInfo.paymentMethod,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to process withdrawal");
			}

			const data = await response.json();

			// Add the new transaction to the list
			setTransactions([data.transaction, ...transactions]);

			// Refresh balance data
			await fetchBalanceData();

			// Show success message
			toast("Your withdrawal has been submitted successfully");

			// Show the transaction details
			setSelectedTransaction(data.transaction);
			setTransactionModalOpen(true);
		} catch (error) {
			console.error("Error processing withdrawal:", error);
			toast(
				error instanceof Error ? error.message : "Failed to process withdrawal"
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Load more transactions
	const loadMoreTransactions = () => {
		if (hasMore && !isLoading) {
			fetchTransactions(false);
		}
	};

	// Filter transactions based on search, type, and status
	const filteredTransactions = useMemo(() => {
		return transactions?.filter((transaction) => {
			// Search term filter (case insensitive)
			const matchesSearch =
				searchTerm === "" ||
				transaction.description
					.toLowerCase()
					.includes(searchTerm.toLowerCase()) ||
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
	}, [searchTerm, typeFilter, statusFilter, transactions]);

	return (
		<div className="px-4 w-[70rem] mx-auto font-satoshi">
			{/* Header with Month Filter and Export/Settings buttons */}
			<div className="flex justify-between items-center mb-6">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="flex items-center gap-2 border-gray-300"
						>
							<CalendarIcon className="h-4 w-4" />
							<span>This Month</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar
							mode="single"
							selected={date}
							onSelect={setDate}
							className="rounded-md border bg-white"
						/>
					</PopoverContent>
				</Popover>

				<div className="flex gap-3">
					<Button
						variant="outline"
						className="flex items-center gap-2 bg-black text-white"
						onClick={handleExportReport}
						disabled={isInitializing || filteredTransactions.length === 0}
					>
						<DownloadIcon className="h-4 w-4" />
						<span>Export Report</span>
					</Button>
					<Link href="/settings/payments">
						<Button
							variant="outline"
							className="flex items-center gap-2 bg-black text-white"
						>
							<SettingsIcon className="h-4 w-4" />
							<span>Payment Settings</span>
						</Button>
					</Link>
				</div>
			</div>

			{/* Balance Cards */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<Card className="p-6 flex flex-col gap-1">
					<div className="text-gray-600 text-sm mb-1">Available Balance</div>
					<div className="text-2xl font-medium">
						{isInitializing ? (
							<div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
						) : (
							`$${availableBalance}`
						)}
					</div>
					<Button
						className="mt-2 bg-green-500 hover:bg-green-600 text-white"
						onClick={handleWithdraw}
						disabled={isInitializing || parseFloat(availableBalance) <= 0}
					>
						{isInitializing ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : null}
						Withdraw
					</Button>
				</Card>

				<Card className="p-6 flex flex-col gap-1">
					<div className="text-gray-600 text-sm mb-1">Processing</div>
					<div className="text-2xl font-medium">
						{isInitializing ? (
							<div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
						) : (
							`$${processingPayments}`
						)}
					</div>
				</Card>

				<Card className="p-6 flex flex-col gap-1">
					<div className="text-gray-600 text-sm mb-1">Total Earnings</div>
					<div className="text-2xl font-medium">
						{isInitializing ? (
							<div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
						) : (
							`$${totalEarnings}`
						)}
					</div>
					<div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
						<InfoIcon className="h-4 w-4" />
						<span>Since you joined</span>
					</div>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex gap-4 mb-6">
				<Input
					type="text"
					placeholder="Search..."
					className="max-w-xs"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					disabled={isInitializing}
				/>

				<Select 
					value={typeFilter} 
					onValueChange={setTypeFilter}
					disabled={isInitializing}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="All Types" />
					</SelectTrigger>
					<SelectContent className="bg-white">
						<SelectItem value="all-types">All Types</SelectItem>
						<SelectItem value="payout">Payout</SelectItem>
						<SelectItem value="sale">Sale</SelectItem>
						<SelectItem value="refund">Refund</SelectItem>
					</SelectContent>
				</Select>

				<Select 
					value={statusFilter} 
					onValueChange={setStatusFilter}
					disabled={isInitializing}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent className="bg-white">
						<SelectItem value="all-statuses">All Statuses</SelectItem>
						<SelectItem value="Processed">Processed</SelectItem>
						<SelectItem value="Processing">Processing</SelectItem>
						<SelectItem value="Withdrawn">Withdrawn</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Transactions List */}
			<div className="mb-6">
				{isInitializing ? (
					<div className="flex flex-col items-center justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
						<p className="text-gray-500">Initializing transaction data...</p>
					</div>
				) : loadingError ? (
					<div className="flex flex-col items-center justify-center py-10">
						<p className="text-red-500 mb-2">{loadingError}</p>
						<Button variant="outline" onClick={() => fetchTransactions()}>
							Try Again
						</Button>
					</div>
				) : isLoading && transactions.length === 0 ? (
					<div className="flex justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : filteredTransactions.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10">
						<p className="text-gray-500 mb-2">No transactions found</p>
						{(searchTerm || typeFilter || statusFilter) && (
							<Button
								variant="outline"
								onClick={() => {
									setSearchTerm("");
									setTypeFilter("");
									setStatusFilter("");
								}}
							>
								Clear Filters
							</Button>
						)}
					</div>
				) : (
					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 text-gray-600">
								<tr>
									<th className="px-6 py-3 text-left font-medium">
										Description
									</th>
									<th className="px-6 py-3 text-left font-medium">Date</th>
									<th className="px-6 py-3 text-left font-medium">Status</th>
									<th className="px-6 py-3 text-left font-medium">Amount</th>
									<th className="px-6 py-3 text-right font-medium">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{filteredTransactions.map((transaction) => (
									<tr key={transaction.id} className="bg-white">
										<td className="px-6 py-4">
											<div className="font-medium">
												{transaction.description}
											</div>
											<div className="text-gray-500 text-xs">
												{transaction.type}
											</div>
										</td>
										<td className="px-6 py-4 text-gray-600">
											{transaction.date}
										</td>
										<td className="px-6 py-4">
											<div
												className={getStatusBadgeStyle(
													transaction.status as TransactionStatus
												)}
											>
												{getStatusIcon(transaction.status as TransactionStatus)}
												<span>{transaction.status}</span>
											</div>
										</td>
										<td className="px-6 py-4 font-medium">
											{transaction.amount}
										</td>
										<td className="px-6 py-4 text-right">
											<Button
												variant="ghost"
												className="text-gray-600 hover:text-gray-900"
												onClick={() => handleViewTransaction(transaction)}
											>
												View
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Load More Button */}
				{hasMore && !isLoading && !isInitializing && (
					<div className="flex justify-center mt-4">
						<Button
							variant="outline"
							onClick={loadMoreTransactions}
							className="border-gray-300"
						>
							Load More
						</Button>
					</div>
				)}
			</div>

			{/* Modals */}
			{selectedTransaction && (
				<>
					<TransactionModal
						isOpen={transactionModalOpen}
						onClose={() => setTransactionModalOpen(false)}
						transaction={selectedTransaction}
						details={transactionDetails}
					/>

					<WithdrawalDetailsModal
						isOpen={withdrawalDetailsModalOpen}
						onClose={() => setWithdrawalDetailsModalOpen(false)}
						transaction={selectedTransaction}
						details={transactionDetails}
					/>
				</>
			)}

			<WithdrawalModal
				isOpen={withdrawalModalOpen}
				onClose={() => setWithdrawalModalOpen(false)}
				onSubmit={handleWithdrawalSubmit}
				availableBalance={availableBalance}
			/>

			<ConfirmationModal
				isOpen={confirmationModalOpen}
				onClose={() => setConfirmationModalOpen(false)}
				onConfirm={handleConfirmWithdrawal}
				withdrawalInfo={withdrawalInfo}
				isLoading={isSubmitting}
			/>
		</div>
	);
};

export default Transactions;