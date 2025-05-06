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
  InfoIcon
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// import TransactionModal from "./TransactionModal"; // Keep the original modal component

// Define Transaction type
type TransactionStatus = "Withdrawn" | "Processing";

interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: string;
  status: TransactionStatus;
}

// Mock data for Transactions
const transactions: Transaction[] = [
  {
    id: "1",
    transactionDate: "March 24, 2025",
    description: "Withdrawal to Bank Account",
    amount: "2000",
    status: "Withdrawn",
  },
  {
    id: "2",
    transactionDate: "March 24, 2025",
    description: "Payment of Summer Skincare Routine Contest",
    amount: "10000",
    status: "Processing",
  },
];

// Helper function to get status badge styling
const getStatusBadgeStyle = (status: TransactionStatus): string => {
  switch (status) {
    case "Withdrawn":
      return "bg-green-50 text-sm text-green-700 border border-green-200 rounded-full flex items-center justify-center px-3 py-1";
    case "Processing":
      return "bg-[#FFF0C3] text-sm text-[#1A1A1A] border border-[#FDD849] rounded-full flex items-center justify-center px-3 py-1";
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
    default:
      return null;
  }
};

const Transactions: React.FC = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleViewTransaction = (transaction: Transaction): void => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  // Filter transactions based on search, type, and status
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
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
  }, [searchTerm, typeFilter, statusFilter]);

  return (
    <div className="px-4 max-w-5xl mx-auto">
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
        <p className="text-sm text-[#BE4501]">Payments are typically processed within 5-7 business days after project completion or commission payout</p>
      </div>

      {/* Earnings cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 shadow-sm border-gray-200">
          <div className="flex flex-col items-center justify-center">
            <p className="text-lg text-gray-900 mb-2">Total Earnings</p>
            <h2 className="text-3xl font-semibold text-gray-900">$12,250</h2>
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-gray-200">
          <div className="flex flex-col items-center justify-center">
            <p className="text-lg text-gray-900 mb-2">Processing Payments</p>
            <h2 className="text-3xl font-semibold text-gray-900">$2,000</h2>
            <div className="flex items-center mt-2 text-orange-600">
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>5-7 business</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-gray-200">
          <div className="flex flex-col items-center justify-center">
            <p className="text-lg text-gray-900 mb-2">Available for Withdrawal</p>
            <h2 className="text-3xl font-semibold text-gray-900">$1,250</h2>
            <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white w-full">
              <span className="mr-2">💳</span>
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
          <SelectContent>
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
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
            <SelectItem value="Withdrawn">Withdrawn</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Table */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 bg-gray-50 p-4 text-gray-600 text-sm font-medium">
          <div className="col-span-1">Transaction Date</div>
          <div className="col-span-1">Description</div>
          <div className="col-span-1">Amount</div>
          <div className="col-span-1 flex justify-between">
            <span>Status</span>
            <span></span>
          </div>
        </div>

        {/* Table Body */}
        {filteredTransactions.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-4 p-4 items-center border-t border-gray-200 text-sm text-gray-800"
          >
            <div className="col-span-1">{item.transactionDate}</div>
            <div className="col-span-1">{item.description}</div>
            <div className="col-span-1">${item.amount}</div>
            <div className="col-span-1 flex justify-between items-center">
              <span className={getStatusBadgeStyle(item.status)}>
                {getStatusIcon(item.status)}
                {item.status}
              </span>
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

      {/* Transaction Modal */}
      {/* {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )} */}
    </div>
  );
};

export default Transactions;