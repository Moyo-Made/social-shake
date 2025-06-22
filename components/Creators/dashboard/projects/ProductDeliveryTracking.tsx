/* eslint-disable @typescript-eslint/no-explicit-any */

import io, { Socket } from "socket.io-client";
import { useRef, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BrandProfile } from "./RenderActionButton";
import { useAuth } from "@/context/AuthContext";
import { ProjectFormData } from "@/types/contestFormData";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Define types for our API responses
interface ShippingAddress {
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	zipCode: string;
	country: string;
	name?: string;
	phoneNumber?: string;
	deliveryInstructions?: string;
}

interface StatusHistoryItem {
	status: string;
	timestamp: { seconds: number };
	description: string;
}

interface DeliveryData {
	id?: string;
	projectId: string;
	userId?: string;
	receiptConfirmed?: boolean;
	currentStatus: string;
	actualDeliveryDate?: { seconds: number };
	statusHistory: StatusHistoryItem[];
	productName?: string;
	productQuantity?: number;
	productType?: string;
	shippingAddress: ShippingAddress;
	estimatedDeliveryDate?: {
		from?: { seconds: number };
		to?: { seconds: number };
	};
	contentDueDate?: { seconds: number };
	shippedDate?: { seconds: number };
	contentCreationStarted?: boolean;
	trackingNumber?: string;
	carrier?: string;
	deliveryTime?: string;
	[key: string]: any;
}

