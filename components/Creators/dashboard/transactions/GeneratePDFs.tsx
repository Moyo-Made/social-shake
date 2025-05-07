/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction } from "./WithdrawModal";

// Extend jsPDF to include autoTable
declare module "jspdf" {
	interface jsPDF {
		autoTable: (options: any) => void;
	}
}

// Helper functions for PDF generation
export const generateWithdrawalPDF = (transaction: Transaction) => {
	const doc = new jsPDF();
	
	// Add title
	doc.setFontSize(20);
	doc.text("Withdrawal Receipt", 105, 20, { align: 'center' });
	
	// Add logo/branding
	doc.setFontSize(12);
	doc.text("Social Shake", 105, 30, { align: 'center' });
	
	// Add status badge
	doc.setFillColor(39, 174, 96);
	doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
	doc.setTextColor(255, 255, 255);
	doc.text("Withdrawn", 105, 42, { align: 'center' });
	doc.setTextColor(0, 0, 0);
	
	// Add transaction details
	doc.setFontSize(12);
	doc.text("Transaction Details", 20, 60);
	
	// Create a table for transaction details
	const tableData = [
		['Transaction ID', transaction.id],
		['Date', transaction.transactionDate],
		['Withdrawal Method', transaction.paymentMethod?.name || 'N/A'],
		['Amount', `$${transaction.amount}`],
		['Status', transaction.status]
	];
	
	// @ts-@ts-expect-error (jspdf-autotable extension)
	autoTable(doc, {
		startY: 65,
		head: [['Item', 'Details']],
		body: tableData,
		theme: 'striped',
		headStyles: { fillColor: [255, 165, 0] }
	});
	
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
	doc.save(`withdrawal-receipt-${transaction.id}.pdf`);
};


