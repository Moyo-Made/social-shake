"use client";

import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchPaymentMethods } from "@/services/paymentMethodService";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { generateTransactionPDF, generateWithdrawalPDF } from "./GeneratePDFs";


// Types - Updated to match actual API response
interface PaymentMethod {
	id: string;
	type: string; // 'bank', 'paypal', 'card', etc.
	userId: string;
	createdAt: string;
	lastUpdated: string;
	isDefault: boolean;
	// Bank specific fields
	accountHolderName?: string;
	accountEnding?: string;
	routingNumberEnding?: string;
	bankName?: string;
	// PayPal specific fields
	paypalEmail?: string;
	// Card specific fields
	cardType?: string;
	cardEnding?: string;
	expiryDate?: string;
}

interface WithdrawalInfo {
	amount: string;
	paymentMethod: PaymentMethod | null;
}

interface WithdrawalModalProps {
	isOpen: boolean;
	onClose: () => void;
	availableBalance: string;
	onSubmit: (withdrawalInfo: WithdrawalInfo) => void;
}

interface ConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	withdrawalInfo: WithdrawalInfo;
	onConfirm: () => void;
	isLoading?: boolean; 
}


// Payment method rendering components
const BankIcon = () => <div className="text-xl">🏦</div>;

const PaypalIcon = () => (
	<div className="text-xl">
		<Image src="/icons/paypal.svg" alt="Paypal" width={30} height={30} />
	</div>
);

const CardIcon = () => <div className="text-xl">💳</div>;

