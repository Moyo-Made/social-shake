"use client";

import React from "react";

// Transaction Details Modal Component
interface Transaction {
	id: string;
	description: string;
	type: string;
	amount: string;
	status: string;
	paymentDate: string;
	projectCompleted: string;
}

interface TransactionModalProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
	transaction,
	isOpen,
	onClose,
}) => {
	if (!isOpen) return null;

	// Function to generate and download PDF
	const handleDownloadPDF = () => {
		// In a real implementation, you would generate a PDF with the transaction details
		// For now, we'll just create a text file with the transaction info
		const content = `
Transaction Details
Transaction ID: ${transaction.id}
Description: ${transaction.description}
Type: ${transaction.type}
Amount: $${transaction.amount}
Status: ${transaction.status}
Payment Date: ${transaction.paymentDate}
Project Completed: ${transaction.projectCompleted}
    `;

		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Transaction_${transaction.id}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Helper function to get status badge styling
	const getStatusStyle = (status: string) => {
		switch (status) {
			case "Processed":
				return "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647]";
			case "Pending":
				return "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]";
			case "Refunded":
				return "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg w-full max-w-lg relative">
				{/* X button to close modal */}
				<button
					className="absolute top-8 right-4 text-gray-500 hover:text-gray-700"
					onClick={onClose}
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M18 6L6 18M6 6L18 18"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>

				{/* Modal Content */}
				<div className="p-8">
					<h2 className="text-2xl font-semibold text-center mb-2">
						Transaction Details
					</h2>
					<p className="text-gray-500 text-center mb-6">
						Transaction ID: {transaction.id}
					</p>

					<div className="space-y-2">
						<div className="flex gap-10">
							<div>
								<p className="text-[#667085]">Description:</p>
								<p className="text-base text-[#101828] w-60">
									{transaction.description}
								</p>
							</div>

							<div>
								<p className="text-[#667085]">Status</p>
								<div
									className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${getStatusStyle(transaction.status)}`}
								>
									{transaction.status === "Processed" && (
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
									)}
									{(transaction.status === "Pending" ||
										transaction.status === "Refunded") && (
										<div
											className={`w-1 h-1 rounded-full mr-1 ${transaction.status === "Pending" ? "bg-[#1A1A1A]" : "bg-[#F04438]"}`}
										></div>
									)}
									{transaction.status}
								</div>
							</div>
						</div>

						<div className="flex gap-10">
							<div>
								<p className="text-[#667085]">Type:</p>
								<p className="text-base text-[#101828] w-60">
									{transaction.type}
								</p>
							</div>

							<div>
								<p className="text-[#667085]">Payment Date</p>
								<p className="text-base text-[#101828]">
									{transaction.paymentDate}
								</p>
							</div>
						</div>

						<div className="flex gap-10">
							<div>
								<p className="text-[#667085]">Amount:</p>
								<p className="text-base text-[#101828] w-60">
									${transaction.amount}
								</p>
							</div>

							<div>
								<p className="text-[#667085]">Project Completed:</p>
								<p className="text-base text-[#101828]">
									{transaction.projectCompleted}
								</p>
							</div>
						</div>
					</div>

					{/* Download PDF Button */}
					<button
						onClick={handleDownloadPDF}
						className="w-full mt-8 bg-black text-white flex items-center justify-center py-2 rounded-lg hover:bg-gray-800 transition-colors"
					>
						Download PDF
						<svg
							className="ml-2 w-6 h-6"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 12L12 16M12 16L8 12M12 16L12 4"
								stroke="white"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default TransactionModal;
