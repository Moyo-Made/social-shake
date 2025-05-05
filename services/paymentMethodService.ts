// services/paymentMethodService.js
import { auth } from "@/config/firebase";

// Helper function to get auth token
const getAuthToken = async () => {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error("User not authenticated");
	}
	return await currentUser.getIdToken();
};

// Fetch all payment methods for the current user
export const fetchPaymentMethods = async () => {
	try {
		const token = await getAuthToken();

		const response = await fetch("/api/payment-methods", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to fetch payment methods");
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching payment methods:", error);
		throw error;
	}
};

// Add a new payment method
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addPaymentMethod = async (paymentMethodData: any) => {
	try {
		const token = await getAuthToken();

		const response = await fetch("/api/payment-methods", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(paymentMethodData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to add payment method");
		}

		return await response.json();
	} catch (error) {
		console.error("Error adding payment method:", error);
		throw error;
	}
};

// Update an existing payment method
export const updatePaymentMethod = async (
	id: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	paymentMethodData: any
) => {
	try {
		const token = await getAuthToken();

		const response = await fetch(`/api/payment-methods/${id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(paymentMethodData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to update payment method");
		}

		return await response.json();
	} catch (error) {
		console.error("Error updating payment method:", error);
		throw error;
	}
};

// Delete a payment method
export const deletePaymentMethod = async (id: string) => {
	try {
		const token = await getAuthToken();

		const response = await fetch(`/api/payment-methods/${id}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to delete payment method");
		}

		return await response.json();
	} catch (error) {
		console.error("Error deleting payment method:", error);
		throw error;
	}
};

// Set a payment method as default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setDefaultPaymentMethod = async (paymentMethodId: any) => {
	try {
		const token = await getAuthToken();

		const response = await fetch("/api/payment-methods/set-default", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ paymentMethodId }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				errorData.error || "Failed to set default payment method"
			);
		}

		return await response.json();
	} catch (error) {
		console.error("Error setting default payment method:", error);
		throw error;
	}
};
