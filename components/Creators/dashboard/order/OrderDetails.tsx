"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
	Clock,
	DollarSign,
	FileText,
	Video,
	Calendar,
	CheckCircle,
	XCircle,
	MessageSquare,
	Upload,
	Palette,
	ArrowLeft,
	Package,
	LayoutDashboard,
	Briefcase,
	Plus,
	Target,
	Minus,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, Key } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function OrderDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const orderId = params.orderId as string;
	const [activeTab, setActiveTab] = useState("overview");
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectReason, setRejectReason] = useState("");
	const [showStartWorkModal, setShowStartWorkModal] = useState(false);
	const [videoProgress, setVideoProgress] = useState<
		{
			id: number;
			status: string;
			file: File | null;
			uploadedAt: Date | null;
			notes: string;
			needsRevision?: boolean;
			revisionNotes?: string;
			uploadProgress: number;
			savedFile?: {
				original_filename: string;
				file_url: string;
				created_at: string;
				approval_status?: string;
				revision_notes?: string;
				video_id: number;
				firestore_id: string;
				id: string;
				file_download_url?: string | null;
				file_name?: string;
				file_size?: number;
				file_content_type?: string;
			};
		}[]
	>([]);
	const [workStarted, setWorkStarted] = useState(false);
	const [processingAction, setProcessingAction] = useState<string | null>(null);
	const [orderState, setOrderState] = useState<string | null>(null);

	const { currentUser } = useAuth();
	const queryClient = useQueryClient();


	// Main order query
const { data: orderData, isLoading: loading, error } = useQuery({
	queryKey: ['order', orderId],
	queryFn: async () => {
	  const response = await fetch(`/api/orders/${orderId}`);
	  if (!response.ok) {
		throw new Error(`Error fetching order: ${response.statusText}`);
	  }
	  return response.json();
	},
	enabled: !!orderId,
  });
  
  // Deliverables query
  const { data: deliverables = [] } = useQuery({
	queryKey: ['deliverables', orderId],
	queryFn: () => fetchDeliverables(orderId),
	enabled: !!orderId,
  });
  
  // Brand profile query
  const { data: brandProfile } = useQuery({
	queryKey: ['brandProfile', orderData?.order?.userId],
	queryFn: async () => {
	  if (!orderData?.order?.userId) return null;
	  const response = await fetch(`/api/admin/brand-approval?userId=${orderData.order.userId}`);
	  if (response.ok) {
		const data = await response.json();
		return data.profile;
	  }
	  return null;
	},
	enabled: !!orderData?.order?.userId,
  });

  // Extract the order for easier access
const selectedOrder = orderData?.order ? {
	...orderData.order,
	videoCount: orderData.order.video_count,
	totalPrice: orderData.order.total_price,
	packageType: orderData.order.package_type,
	scriptChoice: orderData.order.script_choice,
	brandName: orderData.order.brandName || "Brand Name",
	deadline: orderData.order.projectBriefData?.timeline?.finalDeadline,
	scriptFormData: orderData.order.scriptFormData,
	projectBriefData: orderData.order.projectBriefData,
  } : null;

  // Accept order mutation
const acceptOrderMutation = useMutation({
	mutationFn: async (orderId: string) => {
	  const response = await fetch(`/api/orders/${orderId}/approve`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
	  });
	  if (!response.ok) throw new Error("Failed to accept order");
	  return response.json();
	},
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ['order', orderId] });
	  setOrderState("in_progress");
	},
  });

  // Reject order mutation
