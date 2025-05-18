"use client";

import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF to include autoTable
declare module "jspdf" {
	interface jsPDF {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		autoTable: (options: any) => void;
		lastAutoTable?: { finalY: number };
	}
}

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
	// Import jsPDF and autoTable (assuming they are already imported at the top of your file)
	// If not imported elsewhere, you'll need to add:
	// import { jsPDF } from "jspdf";
	// import autoTable from "jspdf-autotable";
	
	const doc = new jsPDF();
	
	// Add title
	doc.setFontSize(20);
	doc.text("Transaction Receipt", 105, 20, { align: 'center' });
	
	// Add logo/branding
	doc.setFontSize(12);
	doc.text("Social Shake", 105, 30, { align: 'center' });
	
	// Add status badge
	if (transaction.status === "Processed" || transaction.status === "Completed") {
	  doc.setFillColor(39, 174, 96); // Green color for completed/processed
	  doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
	  doc.setTextColor(255, 255, 255);
	  doc.text(transaction.status, 105, 42, { align: 'center' });
	} else if (transaction.status === "Processing") {
	  doc.setFillColor(255, 193, 7); // Yellow color for processing
	  doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
	  doc.setTextColor(0, 0, 0);
	  doc.text(transaction.status, 105, 42, { align: 'center' });
	} else {
	  doc.setFillColor(220, 220, 220); // Gray for other statuses
	  doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
	  doc.setTextColor(0, 0, 0);
	  doc.text(transaction.status, 105, 42, { align: 'center' });
	}
	doc.setTextColor(0, 0, 0);
	
	// Add transaction details
	doc.setFontSize(12);
	doc.text("Transaction Details", 20, 60);
	
	// Create a table for transaction details
	const tableData = [
	  ['Transaction ID', transaction.id],
	  ['Description', transaction.description],
	  ['Type', transaction.type],
	  ['Amount', `$${transaction.amount}`],
	  ['Status', transaction.status],
	  ['Payment Date', transaction.paymentDate || 'N/A'],
	  ['Project Completed', transaction.projectCompleted || 'N/A']
	];
	
	// Generate the auto table
	autoTable(doc, {
	  startY: 65,
	  head: [['Item', 'Details']],
	  body: tableData,
	  theme: 'striped',
	  headStyles: { fillColor: [255, 165, 0] }
	});
	
	// Add timeline if applicable
	if (transaction.projectCompleted) {
	  doc.text("Payment Timeline", 20, (doc.lastAutoTable?.finalY || 150) + 10);
	  
	  const timelineData = [
		['Project Completed', transaction.projectCompleted, '✓'],
		['Processing Started', transaction.paymentDate || 'N/A', transaction.paymentDate ? '✓' : 'Pending'],
		['Payment Processed', transaction.status === "Processed" ? transaction.paymentDate : 'Pending...', 
		  transaction.status === "Processed" ? '✓' : '']
	  ];
  
	  autoTable(doc, {
		startY: (doc.lastAutoTable?.finalY || 150) + 15,
		head: [['Stage', 'Time', 'Status']],
		body: timelineData,
		theme: 'grid',
		headStyles: { fillColor: [255, 165, 0] }
	  });
	}
	
	// Add footer
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
	  doc.setPage(i);
	  doc.setFontSize(10);
	  doc.text(
		`Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
		doc.internal.pageSize.getWidth() / 2,
		doc.internal.pageSize.getHeight() - 10,
		{ align: 'center' }
	  );
	}
	
	// Save the PDF
	doc.save(`transaction-receipt-${transaction.id}.pdf`);
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
											className={`w-1 h-1 text-sm rounded-full mr-1 ${transaction.status === "Pending" ? "bg-[#1A1A1A]" : "bg-[#F04438]"}`}
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
								<p className="text-[#667085]">Payment Status</p>
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
								<p className="text-[#667085]">Payment Date:</p>
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
