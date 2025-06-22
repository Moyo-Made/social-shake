"use client";

import CreatorOrderView from "@/components/Creators/dashboard/order/CreatorOrder";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const CreatorOrderPage = () => {
	const { currentUser } = useAuth();
	const creatorId = currentUser?.uid;

	const { data: orders = [], isLoading: loading, error } = useQuery({
		queryKey: ['creator-orders', creatorId],
		queryFn: async () => {
		  const response = await fetch(`/api/orders?creatorId=${creatorId}`);
		  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		  const data = await response.json();
		  if (!data.success) throw new Error(data.error || "Failed to fetch orders");
		  return data.orders || [];
		},
		enabled: !!creatorId,
	  });

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
					<p className="text-gray-500 mb-4">{error instanceof Error ? error.message : "An unknown error occurred"}</p>
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
			/>
		</div>
	);
};

export default CreatorOrderPage;