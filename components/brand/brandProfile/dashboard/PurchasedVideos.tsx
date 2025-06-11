"use client";

import React, { useState, useEffect, useRef } from "react";
import {
	Download,
	Grid3X3,
	List,
	Search,
	User,
	Clock,
	CheckCircle,
	Filter,
	SortDesc,
	Package,
	Video,
	FileText,
	Play,
	ThumbsUp,
	MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FaMoneyCheck } from "react-icons/fa6";
import RevisionRequestModal from "./RevisionRequestModal";

interface DeliveredOrder {
	payment_id: string;
	firestore_id: string;
	id: string;
	user_id: string;
	creator_id: string;
	status: string;
	brand_name: string;
	brand_email: string;
	package_type: string;
	video_count: number;
	total_price: number;
	created_at: string;
	updated_at: string;
	deliverables: Deliverable[];
	deliverables_count: number;
	creator: {
		id: string;
		name: string;
		email: string;
		profile_image: string;
	} | null;
	has_deliverables: boolean;
	latest_deliverable_date: string | null;
}

interface Deliverable {
	firestore_id: string;
	id: number;
	order_id: string;
	video_id: number;
	file_name: string;
	file_download_url: string;
	file_size: number;
	file_content_type: string;
	notes: string;
	status: string;
	created_at: string;
	creator_id: string;
	approval_status?: "pending" | "approved" | "needs_revision" | "revision_requested";
	metadata?: {
		upload_timestamp: number;
		file_extension: string;
	};
}

interface DeliveredOrdersLibraryProps {
	className?: string;
}

