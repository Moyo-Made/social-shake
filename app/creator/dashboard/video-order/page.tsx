"use client";

import CreatorOrderView from "@/components/Creators/dashboard/order/CreatorOrder";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useEffect } from "react";

const CreatorOrderPage = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const { currentUser } = useAuth();

	const creatorId = currentUser?.uid;

	// Fetch orders from API
	useEffect(() => {
		const fetchOrders = async () => {
			setLoading(true);
			try {
				const response = await fetch(
					`/api/orders?creatorId=${creatorId}`
				);
				const data = await response.json();

				if (data.success) {
					setOrders(data.orders);
				} else {
					console.error("Failed to fetch orders:", data.error);
				}
			} catch (error) {
				console.error("Error fetching orders:", error);
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

			// Update order status based on action
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

			// Here you would typically make an API call
			// await fetch(`/api/creator/orders/${orderId}/${action}`, {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(data)
			// });

			// Show success message
			alert(`Order ${action} successful!`);
		} catch (error) {
			console.error(`Error performing ${action}:`, error);
			alert(`Error performing ${action}. Please try again.`);
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

			// Here you would typically:
			// 1. Create FormData and append files
			// 2. Upload to your storage service (AWS S3, Cloudinary, etc.)
			// 3. Update the order with file URLs

			const formData = new FormData();
			Array.from(files).forEach((file) => {
				formData.append("files", file);
			});
			formData.append("orderId", orderId);

			// Mock upload process
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate upload delay

			// await fetch('/api/creator/orders/upload', {
			//   method: 'POST',
			//   body: formData
			// });

			setLoading(false);
			alert(`Successfully uploaded ${files.length} file(s)!`);
		} catch (error) {
			console.error("Error uploading files:", error);
			setLoading(false);
			alert("Error uploading files. Please try again.");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading orders...</p>
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