export const generateTransactionPDF = (transaction: Transaction, paymentProcessed: boolean) => {
	const doc = new jsPDF();
	
	// Add title
	doc.setFontSize(20);
	doc.text("Transaction Receipt", 105, 20, { align: 'center' });
	
	// Add logo/branding
	doc.setFontSize(12);
	doc.text("Social Shake", 105, 30, { align: 'center' });
	
	// Add status badge
	if (paymentProcessed) {
		doc.setFillColor(39, 174, 96);
		doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
		doc.setTextColor(255, 255, 255);
		doc.text("Processed", 105, 42, { align: 'center' });
	} else {
		doc.setFillColor(255, 193, 7);
		doc.roundedRect(75, 35, 60, 10, 5, 5, 'F');
		doc.setTextColor(0, 0, 0);
		doc.text("Processing", 105, 42, { align: 'center' });
	}
	doc.setTextColor(0, 0, 0);
	
	// Add transaction details
	doc.setFontSize(12);
	doc.text("Transaction Details", 20, 60);
	
	// Create a table for transaction details
	const tableData = [
		['Transaction ID', transaction.id],
		['Date', transaction.transactionDate],
		['Description', transaction.description],
		['Project Name', transaction.projectName || 'N/A'],
		['Brand', transaction.brand || 'N/A'],
		['Amount', `$${transaction.amount}`],
		['Status', paymentProcessed ? 'Processed' : transaction.status]
	];
	
	// @ts-@ts-expect-error (jspdf-autotable extension)
autoTable(doc,{
		startY: 65,
		head: [['Item', 'Details']],
		body: tableData,
		theme: 'striped',
		headStyles: { fillColor: [255, 165, 0] }
	});
	
	// Add timeline
	doc.text("Payment Timeline", 20, (doc as any).lastAutoTable.finalY + 10);
	
	const timelineData = [
		['Project Completed', 'March 20, 2025 at 2:45 PM', '✓'],
		['Processing Started', 'March 20, 2025 at 3:00 PM', '✓'],
		['Payment Processed', paymentProcessed ? 'March 24, 2025 at 10:15 AM' : 'Pending...', paymentProcessed ? '✓' : '']
	];


	autoTable(doc,{
		startY: (doc as any).lastAutoTable.finalY + 15,
		head: [['Stage', 'Time', 'Status']],
		body: timelineData,
		theme: 'grid',
		headStyles: { fillColor: [255, 165, 0] }
	});
	
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

// Helper function to generate a complete transaction report PDF
export const generateTransactionReportPDF = (
  transactions: Transaction[],
  financialSummary: {
    totalEarnings: string;
    processingPayments: string;
    availableBalance: string;
  },
  filters?: {
    searchTerm?: string;
    typeFilter?: string;
    statusFilter?: string;
    dateRange?: string;
  }
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text("Transaction Report", 105, 20, { align: 'center' });
  
  // Add logo/branding
  doc.setFontSize(12);
  doc.text("Social Shake", 105, 30, { align: 'center' });
  
  // Add report date
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  doc.setFontSize(10);
  doc.text(`Report Generated: ${currentDate}`, 105, 40, { align: 'center' });
  
  // Add filter information if provided
  if (filters) {
    let filterText = "Filters Applied: ";
    const filterParts = [];
    
    if (filters.searchTerm) filterParts.push(`Search: "${filters.searchTerm}"`);
    if (filters.typeFilter && filters.typeFilter !== "all-types") 
      filterParts.push(`Type: ${filters.typeFilter}`);
    if (filters.statusFilter && filters.statusFilter !== "all-statuses") 
      filterParts.push(`Status: ${filters.statusFilter}`);
    if (filters.dateRange) filterParts.push(`Date Range: ${filters.dateRange}`);
    
    if (filterParts.length > 0) {
      filterText += filterParts.join(", ");
      doc.setFontSize(10);
      doc.text(filterText, 20, 50);
    }
  }
  
  // Financial Summary Section
  doc.setFontSize(14);
  doc.text("Financial Summary", 20, 60);
  
  const summaryData = [
    ['Total Earnings', `$${financialSummary.totalEarnings}`],
    ['Processing Payments', `$${financialSummary.processingPayments}`],
    ['Available for Withdrawal', `$${financialSummary.availableBalance}`],
  ];
  
  autoTable(doc, {
    startY: 65,
    head: [['Item', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: { 
      fillColor: [255, 165, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10
    }
  });
  
  // Transaction Details Section
  doc.setFontSize(14);
  doc.text("Transaction Details", 20, (doc as any).lastAutoTable.finalY + 15);
  
  // Format transaction data for the table
  const transactionData = transactions.map((transaction) => [
    transaction.transactionDate,
    transaction.description,
    `$${transaction.amount}`,
    transaction.status,
    transaction.type
  ]);
  
  // Add transactions table
  autoTable(doc, {

    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Transaction Date', 'Description', 'Amount', 'Status', 'Type']],
    body: transactionData,
    theme: 'striped',
    headStyles: { 
      fillColor: [255, 165, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Date
      1: { cellWidth: 70 }, // Description
      2: { cellWidth: 25 }, // Amount
      3: { cellWidth: 30 }, // Status
      4: { cellWidth: 30 }  // Type
    }
  });
  
  // Add transaction summary by status
  const statusCounts = transactions.reduce((counts, transaction) => {
    counts[transaction.status] = (counts[transaction.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const statusSummaryData = Object.entries(statusCounts).map(([status, count]) => [
    status, count.toString()
  ]);
  
  const hasRoom = (doc as any).lastAutoTable.finalY < 200;
  
  if (hasRoom) {
    doc.setFontSize(14);
    doc.text("Status Summary", 20, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Status', 'Count']],
      body: statusSummaryData,
      theme: 'grid',
      headStyles: { fillColor: [255, 165, 0] },
      styles: { fontSize: 10 }
    });
  } else {
    // Add a new page if there's not enough room
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Status Summary", 20, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['Status', 'Count']],
      body: statusSummaryData,
      theme: 'grid',
      headStyles: { fillColor: [255, 165, 0] },
      styles: { fontSize: 10 }
    });
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Social Shake Transaction Report - Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  doc.save(`social-shake-transaction-report-${Date.now()}.pdf`);
};