// Helper function to format dates
const formatDate = (timestamp: { seconds: number }) => {
	if (!timestamp) return "Not Yet Shipped";

	const date = new Date(timestamp.seconds * 1000);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

// Helper function to format date range
const formatDateRange = (
	from: { seconds: number },
	to: { seconds: number }
) => {
	if (!from || !to) return "Not Yet Shipped";

	const fromDate = new Date(from.seconds * 1000);
	const toDate = new Date(to.seconds * 1000);

	const fromFormatted = fromDate.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const toFormatted = toDate.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return `${fromFormatted}-${toFormatted.split(", ")[0]}, ${toFormatted.split(", ")[1]}`;
};

// Updated API functions to match brand side implementation
const deliveryApi = {
	notifyBrandOfDelivery: async (creatorId: string, projectId: string) => {
		try {
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) {
				throw new Error("User not authenticated");
			}

			const token = await currentUser.getIdToken();

			const response = await fetch("/api/notify-brand", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					creatorId,
					projectId,
					status: "delivered",
					message:
						"Product has been received and delivery confirmed by creator",
				}),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Error notifying brand:", error);
			throw error;
		}
	},

	getDeliveryStatus: async (creatorId: string, projectId: string) => {
		try {
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) {
				throw new Error("User not authenticated");
			}

			const token = await currentUser.getIdToken();

			// Fetch creator status from the same API the brand uses
			const response = await fetch(
				`/api/creator-status?creatorId=${creatorId}&projectId=${projectId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				}
			);

			if (!response.ok) {
				// If no status found, return default pending status
				if (response.status === 404) {
					return {
						status: "pending_shipment",
						trackingNumber: null,
						updatedAt: null,
					};
				}
				throw new Error(`API error: ${response.status}`);
			}

			const result = await response.json();
			return result.data; // The API returns { success: true, data: {...} }
		} catch (error) {
			console.error("Error fetching delivery status:", error);
			throw error;
		}
	},

	confirmProductReceipt: async (creatorId: string, projectId: string) => {
		try {
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) {
				throw new Error("User not authenticated");
			}

			const token = await currentUser.getIdToken();

			// Update status to delivered
			const response = await fetch("/api/creator-status", {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					creatorId,
					projectId,
					status: "delivered",
					trackingNumber: null,
				}),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error("Error confirming receipt:", error);
			throw error;
		}
	},

	beginContentCreation: async (creatorId: string, projectId: string) => {
		try {
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) {
				throw new Error("User not authenticated");
			}

			const token = await currentUser.getIdToken();

			// You might need a separate API for content creation status
			// For now, we'll use the same status API
			const response = await fetch("/api/creator-status", {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					creatorId,
					projectId,
					status: "content_creation",
					trackingNumber: null,
				}),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error("Error beginning content creation:", error);
			throw error;
		}
	},
};

interface DeliveryTrackingProps {
	projectId?: string;
	creatorId?: string;
	project: ProjectFormData;
}

export default function DeliveryTracking({
	projectId,
	creatorId: propCreatorId,
	project,
}: DeliveryTrackingProps) {
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [authCreatorId, setAuthCreatorId] = useState<string>("");
	const [, setShippingAddress] = useState<ShippingAddress | null>(null);
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const socketRef = useRef<Socket | null>(null);
	const [, setNotifications] = useState<any[]>([]);
	const [, setShowNotification] = useState(false);
	const [realTimeStatuses, setRealTimeStatuses] = useState<Record<string, any>>(
		{}
	);

	const router = useRouter();
	const { currentUser } = useAuth();

	useEffect(() => {
		if (!currentUser?.uid) return; // currentUser is the creator's auth

		// Initialize socket connection
		const socket = io({
			path: "/socket.io",
			transports: ["polling", "websocket"],
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			// Subscribe to notifications for this creator
			socket.emit("subscribe-creator-notifications", currentUser.uid);
		});

		// Listen for delivery status notifications
		socket.on(
			"delivery-status-notification",
			(data: {
				projectId: string;
				status: string;
				trackingNumber?: string;
				message: string;
				timestamp: string;
				brandName?: string;
			}) => {

				// Add to notifications list
				setNotifications((prev) => [data, ...prev]);

				// Show toast notification
				toast.success("Delivery Update", {
					description: data.message,
				});

				// Show in-app notification
				setShowNotification(true);

				// Auto-hide after 5 seconds
				setTimeout(() => setShowNotification(false), 5000);

				// Update real-time status for the specific project
				setRealTimeStatuses((prev) => ({
					...prev,
					[data.projectId]: {
						status: data.status,
						trackingNumber: data.trackingNumber,
						updatedAt: data.timestamp,
						shippedDate:
							data.status === "shipped"
								? { seconds: new Date(data.timestamp).getTime() / 1000 }
								: prev[data.projectId]?.shippedDate,
					},
				}));
			}
		);

		// Listen for general project notifications
		socket.on("project-notification", () => {
			// Handle other project-related notifications
		});

		// Cleanup on unmount
		return () => {
			if (socket.connected) {
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [currentUser?.uid]);

	useEffect(() => {
		const fetchBrandProfile = async () => {
			// Use the prop project instead of state project
			const projectData = project; // This is the prop passed to the component

			if (!projectData?.userId) {
				return;
			}

			try {
				const auth = getAuth();
				const currentUser = auth.currentUser;

				if (!currentUser) {
					return;
				}

				const token = await currentUser.getIdToken();

				const response = await fetch(
					`/api/admin/brand-approval?userId=${projectData.userId}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (response.ok) {
					const data = await response.json();
					setBrandProfile(data);
				} else {
					setBrandProfile({
						id: projectData.userId,
						userId: projectData.userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error(`Error fetching brand profile:`, error);
				// Set a default profile even on error
				setBrandProfile({
					id: projectData.userId,
					userId: projectData.userId,
					email: "Unknown",
					brandName: "Unknown Brand",
					logoUrl: "",
				});
			}
		};

		// Use the prop project instead of state
		if (project?.userId) {
			fetchBrandProfile();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [project?.userId]); // Depend on the prop project

	// Use the prop creatorId if provided, otherwise use the auth creatorId
	const effectiveCreatorId = propCreatorId || authCreatorId;

	const fetchShippingAddress = async () => {
		if (!effectiveCreatorId) return null;

		try {
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) return null;

			const token = await currentUser.getIdToken();

			const response = await fetch(
				`/api/shipping-addresses?userId=${effectiveCreatorId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				}
			);

			if (response.ok) {
				const addresses = await response.json();

				const defaultAddress =
					addresses.find((addr: any) => addr.isDefault) || addresses[0];

				if (defaultAddress) {

					const addressData = {
						addressLine1: defaultAddress.addressLine1,
						addressLine2: defaultAddress.addressLine2 || "",
						city: defaultAddress.city,
						state: defaultAddress.state,
						zipCode: defaultAddress.zipCode,
						country: defaultAddress.country,
						name: defaultAddress.name,
						phoneNumber: defaultAddress.phoneNumber,
						deliveryInstructions: defaultAddress.deliveryInstructions,
					};

					setShippingAddress(addressData);
					return addressData;
				}
			}
			return null;
		} catch (error) {
			console.error("Error fetching shipping address:", error);
			return null;
		}
	};

	useEffect(() => {
		const auth = getAuth();
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				setAuthCreatorId(user.uid);
			} else {
				setAuthCreatorId("");
			}
		});

		return () => unsubscribe();
	}, []);


	const queryClient = useQueryClient();

	const {
		data: deliveryData,
		isLoading: loading,
		error: queryError,
		refetch,
	} = useQuery({
		queryKey: ["deliveryStatus", effectiveCreatorId, projectId],
		queryFn: async () => {
			if (!effectiveCreatorId || !projectId) {
				throw new Error("Creator ID and Project ID are required");
			}

			const statusResult = await deliveryApi.getDeliveryStatus(
				effectiveCreatorId,
				projectId
			);

			const fetchedAddress = await fetchShippingAddress();

			if (statusResult) {
				// Create delivery data structure based on the status from brand API
				const processedData: DeliveryData = {
					id: effectiveCreatorId,
					projectId: projectId,
					userId: effectiveCreatorId,
					currentStatus: statusResult.status || "pending_shipment",
					trackingNumber: statusResult.trackingNumber,
					shippingAddress: fetchedAddress || {
						addressLine1: "No address found",
						city: "N/A",
						state: "N/A",
						zipCode: "N/A",
						country: "N/A",
					},
					statusHistory: [],
					deliveryTime: "4-7 days",
					productName: "Product Sample",
					productQuantity: 1,
					productType: "Sample Product",
				};

				// Generate status history based on current status
				const now = Date.now() / 1000;
				const statusHistory: StatusHistoryItem[] = [];

				// Always add preparation step
				statusHistory.push({
					status: "preparation",
					timestamp: { seconds: now - 86400 * 5 }, // 5 days ago
					description: "The Brand is preparing your product package",
				});

				// Add shipped step if status is shipped or beyond
				if (
					["shipped", "delivered", "content_creation"].includes(
						processedData.currentStatus
					)
				) {
					statusHistory.push({
						status: "shipped",
						timestamp: { seconds: now - 86400 * 3 }, // 3 days ago
						description: "Your product has been shipped",
					});

					statusHistory.push({
						status: "in_region",
						timestamp: { seconds: now - 86400 * 2 }, // 2 days ago
						description: "Your product has arrived in your region",
					});

					statusHistory.push({
						status: "out_for_delivery",
						timestamp: { seconds: now - 86400 }, // 1 day ago
						description: "Your package is on a delivery vehicle",
					});

					// Set shipped date
					processedData.shippedDate = { seconds: now - 86400 * 3 };

					// Calculate estimated delivery
					processedData.estimatedDeliveryDate = {
						from: { seconds: now - 86400 },
						to: { seconds: now + 86400 },
					};
				}

				// Add delivered step ONLY if status is delivered or beyond
				if (
					["delivered", "content_creation"].includes(
						processedData.currentStatus
					)
				) {
					statusHistory.push({
						status: "delivered",
						timestamp: { seconds: statusResult.updatedAt || now }, // Use actual timestamp
						description: "Package delivered and receipt confirmed",
					});

					processedData.receiptConfirmed = true;
					processedData.actualDeliveryDate = {
						seconds: statusResult.updatedAt || now,
					};
				}

				// Add content creation step if applicable
				if (processedData.currentStatus === "content_creation") {
					statusHistory.push({
						status: "content_creation",
						timestamp: { seconds: now },
						description: "Content creation period has begun",
					});

					processedData.contentCreationStarted = true;
				}

				processedData.statusHistory = statusHistory;

				// Calculate content due date (14 days after estimated delivery)
				if (processedData.estimatedDeliveryDate?.to) {
					processedData.contentDueDate = {
						seconds:
							processedData.estimatedDeliveryDate.to.seconds +
							14 * 24 * 60 * 60,
					};
				}

				return processedData;
			} else {
				throw new Error("No delivery information found");
			}
		},
		enabled: !!(effectiveCreatorId && projectId),
		staleTime: 30000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
		retry: (failureCount, error) => {
			// Don't retry on authentication errors
			if (
				error instanceof Error &&
				error.message.includes("not authenticated")
			) {
				return false;
			}
			// Retry up to 3 times for other errors
			return failureCount < 3;
		},
	});

	// Convert query error to string for existing error handling
	const error = queryError
		? queryError instanceof Error
			? queryError.message.includes("not authenticated")
				? "Please log in to view delivery information"
				: queryError.message.includes("No delivery information found")
					? "No delivery information found for this project"
					: `Failed to load delivery information: ${queryError.message}`
			: "Failed to load delivery information"
		: null;

	const confirmReceiptMutation = useMutation({
		mutationFn: async () => {
			if (!effectiveCreatorId || !projectId || !deliveryData) {
				throw new Error("Missing required data");
			}

			const result = await deliveryApi.confirmProductReceipt(
				effectiveCreatorId,
				projectId
			);
			if (result.success) {
				await deliveryApi.notifyBrandOfDelivery(effectiveCreatorId, projectId);
			}
			return result;
		},
		onSuccess: () => {
			// Invalidate and refetch delivery status
			queryClient.invalidateQueries({
				queryKey: ["deliveryStatus", effectiveCreatorId, projectId],
			});

			// Update real-time statuses and socket logic (keep existing)
			if (socketRef.current?.connected) {
				socketRef.current.emit("delivery-status-updated", {
					creatorId: effectiveCreatorId,
					projectId: projectId,
					status: "delivered",
					trackingNumber: deliveryData?.trackingNumber,
					updatedAt: new Date().toISOString(),
				});
			}

			setRealTimeStatuses((prev) => ({
				...prev,
				[projectId!]: {
					status: "delivered",
					trackingNumber: deliveryData?.trackingNumber,
					updatedAt: new Date().toISOString(),
				},
			}));

			toast.success("Receipt confirmed and brand notified!");
		},
		onError: (error) => {
			console.error("Error confirming receipt:", error);
			toast.error("Failed to confirm receipt. Please try again.");
		},
	});

	const beginContentCreationMutation = useMutation({
		mutationFn: async () => {
			if (!effectiveCreatorId || !projectId) {
				throw new Error("Missing required data");
			}
			return await deliveryApi.beginContentCreation(
				effectiveCreatorId,
				projectId
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["deliveryStatus", effectiveCreatorId, projectId],
			});

			// Update real-time status (keep existing logic)
			setRealTimeStatuses((prev) => ({
				...prev,
				[projectId!]: {
					status: "content_creation",
					trackingNumber: deliveryData?.trackingNumber,
					updatedAt: new Date().toISOString(),
				},
			}));
		},
		onError: (error) => {
			console.error("Error beginning content creation:", error);
		},
	});

	const handleConfirmReceipt = async () => {
		setConfirmModalOpen(false);
		confirmReceiptMutation.mutate();
	};

	const handleBeginContentCreation = async () => {
		beginContentCreationMutation.mutate();
	};

	const handleSendMessageToBrand = async () => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		// Use the prop project instead of state project
		const projectData = project; // This is the prop

		// Check if we have project data first
		if (!projectData?.userId) {
			alert("Project information is still loading. Please try again.");
			return;
		}

		// Make sure we have the brand profile data
		if (!brandProfile) {
			alert("Brand information is still loading. Please try again.");
			return;
		}

		try {
			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: currentUser.uid,
					brandId: brandProfile.userId,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
					},
					brandData: {
						name: brandProfile.brandName,
						avatar: brandProfile.logoUrl,
						username: brandProfile.email?.split("@")[0] || "",
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create conversation");
			}

			// Navigate to chat page with this conversation
			router.push(
				`/creator/dashboard/messages?conversation=${data.conversationId}`
			);
		} catch (error) {
			console.error("Error creating conversation:", error);
			alert("Failed to start conversation. Please try again.");
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<div className="text-center">
					<p>Loading delivery information...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="text-center text-red-500">
					<p className="mb-2">{error}</p>

					{!effectiveCreatorId && (
						<button
							className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
							onClick={() => refetch()}
						>
							Refresh Page
						</button>
					)}
				</div>
			</div>
		);
	}

	if (!deliveryData) {
		return (
			<div className="flex justify-center items-center h-64">
				No delivery information found
			</div>
		);
	}

	const getProjectStatus = (projectId: string) => {
		return realTimeStatuses[projectId];
	};

	const realTimeStatus = getProjectStatus(projectId || "");
	const currentStatus = realTimeStatus?.status || deliveryData.currentStatus;

	// Determine which steps are completed based on the brand's status system
	const stepsCompleted = {
		preparation: [
			"pending_shipment",
			"shipped",
			"delivered",
			"content_creation",
		].includes(currentStatus),
		shipped: ["shipped", "delivered", "content_creation"].includes(
			currentStatus
		),
		inRegion: ["shipped", "delivered", "content_creation"].includes(
			currentStatus
		),
		outForDelivery: ["shipped", "delivered", "content_creation"].includes(
			currentStatus
		),
		delivered: ["delivered", "content_creation"].includes(currentStatus),
		contentCreation: currentStatus === "content_creation",
	};

	// Find the status descriptions from history
	const findStatusDescription = (status: string) => {
		const historyItem = deliveryData.statusHistory.find(
			(item) => item.status === status
		);
		return historyItem ? historyItem.description : "";
	};

	// Function to get status date
	const getStatusDate = (status: string) => {
		const historyItem = deliveryData.statusHistory.find(
			(item) => item.status === status
		);
		return historyItem ? formatDate(historyItem.timestamp) : "";
	};

	// Format the shipping address for display
	const formatAddress = (address: ShippingAddress) => {
		return {
			name: address.name || "Recipient",
			street: address.addressLine1,
			addressLine2: address.addressLine2,
			city: address.city,
			state: address.state,
			zipCode: address.zipCode,
			country: address.country,
			phoneNumber: address.phoneNumber,
			deliveryInstructions: address.deliveryInstructions,
		};
	};

	const displayAddress = formatAddress(deliveryData.shippingAddress);
	// Where you show deliveryData.trackingNumber, use:
	const currentTrackingNumber =
		realTimeStatus?.trackingNumber || deliveryData.trackingNumber;

	// const currentShippingDate =
	// 	realTimeStatus?.shippedDate || deliveryData.shippedDate;

	const currentCarrier = realTimeStatus?.carrier || deliveryData.carrier;

	// Calculate real-time content due date
	const calculateContentDueDate = () => {
		const deliveredDate = realTimeStatus?.updatedAt
			? new Date(realTimeStatus.updatedAt).getTime() / 1000
			: deliveryData.actualDeliveryDate?.seconds;

		if (
			deliveredDate &&
			(currentStatus === "delivered" || currentStatus === "content_creation")
		) {
			return { seconds: deliveredDate + 14 * 24 * 60 * 60 }; // 14 days after delivery
		}
		return deliveryData.contentDueDate;
	};

	const currentContentDueDate = calculateContentDueDate();

	return (
		<div className="flex flex-col md:flex-row w-full gap-6">
			{/* Timeline section */}
			<div className="flex-1">
				{/* Step 1: Preparation */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.preparation ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg font-medium text-black">
							Product yet to be Shipped{" "}
							{getStatusDate("preparation") && (
								<span className="text-sm ml-2 font-normal text-gray-500">
									{getStatusDate("preparation")}
								</span>
							)}
						</h3>
						<p className="text-base text-gray-600">
							{findStatusDescription("preparation") ||
								"The Brand is preparing your product package"}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 2: Shipped */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.shipped ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product Shipped
							{stepsCompleted.shipped ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("shipped") ||
										formatDate(
											deliveryData.shippedDate || {
												seconds: Date.now() / 1000 - 86400 * 2,
											}
										)}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("shipped") ||
								"Your product has been shipped"}
						</p>
						{currentTrackingNumber && stepsCompleted.shipped && (
							<p className="text-orange-500 mt-1 text-sm flex items-center underline">
								{currentCarrier
									? `Track package with ${currentCarrier}:`
									: "Tracking number:"}{" "}
								<span>{String(currentTrackingNumber)}</span>
								<Copy size={16} className="ml-2" />
							</p>
						)}
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 3: In Region */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.inRegion ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product has reached your Region
							{stepsCompleted.inRegion ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("in_region")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("in_region") ||
								"Your product has arrived in your region"}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 4: Out for Delivery */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.outForDelivery ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product Out for Delivery
							{stepsCompleted.outForDelivery ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("out_for_delivery")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("out_for_delivery") ||
								"Your package is on a delivery vehicle"}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 5: Delivered */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.delivered ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product Delivered
							{stepsCompleted.delivered ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("delivered")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							Package will be marked as delivered once you confirm receipt
						</p>
						{currentStatus === "shipped" && !stepsCompleted.delivered && (
							<button
								className="mt-4 bg-black text-white py-2 px-4 text-sm rounded-md"
								onClick={() => setConfirmModalOpen(true)}
							>
								Confirm Product Receipt
							</button>
						)}
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 6: Content Creation */}
				<div className="flex mb-4">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.contentCreation ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Content Creation Period Begins
							{stepsCompleted.contentCreation ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{formatDate({ seconds: Date.now() / 1000 - 86400 * 2 })}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									After delivery
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{stepsCompleted.contentCreation
								? "You'll have 14 days to create and submit your content"
								: "You begin once your Package is Delivered"}
						</p>
						{stepsCompleted.delivered && !stepsCompleted.contentCreation && (
							<button
								className="mt-4 text-sm bg-green-700 text-white py-2 px-4 rounded-md"
								onClick={handleBeginContentCreation}
								disabled={beginContentCreationMutation.isPending}
							>
								Begin Creating Content
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Right sidebar with delivery info */}
			<div className="md:w-96 h-fit border border-orange-200 rounded-lg p-6">
				<div className="mb-6">
					<div className="flex justify-between items-center mb-2">
						<h3 className="text-base text-black font-medium">
							Delivery Status
						</h3>
						<div className="flex items-center">
							{currentStatus === "pending_shipment" && (
								<span className="text-base text-black font-medium">
									Pending Delivery
								</span>
							)}
							{currentStatus === "shipped" && (
								<>
									<span className="text-base text-black font-medium">
										In Transit
									</span>
									<Image
										src="/icons/transit.svg"
										alt="Transit Icon"
										className="ml-1"
										width={18}
										height={18}
									/>
								</>
							)}
							{(currentStatus === "delivered" ||
								currentStatus === "content_creation") && (
								<>
									<span className="text-base text-black font-medium">
										Delivered
									</span>
									<Image
										src="/icons/delivered.svg"
										alt="Delivered Icon"
										className="ml-1"
										width={18}
										height={18}
									/>
								</>
							)}
						</div>
					</div>
					<div className="border-t pt-2">
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Shipped Date:</span>
							<span className="text-black">
								{deliveryData.shippedDate
									? formatDate(deliveryData.shippedDate)
									: "Not Yet Shipped"}
							</span>
						</div>
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Est. Delivery:</span>
							<span className="text-black">
								{deliveryData.estimatedDeliveryDate
									? deliveryData.estimatedDeliveryDate.from &&
										deliveryData.estimatedDeliveryDate.to
										? formatDateRange(
												deliveryData.estimatedDeliveryDate.from,
												deliveryData.estimatedDeliveryDate.to
											)
										: formatDate(
												deliveryData.estimatedDeliveryDate?.from || {
													seconds: 0,
												}
											)
									: deliveryData.deliveryTime || "Not Yet Shipped"}
							</span>
						</div>
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Content Due:</span>
							<span className="text-black">
								{currentContentDueDate
									? formatDate(currentContentDueDate)
									: "Not Yet Shipped"}
							</span>
						</div>
					</div>
				</div>

				<div className="mb-6">
					<h3 className="text-base text-black font-medium mb-2">
						Shipping Address
					</h3>
					<div className="border-t pt-2 text-black">
						<p className="font-medium text-black">{displayAddress.name}</p>
						<p>{displayAddress.street}</p>
						{displayAddress.addressLine2 && (
							<p>{displayAddress.addressLine2}</p>
						)}
						<p>
							{displayAddress.city}, {displayAddress.state}{" "}
							{displayAddress.zipCode}
						</p>
						<p>{displayAddress.country}</p>
					</div>
				</div>

				<div className="mb-6">
					<h3 className="text-base text-black font-medium mb-2">
						Product Information
					</h3>
					<div className="border-t pt-2 text-black">
						<p className="mt-1">
							Please use all product features in your content
						</p>
					</div>
				</div>

				<Button
					onClick={handleSendMessageToBrand}
					className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md flex justify-center items-center"
				>
					<Image
						src="/icons/messageIcon.svg"
						alt="Message brand"
						width={18}
						height={18}
						className="mr-1"
					/>
					Message Brand
				</Button>
			</div>

			{/* Confirmation Modal */}
			{confirmModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full">
						<h2 className="text-xl text-black font-semibold mb-4">
							Confirm Product Receipt
						</h2>
						<p className="text-gray-700 mb-6">
							By confirming receipt, you acknowledge that you have received the
							product <span>{deliveryData.productName}</span> and are ready to
							begin the content creation process.
						</p>
						<div className="flex justify-end space-x-4">
							<button
								className="py-2 px-4 text-gray-600"
								onClick={() => setConfirmModalOpen(false)}
							>
								Cancel
							</button>
							<button
								className="bg-orange-500 text-white py-2 px-6 rounded-md flex items-center"
								onClick={handleConfirmReceipt}
								disabled={confirmReceiptMutation.isPending}
							>
								Confirm Receipt
								<Check size={18} className="ml-2" />
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
