"use client";

import React, { useState } from "react";
import {
	Bell,
	X,
	Check,
	Eye,
	Clock,
	User,
	Briefcase,
	CheckCircle,
	XCircle,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationData } from "@/types/notifications";
import { useRouter } from "next/navigation";

interface NotificationSystemProps {
	className?: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
	className = "",
}) => {
	const [showModal, setShowModal] = useState(false);
	const router = useRouter();

	const {
		notifications,
		unreadCount,
		loading,
		error,
		markAsRead,
		markAllAsRead,
		handleInvitationResponse,
	} = useNotifications();

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
		router.push(`/creator/dashboard/project/${projectId}`);
	};

	const handleInvitationAction = async (
		notificationId: string,
		projectId: string,
		response: "accepted" | "declined"
	) => {
		try {
			await handleInvitationResponse(notificationId, projectId, response);
		} catch (error) {
			console.error(`Error ${response}ing invitation:`, error);
			// You might want to show a toast notification here
		}
	};

	// Render notification item
	const renderNotification = (notification: NotificationData) => {
		const isInvitation = notification.type === "project_invitation";

		return (
			<div
				key={notification.id}
				className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
					!notification.read ? "bg-orange-50 border-l-4 border-l-blue-500" : ""
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

						{/* Action buttons for invitations */}
						{isInvitation && !notification.responded && (
							<div className="flex items-center gap-2 mt-3">
								<button
									onClick={() =>
										handleInvitationAction(
											notification.id!,
											notification.projectId!,
											"accepted"
										)
									}
									className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
								>
									<Check className="w-3 h-3" />
									Accept
								</button>
								<button
									onClick={() =>
										handleInvitationAction(
											notification.id!,
											notification.projectId!,
											"declined"
										)
									}
									className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors"
								>
									<X className="w-3 h-3" />
									Decline
								</button>
								{notification.projectId && (
									<button
										onClick={() =>
											handleViewProject(
												notification.projectId!,
												notification.id!
											)
										}
										className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors"
									>
										<Eye className="w-3 h-3" />
										View Project
									</button>
								)}
							</div>
						)}

						{/* View project button for other notification types */}
						{!isInvitation && notification.projectId && (
							<div className="mt-3">
								<button
									onClick={() =>
										handleViewProject(notification.projectId!, notification.id!)
									}
									className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors"
								>
									<Eye className="w-3 h-3" />
									View Project
								</button>
							</div>
						)}
					</div>

					{!notification.read && (
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
										projects or update project status.
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
		</>
	);
};

export default NotificationSystem;
