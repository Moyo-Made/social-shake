import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Calendar,
	AlertCircle,
	Settings,
	Check,
	X,
	RefreshCw,
	CreditCardIcon,
} from "lucide-react";

interface SubscriptionStatus {
	id: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialStart: string | null;
	trialEnd: string | null;
	amount: number;
}

interface SubscriptionManagerProps {
	userId: string;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
	userId,
}) => {
	const queryClient = useQueryClient();
	const [success, setSuccess] = useState<string | null>(null);

	const callAPI = async (action: string) => {
		try {
			const response = await fetch("/api/subscription/manage", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action,
					userId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Something went wrong");
			}

			return data;
		} catch (err) {
			throw err;
		}
	};

	// Query for subscription status
	const {
		data: subscription,
		isLoading,
		error,
		refetch,
	} = useQuery<SubscriptionStatus>({
		queryKey: ["subscription", userId],
		queryFn: () => callAPI("get_status").then((data) => data.subscription),
		enabled: !!userId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
	});

	// Mutation for subscription actions
	const subscriptionMutation = useMutation({
		mutationFn: async (action: string) => {
			const data = await callAPI(action);
			return { action, data };
		},
		onSuccess: (result) => {
			const { action, data } = result;
			
			if (action === "create_portal_session") {
				window.open(data.portalUrl, "_blank");
				return;
			}

			setSuccess(data.message);
			
			// Invalidate and refetch subscription data after successful action
			queryClient.invalidateQueries({
				queryKey: ["subscription", userId],
			});
			
			// Clear success message after 5 seconds
			setTimeout(() => setSuccess(null), 5000);
		},
		onError: () => {
			// Error is handled by the mutation's error state
		},
	});

	const handleAction = (action: string) => {
		setSuccess(null);
		subscriptionMutation.mutate(action);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "text-green-600 bg-green-100";
			case "trialing":
				return "text-orange-600 bg-orange-100";
			case "canceled":
				return "text-red-600 bg-red-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const isInTrial =
		subscription?.trialEnd && new Date(subscription.trialEnd) > new Date();

	if (isLoading) {
		return (
			<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="flex flex-col justify-center items-center ">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
					<span className="ml-2 text-gray-600">Loading subscription...</span>
				</div>
			</div>
		);
	}

	if (error && !subscription) {
		return (
			<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="text-center">
					<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						Unable to load subscription
					</h3>
					<p className="text-gray-600 mb-4">
						{error instanceof Error ? error.message : "Failed to fetch subscription"}
					</p>
					<button
						onClick={() => refetch()}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg overflow-hidden">
			{/* Header */}
			<div className=" p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<CreditCardIcon className="w-8 h-8 mr-3" />
						<div>
							<h2 className="text-xl font-semibold">Subscription</h2>
							<p className="text-gray-900">Manage your subscription settings</p>
						</div>
					</div>
					<div
						className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription?.status || "")}`}
					>
						{subscription?.status === "trialing"
							? "Trial"
							: subscription?.status
								? subscription.status.charAt(0).toUpperCase() +
									subscription.status.slice(1)
								: "Unknown"}
					</div>
				</div>
				<hr className="my-4" />
			</div>

			{/* Content */}
			<div className="p-6">
				{/* Alerts */}
				{subscriptionMutation.error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
						<X className="w-5 h-5 text-red-500 mr-2" />
						<span className="text-red-700">
							{subscriptionMutation.error instanceof Error 
								? subscriptionMutation.error.message 
								: "Action failed"}
						</span>
					</div>
				)}

				{success && (
					<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
						<Check className="w-5 h-5 text-green-500 mr-2" />
						<span className="text-green-700">{success}</span>
					</div>
				)}

				{subscription?.cancelAtPeriodEnd && (
					<div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
						<AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
						<span className="text-yellow-700">
							Your subscription will end on{" "}
							{formatDate(subscription.currentPeriodEnd)}
						</span>
					</div>
				)}

				{/* Subscription Details */}
				<div className="grid md:grid-cols-2 gap-6 mb-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
							<span className="text-gray-600">Plan Amount</span>
							<span className="font-semibold text-lg">
								${subscription?.amount}/month
							</span>
						</div>

						<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
							<span className="text-gray-600">Status</span>
							<span
								className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription?.status || "")}`}
							>
								{(subscription?.status ?? "").charAt(0).toUpperCase() +
									(subscription?.status ?? "").slice(1)}
							</span>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
							<span className="text-gray-600">Current Period</span>
							<div className="text-right">
								<div className="font-medium">
									{formatDate(subscription?.currentPeriodStart || "")}
								</div>
								<div className="text-sm text-gray-500">
									to {formatDate(subscription?.currentPeriodEnd || "")}
								</div>
							</div>
						</div>

						{isInTrial && (
							<div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
								<span className="text-orange-600">Trial Ends</span>
								<span className="font-medium text-orange-600">
									{formatDate(subscription?.trialEnd || "")}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => handleAction("create_portal_session")}
						disabled={subscriptionMutation.isPending}
						className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{subscriptionMutation.isPending && subscriptionMutation.variables === "create_portal_session" ? (
							<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Settings className="w-4 h-4 mr-2" />
						)}
						Manage Billing
					</button>

					{subscription?.cancelAtPeriodEnd ? (
						<button
							onClick={() => handleAction("reactivate")}
							disabled={subscriptionMutation.isPending}
							className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{subscriptionMutation.isPending && subscriptionMutation.variables === "reactivate" ? (
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<Check className="w-4 h-4 mr-2" />
							)}
							Reactivate
						</button>
					) : (
						<button
							onClick={() => handleAction("cancel")}
							disabled={subscriptionMutation.isPending}
							className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{subscriptionMutation.isPending && subscriptionMutation.variables === "cancel" ? (
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<X className="w-4 h-4 mr-2" />
							)}
							Cancel Subscription
						</button>
					)}

					<button
						onClick={() => refetch()}
						disabled={isLoading}
						className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RefreshCw
							className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
						/>
						Refresh
					</button>
				</div>

				{/* Next Billing Info */}
				{!subscription?.cancelAtPeriodEnd && (
					<div className="mt-6 p-4 bg-orange-50 border border-orange-300 rounded-lg">
						<div className="flex items-center">
							<Calendar className="w-5 h-5 text-orange-600 mr-2" />
							<span className="text-orange-600">
								Next billing date:{" "}
								<span className="font-medium">
									{formatDate(subscription?.currentPeriodEnd || "")}
								</span>
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default SubscriptionManager;