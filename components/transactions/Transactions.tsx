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
import TransactionModal from "./TransactionModal";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

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
}

interface TotalTransactions {
	totalSpend: string;
	pendingPayments: string;
	totalProcessed: string;
}

// Mock data for Transactions
const transactions: Transaction[] = [
	{
		id: "781673156",
		transactionDate: "March 24, 2025",
		description: "Summer Skincare Routine Project",
		amount: "2,000",
		type: "Project",
		status: "Processed",
		paymentDate: "March 3rd, 2025",
		projectCompleted: "March 1st, 2025",
		actions: "View Transaction",
	},
	{
		id: "781673157",
		transactionDate: "March 24, 2025",
		description: "Summer Skincare Routine Contest Prizes",
		amount: "5,000",
		type: "Contest",
		status: "Pending",
		paymentDate: "Pending",
		projectCompleted: "March 1st, 2025",
		actions: "View Transaction",
	},
	{
		id: "781673158",
		transactionDate: "March 24, 2025",
		description: "Summer Skincare Routine Refund",
		amount: "10,000",
		type: "Project",
		status: "Refunded",
		paymentDate: "March 20th, 2025",
		projectCompleted: "March 15th, 2025",
		actions: "View Transaction",
	},
	{
		id: "781673159",
		transactionDate: "March 24, 2025",
		description: "Summer Skincare Routine Refund",
		amount: "10,000",
		type: "Project",
		status: "Refunded",
		paymentDate: "March 22nd, 2025",
		projectCompleted: "March 18th, 2025",
		actions: "View Transaction",
	},
];

const totalTransactions: TotalTransactions = {
	totalSpend: "12,250",
	pendingPayments: "4,250",
	totalProcessed: "8,000",
};

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

const Transactions: React.FC = () => {
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	// For demonstration purposes - set to true to test empty state
	const [hasTransactions] = useState<boolean>(true);

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
	}, [searchTerm, typeFilter, statusFilter, hasTransactions]);

	return (
		<div>
			{/* Affiliate Payout Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
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
			<div className="w-[65rem] mx-auto">
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
								<Image src="/icons/money-bag.svg" alt="Bag Icon" width={50} height={50} className="" />
							</div>
							<h2 className="text-xl text-black font-semibold mb-2">
								No Transactions Yet
							</h2>
							<p className="mb-5 text-gray-500 w-1/2 text-center">
								You haven&apos;t made any transactions yet. Your transaction history will appear here once you make your first transaction.
							</p>
							<Button className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 text-center">
								<Link href="/dashboard/projects/new">
								Create a New Project +
								</Link>
							</Button>
						</div>
					) : filteredTransactions.length > 0 ? (
						// We have transactions that match the filters
						filteredTransactions.map((item, index) => (
							<div
								key={index}
								className="grid grid-cols-7 p-3 items-center border-t border-gray-200 text-sm text-[#101828] hover:bg-gray-50"
							>
								<div className="col-span-1 pl-4">{item.transactionDate}</div>
								<div className="col-span-2 pr-4">{item.description}</div>
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
										className={`w-fit px-3 py-1 rounded-full text-sm ${getStatusBadgeStyle(item.status)}`}
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