// Modal to select payment method and amount
export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
	isOpen,
	onClose,
	availableBalance,
	onSubmit,

}) => {
	const [amount, setAmount] = useState("");
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
		null
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getPaymentMethods = async () => {
			setIsLoading(true);
			setError("");
			try {
				// Fetch payment methods from API
				const methods = await fetchPaymentMethods();
				setPaymentMethods(methods);

				// Set default payment method if available

				const defaultMethod = methods.find(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(method: { isDefault: any }) => method.isDefault
				);
				if (defaultMethod) {
					setSelectedMethod(defaultMethod);
				}
			} catch (err) {
				setError("Failed to load payment methods. Please try again.");
				console.error("Error fetching payment methods:", err);
			} finally {
				setIsLoading(false);
			}
		};

		if (isOpen) {
			getPaymentMethods();
		}
	}, [isOpen]);

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Remove non-numeric characters except for decimal point
		const value = e.target.value.replace(/[^\d.]/g, "");

		// Allow only one decimal point
		const parts = value.split(".");
		if (parts.length > 2) {
			return;
		}

		// Check if the amount is valid
		const numValue = parseFloat(value);
		const maxAmount = parseFloat(availableBalance.replace(/[^0-9.]/g, ""));

		if (numValue > maxAmount) {
			setError(
				`Cannot withdraw more than your available balance of $${maxAmount.toFixed(2)}`
			);
		} else {
			setError("");
		}

		setAmount(value);
	};

	const handleSelectMethod = (method: PaymentMethod) => {
		setSelectedMethod(method);
	};

	const handleSubmit = () => {
		// Validate amount
		if (!amount || parseFloat(amount) <= 0) {
			setError("Please enter a valid amount");
			return;
		}

		// Validate payment method
		if (!selectedMethod) {
			setError("Please select a payment method");
			return;
		}

		// Submit withdrawal info
		onSubmit({
			amount,
			paymentMethod: selectedMethod,
		});
	};



	// Get the method icon based on the payment method type
	const getMethodIcon = (type: string) => {
		switch (type.toLowerCase()) {
			case "bank":
				return <BankIcon />;
			case "paypal":
				return <PaypalIcon />;
			case "card":
				return <CardIcon />;
			default:
				return <BankIcon />;
		}
	};

	// Get display name for a payment method
	const getMethodName = (method: PaymentMethod): string => {
		switch (method.type.toLowerCase()) {
			case "bank":
				return method.bankName || "Bank Account";
			case "paypal":
				return "PayPal";
			case "card":
				return `${method.cardType || "Card"}`;
			default:
				return method.type.charAt(0).toUpperCase() + method.type.slice(1);
		}
	};

	// Get the masked account number or other identifier to display
	//   const getMaskedAccount = (method: PaymentMethod): string | null => {
	//     switch (method.type.toLowerCase()) {
	//       case 'bank':
	//         return method.accountEnding || null;
	//       case 'paypal':
	//         return method.paypalEmail || null;
	//       case 'card':
	//         return method.cardEnding ? `****${method.cardEnding}` : null;
	//       default:
	//         return null;
	//     }
	//   };

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-white sm:max-w-lg font-satoshi">
				<DialogHeader>
					<DialogTitle className="text-center text-xl font-semibold mb-4">
						Withdraw Funds
					</DialogTitle>
				</DialogHeader>

				{/* Available Balance */}
				<div className="bg-[#FFF4EE] p-4 mb-4">
					<div className="flex justify-between items-center">
						<span className="text-[#667085] text-base">Available Balance:</span>
						<span className="text-black text-xl font-semibold">
							${availableBalance}
						</span>
					</div>
				</div>

				{/* Amount Input */}
				<div className="mb-4">
					<label htmlFor="amount" className="block font-medium mb-2">
						Amount to Withdraw
					</label>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<span className="text-gray-500 sm:text-sm">$</span>
						</div>
						<Input
							id="amount"
							type="text"
							placeholder="0.00"
							className="pl-8 pr-12"
							value={amount}
							onChange={handleAmountChange}
						/>
					</div>
					{error && <p className="text-red-500 text-sm mt-1">{error}</p>}
				</div>

				{/* Payment Methods */}
				<div>
					<label className="block font-medium mb-2">Withdraw To</label>

					{isLoading ? (
						<div className="flex justify-center p-4">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
						</div>
					) : paymentMethods.length === 0 ? (
						<div className="text-center p-4 border border-dashed border-gray-300 rounded-md">
							<p className="text-gray-500">
								No payment methods found. Please add a payment method.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{paymentMethods.map((method) => (
								<div
									key={method.id}
									className={`border rounded-lg p-4 flex items-center cursor-pointer ${
										selectedMethod?.id === method.id
											? "border-orange-500 bg-orange-50"
											: "border-gray-200 hover:border-gray-300"
									}`}
									onClick={() => handleSelectMethod(method)}
								>
									{getMethodIcon(method.type)}
									<div className="ml-3 flex-1">
										<div className="font-medium">{getMethodName(method)}</div>
										<div className="text-sm text-gray-500">
											{method.type === "bank" && method.accountEnding}
											{method.type === "paypal" && method.paypalEmail}
											{method.type === "card" &&
												`${method.cardType || "Card"} ending in ${method.cardEnding}`}
										</div>
									</div>
									{method.isDefault && (
										<span className="text-sm text-[#20D5EC] bg-[#F1FEFB] px-3 py-1 rounded-full">
											Default
										</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				<DialogFooter className="flex justify-between mt-6">
					<Button
						variant="outline"
						className="border-none shadow-none"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!amount || !selectedMethod || isLoading || !!error}
						className="bg-black text-white hover:bg-gray-800"
					>
						Continue <span className="ml-2">→</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// Modal to confirm withdrawal
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	onClose,
	withdrawalInfo,
	onConfirm,
}) => {
	const [isConfirmed, setIsConfirmed] = useState(false);

	// Reset the checkbox when the modal opens
	useEffect(() => {
		if (isOpen) {
			setIsConfirmed(false);
		}
	}, [isOpen]);

	// Get the payment method name
	const getMethodName = (method: PaymentMethod | null): string => {
		if (!method) return "";

		switch (method.type.toLowerCase()) {
			case "bank":
				return method.bankName || "bank account";
			case "paypal":
				return "PayPal account";
			case "card":
				return `${method.cardType || "card"}`;
			default:
				return method.type;
		}
	};

	// Get the masked account number or other identifier
	const getMaskedAccount = (method: PaymentMethod | null): string | null => {
		if (!method) return null;

		switch (method.type.toLowerCase()) {
			case "bank":
				return method.accountEnding || null;
			case "paypal":
				return method.paypalEmail || null;
			case "card":
				return method.cardEnding ? `****${method.cardEnding}` : null;
			default:
				return null;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-white sm:max-w-lg font-satoshi">
				<DialogHeader>
					<DialogTitle className="text-center text-xl font-semibold mb-4">
						Withdraw Funds
					</DialogTitle>
				</DialogHeader>

				{/* Withdrawal Summary */}
				<div className="bg-[#FFF4EE] p-6 rounded-md mb-2">
					<h3 className="text-lg font-medium mb-4">Withdrawal Summary</h3>

					<div className="space-y-3">
						<div className="flex justify-between">
							<span className="text-gray-600">Amount:</span>
							<span className="font-medium">${withdrawalInfo?.amount}</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-600">Destination:</span>
							<span className="font-medium">
								{getMethodName(withdrawalInfo?.paymentMethod)}
								{getMaskedAccount(withdrawalInfo?.paymentMethod) &&
									` (${getMaskedAccount(withdrawalInfo?.paymentMethod)})`}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-600">Processing Time:</span>
							<span className="font-medium">1-3 business days</span>
						</div>
					</div>
				</div>

				{/* Confirmation Checkbox */}
				<div className="flex items-center space-x-2 mb-4">
					<Checkbox
						id="confirmation"
						checked={isConfirmed}
						onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
					/>
					<label htmlFor="confirmation" className="text-sm text-gray-700">
						I confirm that I want to withdraw ${withdrawalInfo?.amount} to my{" "}
						{getMethodName(withdrawalInfo?.paymentMethod)}.
					</label>
				</div>

				<DialogFooter className="flex justify-between">
					<Button
						variant="outline"
						className="border-none shadow-none"
						onClick={onClose}
					>
						Back
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!isConfirmed}
						className="bg-orange-500 text-white hover:bg-orange-600"
					>
						Confirm Withdrawal <span className="ml-1">→</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// Modal to view transaction details
export interface TransactionModalProps {
	isOpen: boolean;
	onClose: () => void;
	transaction: Transaction;
	details?: Record<string, unknown>;
}

// Types
export interface Transaction {
	date: string;
	id: string;
	transactionDate: string;
	description: string;
	amount: string;
	status: "Withdrawn" | "Processing" | "Processed";
	type: string;
	userId: string;
	createdAt: string;
	lastUpdated: string;
	isDefault: boolean;
	paymentMethod?: {
		type: string;
		name: string;
		maskedAccount: string;
	};
	projectName?: string;
	brand?: string;
	processingTime?: string;
	// Optional fields for payment timeline
	completedAt?: string;
	processingStartedAt?: string;
	processedAt?: string;
}

// Modal to view withdrawal details
export const WithdrawalDetailsModal: React.FC<TransactionModalProps> = ({
	isOpen,
	onClose,
	transaction,
}) => {
	const handleGenerateWidthrawalReceipt = () => {
		generateWithdrawalPDF(transaction)
	}
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-white sm:max-w-lg font-satoshi">
				<DialogHeader className="mb-2">
					<DialogTitle className="text-xl text-center">
						<span className="font-semibold"> Transaction Details </span>
						<span
							className={` ${
								transaction.status === "Withdrawn"
									? "bg-green-50 font-medium text-sm text-green-700 border border-green-200 rounded-full px-3 py-1"
									: "text-orange-500"
							}`}
						>
							{transaction.status}
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="bg-[#FFF4EE] p-4 rounded-lg space-y-2">
					<div className="flex justify-between items-center py-2 border-b border-gray-100">
						<span className="text-gray-600">Transaction ID</span>
						<span className="font-medium">{transaction.id}</span>
					</div>

					<div className="flex justify-between items-center py-2 border-b border-gray-100">
						<span className="text-gray-600">Date</span>
						<span className="font-medium">{transaction.transactionDate}</span>
					</div>

					{transaction.paymentMethod && (
						<div className="flex justify-between items-center py-2 border-b border-gray-100">
							<span className="text-gray-600">Withdrawal Method</span>
							<span className="font-medium">
								{transaction.paymentMethod.name}
							</span>
						</div>
					)}
					<div className="flex justify-between items-center py-2 border-b border-gray-100">
						<span className="text-gray-600">Amount</span>
						<span className="font-medium text-lg">${transaction.amount}</span>
					</div>
				</div>

				<DialogFooter className="flex items-center justify-between mt-6">
					<Link
						href="/creator/dashboard/help-support"
						className="border-none shadow-none mr-2"
						
					>
						Report Issue
					</Link>
					<Button
						className="bg-orange-500 text-white hover:bg-orange-600 px-3 "
						onClick={handleGenerateWidthrawalReceipt}
					>
						Download Receipt
						<svg
							className="ml-1 w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export const TransactionModal = ({
	isOpen,
	onClose,
	transaction,
}: TransactionModalProps) => {
	// Timeline status states
	const [projectCompleted] = useState(true);
	const [processingStarted] = useState(true);
	const [paymentProcessed, setPaymentProcessed] = useState(false);

	const handleGenerateTransactionPDF = () => {
		generateTransactionPDF(transaction, true)
	}

	// Simulate payment processing completion
	useEffect(() => {
		if (isOpen && processingStarted && !paymentProcessed) {
			const timer = setTimeout(() => {
				setPaymentProcessed(true);
			}, 5000); // Complete after 5 seconds

			return () => clearTimeout(timer);
		}
	}, [isOpen, processingStarted, paymentProcessed]);

	// Determine if payment data or withdrawal data should be shown
	const isPayment = transaction?.type?.toLowerCase() !== "withdrawal";

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-white sm:max-w-lg font-satoshi">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold flex items-center justify-center">
						Transaction Details
						<span
							className={`inline-flex ml-2 px-3 py-1 text-sm rounded-full font-medium ${
								paymentProcessed
									? "bg-green-100 text-green-800"
									: transaction.status === "Withdrawn"
										? "bg-green-100 text-green-800"
										: "bg-yellow-100 text-[#1A1A1A]"
							}`}
						>
							{paymentProcessed ? "Processed" : transaction.status}
						</span>
					</DialogTitle>
				</DialogHeader>

				{/* Transaction Info */}
				<div className="bg-[#FFF4EE] p-6 rounded-md">
					<div className="space-y-3">
						<div className="flex justify-between">
							<span className="text-gray-600">Transaction ID:</span>
							<span className="font-medium">{transaction.id}</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-600">Date:</span>
							<span className="font-medium">{transaction.transactionDate}</span>
						</div>

						{isPayment && transaction.projectName && (
							<div className="flex justify-between">
								<span className="text-gray-600">Project Name:</span>
								<span className="font-medium">{transaction.projectName}</span>
							</div>
						)}

						{isPayment && transaction.brand && (
							<div className="flex justify-between">
								<span className="text-gray-600">Brand:</span>
								<span className="font-medium">{transaction.brand}</span>
							</div>
						)}

						{!isPayment && transaction.paymentMethod && (
							<div className="flex justify-between">
								<span className="text-gray-600">Withdrawal Method:</span>
								<span className="font-medium">
									{transaction.paymentMethod.name}
									{transaction.paymentMethod.maskedAccount &&
										`(****${transaction.paymentMethod.maskedAccount})`}
								</span>
							</div>
						)}

						<div className="flex justify-between">
							<span className="text-gray-600">Amount:</span>
							<span className="font-medium text-lg">${transaction.amount}</span>
						</div>
					</div>
				</div>

				{/* Timeline Section */}
				{isPayment ? (
					<div className="mt-6">
						{/* Payment Timeline */}
						<div className="relative">
							{/* Project Completed Step */}
							<div className="flex">
								<div className="flex flex-col items-center">
									<div
										className={`w-12 h-12 rounded-full flex items-center justify-center ${
											projectCompleted
												? "bg-orange-500 border-4 border-orange-200"
												: "bg-gray-300 border-4 border-gray-200"
										}`}
									>
										<Check className="text-white" size={24} />
									</div>

									{/* Dotted line connecting to next step */}
									<div
										className="w-0.5 h-16"
										style={{
											backgroundImage:
												"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
											backgroundSize: "1px 8px",
										}}
									></div>
								</div>

								<div className="ml-4 mb-16">
									<h3 className="font-medium text-base">Project Completed</h3>
									<p className="text-gray-500 text-sm">
										March 20, 2025 at 2:45 PM
									</p>
								</div>
							</div>

							{/* Payment Processing Started Step */}
							<div className="flex">
								<div className="flex flex-col items-center">
									<div
										className={`w-12 h-12 rounded-full flex items-center justify-center ${
											processingStarted
												? "bg-orange-500 border-4 border-orange-200"
												: "bg-gray-300 border-4 border-gray-200"
										}`}
									>
										<Check className="text-white" size={24} />
									</div>

									{/* Dotted line connecting to next step */}
									<div
										className="w-0.5 h-16"
										style={{
											backgroundImage:
												"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
											backgroundSize: "1px 8px",
										}}
									></div>
								</div>

								<div className="ml-4 mb-16">
									<h3 className="font-medium text-base">
										Payment Processing Started
									</h3>
									<p className="text-gray-500 text-sm">
										March 20, 2025 at 3:00 PM
									</p>
								</div>
							</div>

							{/* Payment Processed Step */}
							<div className="flex">
								<div className="flex flex-col items-center">
									<div
										className={`w-12 h-12 rounded-full flex items-center justify-center ${
											paymentProcessed
												? "bg-orange-500 border-4 border-orange-200"
												: "bg-gray-300 border-4 border-gray-200"
										}`}
									>
										<Check className="text-white" size={24} />
									</div>
								</div>

								<div className="ml-4">
									<h3 className="font-medium text-base">Payment Processed</h3>
									<p className="text-gray-500 text-sm">
										{paymentProcessed
											? "March 24, 2025 at 10:15 AM"
											: "Pending..."}
									</p>
								</div>
							</div>
						</div>
					</div>
				) : (
					// If it's a withdrawal, don't show timeline
					<div className="mt-6 text-center text-gray-500">
						Your withdrawal has been processed successfully.
					</div>
				)}

				<DialogFooter className="flex justify-between mt-6">
					<Button
						variant="outline"
						className="border-none shadow-none"
						onClick={onClose}
					>
						Close
					</Button>
					<Button
						className="bg-orange-500 text-white hover:bg-orange-600 px-3"
						onClick={handleGenerateTransactionPDF}
					>
						Download Receipt
						<svg
							className="ml-1 w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
