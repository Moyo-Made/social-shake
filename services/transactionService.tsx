import { auth } from "@/config/firebase";

// Helper function to get auth token
const getAuthToken = async () => {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error("User not authenticated");
	}
	return await currentUser.getIdToken();
};

// Define Transaction types
export type TransactionStatus = "Processed" | "Pending" | "Refunded";
export type TransactionType = "Project" | "Contest";

export interface Transaction {
	id: string;
	transactionDate: string;
	description: string;
	amount: string;
	type: TransactionType;
	status: TransactionStatus;
	paymentDate: string;
	projectCompleted: string;
	actions: string;
	rawData?: any; // Optional raw data for debugging
}

export interface TotalTransactions {
	totalSpend: string;
	pendingPayments: string;
	totalProcessed: string;
}

export interface TransactionResponse {
	transactions: Transaction[];
	totals: TotalTransactions;
}

/**
 * Fetch transactions from the API
 */
export const fetchTransactions = async (): Promise<TransactionResponse> => {
	try {
		const token = await getAuthToken();
		
		const response = await fetch("/api/transactions", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});
		
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to fetch transactions");
		}
		
		return await response.json();
	} catch (error: any) {
		console.error("Error fetching transactions:", error);
		throw error;
	}
};

/**
 * Fetch a single transaction by ID
 */
export const fetchTransactionById = async (id: string): Promise<Transaction> => {
	try {
		const token = await getAuthToken();
		
		const response = await fetch(`/api/transactions/${id}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});
		
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to fetch transaction");
		}
		
		return await response.json();
	} catch (error: any) {
		console.error(`Error fetching transaction ${id}:`, error);
		throw error;
	}
};

/**
 * Request a refund for a transaction
 */
export const requestRefund = async (id: string, reason: string): Promise<any> => {
	try {
		const token = await getAuthToken();
		
		const response = await fetch(`/api/transactions/${id}/refund`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ reason }),
		});
		
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to request refund");
		}
		
		return await response.json();
	} catch (error: any) {
		console.error(`Error requesting refund for transaction ${id}:`, error);
		throw error;
	}
};

/**
 * Helper function to get status badge styling
 */
export const getStatusBadgeStyle = (status: TransactionStatus): string => {
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

/**
 * Helper function to get type badge styling
 */
export const getTypeBadgeStyle = (type: TransactionType): string => {
	switch (type) {
		case "Project":
			return "bg-orange-500 text-white";
		case "Contest":
			return "bg-pink-400 text-white";
		default:
			return "bg-gray-200 text-gray-700";
	}
};

/**
 * Helper function to get status icon
 */
export const getStatusIcon = (status: TransactionStatus): React.ReactNode => {
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
