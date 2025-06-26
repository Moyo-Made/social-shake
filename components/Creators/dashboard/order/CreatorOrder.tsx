/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { DollarSign, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueries } from '@tanstack/react-query'

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

// Get unique user IDs from orders
const uniqueUserIds = React.useMemo(() => {
	if (!orders || orders.length === 0) return [];
	return [...new Set(orders.map((order) => order.brandName).filter(Boolean))];
  }, [orders]);
  
  // Use useQueries to fetch all brand profiles
  const brandProfileQueries = useQueries({
	queries: uniqueUserIds.map((userId) => ({
	  queryKey: ['brandProfile', userId],
	  queryFn: async (): Promise<BrandProfile> => {
		try {
		  const response = await fetch(`/api/admin/brand-approval?userId=${userId}`);
		  
		  if (response.ok) {
			const data = await response.json();
			return data;
		  } else {
			// Handle 404 or other errors by returning a placeholder
			return {
			  id: userId,
			  userId: userId,
			  email: "Unknown",
			  brandName: "Unknown Brand",
			  logoUrl: "",
			};
		  }
		} catch (error) {
		  console.error(`Error fetching brand profile for userId ${userId}:`, error);
		  return {
			id: userId,
			userId: userId,
			email: "Unknown",
			brandName: "Unknown Brand",
			logoUrl: "",
		  };
		}
	  },
	  enabled: !!userId,
	  staleTime: 5 * 60 * 1000, // 5 minutes
	}))
  });
  
  // Convert queries results to the format expected by the component
  const brandProfiles = React.useMemo(() => {
	const profiles: { [userId: string]: BrandProfile } = {};
	brandProfileQueries.forEach((query, index) => {
	  const userId = uniqueUserIds[index];
	  if (query.data) {
		profiles[userId] = query.data;
	  }
	});
	return profiles;
  }, [brandProfileQueries, uniqueUserIds]);
  
  const loadingProfiles = React.useMemo(() => {
	const loading: { [userId: string]: boolean } = {};
	brandProfileQueries.forEach((query, index) => {
	  const userId = uniqueUserIds[index];
	  if (query.isLoading) {
		loading[userId] = true;
	  }
	});
	return loading;
  }, [brandProfileQueries, uniqueUserIds]);

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
												{order.totalPrice.toLocaleString()}
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