/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, Video } from "lucide-react";
import { useRouter } from "next/navigation";

interface BrandProfile {
	id: string;
	userId: string;
	email: string;
	brandName: string;
	logoUrl?: string;
}

interface CreatorOrderViewProps {
	orders: any[]; // Accept orders as prop
	onOrderAction?: (
		orderId: string,
		action: string,
		data?: { reason?: string } | undefined
	) => void;
	onMessageBrand?: (orderId: string) => void;
	onUploadDeliverable?: (orderId: string, files: FileList) => void;
}

const CreatorOrderView: React.FC<CreatorOrderViewProps> = ({ orders }) => {
	const router = useRouter();
	const [brandProfiles, setBrandProfiles] = useState<{
		[userId: string]: BrandProfile;
	}>({});
	const [loadingProfiles, setLoadingProfiles] = useState<{
		[userId: string]: boolean;
	}>({});

	// Memoized function to fetch brand profiles
	const fetchBrandProfiles = useCallback(async () => {
		if (!orders || orders.length === 0) return;

		// Get unique user IDs from orders.brandName field (which contains the userId)
		const uniqueUserIds = [
			...new Set(orders.map((order) => order.brandName).filter(Boolean)),
		];

		// Fetch profiles for user IDs we don't already have
		const userIdsToFetch = uniqueUserIds.filter(
			(userId) => !brandProfiles[userId] && !loadingProfiles[userId]
		);

		if (userIdsToFetch.length === 0) {
			return;
		}

		// Set loading state for the user IDs we're about to fetch
		setLoadingProfiles(prev => {
			const newLoadingState = { ...prev };
			userIdsToFetch.forEach((userId) => {
				newLoadingState[userId] = true;
			});
			return newLoadingState;
		});

		// Fetch all brand profiles concurrently
		const fetchPromises = userIdsToFetch.map(async (userId) => {
			try {
				const response = await fetch(
					`/api/admin/brand-approval?userId=${userId}`
				);

				if (response.ok) {
					const data = await response.json();
					return { userId, profile: data };
				} else {
					// Handle 404 or other errors by setting a placeholder
					return {
						userId,
						profile: {
							id: userId,
							userId: userId,
							email: "Unknown",
							brandName: "Unknown Brand",
							logoUrl: "",
						},
					};
				}
			} catch (error) {
				console.error(
					`Error fetching brand profile for userId ${userId}:`,
					error
				);
				return {
					userId,
					profile: {
						id: userId,
						userId: userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					},
				};
			}
		});

		try {
			const results = await Promise.all(fetchPromises);

			// Update brand profiles state
			setBrandProfiles(prev => {
				const newProfiles = { ...prev };
				results.forEach(({ userId, profile }) => {
					newProfiles[userId] = profile;
				})
				return newProfiles;
			});

			// Clear loading states
			setLoadingProfiles(prev => {
				const newLoadingState = { ...prev };
				userIdsToFetch.forEach((userId) => {
					delete newLoadingState[userId];
				});
				return newLoadingState;
			});

		} catch (error) {
			console.error("Error fetching brand profiles:", error);
			// Clear loading states on error
			setLoadingProfiles(prev => {
				const clearedLoadingState = { ...prev };
				userIdsToFetch.forEach((userId) => {
					delete clearedLoadingState[userId];
				});
				return clearedLoadingState;
			});
		}
	}, [orders]); // Only depend on orders, not on brandProfiles or loadingProfiles

	// Fetch brand profiles when orders change
	useEffect(() => {
		fetchBrandProfiles();
	}, [fetchBrandProfiles]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "active":
				return "bg-blue-100 text-blue-800";
			case "in_progress":
				return "bg-purple-100 text-purple-800";
			case "delivered":
				return "bg-green-100 text-green-800";
			case "completed":
				return "bg-green-200 text-green-900";
			case "rejected":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getPackageDisplayName = (packageType: string) => {
		switch (packageType) {
			case "one":
				return "1 Custom Video";
			case "three":
				return "3 Custom Videos";
			case "five":
				return "5 Custom Videos";
			case "bulk":
				return "Bulk Videos (6+)";
			default:
				return packageType;
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getDaysUntilDeadline = (deadline?: string | null) => {
		if (!deadline) return "No deadline";
		const today = new Date();
		const deadlineDate = new Date(deadline);
		const diffTime = deadlineDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays > 0 ? `${diffDays} days left` : "Overdue";
	};

	const handleViewDetails = (orderId: string) => {
		router.push(`/creator/dashboard/video-order/${orderId}`);
	};

	const getBrandDisplayName = (order: any) => {
		
		// The userId is stored in order.brandName field (based on your data structure)
		const userId = order.brandName; // This contains the actual userId

		// Check if we're still loading this profile
		if (userId && loadingProfiles[userId]) {
			return "Loading...";
		}

		// Try to get brand profile using the userId from order.brandName
		if (userId && brandProfiles[userId]) {
			const profile = brandProfiles[userId];

			const displayName = profile.brandName || profile.email || "Unknown Brand";
			return displayName;
		}

		// Since brandName contains userId, use brandEmail as fallback
		const fallbackName = order.brandEmail || "Unknown Brand";
		return fallbackName;
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-2xl font-semibold text-gray-900 mb-1">
						Your Orders
					</h1>
					<p className="text-gray-600">
						Manage and track your video production orders
					</p>
				</div>

				{orders.length === 0 ? (
					<div className="bg-white rounded-lg shadow-sm border p-12 text-center">
						<Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							No orders yet
						</h3>
						<p className="text-gray-500">
							Your video production orders from brands will appear here
						</p>
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{orders.map((order) => (
							<div
								key={order.id}
								className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6"
							>
								{/* Header */}
								<div className="flex justify-between items-start mb-4">
									<div>
										<h3 className="font-semibold text-lg text-gray-900 mb-1">
											{getBrandDisplayName(order)}
										</h3>
										<p className="text-gray-500 text-sm">
											{getPackageDisplayName(order.packageType)}
										</p>
									</div>
									<span
										className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(order.status)}`}
									>
										{order.status}
									</span>
								</div>

								{/* Stats */}
								<div className="flex justify-between mb-4 p-3 bg-gray-50 rounded-lg">
									<div className="text-center">
										<div className="flex items-center justify-center mb-1">
											<Video className="w-4 h-4 text-gray-600 mr-1" />
											<span className="text-sm font-medium text-gray-900">
												{order.videoCount}
											</span>
										</div>
										<p className="text-xs text-gray-500">Videos</p>
									</div>
									<div className="text-center">
										<div className="flex items-center justify-center mb-1">
											<DollarSign className="w-4 h-4 text-gray-600 mr-1" />
											<span className="text-sm font-medium text-gray-900">
												${order.totalPrice.toLocaleString()}
											</span>
										</div>
										<p className="text-xs text-gray-500">Value</p>
									</div>
								</div>

								{/* Timeline */}
								<div className="space-y-2 mb-4">
									<div className="flex justify-between text-sm">
										<span className="text-gray-500">Created</span>
										<span className="text-gray-900">
											{formatDate(order.createdAt)}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-gray-500">Deadline</span>
										<span className="text-gray-900">
											{getDaysUntilDeadline(order.deadline)}
										</span>
									</div>
								</div>

								{/* Action */}
								<button
									onClick={() => handleViewDetails(order.id)}
									className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
								>
									View Details
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default CreatorOrderView;