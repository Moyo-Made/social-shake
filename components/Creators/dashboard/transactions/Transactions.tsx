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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define Transaction type
type TransactionStatus = "Withdrawn" | "Processing" | "Processed" | "Failed";

// Helper function to get status badge styling
const getStatusBadgeStyle = (status: TransactionStatus): string => {
	switch (status) {
		case "Withdrawn":
			return "bg-green-50 text-sm text-green-700 border border-green-200 rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		case "Processing":
			return "bg-[#FFF0C3] text-sm text-[#1A1A1A] border border-[#FDD849] rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		case "Processed":
			return "bg-blue-50 text-sm text-blue-700 border border-blue-200 rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		case "Failed":
			return "bg-red-50 text-sm text-red-700 border border-red-200 rounded-full flex items-center justify-center px-3 py-1 w-1/2";
		default:
			return "bg-gray-100 text-gray-700";
	}
};

// Helper function to get status icon
const getStatusIcon = (status: TransactionStatus): React.ReactNode => {
	switch (status) {
		case "Withdrawn":
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
		case "Processing":
			return <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mr-1"></div>;
		case "Failed":
			return (
				<svg
					className="w-4 h-4 mr-1"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M6 18L18 6M6 6l12 12"
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

const Transactions: React.FC = () => {
	const queryClient = useQueryClient();
	const { currentUser } = useAuth();

	// Transaction state and modals
	const [transactionModalOpen, setTransactionModalOpen] = useState<boolean>(false);
	const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

	// Withdrawal flow states
	const [withdrawalModalOpen, setWithdrawalModalOpen] = useState<boolean>(false);
	const [confirmationModalOpen, setConfirmationModalOpen] = useState<boolean>(false);
	const [withdrawalInfo, setWithdrawalInfo] = useState<any>(null);

	// Filter states
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [dateFilterEnabled, setDateFilterEnabled] = useState<boolean>(false);

	// Pagination and transaction accumulation
	const [hasMore, setHasMore] = useState<boolean>(false);
	const [lastId, setLastId] = useState<string | null>(null);
	const [allTransactions, setAllTransactions] = useState<any[]>([]);

	// Transaction details
	const [transactionDetails, setTransactionDetails] = useState<any>(null);
	const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
	const [stripeConnected, setStripeConnected] = useState(false);
	const [withdrawalDetailsModalOpen, setWithdrawalDetailsModalOpen] = useState<boolean>(false);

	// Query for Stripe status
	const { data: stripeStatus, error: stripeStatusError } = useQuery({
		queryKey: ['stripeStatus', currentUser?.uid],
		queryFn: async () => {
			if (!currentUser?.uid) throw new Error('User not authenticated');
			
			const response = await fetch(`/api/creator/stripe-status?userId=${currentUser.uid}`);
			if (!response.ok) throw new Error('Failed to load Stripe account information');
			return response.json();
		},
		enabled: !!currentUser?.uid,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});

	// Update Stripe connection state when query resolves
	useEffect(() => {
		if (stripeStatus) {
			setStripeConnected(stripeStatus.connected);
			setStripeAccountId(stripeStatus.stripeAccountId || null);
		}
	}, [stripeStatus]);

	// Query for balance data
	const { 
		data: balanceData, 
		isLoading: isBalanceLoading, 
		error: balanceError 
	} = useQuery({
		queryKey: ['balance', stripeAccountId],
		queryFn: async () => {
			if (!stripeAccountId) throw new Error('Stripe account ID not available');
			
			const response = await fetch(`/api/stripe/balance?accountId=${stripeAccountId}`);
			if (!response.ok) throw new Error('Failed to fetch balance data');
			return response.json();
		},
		enabled: !!stripeAccountId && stripeConnected,
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: 2,
	});

	// Query for transactions with pagination
	const { 
		data: transactionsData, 
		isLoading: isTransactionsLoading, 
		error: transactionsError,
	} = useQuery({
		queryKey: ['transactions', stripeAccountId, typeFilter, dateFilterEnabled ? date : null, lastId],
		queryFn: async () => {
			if (!stripeAccountId) throw new Error('Stripe account ID not available');
			
			let url = `/api/stripe/transactions?accountId=${stripeAccountId}&limit=25`;
			
			// Add pagination params if needed
			if (lastId) {
				url += `&startingAfter=${lastId}`;
			}

			// Add type filter
			if (typeFilter && typeFilter !== "all-types") {
				url += `&type=${typeFilter}`;
			}

			// Add date filter if enabled
			if (dateFilterEnabled && date) {
				const timestamp = Math.floor(date.getTime() / 1000);
				url += `&created=${timestamp}`;
			}

			const response = await fetch(url);
			if (!response.ok) throw new Error('Failed to fetch transactions');
			
			const data = await response.json();
			
			return data;
		},
		enabled: !!stripeAccountId && stripeConnected,
		staleTime: 1 * 60 * 1000, // 1 minute
		retry: 2,
	});

	// Update transactions when new data comes in
	useEffect(() => {
		if (transactionsData?.transactions) {
			if (lastId) {
				// If we have a lastId, we're loading more - append to existing transactions
				setAllTransactions(prev => [...prev, ...transactionsData.transactions]);
			} else {
				// If no lastId, this is a fresh load - replace all transactions
				setAllTransactions(transactionsData.transactions);
			}
		}
	}, [transactionsData, lastId]);

	// Update pagination state when new data arrives
	useEffect(() => {
		if (transactionsData) {
			setHasMore(transactionsData.hasMore || false);
		}
	}, [transactionsData]);

	// Reset transactions when filters change
	useEffect(() => {
		setAllTransactions([]);
		setLastId(null);
		setHasMore(false);
	}, [typeFilter, statusFilter, dateFilterEnabled, date, searchTerm]);

	// Mutation for withdrawal
	const withdrawalMutation = useMutation({
		mutationFn: async (withdrawalData: any) => {
			if (!stripeAccountId) throw new Error('Stripe account ID not available');
			
			const response = await fetch(`/api/stripe/payouts?accountId=${stripeAccountId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: parseFloat(withdrawalData.amount),
					method: withdrawalData.paymentMethod === "instant" ? "instant" : "standard",
				}),
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to process withdrawal");
			}
			
			return response.json();
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['balance'] });
			queryClient.invalidateQueries({ queryKey: ['transactions'] });
			
			toast("Your withdrawal has been submitted successfully");
			setConfirmationModalOpen(false);

			// Create a transaction object for the modal
			const newTransaction: Transaction = {
				id: data.payout.id,
				description: "Payout to bank account",
				date: new Date().toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
				}),
				status: data.payout.status === "paid" ? "Withdrawn" : "Processing",
				amount: `$${data.payout.amount.toFixed(2)}`,
				type: "payout",
				transactionDate: "",
				userId: "",
				createdAt: "",
				lastUpdated: "",
				isDefault: false,
			};

			setSelectedTransaction(newTransaction);
			setTransactionDetails(data.payout);
			setTransactionModalOpen(true);
		},
		onError: (error) => {
			console.error("Error processing withdrawal:", error);
			toast(error instanceof Error ? error.message : "Failed to process withdrawal");
		},
	});

	// Derived state from queries
	const transactions = useMemo(() => allTransactions || [], [allTransactions]);
	const availableBalance = balanceData?.availableBalance || "0";
	const processingPayments = balanceData?.processingPayments || "0";
	const totalEarnings = balanceData?.totalEarnings || "0";

	// Loading and error states
	const isInitializing = isBalanceLoading || isTransactionsLoading;
	const loadingError = stripeStatusError?.message || balanceError?.message || transactionsError?.message || null;

	// Handle date selection
	const handleDateSelect = (selectedDate: Date | undefined) => {
		setDate(selectedDate);
		if (selectedDate) {
			setDateFilterEnabled(true);
		}
	};

	// Clear date filter
	const clearDateFilter = () => {
		setDate(undefined);
		setDateFilterEnabled(false);
	};

	const handleExportReport = () => {
		// Generate the PDF with the current filtered transactions
		generateTransactionReportPDF(filteredTransactions, {
			totalEarnings,
			processingPayments,
			availableBalance,
		});
	};

	// Handle initiating withdrawal
	// const handleWithdraw = () => {
	// 	setWithdrawalModalOpen(true);
	// };

	// Handle withdrawal form submission
	const handleWithdrawalSubmit = (info: any) => {
		setWithdrawalInfo(info);
		setWithdrawalModalOpen(false);
		setConfirmationModalOpen(true);
	};

	// Handle withdrawal confirmation
	const handleConfirmWithdrawal = () => {
		if (withdrawalInfo) {
			withdrawalMutation.mutate(withdrawalInfo);
		}
	};

	// Load more transactions for pagination
	const loadMoreTransactions = () => {
		if (hasMore && !isTransactionsLoading && allTransactions.length > 0) {
			const newLastId = allTransactions[allTransactions.length - 1].id;
			setLastId(newLastId);
			// The query will automatically refetch when lastId changes due to the queryKey dependency
		}
	};

	// Filter transactions based on search, type, and status
	const filteredTransactions = useMemo(() => {
		return transactions?.filter((transaction: { description: string; amount: string; type: string; status: string; }) => {
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

	// Show error state if Stripe is not connected
	if (!stripeConnected && !isInitializing && stripeStatus) {
		return (
			<div className="px-4 w-[70rem] mx-auto font-satoshi pt-10">
				<div className="flex flex-col items-center justify-center py-20">
					<p className="text-red-500 mb-4 text-center">
						Stripe account not connected. Please connect your Stripe account to view transactions.
					</p>
					<Link href="/settings/payments">
						<Button className="bg-black text-white">
							Connect Stripe Account
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 w-[70rem] mx-auto font-satoshi pt-10">
			{/* Header with Month Filter and Export/Settings buttons */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="flex items-center gap-2 border-gray-300"
								disabled={isInitializing}
							>
								<CalendarIcon className="h-4 w-4" />
								<span>
									{dateFilterEnabled && date 
										? date.toLocaleDateString("en-US", {
												year: "numeric",
												month: "short",
												day: "numeric",
											})
										: "Filter by Date"
									}
								</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0">
							<Calendar
								mode="single"
								selected={date}
								onSelect={handleDateSelect}
								className="rounded-md border bg-white"
							/>
						</PopoverContent>
					</Popover>
					
					{/* Clear date filter button */}
					{dateFilterEnabled && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearDateFilter}
							className="text-gray-500 hover:text-gray-700"
							disabled={isInitializing}
						>
							Clear Date Filter
						</Button>
					)}
				</div>

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
					{/* <Button
						className="mt-2 bg-green-500 hover:bg-green-600 text-white"
						onClick={handleWithdraw}
						disabled={isInitializing || parseFloat(availableBalance) <= 0 || withdrawalMutation.isPending}
					>
						{withdrawalMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : null}
						Withdraw
					</Button> */}
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
				{isInitializing && allTransactions.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
						<p className="text-gray-500">Loading transaction data...</p>
					</div>
				) : loadingError ? (
					<div className="flex flex-col items-center justify-center py-10">
						<p className="text-red-500 mb-2">{loadingError}</p>
						<Button 
							variant="outline" 
							onClick={() => {
								queryClient.invalidateQueries({ queryKey: ['balance'] });
								queryClient.invalidateQueries({ queryKey: ['transactions'] });
							}}
						>
							Try Again
						</Button>
					</div>
				) : filteredTransactions.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10">
						<p className="text-gray-500 mb-2">No transactions found</p>
						{(searchTerm || typeFilter || statusFilter || dateFilterEnabled) && (
							<Button
								variant="outline"
								onClick={() => {
									setSearchTerm("");
									setTypeFilter("");
									setStatusFilter("");
									clearDateFilter();
								}}
							>
								Clear All Filters
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
								</tr>
							</thead>
							<tbody className="divide-y">
								{filteredTransactions.map((transaction: { id: React.Key | null | undefined; description: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; type: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; date: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; status: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; amount: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => (
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
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Load More Button */}
				{hasMore && !isInitializing && (
					<div className="flex justify-center mt-4">
						<Button
							variant="outline"
							onClick={loadMoreTransactions}
							className="border-gray-300"
							disabled={isTransactionsLoading}
						>
							{isTransactionsLoading ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : null}
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
				isLoading={withdrawalMutation.isPending}
			/>
		</div>
	);
};

export default Transactions;