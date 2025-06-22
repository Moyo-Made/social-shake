/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import Image from "next/image";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import io, { Socket } from "socket.io-client";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Define types for our data
interface ApprovedCreator {
	id: string;
	applicationId: string;
	creatorId: string;
	projectId: string;
	currentStatus: string;
	createdAt: string;
	updatedAt?: string;
	creator?: CreatorProfile;
	trackingNumber?: string;
}

interface CreatorProfile {
	id: string;
	userId: string;
	verificationId: string;
	creator: string;
	status: string;
	createdAt: string;
	logoUrl: string;
	bio: string;
	socialMedia: {
		instagram: string;
		twitter: string;
		facebook: string;
		youtube: string;
		tiktok: string;
	};
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	contentTypes: string[];
	contentLinks: string[];
	country: string;
	gender: string;
	ethnicity: string | null;
	dateOfBirth: string;
	verifiableIDUrl: string | null;
	verificationVideoUrl: string | null;
	following: number;
	gmv: number;
	shippingAddress?: {
		street: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
	};
}

interface Creator {
	id: string;
	verificationId: string;
	userId: string;
	creator: string;
	status: string;
	createdAt: string;
	logoUrl: string | null;
	bio: string;
	socialMedia: {
		instagram?: string;
		twitter?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		[key: string]: string | undefined;
	};
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	contentTypes: string[];
	contentLinks: string[];
	country: string;
	gender: string;
	ethnicity: string | null;
	dateOfBirth: string;
	verifiableIDUrl: string | null;
	verificationVideoUrl: string | null;
	// Extended properties for application display
	following?: number;
	gmv?: number;
}

// Status mapping for display
const STATUS_DISPLAY = {
	pending_shipment: "Pending Shipment",
	shipped: "Shipped",
	delivered: "Delivered",
};

// Convert API status to display status
const getDisplayStatus = (apiStatus: string): string => {
	return STATUS_DISPLAY[apiStatus as keyof typeof STATUS_DISPLAY] || apiStatus;
};

// Convert display status back to API status
const getApiStatus = (displayStatus: string): string => {
	const entries = Object.entries(STATUS_DISPLAY);
	const found = entries.find(([, value]) => value === displayStatus);
	return found ? found[0] : displayStatus.toLowerCase().replace(/ /g, "_");
};

interface ApprovedCreatorsProps {
	projectId: string;
}

// API functions for TanStack Query
const getAuthToken = async () => {
	const auth = getAuth();
	const currentUser = auth.currentUser;
	if (!currentUser) throw new Error("User not authenticated");
	return await currentUser.getIdToken();
};

const fetchApprovedCreators = async (
	projectId: string
): Promise<ApprovedCreator[]> => {
	if (!projectId) throw new Error("Project ID is required");

	const token = await getAuthToken();
	const response = await fetch(
		`/api/project-applications?projectId=${projectId}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch applications: ${response.statusText}`
		);
	}

	const applications = await response.json();
	const approvedApplications = applications.filter(
		(app: any) => app.status === "approved"
	);
	const userIds = [
		...new Set(approvedApplications.map((app: any) => app.userId)),
	];
	const creatorDataMap = new Map();

	// Fetch all creator data in parallel
	await Promise.all(
		userIds.map(async (userId) => {
			try {
				const creatorRes = await fetch(
					`/api/admin/creator-approval?userId=${userId}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (creatorRes.ok) {
					const response = await creatorRes.json();
					if (response.creators && response.creators.length > 0) {
						creatorDataMap.set(userId, response.creators[0]);
					}
				}
			} catch (err) {
				console.error(
					`Error fetching creator data for user ID ${userId}:`,
					err
				);
			}
		})
	);

	// Fetch saved status data for each creator
	const statusDataMap = new Map();
	await Promise.all(
		userIds.map(async (userId) => {
			try {
				const statusRes = await fetch(
					`/api/creator-status?creatorId=${userId}&projectId=${projectId}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (statusRes.ok) {
					const statusData = await statusRes.json();
					statusDataMap.set(userId, statusData);
				}
			} catch (err) {
				console.error(`Error fetching status for user ID ${userId}:`, err);
			}
		})
	);

	// Transform approved applications with detailed creator data
	return approvedApplications.map((app: any) => {
		const creatorData = creatorDataMap.get(app.userId);
		const statusData = statusDataMap.get(app.userId);

		return {
			id: app.userId,
			applicationId: app.id,
			creatorId: app.userId,
			projectId: app.projectId,
			currentStatus: statusData?.data?.status || "pending_shipment",
			trackingNumber: statusData?.data?.trackingNumber || undefined,
			createdAt: app.createdAt,
			updatedAt: statusData?.data?.updatedAt || app.updatedAt,
			creator: creatorData || {},
		};
	});
};

