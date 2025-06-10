"use client";

import CreatorOrderView from "@/components/Creators/dashboard/order/CreatorOrder";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useEffect } from "react";

const CreatorOrderPage = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { currentUser } = useAuth();

	const creatorId = currentUser?.uid;

	// Fetch orders from API
	useEffect(() => {
		const fetchOrders = async () => {
			if (!creatorId) {
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);
			
			try {
				const response = await fetch(
					`/api/orders?creatorId=${creatorId}`
				);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const data = await response.json();

				if (data.success) {
					setOrders(data.orders || []);
				} else {
					throw new Error(data.error || "Failed to fetch orders");
				}
			} catch (error) {
				console.error("Error fetching orders:", error);
				setError(error instanceof Error ? error.message : "An error occurred");
				setOrders([]); // Set empty array on error
			} finally {
				setLoading(false);
			}
		};

		fetchOrders();
	}, [creatorId]);

	const handleOrderAction = async (
		orderId: string,
		action: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any
	) => {
		try {
			console.log(`Performing action: ${action} on order: ${orderId}`, data);

			// Optimistically update the UI first
			setOrders(
				(prevOrders) =>
					prevOrders?.map((order) => {
						if (order.id === orderId) {
							switch (action) {
								case "accept":
									return { ...order, status: "accepted" };
								case "reject":
									return { ...order, status: "rejected" };
								case "start-work":
									return { ...order, status: "in-progress" };
								case "mark-delivered":
									return { ...order, status: "delivered" };
								default:
									return order;
							}
						}
						return order;
					})
			);

			// Make the actual API call
			const response = await fetch(`/api/creator/orders/${orderId}/${action}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				throw new Error(`Failed to ${action} order`);
			}

			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.error || `Failed to ${action} order`);
			}

			// Show success message
			alert(`Order ${action} successful!`);
		} catch (error) {
			console.error(`Error performing ${action}:`, error);
			alert(`Error performing ${action}. Please try again.`);
			
			// Revert the optimistic update on error
			// You might want to refetch the orders here or revert the specific change
		}
	};

	const handleMessageBrand = (orderId: string) => {
		console.log(`Opening message thread for order: ${orderId}`);
		// Here you would typically:
		// 1. Open a messaging modal/component
		// 2. Navigate to a messaging page
		// 3. Initialize a chat system
		alert(`Opening message thread for order: ${orderId}`);
	};

	const handleUploadDeliverable = async (orderId: string, files: FileList) => {
		try {
			console.log(`Uploading ${files.length} files for order: ${orderId}`);

			const formData = new FormData();
			Array.from(files).forEach((file) => {
				formData.append("files", file);
			});
			formData.append("orderId", orderId);

			setLoading(true);

			const response = await fetch('/api/creator/orders/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error('Upload failed');
			}

			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.error || 'Upload failed');
			}

			alert(`Successfully uploaded ${files.length} file(s)!`);
		} catch (error) {
			console.error("Error uploading files:", error);
			alert("Error uploading files. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading orders...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						Error loading orders
					</h3>
					<p className="text-gray-500 mb-4">{error}</p>
					<button 
						onClick={() => window.location.reload()} 
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<CreatorOrderView
				orders={orders}
				onOrderAction={handleOrderAction}
				onMessageBrand={handleMessageBrand}
				onUploadDeliverable={handleUploadDeliverable}
			/>
		</div>
	);
};

export default CreatorOrderPage;