const rejectOrderMutation = useMutation({
	mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
	  const response = await fetch(`/api/orders/${orderId}/reject`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ reason }),
	  });
	  if (!response.ok) throw new Error("Failed to reject order");
	  return response.json();
	},
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ['order', orderId] });
	  setOrderState("rejected");
	  setShowRejectModal(false);
	  setRejectReason("");
	},
  });
  
  // Mark delivered mutation
  const markDeliveredMutation = useMutation({
	mutationFn: async (orderId: string) => {
	  const completedDeliverableIds = videoProgress
		.filter((v) => v.status === "content_submitted" && v.savedFile)
		.map((v) => v.savedFile?.original_filename)
		.filter(Boolean);
  
	  const response = await fetch(`/api/orders/${orderId}/delivered`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
		  creatorId: selectedOrder?.creatorId,
		  delivery_message: "All videos have been completed and are ready for review.",
		  deliverable_ids: completedDeliverableIds,
		}),
	  });
	  
	  if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to mark order as delivered");
	  }
	  return response.json();
	},
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ['order', orderId] });
	  toast.success("Order marked as delivered successfully! Brand has been notified.");
	},
	onError: (error) => {
	  toast.error(error instanceof Error ? error.message : "Failed to mark order as delivered");
	},
  });

	// Updated fetch deliverables function
	const fetchDeliverables = async (orderId: string) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/deliverables`);
			if (response.ok) {
				const data = await response.json();

				return data.deliverables || [];
			} else {
				console.error(
					"Failed to fetch deliverables:",
					response.status,
					response.statusText
				);
			}
		} catch (error) {
			console.error("Error fetching deliverables:", error);
		}
		return [];
	};

	// Updated save deliverable function with chunked upload support
	const saveDeliverable = async (
		orderId: string,
		videoId: number,
		file: File,
		notes: string = "",
		onProgress?: (progress: number) => void
	) => {
		const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
		const fileId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;

		try {
			// Upload file in chunks
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				// Convert chunk to base64
				const chunkData = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => {
						const result = reader.result as string;
						// Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
						const base64Data = result.split(",")[1];
						resolve(base64Data);
					};
					reader.onerror = reject;
					reader.readAsDataURL(chunk);
				});

				const chunkPayload = {
					chunkData,
					fileName: file.name,
					fileContentType: file.type,
					chunkIndex,
					totalChunks,
					fileId,
					videoId,
					notes,
					status: "content_submitted",
					fileSize: file.size,
				};

				const response = await fetch(
					`/api/orders/${orderId}/deliverables/upload`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(chunkPayload),
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to upload chunk");
				}

				const data = await response.json();

				// Update progress
				if (onProgress) {
					onProgress(data.progress || 0);
				}

				// If this is the last chunk and upload is complete
				if (data.deliverable && data.progress === 100) {
					return data.deliverable;
				}
			}

			throw new Error("Upload completed but no deliverable returned");
		} catch (error) {
			console.error("Error saving deliverable:", error);
			throw error;
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

	const getStatusDisplayName = (status: string) => {
		switch (status) {
			case "payment_escrowed":
				return "Payment Secured";
			case "in_progress":
				return "In Progress";
			case "content_submitted":
				return "Content Submitted";
			case "revision_requested":
				return "Revision Requested";
			case "delivered":
				return "Delivered";
			default:
				return status.replace("_", " ").toUpperCase();
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "accepted":
			case "active":
				return "bg-blue-100 text-blue-800";
			case "in_progress":
				return "bg-purple-100 text-purple-800";
			case "payment_escrowed":
				return "bg-purple-100 text-purple-800";
			case "delivered":
				return "bg-green-100 text-green-800";
			case "content_submitted":
				return "bg-green-200 text-green-900";
			case "revision_requested":
				return "bg-orange-100 text-orange-800";
			case "rejected":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getDaysUntilDeadline = (deadline?: string) => {
		if (!deadline) return "No deadline";
		const today = new Date();
		const deadlineDate = new Date(deadline);
		const diffTime = deadlineDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays > 0 ? diffDays : "Overdue";
	};

	const handleAcceptOrder = async () => {
		if (selectedOrder) {
		  setProcessingAction(`accept-${selectedOrder.id}`);
		  try {
			await acceptOrderMutation.mutateAsync(selectedOrder.id);
		  } finally {
			setProcessingAction(null);
		  }
		}
	  };

	  const handleRejectOrder = async () => {
		if (selectedOrder && rejectReason.trim()) {
		  setProcessingAction(`reject-${selectedOrder.id}`);
		  try {
			await rejectOrderMutation.mutateAsync({ 
			  orderId: selectedOrder.id, 
			  reason: rejectReason 
			});
		  } finally {
			setProcessingAction(null);
		  }
		}
	  };

	const handleStartWork = () => {
		setShowStartWorkModal(true);
	};

	const confirmStartWork = async () => {
		if (selectedOrder) {
			// Initialize video progress tracking
			const initialProgress = Array.from(
				{ length: selectedOrder.videoCount },
				(_, index) => ({
					id: index + 1,
					status: "pending",
					file: null,
					uploadedAt: null,
					notes: "",
					uploadProgress: 0,
				})
			);
			setVideoProgress(
				initialProgress.map((progress) => ({
					...progress,
					uploadProgress: 0, // Add default uploadProgress property
				}))
			);
			setWorkStarted(true);
			setShowStartWorkModal(false);

			// Update order status to 'active' and notify brand
			try {
				const response = await fetch(
					`/api/orders/${selectedOrder.id}/start-work`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							status: "active",
							work_started_at: new Date().toISOString(),
						}),
					}
				);

				if (response.ok) {
					
					toast.success("Work started successfully! Brand has been notified.");
					queryClient.invalidateQueries({ queryKey: ['order', selectedOrder.id] });
				}
			} catch (error) {
				console.error("Error starting work:", error);
			}
		}
	};

	const handleMarkDelivered = async () => {
		if (selectedOrder) {
		  setProcessingAction(`deliver-${selectedOrder.id}`);
		  try {
			await markDeliveredMutation.mutateAsync(selectedOrder.id);
		  } finally {
			setProcessingAction(null);
		  }
		}
	  };


	  useEffect(() => {
		if (orderData?.success && deliverables.length >= 0) {
		  const order = selectedOrder;
		  if (!order) return;
	  
		  setOrderState(
			order.status === "accepted" || order.status === "rejected"
			  ? order.status
			  : null
		  );
	  
		  // Initialize video progress with saved deliverables and revision status
		  if (
			order.status === "active" ||
			order.status === "in_progress" ||
			order.status === "revision_requested"
		  ) {
			const initialProgress = Array.from(
			  { length: order.videoCount },
			  (_, index) => {
				const savedDeliverable = deliverables.find(
				  (d: { video_id: number }) => d.video_id === index + 1
				);
	  
				if (savedDeliverable) {
				  const needsRevision = savedDeliverable.approval_status === "revision_requested";
				  return {
					id: index + 1,
					status: needsRevision ? "revision_requested" : "content_submitted",
					file: null,
					uploadedAt: new Date(savedDeliverable.created_at),
					notes: savedDeliverable.notes || "",
					needsRevision: needsRevision,
					revisionNotes: savedDeliverable.revision_notes || "",
					savedFile: savedDeliverable,
					uploadProgress: 0,
				  };
				} else {
				  return {
					id: index + 1,
					status: "pending",
					file: null,
					uploadedAt: null,
					notes: "",
					needsRevision: false,
					revisionNotes: "",
					savedFile: undefined,
					uploadProgress: 0,
				  };
				}
			  }
			);
			setVideoProgress(initialProgress);
			setWorkStarted(true);
		  }
		}
	  // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [orderData, deliverables]);

	const handleSendMessageToBrand = async () => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		// Make this more permissive - try to proceed even without brandProfile if we have basic order info
		if (!brandProfile && !selectedOrder?.userId) {
			alert(
				"Brand information is not available. Please refresh the page and try again."
			);
			return;
		}

		try {
			const requestBody = {
				currentUserId: currentUser.uid,
				brandId: brandProfile?.userId || selectedOrder?.userId,
				userData: {
					name: currentUser.displayName || "User",
					avatar: currentUser.photoURL || "/icons/default-avatar.svg",
					username: currentUser.email?.split("@")[0] || "",
				},
				brandData: {
					name: brandProfile?.brandName || selectedOrder?.brandName || "Brand",
					avatar: brandProfile?.logoUrl || "/icons/default-avatar.svg",
					username: brandProfile?.email?.split("@")[0] || "brand",
				},
			};

			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
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
		}
	};

	if (loading) {
		return (
			<div className="flex-col mx-auto my-5 flex justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading order details...</p>
			</div>
		);
	}

	if (error) {
		return <div className="p-6 text-center text-red-600">Error: {error instanceof Error ? error.message : String(error)}</div>;
	}

	if (!selectedOrder) {
		return <div className="p-6 text-center">Order not found</div>;
	}

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<Button
					variant="outline"
					onClick={() => router.back()}
					className="flex items-center gap-2 shadow-none border-none transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Orders
				</Button>
				<div className="flex gap-3">
					<Button
						variant="outline"
						onClick={handleSendMessageToBrand}
						className="flex items-center gap-2 bg-black text-white hover:bg-gray-900 transition-colors rounded-lg"
					>
						<MessageSquare className="w-4 h-4" />
						Message Brand
					</Button>
				</div>
			</div>

			{/* Order Header Card */}
			<div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 mb-8">
				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-xl font-semibold text-gray-900 mb-1">
							{selectedOrder.brandName || "Brand Name"}
						</h1>
						<p className="text-gray-600">
							{getPackageDisplayName(selectedOrder.packageType)}
						</p>
					</div>
					<Badge
						className={`rounded-full px-2 py-1 text-sm font-medium ${getStatusColor(selectedOrder.status)}`}
						variant="secondary"
					>
						{getStatusDisplayName(selectedOrder.status)}
					</Badge>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
					<div className="text-center">
						<div className="flex items-center justify-center gap-2 mb-2">
							<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
								<Video className="w-5 h-5 text-blue-600" />
							</div>
						</div>
						<div className="text-xl font-bold text-gray-900">
							{selectedOrder.videoCount}
						</div>
						<div className="text-sm text-gray-600">Videos</div>
					</div>

					<div className="text-center">
						<div className="flex items-center justify-center gap-2 mb-2">
							<div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
								<DollarSign className="w-5 h-5 text-green-600" />
							</div>
						</div>
						<div className="text-xl font-bold text-green-600">
							${selectedOrder.totalPrice}
						</div>
						<div className="text-sm text-gray-600">Total Price</div>
					</div>

					<div className="text-center">
						<div className="flex items-center justify-center gap-2 mb-2">
							<div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
								<Calendar className="w-5 h-5 text-purple-600" />
							</div>
						</div>
						<div className="text-xl font-bold text-gray-900">
							{selectedOrder.deadline
								? formatDate(selectedOrder.deadline).split(",")[0]
								: "No deadline"}
						</div>
						<div className="text-sm text-gray-600">Deadline</div>
					</div>

					<div className="text-center">
						<div className="flex items-center justify-center gap-2 mb-2">
							<div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
								<Clock className="w-5 h-5 text-orange-600" />
							</div>
						</div>
						<div
							className={`text-xl font-bold ${
								selectedOrder.deadline &&
								typeof getDaysUntilDeadline(selectedOrder.deadline) ===
									"number" &&
								Number(getDaysUntilDeadline(selectedOrder.deadline)) < 3
									? "text-red-600"
									: "text-gray-900"
							}`}
						>
							{getDaysUntilDeadline(selectedOrder.deadline)}
						</div>
						<div className="text-sm text-gray-600">Days Left</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-4">
					{(selectedOrder.status === "pending" ||
						selectedOrder.status === "payment_escrowed") && (
						<>
							<Button
								onClick={handleAcceptOrder}
								disabled={
									processingAction === `accept-${selectedOrder.id}` ||
									orderState === "rejected"
								}
								className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
									orderState === "in_progress"
										? "bg-green-600 hover:bg-green-700 text-white"
										: orderState === "rejected"
											? "bg-gray-300 text-gray-500 cursor-not-allowed"
											: "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
								} ${processingAction === `accept-${selectedOrder.id}` ? "opacity-70" : ""}`}
							>
								{processingAction === `accept-${selectedOrder.id}` ? (
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
								) : (
									<CheckCircle className="w-4 h-4 mr-2" />
								)}
								{orderState === "in_progress" ? "Accepted" : "Accept Order"}
							</Button>
							<Button
								variant="outline"
								onClick={() => setShowRejectModal(true)}
								disabled={
									processingAction === `reject-${selectedOrder.id}` ||
									orderState === "in_progress"
								}
								className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
									orderState === "rejected"
										? "border-red-600 bg-red-600 text-white"
										: orderState === "in_progress"
											? "border-gray-300 text-gray-500 cursor-not-allowed"
											: "border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
								} ${processingAction === `reject-${selectedOrder.id}` ? "opacity-70" : ""}`}
							>
								{processingAction === `reject-${selectedOrder.id}` ? (
									<div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
								) : (
									<XCircle className="w-4 h-4 mr-2" />
								)}
								{orderState === "rejected" ? "Rejected" : "Reject Order"}
							</Button>
						</>
					)}

					{selectedOrder.status === "in_progress" && !workStarted && (
						<Button
							onClick={handleStartWork}
							className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
						>
							Start Working
						</Button>
					)}

					{workStarted &&
						videoProgress.filter((v) => v.status === "content_submitted")
							.length === selectedOrder.videoCount && (
							<Button
								onClick={handleMarkDelivered}
								disabled={processingAction === `deliver-${selectedOrder.id}`}
								className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
							>
								{processingAction === `deliver-${selectedOrder.id}` ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Marking as Delivered...
									</>
								) : (
									<>
										<Package className="w-4 h-4 mr-2" />
										Mark as Delivered
									</>
								)}
							</Button>
						)}
				</div>
			</div>

			{/* Enhanced Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-8"
			>
				<div className="border-b border-gray-200">
					<TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0 space-x-0">
						<TabsTrigger
							value="overview"
							className="w-full data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-4 px-6 font-medium transition-all duration-200 hover:bg-gray-50"
						>
							<LayoutDashboard className="w-4 h-4 mr-2" />
							Overview
						</TabsTrigger>
						<TabsTrigger
							value="scripts"
							className="w-full data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-4 px-6 font-medium transition-all duration-200 hover:bg-gray-50"
						>
							<FileText className="w-4 h-4 mr-2" />
							Scripts
						</TabsTrigger>
						<TabsTrigger
							value="brief"
							className="w-full data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-4 px-6 font-medium transition-all duration-200 hover:bg-gray-50"
						>
							<Briefcase className="w-4 h-4 mr-2" />
							Project Brief
						</TabsTrigger>
						<TabsTrigger
							value="deliverables"
							className="w-full data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-4 px-6 font-medium transition-all duration-200 hover:bg-gray-50"
						>
							<Upload className="w-4 h-4 mr-2" />
							Deliverables
							{workStarted && (
								<Badge
									variant="outline"
									className="ml-2 bg-blue-50 text-blue-700 border-blue-200"
								>
									{
										videoProgress.filter(
											(v) => v.status === "content_submitted"
										).length
									}
									/{selectedOrder.videoCount}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="overview" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-2 text-blue-900">
									<Target className="w-5 h-5" />
									Project Overview
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{selectedOrder.projectBriefData?.projectOverview
									?.projectGoal && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Project Goal
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.projectOverview
													.projectGoal
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.projectOverview
									?.brandBackground && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Brand Background
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.projectOverview
													.brandBackground
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.projectOverview
									?.targetAudience && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Target Audience
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.projectOverview
													.targetAudience
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.projectOverview
									?.keyMessages && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Key Messages
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.projectOverview
													.keyMessages
											}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-2 text-purple-900">
									<Palette className="w-5 h-5" />
									Brand Guidelines
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{selectedOrder.projectBriefData?.brandGuidelines
									?.brandVoice && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Brand Voice
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.brandGuidelines
													.brandVoice
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.brandGuidelines
									?.visualStyle && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Visual Style
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.brandGuidelines
													.visualStyle
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.brandGuidelines
									?.colorPreferences && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Color Preferences
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.brandGuidelines
													.colorPreferences
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.brandGuidelines?.logoUsage && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Logo Usage
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{selectedOrder.projectBriefData.brandGuidelines.logoUsage}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.brandGuidelines
									?.brandAssets && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Brand Assets
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.brandGuidelines
													.brandAssets
											}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="scripts" className="space-y-6">
					<Card className="border-0 shadow-sm">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center gap-3">
								<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
									<FileText className="w-5 h-5 text-blue-600" />
								</div>
								<div>
									<div className="text-xl font-bold text-gray-900">Scripts</div>
									<div className="text-sm text-gray-600 font-normal">
										{selectedOrder.scriptChoice === "brand_provided"
											? "Provided by Brand"
											: "To be Written by Creator"}
									</div>
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6">
							{selectedOrder.scriptFormData?.scripts &&
							selectedOrder.scriptFormData.scripts.length > 0 ? (
								<div className="space-y-6">
									{selectedOrder.scriptFormData.scripts.map(
										(
											script: {
												title?: string;
												script?: string;
												notes?: string;
											},
											index: Key | null | undefined
										) => (
											<div
												key={index}
												className="border border-gray-200 rounded-xl overflow-hidden"
											>
												<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
													<h4 className="font-semibold text-gray-900">
														Script {typeof index === "number" ? index + 1 : 1}:{" "}
														{script.title || "Untitled"}
													</h4>
												</div>
												<div className="p-6">
													<div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
														<pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
															{script.script || "No content provided"}
														</pre>
													</div>
													{script.notes && (
														<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
															<h5 className="font-medium text-yellow-800 mb-2">
																Notes:
															</h5>
															<p className="text-sm text-yellow-700">
																{script.notes}
															</p>
														</div>
													)}
												</div>
											</div>
										)
									)}
								</div>
							) : (
								<div className="text-center py-12">
									<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<FileText className="w-8 h-8 text-gray-400" />
									</div>
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										{selectedOrder.scriptChoice === "creator-written"
											? "Scripts Required"
											: "No Scripts Yet"}
									</h3>
									<p className="text-gray-600">
										{selectedOrder.scriptChoice === "creator-written"
											? "You'll need to write the scripts for this project"
											: "No scripts provided yet"}
									</p>
								</div>
							)}

							{/* General Requirements */}
							{selectedOrder.scriptFormData?.generalRequirements && (
								<div className="mt-8 pt-6 border-t border-gray-200">
									<h4 className="font-semibold text-gray-900 mb-6">
										General Requirements
									</h4>
									<div className="grid gap-4 md:grid-cols-2">
										{selectedOrder.scriptFormData.generalRequirements
											.targetAudience && (
											<div className="bg-blue-50 rounded-lg p-4">
												<h5 className="font-medium text-blue-900 mb-2">
													Target Audience
												</h5>
												<p className="text-sm text-blue-800">
													{
														selectedOrder.scriptFormData.generalRequirements
															.targetAudience
													}
												</p>
											</div>
										)}
										{selectedOrder.scriptFormData.generalRequirements
											.brandVoice && (
											<div className="bg-purple-50 rounded-lg p-4">
												<h5 className="font-medium text-purple-900 mb-2">
													Brand Voice
												</h5>
												<p className="text-sm text-purple-800">
													{
														selectedOrder.scriptFormData.generalRequirements
															.brandVoice
													}
												</p>
											</div>
										)}
										{selectedOrder.scriptFormData.generalRequirements
											.callToAction && (
											<div className="bg-green-50 rounded-lg p-4">
												<h5 className="font-medium text-green-900 mb-2">
													Call to Action
												</h5>
												<p className="text-sm text-green-800">
													{
														selectedOrder.scriptFormData.generalRequirements
															.callToAction
													}
												</p>
											</div>
										)}
										{selectedOrder.scriptFormData.generalRequirements
											.keyMessages && (
											<div className="bg-orange-50 rounded-lg p-4">
												<h5 className="font-medium text-orange-900 mb-2">
													Key Messages
												</h5>
												<p className="text-sm text-orange-800">
													{
														selectedOrder.scriptFormData.generalRequirements
															.keyMessages
													}
												</p>
											</div>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="brief" className="space-y-6">
					<div className="grid gap-6 lg:grid-cols-2">
						<Card className="border-0 shadow-sm">
							<CardHeader className="border-b border-gray-100">
								<CardTitle className="flex items-center gap-3 text-gray-900">
									<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
										<CheckCircle className="w-4 h-4 text-green-600" />
									</div>
									Content Requirements
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								{selectedOrder.projectBriefData?.contentRequirements
									?.mustInclude && (
									<div className="bg-green-50 border border-green-200 rounded-lg p-4">
										<h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
											<Plus className="w-4 h-4" />
											Must Include
										</h4>
										<p className="text-green-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.contentRequirements
													.mustInclude
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.contentRequirements
									?.mustAvoid && (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4">
										<h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
											<Minus className="w-4 h-4" />
											Must Avoid
										</h4>
										<p className="text-red-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.contentRequirements
													.mustAvoid
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.contentRequirements
									?.toneAndStyle && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Tone and Style
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.contentRequirements
													.toneAndStyle
											}
										</p>
									</div>
								)}

								{selectedOrder.projectBriefData?.contentRequirements
									?.callToAction && (
									<div>
										<h4 className="font-semibold text-gray-900 mb-2">
											Call to Action
										</h4>
										<p className="text-gray-700 leading-relaxed">
											{
												selectedOrder.projectBriefData.contentRequirements
													.callToAction
											}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<div className="space-y-6">
							<Card className="border-0 shadow-sm">
								<CardHeader className="border-b border-gray-100">
									<CardTitle className="flex items-center gap-3 text-gray-900">
										<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
											<Video className="w-4 h-4 text-blue-600" />
										</div>
										Video Specifications
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6 space-y-4">
									{selectedOrder.projectBriefData?.videoSpecs?.duration && (
										<div className="flex justify-between items-center py-2 border-b border-gray-100">
											<span className="font-medium text-gray-900">
												Duration
											</span>
											<span className="text-gray-700">
												{selectedOrder.projectBriefData.videoSpecs.duration}
											</span>
										</div>
									)}

									{selectedOrder.projectBriefData?.videoSpecs?.format && (
										<div className="flex justify-between items-center py-2 border-b border-gray-100">
											<span className="font-medium text-gray-900">Format</span>
											<span className="text-gray-700">
												{selectedOrder.projectBriefData.videoSpecs.format}
											</span>
										</div>
									)}

									{selectedOrder.projectBriefData?.videoSpecs
										?.deliveryFormat && (
										<div className="flex justify-between items-center py-2">
											<span className="font-medium text-gray-900">
												Delivery Format
											</span>
											<span className="text-gray-700">
												{
													selectedOrder.projectBriefData.videoSpecs
														.deliveryFormat
												}
											</span>
										</div>
									)}
								</CardContent>
							</Card>

							<Card className="border-0 shadow-sm">
								<CardHeader className="border-b border-gray-100">
									<CardTitle className="flex items-center gap-3 text-gray-900">
										<div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
											<Calendar className="w-4 h-4 text-purple-600" />
										</div>
										Timeline
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6 space-y-4">
									{selectedOrder.projectBriefData?.timeline?.finalDeadline && (
										<div className="flex justify-between items-center py-2 border-b border-gray-100">
											<span className="font-medium text-gray-900">
												Final Deadline
											</span>
											<span className="text-gray-700">
												{formatDate(
													selectedOrder.projectBriefData.timeline.finalDeadline
												)}
											</span>
										</div>
									)}

									{selectedOrder.projectBriefData?.timeline?.scriptDeadline && (
										<div className="flex justify-between items-center py-2 border-b border-gray-100">
											<span className="font-medium text-gray-900">
												Script Deadline
											</span>
											<span className="text-gray-700">
												{formatDate(
													selectedOrder.projectBriefData.timeline.scriptDeadline
												)}
											</span>
										</div>
									)}

									{selectedOrder.projectBriefData?.timeline?.revisionRounds && (
										<div className="flex justify-between items-center py-2">
											<span className="font-medium text-gray-900">
												Revision Rounds
											</span>
											<span className="text-gray-700">
												{selectedOrder.projectBriefData.timeline.revisionRounds}
											</span>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="deliverables" className="space-y-6">
					<Card className="border-0 shadow-sm">
						<CardHeader className="border-b border-gray-100">
							<CardTitle className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
										<Upload className="w-5 h-5 text-blue-600" />
									</div>
									<div>
										<div className="text-xl font-bold text-gray-900">
											Upload Deliverables
										</div>
										{workStarted && (
											<div className="text-sm text-gray-600 font-normal">
												{
													videoProgress.filter(
														(v) => v.status === "content_submitted"
													).length
												}{" "}
												of {selectedOrder.videoCount} videos completed
											</div>
										)}
									</div>
								</div>
								{workStarted && (
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="text-lg font-semibold text-blue-600">
												{Math.round(
													(videoProgress.filter(
														(v) => v.status === "content_submitted"
													).length /
														selectedOrder.videoCount) *
														100
												)}
												%
											</div>
											<div className="text-sm text-gray-600">Complete</div>
										</div>
										{selectedOrder.status === "revision_requested" && (
											<Badge
												variant="outline"
												className="bg-orange-100 text-orange-800 border-orange-200"
											>
												Revisions Requested
											</Badge>
										)}
									</div>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{workStarted ? (
								<div className="space-y-6">
									{videoProgress.map((video, index) => (
										<div key={video.id} className="border rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="font-medium">Video {video.id}</h4>
												<div className="flex gap-2">
													<Badge
														variant={
															video.status === "content_submitted"
																? "default"
																: video.status === "revision_requested"
																	? "outline"
																	: "outline"
														}
														className={
															video.status === "content_submitted"
																? "bg-green-100 text-green-800"
																: video.status === "revision_requested"
																	? "bg-orange-100 text-orange-800"
																	: ""
														}
													>
														{video.status === "content_submitted"
															? "Completed"
															: video.status === "revision_requested"
																? "Needs Revision"
																: video.status === "uploading"
																	? "Uploading..."
																	: "Pending"}
													</Badge>
												</div>
											</div>

											{video.status === "uploading" && (
												<div className="mb-4">
													<div className="flex justify-between items-center mb-2">
														<span className="text-sm font-medium text-blue-600">
															Uploading...
														</span>
														<span className="text-sm font-medium text-blue-600">
															{video.uploadProgress || 0}%
														</span>
													</div>
													<div className="w-full bg-gray-200 rounded-full h-2">
														<div
															className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
															style={{ width: `${video.uploadProgress || 0}%` }}
														></div>
													</div>
												</div>
											)}

											{/* Show revision notes if any */}
											{video.needsRevision && video.revisionNotes && (
												<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
													<h5 className="font-medium text-orange-800 mb-1">
														Revision Notes:
													</h5>
													<p className="text-sm text-orange-700">
														{video.revisionNotes}
													</p>
												</div>
											)}

											{/* Show current file if exists */}
											{video.savedFile && (
												<div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
													<div className="flex items-center justify-between">
														<div>
															<p className="font-medium text-sm">
																Current File:
															</p>
															<p className="text-sm text-gray-600">
																{video.savedFile.file_name}
															</p>
															<p className="text-xs text-gray-500">
																Uploaded:{" "}
																{new Date(
																	video.savedFile.created_at
																).toLocaleDateString()}
															</p>
														</div>
														{video.savedFile.file_download_url && (
															<a
																href={video.savedFile.file_download_url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-sm text-blue-600 hover:text-blue-800"
															>
																View File →
															</a>
														)}
													</div>
												</div>
											)}

											{/* Upload section */}
											{video.status !== "delivered" ? (
												<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
													<Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
													<p className="text-sm text-gray-600 mb-3">
														{video.needsRevision
															? `Upload Revised Video ${video.id}`
															: `Upload Video ${video.id}`}
													</p>
													<input
														type="file"
														accept="video/*"
														onChange={async (e) => {
															if (e.target.files && e.target.files[0]) {
																const file = e.target.files[0];

																// Update UI to show uploading state
																setVideoProgress((prevProgress) => {
																	const newProgress = [...prevProgress];
																	newProgress[index] = {
																		...video,
																		status: "uploading",
																		uploadProgress: 0,
																	};
																	return newProgress;
																});

																try {
																	// Save to database
																	const savedDeliverable =
																		await saveDeliverable(
																			selectedOrder.id,
																			video.id,
																			file,
																			"",
																			(progress) => {
																				// FIXED: Use functional update to get current state
																				setVideoProgress((currentProgress) => {
																					const updatedProgress = [
																						...currentProgress,
																					];
																					updatedProgress[index] = {
																						...updatedProgress[index],
																						uploadProgress: progress,
																					};
																					return updatedProgress;
																				});
																			}
																		);

																	// Update progress with success state
																	setVideoProgress((prevProgress) => {
																		const newProgress = [...prevProgress];
																		newProgress[index] = {
																			...video,
																			status: "content_submitted",
																			file: file,
																			uploadedAt: new Date(),
																			needsRevision: false,
																			revisionNotes: "",
																			savedFile: savedDeliverable,
																		};
																		return newProgress;
																	});

																	
																} catch (error) {
																	// Revert to previous state on error
																	setVideoProgress((prevProgress) => {
																		const newProgress = [...prevProgress];
																		newProgress[index] = {
																			...video,
																			status: video.needsRevision
																				? "revision_requested"
																				: "pending",
																		};
																		return newProgress;
																	});
																	console.error(
																		"Failed to upload deliverable:",
																		error
																	);
																	toast.error("Failed to upload video");
																}
															}
														}}
														className="hidden"
														id={`video-upload-${video.id}`}
													/>

													<label htmlFor={`video-upload-${video.id}`}>
														<span className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
															{video.needsRevision
																? "Upload Revision"
																: "Choose File"}
														</span>
													</label>
												</div>
											) : (
												<div className="bg-green-50 border border-green-200 rounded-lg p-4">
													<div className="flex items-center gap-2 text-green-800">
														<CheckCircle className="w-4 h-4" />
														<span className="font-medium">
															{video.savedFile?.original_filename ||
																video.file?.name ||
																`Video ${video.id}`}
														</span>
													</div>
													<p className="text-sm text-green-600 mt-1">
														Uploaded on x
														{video.uploadedAt
															? new Date(video.uploadedAt).toLocaleDateString()
															: "Not uploaded"}
													</p>
												</div>
											)}
										</div>
									))}

									{/* Update the mark as delivered button logic */}
									{workStarted &&
										videoProgress.filter(
											(v) =>
												v.status === "content_submitted" && !v.needsRevision
										).length === selectedOrder.videoCount &&
										selectedOrder.status !== "revision_requested" && (
											<div className="text-center pt-4">
												<Button
													onClick={handleMarkDelivered}
													disabled={
														processingAction === `deliver-${selectedOrder.id}`
													}
													className="bg-green-600 hover:bg-green-700"
												>
													{processingAction ===
													`deliver-${selectedOrder.id}` ? (
														<>
															<div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2" />
															Marking as Delivered...
														</>
													) : (
														"Mark as Delivered"
													)}
												</Button>
											</div>
										)}

									<div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
										<p>• Supported formats: MP4, MOV, AVI</p>
										<p>• Maximum file size: 500MB per video</p>
										{selectedOrder.projectBriefData?.videoSpecs
											?.deliveryFormat && (
											<p>
												• Required format:{" "}
												{
													selectedOrder.projectBriefData.videoSpecs
														.deliveryFormat
												}
											</p>
										)}
										{selectedOrder.status === "revision_requested" && (
											<p className="text-orange-600 mt-2">
												• Brand has requested revisions. Please review the notes
												above and upload updated files.
											</p>
										)}
									</div>
								</div>
							) : (
								<div className="text-center py-8 text-gray-500">
									{selectedOrder.status === "pending"
										? "Accept the order to begin working"
										: "Click 'Start Working' to begin uploading deliverables"}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Reject Order Modal */}
			{showRejectModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 className="text-lg font-semibold mb-4">Reject Order</h3>
						<p className="text-gray-600 mb-4">
							Please provide a reason for rejecting this order:
						</p>
						<textarea
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none"
							placeholder="Enter your reason here..."
						/>
						<div className="flex gap-3 mt-4">
							<Button
								onClick={handleRejectOrder}
								disabled={!rejectReason.trim()}
								className="bg-red-600 hover:bg-red-700 text-white"
							>
								Reject Order
							</Button>
							<Button
								variant="outline"
								onClick={() => setShowRejectModal(false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Start Work Confirmation Modal */}
			{showStartWorkModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 className="text-lg font-semibold mb-4">
							Start Working on Project
						</h3>
						<div className="space-y-3 mb-4">
							<div className="flex justify-between">
								<span className="text-gray-600">Package:</span>
								<span className="font-medium">
									{getPackageDisplayName(selectedOrder.packageType)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Videos to create:</span>
								<span className="font-medium">{selectedOrder.videoCount}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Deadline:</span>
								<span className="font-medium">
									{selectedOrder.deadline
										? formatDate(selectedOrder.deadline)
										: "No deadline"}
								</span>
							</div>
						</div>
						<p className="text-gray-600 mb-4">
							This will change your order status to &quot;In Progress&quot; and
							enable the video upload area.
						</p>
						<div className="flex gap-3">
							<Button
								onClick={confirmStartWork}
								className="bg-blue-600 hover:bg-blue-700 text-white"
							>
								Start Project
							</Button>
							<Button
								variant="outline"
								onClick={() => setShowStartWorkModal(false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}