const updateCreatorStatus = async ({
	creatorId,
	projectId,
	status,
	trackingNumber,
}: {
	creatorId: string;
	projectId: string;
	status: string;
	trackingNumber?: string | null;
}) => {
	const token = await getAuthToken();
	const updateData = { creatorId, projectId, status, trackingNumber };

	// Try PUT first (update existing)
	let response = await fetch("/api/creator-status", {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(updateData),
	});

	// If PUT fails with 404, try POST (create new)
	if (!response.ok && response.status === 404) {
		response = await fetch("/api/creator-status", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updateData),
		});
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to update status: ${response.statusText}`
		);
	}

	return await response.json();
};

const sendNotification = async ({
	creatorId,
	projectId,
	status,
	trackingNumber,
	message,
}: {
	creatorId: string;
	projectId: string;
	status: string;
	trackingNumber?: string;
	message: string;
}) => {
	const token = await getAuthToken();
	const response = await fetch("/api/notify-creator", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			creatorId,
			projectId,
			status,
			trackingNumber,
			message,
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to send notification");
	}

	return await response.json();
};

const createConversation = async ({
	currentUserId,
	creatorId,
	userData,
	creatorData,
}: {
	currentUserId: string;
	creatorId: string;
	userData: any;
	creatorData: any;
}) => {
	const response = await fetch("/api/createConversation", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			currentUserId,
			creatorId,
			userData,
			creatorData,
		}),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error || "Failed to handle conversation");
	}

	return data;
};

const ApprovedCreators: React.FC<ApprovedCreatorsProps> = ({ projectId }) => {
	const [trackingNumbers, setTrackingNumbers] = useState<
		Record<string, string>
	>({});
	const router = useRouter();
	const { currentUser } = useAuth();
	const socketRef = useRef<Socket | null>(null);
	const queryClient = useQueryClient();

	// Query for approved creators
	const {
		data: creators = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["approvedCreators", projectId],
		queryFn: () => fetchApprovedCreators(projectId),
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	// Mutation for updating creator status
	const statusMutation = useMutation({
		mutationFn: updateCreatorStatus,
		onSuccess: (data, variables) => {
			queryClient.setQueryData(
				["approvedCreators", projectId],
				(oldData: ApprovedCreator[] | undefined) => {
					if (!oldData) return oldData;
					return oldData.map((creator) =>
						creator.id === variables.creatorId
							? {
									...creator,
									currentStatus: variables.status,
									trackingNumber:
										variables.trackingNumber || creator.trackingNumber,
									updatedAt: new Date().toISOString(),
								}
							: creator
					);
				}
			);
			toast.success(
				`Delivery status updated to ${getDisplayStatus(variables.status)}`
			);
		},
		onError: (error) => {
			toast.error("Failed to update delivery status", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// Mutation for saving tracking numbers
	const trackingMutation = useMutation({
		mutationFn: ({
			creatorId,
			trackingNumber,
		}: {
			creatorId: string;
			trackingNumber: string;
		}) =>
			updateCreatorStatus({
				creatorId,
				projectId,
				status: "shipped",
				trackingNumber,
			}),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(
				["approvedCreators", projectId],
				(oldData: ApprovedCreator[] | undefined) => {
					if (!oldData) return oldData;
					return oldData.map((creator) =>
						creator.id === variables.creatorId
							? {
									...creator,
									trackingNumber: variables.trackingNumber,
									updatedAt: new Date().toISOString(),
								}
							: creator
					);
				}
			);
			toast.success("Tracking number saved successfully");
		},
		onError: (error) => {
			toast.error("Failed to save tracking number", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// Mutation for sending notifications
	const notificationMutation = useMutation({
		mutationFn: sendNotification,
		onSuccess: (data, variables) => {
			const creator = creators.find((c) => c.id === variables.creatorId);
			if (creator) {
				toast.success("Notification Sent", {
					description: `${creator.creator?.firstName} ${creator.creator?.lastName} has been notified`,
				});
			}
		},
		onError: (error) => {
			toast.error("Failed to notify creator", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// Mutation for creating conversations
	const conversationMutation = useMutation({
		mutationFn: createConversation,
		onSuccess: (data) => {
			router.push(
				`/brand/dashboard/messages?conversation=${data.conversationId}`
			);
		},
		onError: (error) => {
			console.error("Error handling conversation:", error);
			alert("Failed to open conversation. Please try again.");
		},
	});

	// Initialize tracking numbers when creators data changes
	useEffect(() => {
		if (creators.length > 0) {
			const initialTrackingNumbers: Record<string, string> = {};
			creators.forEach((creator) => {
				if (creator.trackingNumber) {
					initialTrackingNumbers[creator.id] = creator.trackingNumber;
				}
			});
			setTrackingNumbers(initialTrackingNumbers);
		}
	}, [creators]);

	// Socket connection for real-time updates
	useEffect(() => {
		if (!currentUser?.uid) return;

		const socket = io({
			path: "/socket.io",
			transports: ["polling", "websocket"],
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			console.log("Connected to socket server");
			socket.emit("subscribe-user", currentUser.uid);
		});

		socket.on("delivery-status-updated", (data) => {
			if (data.projectId === projectId) {
				queryClient.setQueryData(
					["approvedCreators", projectId],
					(oldData: ApprovedCreator[] | undefined) => {
						if (!oldData) return oldData;
						return oldData.map((creator) =>
							creator.id === data.creatorId
								? {
										...creator,
										currentStatus: data.status,
										updatedAt: data.updatedAt,
									}
								: creator
						);
					}
				);
			}
		});

		return () => {
			if (socket.connected) {
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [currentUser?.uid, projectId, queryClient]);

	// Firestore listener
	useEffect(() => {
		const unsubscribe = onSnapshot(
			doc(db, "projectCreatorStatus", projectId),
			(doc) => {
				const data = doc.data();
				if (data?.status === "delivered") {
					// Invalidate and refetch the query
					queryClient.invalidateQueries({
						queryKey: ["approvedCreators", projectId],
					});
				}
			}
		);

		return () => unsubscribe();
	}, [projectId, queryClient]);

	const handleSendMessage = async (creator: Creator) => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		conversationMutation.mutate({
			currentUserId: currentUser.uid,
			creatorId: creator.id,
			userData: {
				name: currentUser.displayName || "User",
				avatar: currentUser.photoURL || "/icons/default-avatar.svg",
				username: currentUser.email?.split("@")[0] || "",
			},
			creatorData: {
				name:
					`${creator.firstName} ${creator.lastName}`.trim() || creator.username,
				avatar: creator.logoUrl || "/icons/default-avatar.svg",
				username: creator.username,
			},
		});
	};

	const handleStatusChange = async (
		creatorId: string,
		newDisplayStatus: string
	) => {
		const newApiStatus = getApiStatus(newDisplayStatus);
		statusMutation.mutate({
			creatorId,
			projectId,
			status: newApiStatus,
			trackingNumber:
				newApiStatus === "shipped" ? trackingNumbers[creatorId] : null,
		});

		// Clear tracking number if status is changed away from "shipped"
		if (newApiStatus !== "shipped") {
			setTrackingNumbers((prev) => {
				const updated = { ...prev };
				delete updated[creatorId];
				return updated;
			});
		}
	};

	const saveTrackingNumber = async (creatorId: string) => {
		const trackingNumber = trackingNumbers[creatorId]?.trim();

		if (!trackingNumber) {
			toast.error("Please enter a tracking number");
			return;
		}

		trackingMutation.mutate({ creatorId, trackingNumber });
	};

	const handleTrackingNumberChange = (
		creatorId: string,
		trackingNumber: string
	) => {
		setTrackingNumbers((prev) => ({
			...prev,
			[creatorId]: trackingNumber,
		}));
	};

	const notifyCreator = async (creatorId: string) => {
		const creator = creators.find((c) => c.id === creatorId);
		if (!creator) {
			toast.error("Creator not found");
			return;
		}

		// Send notification via API
		notificationMutation.mutate({
			creatorId,
			projectId,
			status: creator.currentStatus,
			trackingNumber: creator.trackingNumber,
			message: `Your delivery status has been updated to ${getDisplayStatus(creator.currentStatus)}`,
		});

		// Send real-time notification via socket
		if (socketRef.current?.connected && currentUser) {
			socketRef.current.emit("send-delivery-notification", {
				creatorId,
				projectId,
				status: creator.currentStatus,
				trackingNumber: creator.trackingNumber,
				message: `Your delivery status has been updated to ${getDisplayStatus(creator.currentStatus)}`,
				timestamp: new Date().toISOString(),
				brandName: currentUser.displayName || "Brand",
			});
		}
	};

	// Format the status for display with proper badge styling
	const getStatusBadge = (status: string) => {
		const displayStatus = getDisplayStatus(status);
		let badgeClass =
			"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ";

		switch (displayStatus) {
			case "Pending Shipment":
				badgeClass += "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]";
				return (
					<div className={badgeClass}>
						<span className="mr-1 mb-0.5">•</span>
						{displayStatus}
					</div>
				);
			case "Shipped":
				badgeClass += "bg-[#FFE5FB] border border-[#FC52E4] text-[#FC52E4]";
				return (
					<div className={badgeClass}>
						<span className="mr-1 mb-0.5">•</span>
						{displayStatus}
					</div>
				);
			case "Delivered":
				badgeClass += "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647]";
				return (
					<div className={badgeClass}>
						<Check className="w-3 h-3 mr-1" />
						{displayStatus}
					</div>
				);
			default:
				badgeClass += "bg-gray-100 text-gray-800";
				return <div className={badgeClass}>{displayStatus}</div>;
		}
	};

	// Format the date for display
	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";

		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
		} catch (error) {
			console.error("Error formatting date:", error);
			return "Invalid Date";
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p className="text-gray-600">Loading delivery information...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12 bg-red-50 rounded-lg">
				<p className="text-red-500">
					Error loading approved creators:{" "}
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
			</div>
		);
	}

	if (creators.length === 0) {
		return (
			<div className="text-center py-12 bg-gray-50 rounded-lg">
				<p className="text-gray-500">
					No approved creators found for this project.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl mx-auto rounded-lg shadow-sm space-y-4">
			{creators.map((creator) => (
				<Card key={creator.id} className="mb-4">
					<CardContent className="p-6">
						<div className="flex items-start justify-between mb-6">
							<div className="flex items-start">
								<div className="flex-shrink-0 mr-4">
									<div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
										<Image
											src={creator.creator?.logoUrl || ""}
											alt={creator.creator?.username || "Creator"}
											width={48}
											height={48}
											className="w-full h-full object-cover"
										/>
									</div>
								</div>
								<div>
									<h3 className="text-base font-semibold text-gray-900">
										{creator.creator?.firstName && creator.creator?.lastName
											? `${creator.creator.firstName} ${creator.creator.lastName}`
											: creator.creator?.username || "Unknown Creator"}
									</h3>
									<p className="text-sm text-gray-600">
										{creator.creator?.email || "Unknown"}
									</p>
									<Button
										onClick={() =>
											creator?.creator && handleSendMessage(creator.creator)
										}
										disabled={conversationMutation.isPending}
										className="inline-flex items-center mt-2 px-3 py-1 bg-black text-white text-xs rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
									>
										<span className="mr-1">
											{conversationMutation.isPending
												? "Loading..."
												: "Message Creator"}
										</span>
										<Image
											src="/icons/messageIcon.svg"
											alt="Message Icon"
											width={12}
											height={12}
										/>
									</Button>
								</div>
							</div>
							<div className="text-right">
								{getStatusBadge(creator.currentStatus)}
								<p className="text-sm text-gray-600 mt-1">
									Updated On:{" "}
									{formatDate(creator.updatedAt || creator.createdAt)}
								</p>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-700 block mb-2">
									Delivery Status
								</label>
								<Select
									value={getDisplayStatus(creator.currentStatus)}
									onValueChange={(value) =>
										handleStatusChange(creator.id, value)
									}
									disabled={
										statusMutation.isPending ||
										creator.currentStatus === "delivered"
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="" />
									</SelectTrigger>
									<SelectContent className="bg-white">
										<SelectItem value="Pending Shipment">
											Pending Shipment
										</SelectItem>
										<SelectItem value="Shipped">Shipped</SelectItem>
										<SelectItem value="Delivered">Delivered</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{creator.currentStatus === "delivered" && (
								<p className="text-sm text-green-600 mt-1 flex items-center">
									<Check className="w-3 h-3 mr-1" />
									Delivery confirmed
								</p>
							)}

							{/* Tracking Number Field - Only show when status is "Shipped" and not delivered */}
							{creator.currentStatus === "shipped" && (
								<div>
									<label className="text-sm font-medium text-gray-700 block mb-2">
										Tracking Number
									</label>
									<div className="flex gap-2">
										<input
											type="text"
											value={
												trackingNumbers[creator.id] ||
												creator.trackingNumber ||
												""
											}
											onChange={(e) =>
												handleTrackingNumberChange(creator.id, e.target.value)
											}
											placeholder="Enter tracking number"
											className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
										/>
										<Button
											onClick={() => saveTrackingNumber(creator.id)}
											disabled={
												trackingMutation.isPending ||
												!trackingNumbers[creator.id]?.trim()
											}
											className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
										>
											{trackingMutation.isPending ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												"Save"
											)}
										</Button>
									</div>
									{/* Show saved indicator */}
									{creator.trackingNumber &&
										creator.trackingNumber === trackingNumbers[creator.id] && (
											<p className="text-sm text-green-600 mt-1 flex items-center">
												<Check className="w-3 h-3 mr-1" />
												Tracking number saved
											</p>
										)}
								</div>
							)}
						</div>
					</CardContent>
					<CardFooter className="px-6 pb-6 pt-0">
						<Button
							className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-300"
							onClick={() => notifyCreator(creator.id)}
							disabled={
								notificationMutation.isPending ||
								creator.currentStatus === "delivered"
							}
						>
							<span>
								{notificationMutation.isPending
									? "Sending..."
									: "Notify Creator"}
							</span>
							<Mail className="ml-2 h-4 w-4" />
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
};

export default ApprovedCreators;