const DeliveredOrdersLibrary: React.FC<DeliveredOrdersLibraryProps> = ({
	className = "",
}) => {
	const { currentUser } = useAuth();

	const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
	const [selectedOrder, setSelectedOrder] = useState<DeliveredOrder | null>(
		null
	);
	const [selectedDeliverable, setSelectedDeliverable] =
		useState<Deliverable | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<string>("newest");
	const [selectedCreator, setSelectedCreator] = useState<string>("all");
	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
		new Set()
	);
	const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
	const [selectedRevisionDeliverable, setSelectedRevisionDeliverable] =
		useState<{
			deliverable: Deliverable;
			order: DeliveredOrder;
		} | null>(null);
	const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

	// Add this function to toggle package expansion
	const togglePackageExpansion = (orderId: string) => {
		setExpandedPackages((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(orderId)) {
				newSet.delete(orderId);
			} else {
				newSet.add(orderId);
			}
			return newSet;
		});
	};

	// Add this function to check if package should be collapsed
	const shouldCollapsePackage = (order: DeliveredOrder) => {
		return order.deliverables_count > 1;
	}

	// function to approve all videos in a package
	const handleApproveAll = async (order: DeliveredOrder) => {
		const pendingDeliverables = order.deliverables.filter(
			(d) => d.approval_status !== "approved"
		);

		if (pendingDeliverables.length === 0) {
			toast.info("All videos are already approved");
			return;
		}

		try {
			const paymentId = order.payment_id;

			const response = await fetch("/api/payments/approve-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					paymentId: paymentId,
					action: "approve",
					approveAll: true, // NEW: Approve all flag
					deliverableId: null, // Not needed when approving all
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to approve all videos");
			}

			// NEW: Refetch the delivered orders to get updated approval status from server
			await refetchDeliveredOrders();

			toast.success(`All ${pendingDeliverables.length} videos approved!`);
		} catch (error) {
			console.error("Approval error:", error);
			toast.error("Failed to approve all videos");
		}
	};

	// Fetch delivered orders
	useEffect(() => {
		const fetchDeliveredOrders = async () => {
			if (!currentUser) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/orders/delivered?userId=${currentUser.uid}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch delivered orders");
				}

				const data = await response.json();
				setDeliveredOrders(data.orders || []);
			} catch (err) {
				console.error("Error fetching delivered orders:", err);
				setError("Failed to load delivered orders");
			} finally {
				setLoading(false);
			}
		};

		fetchDeliveredOrders();
	}, [currentUser]);

	const refetchDeliveredOrders = async () => {
		if (!currentUser) return;

		try {
			const response = await fetch(
				`/api/orders/delivered?userId=${currentUser.uid}`
			);

			if (!response.ok) {
				throw new Error("Failed to fetch delivered orders");
			}

			const data = await response.json();
			setDeliveredOrders(data.orders || []);
		} catch (err) {
			console.error("Error refetching delivered orders:", err);
			// Don't show error toast here as it might be annoying during normal operation
		}
	};

	useEffect(() => {
		if (isPreviewOpen && videoRef.current && selectedDeliverable) {
			const video = videoRef.current;

			// Set the video source directly
			video.src = selectedDeliverable.file_download_url;

			// Reset video state
			video.currentTime = 0;

			// Load the video
			video.load();

			// Add error handling
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const handleVideoError = (e: any) => {
				console.error("Video error event:", e);
				console.error("Video error code:", video.error?.code);
				console.error("Video error message:", video.error?.message);


				toast.error(
					`Video loading failed: ${video.error?.message || "Unknown error"}`
				);
			};

			const handleVideoLoad = () => {
			};

			video.addEventListener("error", handleVideoError);
			video.addEventListener("loadeddata", handleVideoLoad);
		}
	}, [isPreviewOpen, selectedDeliverable]);

	// Handle download (only available after approval)
	const handleDownload = async (deliverable: Deliverable) => {
		if (!currentUser) {
			toast.error("Please log in to download videos");
			return;
		}

		if (deliverable.approval_status !== "approved") {
			toast.error("Video must be approved before downloading");
			return;
		}

		setIsDownloading(deliverable.firestore_id);
		try {
			const link = document.createElement("a");
			link.href = deliverable.file_download_url;
			link.download = deliverable.file_name;
			link.target = "_blank";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			toast.success("Download started successfully");
		} catch (error) {
			console.error("Download error:", error);
			toast.error("Download failed. Please try again.");
		} finally {
			setIsDownloading(null);
		}
	};

	// Handle deliverable preview
	const handleDeliverablePreview = (
		order: DeliveredOrder,
		deliverable: Deliverable
	) => {
		setSelectedOrder(order);
		setSelectedDeliverable(deliverable);
		setIsPreviewOpen(true);
	};

	// Handle approval
	const handleApprove = async (deliverable: Deliverable) => {
		try {
			// Find the order that contains this deliverable
			const order = deliveredOrders.find((o) =>
				o.deliverables.some((d) => d.firestore_id === deliverable.firestore_id)
			);

			if (!order) {
				toast.error("Order not found");
				return;
			}

			const paymentId = order.payment_id;

			if (!paymentId) {
				toast.error("Payment ID not found for this order");
				return;
			}
			
			const paymentResponse = await fetch("/api/payments/approve-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					paymentId: paymentId,
					action: "approve",
					deliverableId: deliverable.firestore_id, // NEW: Pass specific deliverable ID
					approveAll: false, // NEW: Single approval flag
				}),
			});

			if (!paymentResponse.ok) {
				const errorData = await paymentResponse.json();
				throw new Error(errorData.error || "Failed to process payment");
			}

			const paymentResult = await paymentResponse.json();
			console.log("Payment processed:", paymentResult);

			// NEW: Refetch the delivered orders to get updated approval status from server
			await refetchDeliveredOrders();

			toast.success(
				`Video approved! $${order.total_price} transferred to ${order.creator?.name}`
			);
		} catch (error) {
			console.error("Approval error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to approve video"
			);
		}
	};

	// Handle request revision - now just opens the modal
	const handleRequestRevision = (deliverable: Deliverable) => {
		// Find the order that contains this deliverable
		const order = deliveredOrders.find((o) =>
			o.deliverables.some((d) => d.firestore_id === deliverable.firestore_id)
		);

		if (!order) {
			toast.error("Order not found");
			return;
		}

		setSelectedRevisionDeliverable({ deliverable, order });
		setIsRevisionModalOpen(true);
	};

	// function to handle the actual revision submission
	const handleRevisionSubmit = async (revisionNotes: string) => {
		if (!selectedRevisionDeliverable) return;
	
		const { deliverable, order } = selectedRevisionDeliverable;
		setIsSubmittingRevision(true);
	
		try {
			const paymentId = order.payment_id;
	
			if (!paymentId) {
				toast.error("Payment ID not found for this order");
				return;
			}
	
			const deliverableId = deliverable.firestore_id || deliverable.id;
			
			if (!deliverableId) {
				console.error("No deliverable ID found in:", deliverable);
				toast.error("Deliverable ID not found");
				return;
			}
	
			const requestPayload = {
				paymentId: paymentId,
				action: "request_review",
				deliverableId: deliverableId,
				reason: "Revision requested by brand",
				revisionNotes: revisionNotes,
				keepInCollection: true, // NEW: Flag to keep in collection
			};
	
			const response = await fetch("/api/payments/request-review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestPayload),
			});
	
			if (!response.ok) {
				const errorData = await response.json();
				console.error("Error response:", errorData);
				throw new Error(errorData.error || "Failed to request revision");
			}
	
			const result = await response.json();
			console.log("Revision request result:", result);
	
			// Refetch to get updated status
			await refetchDeliveredOrders();
	
			// Close modal and reset state
			setIsRevisionModalOpen(false);
			setSelectedRevisionDeliverable(null);
	
			toast.success("Revision requested! The video will remain here until a new version is submitted.");
		} catch (error) {
			console.error("Revision request error:", error);
			if (error instanceof Error) {
				toast.error(`Failed to request revision: ${error.message}`);
			} else {
				toast.error("Failed to request revision");
			}
		} finally {
			setIsSubmittingRevision(false);
		}
	};

	// Handle modal close
	const handleRevisionModalClose = () => {
		if (!isSubmittingRevision) {
			setIsRevisionModalOpen(false);
			setSelectedRevisionDeliverable(null);
		}
	};

	// Get unique creators for filter
	const uniqueCreators = Array.from(
		new Set(
			deliveredOrders
				.map((order) => order.creator?.name)
				.filter((name): name is string => !!name)
		)
	).sort();

	// Filter and sort orders
	const filteredAndSortedOrders = deliveredOrders
		.filter((order) => {
			const matchesSearch =
				order.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				order.creator?.name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				order.deliverables.some((d) =>
					d.file_name.toLowerCase().includes(searchQuery.toLowerCase())
				);
			const matchesCreator =
				selectedCreator === "all" || order.creator?.name === selectedCreator;
			return matchesSearch && matchesCreator;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case "creator-asc":
					return (a.creator?.name || "").localeCompare(b.creator?.name || "");
				case "creator-desc":
					return (b.creator?.name || "").localeCompare(a.creator?.name || "");
				case "order-id-asc":
					return a.id.localeCompare(b.id);
				case "order-id-desc":
					return b.id.localeCompare(a.id);
				case "oldest":
					return (
						new Date(a.latest_deliverable_date || a.created_at).getTime() -
						new Date(b.latest_deliverable_date || b.created_at).getTime()
					);
				case "newest":
				default:
					return (
						new Date(b.latest_deliverable_date || b.created_at).getTime() -
						new Date(a.latest_deliverable_date || a.created_at).getTime()
					);
			}
		});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatFileSize = (bytes: number) => {
		const sizes = ["Bytes", "KB", "MB", "GB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
	};

	const getPackageTypeColor = (packageType: string) => {
		switch (packageType.toLowerCase()) {
			case "premium":
				return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
			case "standard":
				return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
			case "basic":
				return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
			default:
				return "bg-gradient-to-r from-gray-500 to-slate-500 text-white";
		}
	};

	const getApprovalStatusColor = (status?: string) => {
		switch (status) {
			case "approved":
				return "bg-green-100 text-green-800 border-green-200";
			case "needs_revision":
			case "revision_requested": 
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "pending":
			default:
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
		}
	};
	
	const getApprovalStatusText = (status?: string) => {
		switch (status) {
			case "completed":
			case "approved":
				return "Approved";
			case "needs_revision":
				return "Needs Revision";
			case "revision_requested":
				return "Revision Requested";
			case "pending":
			default:
				return "Pending Review";
		}
	};

	if (!currentUser) {
		return (
			<div className={`text-center py-12 ${className}`}>
				<FaMoneyCheck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
				<p className="text-lg font-semibold text-gray-700">
					Please log in to view your delivered orders
				</p>
				<p className="text-sm text-gray-500 mt-1">
					Sign in to access your completed orders
				</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div
				className={`flex flex-col justify-center items-center h-screen ${className}`}
			>
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<span className="ml-3 text-gray-600">
					Loading your delivered orders...
				</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`text-center py-12 ${className}`}>
				<div className="text-red-600 mb-4">
					<p className="text-lg font-semibold">
						Error Loading Delivered Orders
					</p>
					<p className="text-sm mt-1">{error}</p>
				</div>
				<Button
					onClick={() => window.location.reload()}
					className="bg-orange-500 hover:bg-orange-600 text-white"
				>
					Try Again
				</Button>
			</div>
		);
	}

	const totalDeliverables = deliveredOrders.reduce(
		(sum, order) => sum + order.deliverables_count,
		0
	);

	return (
		<div className={`w-full max-w-7xl p-6`}>
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-2">
					<CheckCircle className="h-6 w-6 text-green-500" />
					<h1 className="text-2xl font-bold text-gray-900">
						My Delivered Orders
					</h1>
				</div>
				<p className="ml-8 text-gray-600 mt-1">
					{deliveredOrders.length === 0
						? "Your completed orders will appear here"
						: `${deliveredOrders.length} order${deliveredOrders.length === 1 ? "" : "s"} delivered • ${totalDeliverables} total deliverables`}
				</p>
			</div>

			{deliveredOrders.length === 0 ? (
				<div className="text-center py-16">
					<CheckCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
					<p className="text-xl font-semibold text-gray-700 mb-2">
						No delivered orders yet
					</p>
					<p className="text-gray-500 mb-6">
						Your completed orders and deliverables will appear here
					</p>
				</div>
			) : (
				<>
					{/* Search and Filters */}
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
						<div className="flex flex-col lg:flex-row gap-4">
							{/* Search */}
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									type="text"
									placeholder="Search orders, creators, or files..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
								/>
							</div>

							{/* Creator Filter */}
							<Select
								value={selectedCreator}
								onValueChange={setSelectedCreator}
							>
								<SelectTrigger className="w-full lg:w-[200px] border-gray-200">
									<Filter className="h-4 w-4" />
									<SelectValue placeholder="Filter by creator" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="all">All Creators</SelectItem>
									{uniqueCreators.map((creator) => (
										<SelectItem key={creator} value={creator!}>
											{creator}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Sort */}
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-full lg:w-[200px] border-gray-200">
									<SortDesc className="h-4 w-4" />
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectItem value="newest">Recently Delivered</SelectItem>
									<SelectItem value="oldest">Oldest First</SelectItem>
									<SelectItem value="order-id-asc">Order ID A-Z</SelectItem>
									<SelectItem value="order-id-desc">Order ID Z-A</SelectItem>
									<SelectItem value="creator-asc">Creator A-Z</SelectItem>
									<SelectItem value="creator-desc">Creator Z-A</SelectItem>
								</SelectContent>
							</Select>

							{/* View Mode Toggle */}
							<div className="flex border border-gray-200 rounded-lg overflow-hidden">
								<Button
									onClick={() => setViewMode("grid")}
									className={`px-3 py-2 border-none ${
										viewMode === "grid"
											? "bg-orange-500 text-white"
											: "bg-white text-gray-600 hover:bg-gray-50"
									}`}
								>
									<Grid3X3 size={16} />
								</Button>
								<Button
									onClick={() => setViewMode("list")}
									className={`px-3 py-2 border-none ${
										viewMode === "list"
											? "bg-orange-500 text-white"
											: "bg-white text-gray-600 hover:bg-gray-50"
									}`}
								>
									<List size={16} />
								</Button>
							</div>
						</div>

						{/* Results count */}
						<div className="mt-4 text-sm text-gray-600">
							Showing {filteredAndSortedOrders.length} of{" "}
							{deliveredOrders.length} delivered orders
						</div>
					</div>

					{/* Orders Display */}
					{filteredAndSortedOrders.length === 0 ? (
						<div className="text-center py-12">
							<Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
							<p className="text-lg font-semibold text-gray-700">
								No orders match your search
							</p>
							<p className="text-sm text-gray-500 mt-1">
								Try different search terms or filters
							</p>
						</div>
					) : (
						<div
							className={
								viewMode === "grid"
									? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
									: "space-y-6"
							}
						>
							{filteredAndSortedOrders.map((order) => {
								const isExpanded = expandedPackages.has(order.firestore_id);
								const isMultiVideo = shouldCollapsePackage(order);
								const approvedCount = order.deliverables.filter(
									(d) => d.approval_status === "approved"
								).length;
								
								const pendingCount = order.deliverables.filter(
									(d) => d.approval_status !== "approved" 
								).length;
								

								return (
									<div
										key={order.firestore_id}
										className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
									>
										{/* Order Header */}
										<div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
											<div className="flex justify-between items-start mb-3">
												<div>
													<h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
														<Package size={18} className="text-orange-500" />
														Order #{order.id}
													</h3>
													<p className="text-gray-600 mt-1 font-medium">
														{order.brand_name}
													</p>
												</div>
												<span
													className={`px-3 py-1 text-xs font-semibold rounded-full ${getPackageTypeColor(order.package_type)}`}
												>
													{order.package_type.toUpperCase()}
												</span>
											</div>

											{order.creator && (
												<div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
													<div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
														<User size={12} className="text-orange-600" />
													</div>
													<span className="font-normal">
														{order.creator.email}
													</span>
												</div>
											)}

											<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
												<div className="flex items-center gap-2">
													<Clock size={12} />
													<span>
														Delivered{" "}
														{formatDate(
															order.latest_deliverable_date || order.created_at
														)}
													</span>
												</div>
												<div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full">
													<Video size={12} className="text-orange-600" />
													<span className="text-orange-800 font-medium">
														{order.deliverables_count} video
														{order.deliverables_count === 1 ? "" : "s"}
													</span>
												</div>
											</div>

											{/* Multi-video package status */}
											{isMultiVideo && (
												<div className="flex items-center justify-between mb-3">
													<div className="flex items-center gap-2 text-sm">
														<div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
															<CheckCircle
																size={12}
																className="text-green-600"
															/>
															<span className="text-green-800 font-medium">
																{approvedCount} approved
															</span>
														</div>
														{pendingCount > 0 && (
															<div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
																<Clock size={12} className="text-yellow-600" />
																<span className="text-yellow-800 font-medium">
																	{pendingCount} pending
																</span>
															</div>
														)}
													</div>

													{/* Expand/Collapse button */}
													<Button
														onClick={() =>
															togglePackageExpansion(order.firestore_id)
														}
														className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1"
													>
														{isExpanded ? "Collapse" : "View All"}
														<div
															className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
														>
															⌄
														</div>
													</Button>
												</div>
											)}

											{/* Quick approve all button for multi-video packages */}
											{isMultiVideo && pendingCount > 0 && isExpanded && (
												<div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
													<div className="flex items-center justify-between">
														<div>
															<span className="text-sm text-green-800 font-medium">
																Approve all {pendingCount} pending videos
															</span>
															<p className="text-xs text-green-600">
																Will transfer ${order.total_price} to{" "}
																{order.creator?.name}
															</p>
														</div>
														<Button
															onClick={() => handleApproveAll(order)}
															className="bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-1"
														>
															<ThumbsUp size={14} />
															Approve All
														</Button>
													</div>
												</div>
											)}
										</div>

										{/* Deliverables Section */}
										<div className="p-5">
											{/* Single video or collapsed multi-video preview */}
											{(!isMultiVideo || !isExpanded) && (
												<div className="grid gap-4">
													{/* Show first video as preview for collapsed multi-video packages */}
													{(isMultiVideo && !isExpanded
														? [order.deliverables[0]]
														: order.deliverables
													).map((deliverable) => (
														<div
															key={deliverable.firestore_id}
															className="group/item border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
														>
															{/* Video Preview */}
															<div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800">
																{deliverable.file_content_type && deliverable.file_content_type.startsWith("video/") ? (
																	<>
																		<video
																			className="w-full h-full object-cover"
																			src={deliverable.file_download_url}
																			preload="metadata"
																		/>
																		<div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
																			<Button
																				onClick={() =>
																					handleDeliverablePreview(
																						order,
																						deliverable
																					)
																				}
																				className="bg-white hover:bg-opacity-100 text-orange-500 rounded-full p-3 transform scale-90 hover:scale-100 transition-all duration-200"
																			>
																				<Play size={20} fill="currentColor" />
																			</Button>
																		</div>
																		{/* Approval Status Badge */}
																		<div
																			className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor(deliverable.approval_status)}`}
																		>
																			{getApprovalStatusText(
																				deliverable.approval_status
																			)}
																		</div>
																		{/* Multi-video indicator */}
																		{isMultiVideo && !isExpanded && (
																			<div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs font-medium">
																				+{order.deliverables_count - 1} more
																			</div>
																		)}
																	</>
																) : (
																	<div className="w-full h-full flex items-center justify-center text-gray-400">
																		<FileText className="h-16 w-16" />
																	</div>
																)}
															</div>

															{/* Video Info */}
															<div className="p-4">
																<h4 className="font-semibold text-gray-900 mb-1 truncate">
																	{isMultiVideo && !isExpanded
																		? `${order.deliverables_count} Videos Package`
																		: `Video ${deliverable.video_id}`}
																</h4>
																<p className="text-sm text-gray-600 mb-2 truncate">
																	{isMultiVideo && !isExpanded
																		? `${approvedCount} approved, ${pendingCount} pending review`
																		: deliverable.file_name}
																</p>

																{!isMultiVideo && (
																	<>
																		<div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
																			<span className="bg-gray-100 px-2 py-1 rounded">
																				{formatFileSize(deliverable.file_size)}
																			</span>
																			<span>
																				{formatDate(deliverable.created_at)}
																			</span>
																		</div>

																		{deliverable.notes && (
																			<div className="mb-3 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-200">
																				<p className="text-xs text-blue-800 italic">
																					&quot;{deliverable.notes}&quot;
																				</p>
																			</div>
																		)}

																		{deliverable.approval_status !==
																			"approved" && (
																			<div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
																				<div className="flex items-center justify-between">
																					<span className="text-sm text-green-800">
																						Approval will transfer:
																					</span>
																					<span className="font-bold text-green-900">
																						${order.total_price}
																					</span>
																				</div>
																				<p className="text-xs text-green-600 mt-1">
																					Full amount will be sent to{" "}
																					{order.creator?.name}
																				</p>
																			</div>
																		)}

																		{/* Single Video Action Buttons */}
																		<div className="flex gap-2">
																			{deliverable.approval_status !==
																				"approved" && (
																				<>
																					<Button
																						onClick={() =>
																							handleApprove(deliverable)
																						}
																						className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
																					>
																						<ThumbsUp size={14} />
																						Approve ${order.total_price}
																					</Button>
																					<Button
																						onClick={() =>
																							handleRequestRevision(deliverable)
																						}
																						className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
																					>
																						<MessageSquare size={14} />
																						Review
																					</Button>
																				</>
																			)}

																			{deliverable.approval_status ===
																				"approved" && (
																				<Button
																					onClick={() =>
																						handleDownload(deliverable)
																					}
																					disabled={
																						isDownloading ===
																						deliverable.firestore_id
																					}
																					className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
																				>
																					{isDownloading ===
																					deliverable.firestore_id ? (
																						<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
																					) : (
																						<>
																							<Download size={14} />
																							Download
																						</>
																					)}
																				</Button>
																			)}
																		</div>
																	</>
																)}
															</div>
														</div>
													))}
												</div>
											)}

											{/* Expanded multi-video view */}
											{isMultiVideo && isExpanded && (
												<div className="space-y-4">
													<div className="flex items-center justify-between mb-4">
														<h4 className="font-semibold text-gray-900">
															All Videos ({order.deliverables_count})
														</h4>
													</div>

													<div className="grid gap-4">
														{order.deliverables.map((deliverable) => (
															<div
																key={deliverable.firestore_id}
																className="group/item border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
															>
																{/* Video Preview */}
																<div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800">
																	{deliverable.file_content_type.startsWith(
																		"video/"
																	) ? (
																		<>
																			<video
																				className="w-full h-full object-cover"
																				src={deliverable.file_download_url}
																				preload="metadata"
																			/>
																			<div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
																				<Button
																					onClick={() =>
																						handleDeliverablePreview(
																							order,
																							deliverable
																						)
																					}
																					className="bg-white hover:bg-opacity-100 text-orange-500 rounded-full p-3 transform scale-90 hover:scale-100 transition-all duration-200"
																				>
																					<Play size={20} fill="currentColor" />
																				</Button>
																			</div>
																			{/* Approval Status Badge */}
																			<div
																				className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor(deliverable.approval_status)}`}
																			>
																				{getApprovalStatusText(
																					deliverable.approval_status
																				)}
																			</div>
																		</>
																	) : (
																		<div className="w-full h-full flex items-center justify-center text-gray-400">
																			<FileText className="h-16 w-16" />
																		</div>
																	)}
																</div>

																{/* Video Info */}
																<div className="p-4">
																	<h4 className="font-semibold text-gray-900 mb-1 truncate">
																		Video {deliverable.video_id}
																	</h4>
																	<p className="text-sm text-gray-600 mb-2 truncate">
																		{deliverable.file_name}
																	</p>

																	<div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
																		<span className="bg-gray-100 px-2 py-1 rounded">
																			{formatFileSize(deliverable.file_size)}
																		</span>
																		<span>
																			{formatDate(deliverable.created_at)}
																		</span>
																	</div>

																	{deliverable.notes && (
																		<div className="mb-3 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-200">
																			<p className="text-xs text-blue-800 italic">
																				&quot;{deliverable.notes}&quot;
																			</p>
																		</div>
																	)}

																	{/* Individual Video Action Buttons */}
																	{/* Individual Video Action Buttons - Replace existing buttons section */}
																	<div className="flex gap-2">
																		{deliverable.approval_status !==
																			"approved" && (
																			<Button
																				onClick={() =>
																					handleRequestRevision(deliverable)
																				}
																				className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
																			>
																				<MessageSquare size={14} />
																				Review
																			</Button>
																		)}

																		{deliverable.approval_status ===
																			"approved" && (
																			<Button
																				onClick={() =>
																					handleDownload(deliverable)
																				}
																				disabled={
																					isDownloading ===
																					deliverable.firestore_id
																				}
																				className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
																			>
																				{isDownloading ===
																				deliverable.firestore_id ? (
																					<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
																				) : (
																					<>
																						<Download size={14} />
																						Download
																					</>
																				)}
																			</Button>
																		)}
																	</div>
																</div>
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</>
			)}

			{/* Enhanced Preview Modal */}
			{isPreviewOpen && selectedOrder && selectedDeliverable && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] overflow-auto shadow-2xl">
						<div className="p-6">
							{/* Modal Header */}
							<div className="flex justify-between items-start mb-6">
								<div>
									<h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
										<div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
											<Package size={20} className="text-orange-600" />
										</div>
										Order #{selectedOrder.id}
									</h3>
									<p className="text-gray-600 mt-2 text-lg">
										Video {selectedDeliverable.video_id}:{" "}
										{selectedDeliverable.file_name}
									</p>
									{selectedOrder.creator && (
										<div className="flex items-center gap-2 text-gray-600 mt-2">
											<User size={16} />
											<span className="font-medium">
												{selectedOrder.creator.name}
											</span>
										</div>
									)}
									<div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
										<div className="flex items-center gap-1">
											<Clock size={14} />
											<span>
												Delivered {formatDate(selectedDeliverable.created_at)}
											</span>
										</div>
										<div
											className={`px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor(selectedDeliverable.approval_status)}`}
										>
											{getApprovalStatusText(
												selectedDeliverable.approval_status
											)}
										</div>
									</div>
								</div>
								<Button
									onClick={() => setIsPreviewOpen(false)}
									className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
								>
									×
								</Button>
							</div>

							{/* Video Player */}
							<div className="aspect-video max-w-4xl bg-gray-900 rounded-xl mb-6 overflow-hidden shadow-lg">
								{selectedDeliverable.file_content_type.startsWith("video/") ? (
									<video
										ref={videoRef}
										key={selectedDeliverable.firestore_id}
										controls
										className="w-full h-full"
										preload="metadata"
										playsInline
										crossOrigin="anonymous"
										onError={(e) => {
											console.error("Video loading error:", e);
											console.error("Video URL:", selectedDeliverable.file_download_url);
											console.error(
												"Video type:",
												selectedDeliverable.file_content_type
											);
											toast.error(
												"Failed to load video. Please check the video URL or format."
											);
										}}
								
									>
										Your browser does not support the video tag.
									</video>
								) : (
									<div className="text-gray-400 text-center h-full flex flex-col items-center justify-center">
										<FileText className="h-20 w-20 mb-4" />
										<p className="text-lg">File preview not available</p>
										<p className="text-sm">Click download to view the file</p>
									</div>
								)}
							</div>

							{/* Notes */}
							{selectedDeliverable.notes && (
								<div className="mb-6 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
									<div className="flex items-start gap-2">
										<MessageSquare size={16} className="text-blue-600 mt-0.5" />
										<div>
											<p className="font-medium text-blue-900 mb-1">
												Creator Notes:
											</p>
											<p className="text-blue-800 italic">
												&quot;{selectedDeliverable.notes}&quot;
											</p>
										</div>
									</div>
								</div>
							)}

							{/* Modal Footer */}
							<div className="flex justify-between items-center pt-6 border-t border-gray-200">
								<div className="text-sm text-gray-600 space-y-1">
									<p>
										Order Total:{" "}
										<span className="font-semibold text-lg text-gray-900">
											${selectedOrder.total_price}
										</span>
									</p>
									<div className="flex items-center gap-4">
										<span
											className={`px-3 py-1 text-xs font-semibold rounded-full ${getPackageTypeColor(selectedOrder.package_type)}`}
										>
											{selectedOrder.package_type.toUpperCase()}
										</span>
										<span className="text-gray-500">
											File Size: {formatFileSize(selectedDeliverable.file_size)}
										</span>
									</div>
								</div>

								{selectedDeliverable.approval_status !== "approved" && (
									<div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
										<div className="flex items-center justify-between">
											<span className="text-sm text-green-800">
												Approval will transfer to {selectedOrder.creator?.name}:
											</span>
											<span className="font-bold text-lg text-green-900">
												${selectedOrder.total_price}
											</span>
										</div>
									</div>
								)}

								<div className="flex gap-3">
									<Button
										onClick={() => setIsPreviewOpen(false)}
										className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Close
									</Button>

									{selectedDeliverable.approval_status !== "approved" && (
										<>
											<Button
												onClick={() =>
													handleRequestRevision(selectedDeliverable)
												}
												className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
											>
												<MessageSquare size={16} />
												Request Revision
											</Button>
											<Button
												onClick={() => handleApprove(selectedDeliverable)}
												className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
											>
												<ThumbsUp size={16} />
												Approve
											</Button>
										</>
									)}

									{selectedDeliverable.approval_status === "approved" && (
										<Button
											onClick={() => handleDownload(selectedDeliverable)}
											disabled={
												isDownloading === selectedDeliverable.firestore_id
											}
											className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
										>
											{isDownloading === selectedDeliverable.firestore_id ? (
												<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
											) : (
												<>
													<Download size={16} />
													Download
												</>
											)}
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Revision Request Modal */}
			{selectedRevisionDeliverable && (
				<RevisionRequestModal
					isOpen={isRevisionModalOpen}
					onClose={handleRevisionModalClose}
					onSubmit={handleRevisionSubmit}
					deliverable={selectedRevisionDeliverable.deliverable}
					order={selectedRevisionDeliverable.order}
					isSubmitting={isSubmittingRevision}
				/>
			)}
		</div>
	);
};

export default DeliveredOrdersLibrary;