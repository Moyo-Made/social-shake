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
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
	CalendarIcon,
	DownloadIcon,
	SettingsIcon,
	InfoIcon,
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

	// Financial data
	const [availableBalance, setAvailableBalance] = useState<string>("1,250");
	const [processingPayments, setProcessingPayments] = useState<string>("2,000");
	const [totalEarnings] = useState<string>("12,250");
	const [withdrawalDetailsModalOpen, setWithdrawalDetailsModalOpen] =
		useState<boolean>(false);
	// Transaction state and modals
	const [transactions, setTransactions] = useState<Transaction[]>([
		{
			id: "tx-123456",
			transactionDate: "May 5, 2025",
			description: "Payment for Logo Design Project",
			amount: "750.00",
			status: "Processing",
			type: "payment",
			userId: "user-123",
			createdAt: new Date().toISOString(),
			lastUpdated: new Date().toISOString(),
			isDefault: false,
			projectName: "Logo Design for TechCorp",
			brand: "TechCorp",
			processingTime: "5-7 business days",
			processingStartedAt: new Date().toISOString(),
		},
		{
			id: "tx-654321",
			transactionDate: "April 28, 2025",
			description: "Withdrawal to Bank Account",
			amount: "500.00",
			status: "Withdrawn",
			type: "withdrawal",
			userId: "user-123",
			createdAt: new Date().toISOString(),
			lastUpdated: new Date().toISOString(),
			isDefault: false,
			paymentMethod: {
				type: "bank",
				name: "Chase Bank",
				maskedAccount: "4567",
			},
			processingTime: "1-3 business days",
		},
	]);

  const handleExportReport = () => {

    // Generate the PDF with the current filtered transactions
	generateTransactionReportPDF(transactions, {
		totalEarnings,
		processingPayments,
		availableBalance,
	});
  };

	const handleViewTransaction = (transaction: Transaction): void => {
		setSelectedTransaction(transaction);

		// Show different modals based on transaction status
		if (transaction.status === "Withdrawn") {
			setWithdrawalDetailsModalOpen(true);
		} else {
			setTransactionModalOpen(true);

			// If transaction is "Processing", update it to "Processed" after a delay
			if (transaction.status === "Processing") {
				// Update the status to "Processed" after 5 seconds (simulating processing completion)
				setTimeout(() => {
					setTransactions(
						(prevTransactions) =>
							prevTransactions?.map((tx) =>
								tx.id === transaction.id
									? { ...tx, status: "Processed" as TransactionStatus }
									: tx
							) || []
					);

					// Also update the selected transaction to reflect the change
					setSelectedTransaction((prev) =>
						prev ? { ...prev, status: "Processed" as TransactionStatus } : null
					);
				}, 5000);
			}
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

	// Handle withdrawal confirmation
	const handleConfirmWithdrawal = () => {
		// Close the confirmation modal
		setConfirmationModalOpen(false);

		// Create a payment method object from the withdrawalInfo
		const paymentMethod = {
			type: withdrawalInfo.paymentMethod?.type || "",
			name: getPaymentMethodDisplayName(withdrawalInfo.paymentMethod),
			maskedAccount: getPaymentMethodMaskedAccount(
				withdrawalInfo.paymentMethod
			),
		};

		// Create a new transaction record
		const newTransaction: Transaction = {
			id: `tx-${Date.now().toString().slice(-6)}`, // Generate a simple ID
			transactionDate: new Date().toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			}),
			description: `Withdrawal to ${getPaymentMethodDisplayName(withdrawalInfo.paymentMethod)}`,
			amount: withdrawalInfo.amount,
			status: "Withdrawn",
			type: withdrawalInfo.paymentMethod?.type || "withdrawal",
			paymentMethod: paymentMethod,
			processingTime: "1-3 business days",
			userId: withdrawalInfo.paymentMethod?.userId || "",
			createdAt: new Date().toISOString(),
			lastUpdated: new Date().toISOString(),
			isDefault: false,
		};

		// Add the new transaction to the list
		setTransactions([newTransaction, ...(transactions || [])]);

		// Update the balances
		const withdrawalAmount = parseFloat(withdrawalInfo.amount);
		const currentAvailable = parseFloat(availableBalance.replace(/,/g, ""));
		const newAvailable = currentAvailable - withdrawalAmount;
		const currentProcessing = parseFloat(processingPayments.replace(/,/g, ""));
		const newProcessing = currentProcessing + withdrawalAmount;

		// Format with commas
		setAvailableBalance(newAvailable.toLocaleString("en-US"));
		setProcessingPayments(newProcessing.toLocaleString("en-US"));

		// Show the transaction details
		setSelectedTransaction(newTransaction);
		setTransactionModalOpen(false);
	};

	// Helper function to get payment method display name
	const getPaymentMethodDisplayName = (method: any): string => {
		if (!method) return "Unknown Payment Method";

		switch (method.type.toLowerCase()) {
			case "bank":
				return method.bankName || "Bank Account";
			case "paypal":
				return `PayPal (${method.paypalEmail || ""})`;
			case "card":
				return `${method.cardType || "Card"} ending in ${method.cardEnding || ""}`;
			default:
				return method.type.charAt(0).toUpperCase() + method.type.slice(1);
		}
	};

	// Helper function to get masked account
	const getPaymentMethodMaskedAccount = (method: any): string => {
		if (!method) return "";

		switch (method.type.toLowerCase()) {
			case "bank":
				return method.accountEnding || "";
			case "paypal":
				return method.paypalEmail || "";
			case "card":
				return method.cardEnding ? `****${method.cardEnding}` : "";
			default:
				return "";
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
			const matchesType = typeFilter === "" || typeFilter === "all-types";

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
					<PopoverContent className="w-auto p-0 bg-white" align="start">
						<Calendar
							mode="single"
							selected={date}
							onSelect={setDate}
							initialFocus
						/>
					</PopoverContent>
				</Popover>

				<div className="flex gap-3">
					<Button
						variant="outline"
						className="bg-black text-white hover:bg-gray-800 px-6"
            onClick={handleExportReport}
					>
						<DownloadIcon className="h-5 w-5 mr-1" />
						Export
					</Button>
					<Link href="/creator/dashboard/settings">
						<Button
							variant="outline"
							className="bg-neutral-900 text-white hover:bg-gray-800 px-4"
						>
							<SettingsIcon className="h-5 w-5 mr-1" />
							Payment Settings
						</Button>
					</Link>
				</div>
			</div>

			{/* Info banner */}
			<div className="bg-[#FDEFE7] p-3 rounded-lg mb-6 flex justify-center items-center">
				<InfoIcon className="h-5 w-5 text-orange-500 mr-2" />
				<p className="text-sm text-[#BE4501]">
					Payments are typically processed within 5-7 business days after
					project completion or commission payout
				</p>
			</div>

			{/* Earnings cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<Card className="p-6 shadow-sm border-gray-200">
					<div className="flex flex-col items-center justify-center">
						<p className="text-lg text-gray-900 mb-2">Total Earnings</p>
						<h2 className="text-3xl font-semibold text-gray-900">
							${totalEarnings}
						</h2>
					</div>
				</Card>

				<Card className="p-6 shadow-sm border-gray-200">
					<div className="flex flex-col items-center justify-center">
						<p className="text-lg text-gray-900 mb-2">Processing Payments</p>
						<h2 className="text-3xl font-semibold text-gray-900">
							${processingPayments}
						</h2>
						<div className="flex items-center mt-2 text-orange-600">
							<CalendarIcon className="h-4 w-4 mr-1" />
							<span>5-7 business days</span>
						</div>
					</div>
				</Card>

				<Card className="p-6 shadow-sm border-gray-200">
					<div className="flex flex-col items-center justify-center">
						<p className="text-lg text-gray-900 mb-2">
							Available for Withdrawal
						</p>
						<h2 className="text-3xl font-semibold text-gray-900">
							${availableBalance}
						</h2>
						<Button
							className="mt-4 bg-green-700 hover:bg-green-800 text-white w-full"
							onClick={handleWithdraw}
							disabled={parseFloat(availableBalance.replace(/,/g, "")) <= 0}
						>
							<span className="mr-1">💳</span>
							Withdraw
						</Button>
					</div>
				</Card>
			</div>

			{/* Search and filters */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="relative">
					<Input
						type="text"
						className="pl-10 pr-4 py-2 w-full"
						placeholder="Search Transactions"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
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
				</div>

				<Select
					value={typeFilter}
					onValueChange={(value: string) => setTypeFilter(value)}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Filter by Type" />
					</SelectTrigger>
					<SelectContent className="bg-white">
						<SelectItem value="all-types">All Types</SelectItem>
						<SelectItem value="withdrawal">Withdrawal</SelectItem>
						<SelectItem value="payment">Payment</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={statusFilter}
					onValueChange={(value: string) => setStatusFilter(value)}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Filter by Status" />
					</SelectTrigger>
					<SelectContent className="bg-white">
						<SelectItem value="all-statuses">All Statuses</SelectItem>
						<SelectItem value="Withdrawn">Withdrawn</SelectItem>
						<SelectItem value="Processing">Processing</SelectItem>
						<SelectItem value="Processed">Processed</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Transaction Table */}
			{transactions?.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 border border-gray-200 rounded-md">
					<h2 className="text-2xl font-medium mb-2">No transactions yet</h2>
					<p className="text-gray-600">
						Your transactions will appear here once you start earning.
					</p>
				</div>
			) : filteredTransactions?.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 border border-gray-200 rounded-md">
					<h2 className="text-2xl font-medium mb-2">No Search Results</h2>
					<p className="text-gray-600 mb-6">
						We couldn&apos;t find any transactions matching your search
						criteria. Try adjusting your search.
					</p>
					<Button
						variant="outline"
						className="bg-black text-white hover:bg-gray-800 px-8"
						onClick={() => {
							setSearchTerm("");
							setTypeFilter("");
							setStatusFilter("");
						}}
					>
						Clear Search
					</Button>
				</div>
			) : (
				<div className="border border-gray-200 rounded-md overflow-hidden">
					{/* Table Header */}
					<div className="grid grid-cols-6 bg-gray-50 p-4 text-gray-600 text-sm font-medium">
						<div className="col-span-1">Transaction Date</div>
						<div className="col-span-2">Description</div>
						<div className="col-span-1">Amount</div>
						<div className="col-span-1 ">
							<span>Status</span>
						</div>
						<div className="col-span-1 ">
							<span>Actions</span>
						</div>
					</div>

					{/* Table Body */}
					{filteredTransactions?.map((item, index) => (
						<div
							key={index}
							className="grid grid-cols-6 p-4 items-center border-t border-gray-200 text-sm text-gray-800"
						>
							<div className="col-span-1">{item.transactionDate}</div>
							<div className="col-span-2">{item.description}</div>
							<div className="col-span-1">${item.amount}</div>
							<div className="col-span-1">
								<span className={getStatusBadgeStyle(item.status)}>
									{getStatusIcon(item.status)}
									{item.status}
								</span>
							</div>
							<div className="col-span-1">
								<button
									className="text-orange-500 hover:underline"
									onClick={() => handleViewTransaction(item)}
								>
									View Transaction
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Transaction Modal */}
			{selectedTransaction && (
				<TransactionModal
					transaction={selectedTransaction}
					isOpen={transactionModalOpen}
					onClose={() => setTransactionModalOpen(false)}
				/>
			)}

			{/* Withdrawal Modal */}
			<WithdrawalModal
				isOpen={withdrawalModalOpen}
				onClose={() => setWithdrawalModalOpen(false)}
				onSubmit={handleWithdrawalSubmit}
				availableBalance={parseFloat(
					availableBalance.replace(/,/g, "")
				).toString()}
			/>

			{/* WithdrawalDetailsModal - For Withdrawn transactions */}
			{selectedTransaction && (
				<WithdrawalDetailsModal
					transaction={selectedTransaction}
					isOpen={withdrawalDetailsModalOpen}
					onClose={() => setWithdrawalDetailsModalOpen(false)}
				/>
			)}

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={confirmationModalOpen}
				onClose={() => setConfirmationModalOpen(false)}
				onConfirm={handleConfirmWithdrawal}
				withdrawalInfo={withdrawalInfo}
			/>
		</div>
	);
};

export default Transactions;
