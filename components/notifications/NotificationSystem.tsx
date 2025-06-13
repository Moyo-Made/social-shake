"use client";

import React, { useState } from "react";
import {
	Bell,
	X,
	Eye,
	Clock,
	User,
	Briefcase,
	CheckCircle,
	XCircle,
	Check,
	Package,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationData } from "@/types/notifications";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ProjectDetailsModal from "../Creators/dashboard/ProjectDetailsModal";
// import Link from "next/link";

interface NotificationSystemProps {
	className?: string;
	userId: string;
}

// Add interface for project details
interface ProjectDetails {
	id: string;
	title: string;
	description: string;
	requirements: string[];
	deliverables: string[];
	timeline: {
		startDate: string;
		endDate: string;
		duration: string;
	};
	budget: {
		amount: number;
		currency: string;
		paymentType: string;
	};
	brand: {
		name: string;
		logo?: string;
	};
	categories: string[];
	targetAudience?: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
	className = "",
	userId,
}) => {
	const [showModal, setShowModal] = useState(false);
	const [processingAction, setProcessingAction] = useState<string | null>(null);
	const [orderStates, setOrderStates] = useState<{
		[key: string]: "approved" | "rejected" | null;
	}>({});

	const [showProjectModal, setShowProjectModal] = useState(false);
	const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(
		null
	);
	const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);

	const router = useRouter();
	const { currentUser } = useAuth();

	const {
		notifications,
		unreadCount,
		loading,
		error,
		markAsRead,
		markAllAsRead,
		refetch,
	} = useNotifications();

	// Function to fetch project details
	const fetchProjectDetails = async (projectId: string) => {
		setLoadingProjectDetails(true);
		try {
			const response = await fetch(`/api/projects/${projectId}/details`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch project details");
			}

			// The issue is here - you need to access data.data, not data.project
			if (data.success && data.exists && data.data) {
				// Transform the API response to match your ProjectDetails interface
				const projectData = data.data;

				const transformedProject: ProjectDetails = {
					id: projectData.projectId,
					title: projectData.projectDetails.projectName,
					description: projectData.projectDetails.projectDescription,
					requirements: [
						`Content Type: ${projectData.projectRequirements.contentType}`,
						`Platform: ${projectData.projectRequirements.platform.join(", ")}`,
						`Aspect Ratio: ${projectData.projectRequirements.aspectRatio}`,
						`Duration: ${projectData.projectRequirements.duration}`,
						`Video Type: ${projectData.projectRequirements.videoType}`,
						...(projectData.projectRequirements.script
							? [`Script: ${projectData.projectRequirements.script}`]
							: []),
					],
					deliverables: [
						`${projectData.creatorPricing.totalVideos} video(s)`,
						`${projectData.projectRequirements.duration} duration`,
						`${projectData.projectRequirements.aspectRatio} format`,
					],
					timeline: {
						startDate: projectData.createdAt,
						endDate: projectData.updatedAt, // You might want to calculate this based on project duration
						duration: projectData.projectRequirements.duration,
					},
					budget: {
						amount: projectData.creatorPricing.totalAmount,
						currency: "$", // Assuming USD, you might want to make this dynamic
						paymentType: "Per project",
					},
					brand: {
						name: projectData.brandInfo.brandName,
						logo: undefined, // No logo in the API response
					},
					categories: [projectData.projectDetails.projectType],
					targetAudience: `${projectData.creatorPricing.ageGroup} ${projectData.creatorPricing.gender}`,
				};

				setProjectDetails(transformedProject);
			} else {
				throw new Error("Project not found or invalid response structure");
			}
		} catch (error) {
			console.error("Error fetching project details:", error);
			toast.error("Failed to load project details");
		} finally {
			setLoadingProjectDetails(false);
		}
	};

	// Project invitation handlers
	const handleAcceptProject = async (
		notificationId: string,
		projectId: string
	) => {
		setProcessingAction(`accept-${notificationId}`);

		try {
			console.log("Accepting project invitation...");

			const response = await fetch("/api/projects/accept-invitation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser?.uid,
					notificationId,
					projectId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to accept project invitation");
			}

			// Mark notification as read
			await markAsRead(notificationId);

			// Refetch notifications to get updated data from server
			await refetch();

			// Close the project modal if it's open
			setShowProjectModal(false);

			console.log("Project invitation accepted successfully!");
			toast.success(
				data.message || "Project invitation accepted successfully!"
			);
		} catch (error) {
			console.error("Error accepting project invitation:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to accept project invitation"
			);
		} finally {
			setProcessingAction(null);
		}
	};

	const handleRejectProject = async (
		notificationId: string,
		projectId: string
	) => {
		setProcessingAction(`reject-${notificationId}`);

		try {
			console.log("Rejecting project invitation...");

			const response = await fetch("/api/projects/reject-invitation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId,
					notificationId,
					projectId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to reject project invitation");
			}

			// Mark notification as read
			await markAsRead(notificationId);

			// Refetch notifications to get updated data from server
			await refetch();

			// Close the project modal if it's open
			setShowProjectModal(false);

			console.log("Project invitation rejected successfully!");
			toast.success(
				data.message || "Project invitation rejected successfully!"
			);
		} catch (error) {
			console.error("Error rejecting project invitation:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to reject project invitation"
			);
		} finally {
			setProcessingAction(null);
		}
	};

	// Get notification icon based on type
	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "project_invitation":
				return <Briefcase className="w-5 h-5 text-orange-500" />;
			case "application_accepted":
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case "application_rejected":
				return <XCircle className="w-5 h-5 text-red-500" />;
			case "project_deadline_approaching":
				return <Clock className="w-5 h-5 text-orange-500" />;
			case "new_application":
				return <User className="w-5 h-5 text-purple-500" />;
			case "order_finalized":
			case "order_ready_for_payment":
				return <Package className="w-5 h-5 text-blue-500" />;
			default:
				return <Bell className="w-5 h-5 text-gray-500" />;
		}
	};

	// Format time ago
	const timeAgo = (date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	const handleViewProject = async (
		projectId: string,
		notificationId: string
	) => {
		await markAsRead(notificationId);

		// Set loading state and show modal
		setLoadingProjectDetails(true);
		setShowProjectModal(true);

		// Fetch project details
		await fetchProjectDetails(projectId);
		setLoadingProjectDetails(false);
	};

	// Handle order actions
	const handleOrderAction = async (
		action: "approve" | "reject" | "view",
		orderId: string,
		notificationId: string
	) => {
		setProcessingAction(`${action}-${notificationId}`);

		try {
			// Mark notification as read first
			await markAsRead(notificationId);

			if (action === "view") {
				// Navigate to order details page
				router.push(`/creator/dashboard/video-order/${orderId}`);
			} else if (action === "approve") {
				// Call your order approval API
				const response = await fetch(`/api/orders/${orderId}/approve`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId,
					}),
				});

				if (response.ok) {
					// Update the order state to approved
					setOrderStates((prev) => ({ ...prev, [orderId]: "approved" }));
				} else {
					throw new Error("Failed to approve order");
				}
			} else if (action === "reject") {
				// Call your order rejection API
				const response = await fetch(`/api/orders/${orderId}/reject`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId,
					}),
				});

				if (response.ok) {
					// Update the order state to rejected
					setOrderStates((prev) => ({ ...prev, [orderId]: "rejected" }));
				} else {
					throw new Error("Failed to reject order");
				}
			}
		} catch (error) {
			console.error(`Error ${action}ing order:`, error);
			toast.error(
				`Failed to ${action} order: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			setProcessingAction(null);
		}
	};

	// Render notification item
	const renderNotification = (notification: NotificationData) => {
		const isInvitation = notification.type === "project_invitation";
		const isOrder = notification.type === "order_finalized";

		// Extract orderId from notification - you might need to adjust this based on your NotificationData structure
		const orderId = notification.orderId || notification.relatedId;
		const orderState = orderId ? orderStates[orderId] : null;

		// Get project invitation state from server data
		const projectInvitationState = notification.responded
			? notification.response
			: null;

		return (
			<div
				key={notification.id}
				className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
					notification.status === "unread"
						? "bg-orange-50 border-l-4 border-l-blue-500"
						: ""
				}`}
			>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 mt-1">
						{getNotificationIcon(notification.type)}
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-gray-900 mb-1">
									{notification.title}
								</h4>
								<p className="text-sm text-gray-600 mb-2">
									{notification.message}
								</p>

								{notification.brandName && (
									<p className="text-xs text-gray-500">
										From:{" "}
										<span className="font-medium">
											{notification.brandName}
										</span>
										{notification.projectTitle && (
											<>
												{" "}
												• Project:{" "}
												<span className="font-medium">
													{notification.projectTitle}
												</span>
											</>
										)}
									</p>
								)}
							</div>

							<span className="text-xs text-gray-400 flex-shrink-0">
								{timeAgo(notification.createdAt)}
							</span>
						</div>

						{/* Action buttons for project invitations */}
						{isInvitation && !projectInvitationState && (
							<div className="flex items-center gap-2 mt-3">
								{notification.projectId && (
									<>
										<button
											onClick={() =>
												handleAcceptProject(
													notification.id!,
													notification.projectId!
												)
											}
											disabled={
												processingAction === `accept-${notification.id}`
											}
											className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{processingAction === `accept-${notification.id}` ? (
												<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
											) : (
												<Check className="w-3 h-3" />
											)}
											Accept
										</button>
										<button
											onClick={() =>
												handleRejectProject(
													notification.id!,
													notification.projectId!
												)
											}
											disabled={
												processingAction === `reject-${notification.id}`
											}
											className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{processingAction === `reject-${notification.id}` ? (
												<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
											) : (
												<X className="w-3 h-3" />
											)}
											Reject
										</button>
										<button
											onClick={() =>
												handleViewProject(
													notification.projectId!,
													notification.id!
												)
											}
											disabled={processingAction === `view-${notification.id}`}
											className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{processingAction === `view-${notification.id}` ? (
												<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
											) : (
												<Eye className="w-3 h-3" />
											)}
											View Details
										</button>
									</>
								)}
							</div>
						)}

						{/* Show response status if already responded */}
						{isInvitation && projectInvitationState && (
							<div className="mt-3">
								<div
									className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
										projectInvitationState === "accepted"
											? "bg-green-100 text-green-800"
											: "bg-red-100 text-red-800"
									}`}
								>
									{projectInvitationState === "accepted" ? (
										<>
											<Check className="w-3 h-3" />
											Accepted
										</>
									) : (
										<>
											<X className="w-3 h-3" />
											Rejected
										</>
									)}
								</div>
							</div>
						)}

						{/* Action buttons for order notifications */}
						{isOrder && orderId && !notification.responded && (
							<div className="flex items-center gap-2 mt-3">
								<button
									onClick={() =>
										handleOrderAction("approve", orderId, notification.id!)
									}
									disabled={
										processingAction === `approve-${notification.id}` ||
										orderState === "rejected"
									}
									className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors disabled:cursor-not-allowed ${
										orderState === "approved"
											? "bg-green-600 text-white"
											: orderState === "rejected"
												? "bg-gray-300 text-gray-500"
												: "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
									}`}
								>
									{processingAction === `approve-${notification.id}` ? (
										<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<Check className="w-3 h-3" />
									)}
									{orderState === "approved" ? "Accepted" : "Accept"}
								</button>

								<button
									onClick={() =>
										handleOrderAction("reject", orderId, notification.id!)
									}
									disabled={
										processingAction === `reject-${notification.id}` ||
										orderState === "approved"
									}
									className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors disabled:cursor-not-allowed ${
										orderState === "rejected"
											? "bg-red-600 text-white"
											: orderState === "approved"
												? "bg-gray-300 text-gray-500"
												: "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
									}`}
								>
									{processingAction === `reject-${notification.id}` ? (
										<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<XCircle className="w-3 h-3" />
									)}
									{orderState === "rejected" ? "Rejected" : "Reject"}
								</button>

								<button
									onClick={() =>
										handleOrderAction("view", orderId, notification.id!)
									}
									disabled={processingAction === `view-${notification.id}`}
									className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{processingAction === `view-${notification.id}` ? (
										<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<Eye className="w-3 h-3" />
									)}
									View
								</button>
							</div>
						)}

						{/* Show order status if it has been acted upon */}
						{isOrder && orderId && orderState && (
							<div className="mt-2">
								<span
									className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
										orderState === "approved"
											? "bg-green-100 text-green-800"
											: "bg-red-100 text-red-800"
									}`}
								>
									{orderState === "approved" ? (
										<>
											<CheckCircle className="w-3 h-3" />
											Order Accepted
										</>
									) : (
										<>
											<XCircle className="w-3 h-3" />
											Order Rejected
										</>
									)}
								</span>
							</div>
						)}

						{/* View project button for other notification types */}
						{/* {!isInvitation && !isOrder && notification.projectId && (
							<div className="mt-3">
								<Link href={`/creator/dashboard/project/applied`}>
									<button className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors">
										<Eye className="w-3 h-3" />
										View Project
									</button>
								</Link>
							</div>
						)} */}
					</div>

					{notification.status === "unread" && (
						<button
							onClick={() => markAsRead(notification.id!)}
							className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
							title="Mark as read"
						/>
					)}
				</div>
			</div>
		);
	};

	return (
		<>
			{/* Notification Bell */}
			<div className={`relative ${className} mr-2`}>
				<button
					onClick={() => setShowModal(true)}
					className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
					aria-label="Open notifications"
				>
					<Bell className="w-5 h-5" />
					{unreadCount > 0 && (
						<span className="absolute -top-[1px] -right-0 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
				</button>
			</div>

			{/* Notification Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 overflow-hidden">
					<div
						className="absolute inset-0 bg-black bg-opacity-25"
						onClick={() => setShowModal(false)}
					/>

					<div className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-5rem)] flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900">
								Notifications
								{unreadCount > 0 && (
									<span className="ml-2 text-sm text-gray-500">
										({unreadCount} unread)
									</span>
								)}
							</h3>
							<button
								onClick={() => setShowModal(false)}
								className="text-gray-400 hover:text-gray-600 transition-colors"
								aria-label="Close notifications"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto">
							{loading ? (
								<div className="p-4 text-center text-gray-500">
									<div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
									Loading notifications...
								</div>
							) : error ? (
								<div className="p-4 text-center text-red-500">
									<p className="mb-2">{error}</p>
									<button
										onClick={() => window.location.reload()}
										className="text-sm text-orange-600 hover:text-orange-700"
									>
										Try again
									</button>
								</div>
							) : notifications.length === 0 ? (
								<div className="p-8 text-center text-gray-500">
									<Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
									<p className="text-lg font-medium mb-2">
										No notifications yet
									</p>
									<p className="text-sm">
										You&apos;ll see notifications here when brands invite you to
										projects or send you orders.
									</p>
								</div>
							) : (
								<div className="divide-y divide-gray-100">
									{notifications.map(renderNotification)}
								</div>
							)}
						</div>

						{/* Footer */}
						{notifications.length > 0 && (
							<div className="p-4 border-t border-gray-200">
								<button
									onClick={markAllAsRead}
									className="w-full px-4 py-2 text-sm text-orange-600 hover:text-orange-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
									disabled={unreadCount === 0}
								>
									Mark all as read
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Project Details Modal */}
			<ProjectDetailsModal
				isOpen={showProjectModal}
				onClose={() => {
					setShowProjectModal(false);
					setProjectDetails(null);
				}}
				projectDetails={projectDetails}
				isLoading={loadingProjectDetails}
				onAccept={() => {
					if (projectDetails) {
						// Find the notification that corresponds to this project
						const projectNotification = notifications.find(
							(n) =>
								n.projectId === projectDetails.id &&
								n.type === "project_invitation"
						);
						if (projectNotification) {
							handleAcceptProject(projectNotification.id!, projectDetails.id);
						}
					}
				}}
				onReject={() => {
					if (projectDetails) {
						// Find the notification that corresponds to this project
						const projectNotification = notifications.find(
							(n) =>
								n.projectId === projectDetails.id &&
								n.type === "project_invitation"
						);
						if (projectNotification) {
							handleRejectProject(projectNotification.id!, projectDetails.id);
						}
					}
				}}
				processingAccept={processingAction?.startsWith("accept-") || false}
				processingReject={processingAction?.startsWith("reject-") || false}
				showActions={true}
				notification={
					notifications.find((n) => n.projectId === projectDetails?.id) || null
				}
			/>
		</>
	);
};

export default NotificationSystem;
