import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Check, ChevronLeft, Mail, Search, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ShippingAddress } from "@/components/Creators/dashboard/projects/available/ProjectApplyModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ApplicationsProps {
	projectData: {
		id: string;
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
	following?: number;
	gmv?: number;
}

interface Application {
	id: string;
	userId: string;
	projectId: string;
	reason: string;
	shippingAddress: {
		addressLine1: string;
		addressLine2: string;
		city: string;
		state: string;
		country: string;
		zipCode: string;
	};
	deliveryTime: string;
	productOwnership: string;
	status: string;
	createdAt: unknown;
	creator?: Creator;
}

// Query keys
const queryKeys = {
	applications: (projectId: string) => ['applications', projectId],
	shippingAddress: (applicationId: string) => ['shippingAddress', applicationId],
	creatorData: (userId: string) => ['creatorData', userId],
};

// API functions
const fetchApplications = async (projectId: string): Promise<Application[]> => {
	const response = await fetch(`/api/project-applications?projectId=${projectId}`);
	if (!response.ok) {
		throw new Error("Failed to fetch applications");
	}
	return response.json();
};

const fetchCreatorData = async (userId: string): Promise<Creator | null> => {
	const response = await fetch(`/api/admin/creator-approval?userId=${userId}`);
	if (!response.ok) {
		return null;
	}
	const data = await response.json();
	return data.creators && data.creators.length > 0 ? data.creators[0] : null;
};

const fetchShippingAddress = async (applicationId: string): Promise<ShippingAddress | null> => {
	const response = await fetch(`/api/project-application-address?applicationId=${applicationId}`);
	if (!response.ok) {
		return null;
	}
	return response.json();
};

const updateApplicationStatus = async ({ applicationId, status }: { applicationId: string; status: string }) => {
	const response = await fetch(`/api/project-applications?applicationId=${applicationId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		throw new Error(`Failed to ${status} application`);
	}

	return response.json();
};

const ProjectApplications: React.FC<ApplicationsProps> = ({ projectData }) => {
	// States
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortOrder, setSortOrder] = useState("");
	const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
	const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);

	// Modal states
	const [showApproveModal, setShowApproveModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [pendingActionId, setPendingActionId] = useState<string | null>(null);

	const { currentUser } = useAuth();
	const router = useRouter();
	const queryClient = useQueryClient();

	// Queries
	const {
		data: applications = [],
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: queryKeys.applications(projectData?.id || ''),
		queryFn: () => fetchApplications(projectData.id),
		enabled: !!projectData?.id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	// Fetch creator data for all applications
	const creatorQueries = useQuery({
		queryKey: ['creatorsForApplications', projectData?.id],
		queryFn: async () => {
			if (!applications.length) return new Map();

			const userIds = [...new Set(applications.map((app: Application) => app.userId))];
			const creatorDataMap = new Map();

			await Promise.all(
				userIds.map(async (userId) => {
					try {
						const creatorData = await fetchCreatorData(userId);
						if (creatorData) {
							creatorDataMap.set(userId, creatorData);
						}
					} catch (err) {
						console.error(`Error fetching creator data for user ID ${userId}:`, err);
					}
				})
			);

			return creatorDataMap;
		},
		enabled: applications.length > 0,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});

	// Shipping address query for selected application
	const { data: shippingAddress } = useQuery({
		queryKey: queryKeys.shippingAddress(selectedApplication?.id || ''),
		queryFn: () => fetchShippingAddress(selectedApplication!.id),
		enabled: !!(selectedApplication?.id && selectedApplication.productOwnership === "need"),
		staleTime: 15 * 60 * 1000, // 15 minutes
	});

	// Mutations
	const approveApplicationMutation = useMutation({
		mutationFn: (applicationId: string) => updateApplicationStatus({ applicationId, status: 'approved' }),
		onSuccess: (data, applicationId) => {
			// Update the applications cache
			queryClient.setQueryData(
				queryKeys.applications(projectData.id),
				(oldData: Application[] | undefined) =>
					oldData?.map(app =>
						app.id === applicationId ? { ...app, status: 'approved' } : app
					) || []
			);

			// Update selected application if it's the one being modified
			if (selectedApplication && selectedApplication.id === applicationId) {
				setSelectedApplication(prev => prev ? { ...prev, status: 'approved' } : null);
			}

			closeModals();
		},
		onError: (error) => {
			console.error("Error approving application:", error);
		},
	});

	const rejectApplicationMutation = useMutation({
		mutationFn: (applicationId: string) => updateApplicationStatus({ applicationId, status: 'rejected' }),
		onSuccess: (data, applicationId) => {
			// Update the applications cache
			queryClient.setQueryData(
				queryKeys.applications(projectData.id),
				(oldData: Application[] | undefined) =>
					oldData?.map(app =>
						app.id === applicationId ? { ...app, status: 'rejected' } : app
					) || []
			);

			// Update selected application if it's the one being modified
			if (selectedApplication && selectedApplication.id === applicationId) {
				setSelectedApplication(prev => prev ? { ...prev, status: 'rejected' } : null);
			}

			closeModals();
		},
		onError: (error) => {
			console.error("Error rejecting application:", error);
		},
	});

	// Combine applications with creator data
	const applicationsWithCreators = React.useMemo(() => {
		if (!applications.length || !creatorQueries.data) return [];

		return applications.map((app: Application) => {
			const creatorData = creatorQueries.data.get(app.userId);
			if (creatorData) {
				return { ...app, creator: creatorData };
			}
			// Fallback if creator data not found
			return {
				...app,
				creator: {
					id: app.userId,
					userId: app.userId,
					verificationId: "",
					creator: "",
					status: "",
					createdAt: "",
					logoUrl: "",
					bio: "",
					socialMedia: {
						instagram: "",
						twitter: "",
						facebook: "",
						youtube: "",
						tiktok: "",
					},
					firstName: "",
					lastName: "",
					email: "Unknown",
					username: "Unknown Creator",
					contentTypes: [],
					contentLinks: [],
					country: "",
					gender: "",
					ethnicity: null,
					dateOfBirth: "",
					verifiableIDUrl: null,
					verificationVideoUrl: null,
					following: 0,
					gmv: 0,
				},
			};
		});
	}, [applications, creatorQueries.data]);

	// Update filtered applications when data changes
	useEffect(() => {
		setFilteredApplications(applicationsWithCreators);
	}, [applicationsWithCreators]);

	const handleSendMessage = async (creator: Creator) => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		try {
			console.log("Starting conversation with creator:", creator.id);
			console.log("Current user ID:", currentUser.uid);

			const effectiveUserId = currentUser.uid;
			console.log("Using effective user ID:", effectiveUserId);

			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: effectiveUserId,
					creatorId: creator.userId || creator.id,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
						authUserId: currentUser.uid,
					},
					creatorData: {
						name:
							`${creator.firstName} ${creator.lastName}`.trim() ||
							creator.username,
						avatar: creator.logoUrl || "/icons/default-avatar.svg",
						username: creator.username,
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error("Conversation creation failed:", data);
				throw new Error(data.error || "Failed to handle conversation");
			}

			console.log(
				`Conversation ${response.status === 201 ? "created" : "found"}`,
				"ID:",
				data.conversationId
			);

			router.push(
				`/brand/dashboard/messages?conversation=${data.conversationId}`
			);
		} catch (error) {
			console.error("Error handling conversation:", error);
			alert("Failed to open conversation. Please try again.");
		}
	};

	// Approve Confirmation Modal
	const ApproveModal = () => {
		if (!showApproveModal) {
			return null;
		}

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
				<div className="bg-white rounded-lg p-6 max-w-md mx-4">
					<h3 className="text-black text-start text-xl font-medium mb-4">
						Confirm Approval
					</h3>
					<p className="text-start text-gray-600 mb-6">
						Are you sure you want to approve this application? Once approved,
						the creator will be allowed to participate in the project.
					</p>
					<div className="flex justify-end space-x-3">
						<Button
							variant="outline"
							onClick={closeModals}
							className="bg-white"
							disabled={approveApplicationMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleApproveApplication}
							className="bg-orange-500 hover:bg-orange-600 text-white"
							disabled={approveApplicationMutation.isPending}
						>
							{approveApplicationMutation.isPending ? "Approving..." : "Approve"} <Check className="ml-px h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	// Reject Confirmation Modal
	const RejectModal = () => {
		if (!showRejectModal) return null;

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
				<div className="bg-white rounded-lg p-6 max-w-md mx-4">
					<h3 className="text-lg font-medium mb-4">Confirm Rejection</h3>
					<p className="text-gray-600 mb-6">
						Are you sure you want to reject this application? The creator will
						be notified, and they won&apos;t be able to participate in the
						project.
					</p>
					<div className="flex justify-end space-x-3">
						<Button
							variant="outline"
							onClick={closeModals}
							className="bg-white"
							disabled={rejectApplicationMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRejectApplication}
							className="bg-red-500 hover:bg-red-600 text-white"
							disabled={rejectApplicationMutation.isPending}
						>
							{rejectApplicationMutation.isPending ? "Rejecting..." : "Reject"} <X className="ml-px h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	// Handle search input
	const handleSearch = (e: { target: { value: string } }) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);
		filterApplications(query, statusFilter);
	};

	// Handle status filter
	const handleStatusFilter = (value: string) => {
		setStatusFilter(value);
		filterApplications(searchQuery, value);
	};

	// Handle sorting
	const handleSort = (value: string) => {
		setSortOrder(value);
		const sorted = [...filteredApplications];

		if (value === "date-asc" || value === "date-desc") {
			sorted.sort((a, b) => {
				const dateA = new Date(a.createdAt as string);
				const dateB = new Date(b.createdAt as string);

				return value === "date-asc"
					? dateA.getTime() - dateB.getTime()
					: dateB.getTime() - dateA.getTime();
			});
		} else if (value === "name-asc" || value === "name-desc") {
			sorted.sort((a, b) => {
				const nameA = a.creator?.username || "";
				const nameB = b.creator?.username || "";
				return value === "name-asc"
					? nameA.localeCompare(nameB)
					: nameB.localeCompare(nameA);
			});
		}

		setFilteredApplications(sorted);
	};

	// Filter applications based on search query and status
	const filterApplications = (query: string, status: string) => {
		let filtered = [...applicationsWithCreators];

		if (query) {
			filtered = filtered.filter(
				(app) =>
					app.creator?.username?.toLowerCase().includes(query) ||
					app.creator?.socialMedia.tiktok?.toLowerCase().includes(query)
			);
		}

		if (status && status !== "All") {
			filtered = filtered.filter((app) => app.status === status.toLowerCase());
		}

		setFilteredApplications(filtered);
	};

	// Get button styling based on status
	const getStatusStyles = (status: string) => {
		switch (status.toLowerCase()) {
			case "pending":
				return "bg-yellow-100 text-yellow-800 border border-yellow-200";
			case "approved":
				return "bg-green-100 text-green-800 border border-green-200";
			case "rejected":
				return "bg-red-100 text-red-800 border border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border border-gray-200";
		}
	};

	// Get action button styling
	const getActionButtonStyle = (status: string) => {
		return status.toLowerCase() === "pending"
			? "text-orange-500"
			: "text-orange-500";
	};

	// Get action button text
	const getActionText = (status: string) => {
		return status.toLowerCase() === "pending"
			? "Review Application"
			: "View Application";
	};

	// Render status indicator
	const renderStatusIndicator = (status: string) => {
		if (status.toLowerCase() === "approved") {
			return <Check size={12} className="mr-1 text-green-600" />;
		} else if (status.toLowerCase() === "pending") {
			return <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />;
		} else if (status.toLowerCase() === "rejected") {
			return <div className="w-2 h-2 bg-red-400 rounded-full mr-1" />;
		}
		return null;
	};

	// View application details
	const handleViewApplication = (id: string) => {
		const application = applicationsWithCreators.find((app) => app.id === id);
		if (application) {
			setSelectedApplication(application);
		}
	};

	// Go back to application list
	const handleBackToList = () => {
		setSelectedApplication(null);
	};

	// Open approve modal
	const openApproveModal = (id: string) => {
		setPendingActionId(id);
		setShowApproveModal(true);
	};

	// Open reject modal
	const openRejectModal = (id: string) => {
		setPendingActionId(id);
		setShowRejectModal(true);
	};

	// Close all modals
	const closeModals = () => {
		setShowApproveModal(false);
		setShowRejectModal(false);
		setPendingActionId(null);
	};

	// Handle approving an application
	const handleApproveApplication = () => {
		if (pendingActionId) {
			approveApplicationMutation.mutate(pendingActionId);
		}
	};

	// Handle rejecting an application
	const handleRejectApplication = () => {
		if (pendingActionId) {
			rejectApplicationMutation.mutate(pendingActionId);
		}
	};

	// Format timestamp to readable date
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const formatDate = (timestamp: any) => {
		if (!timestamp) return "Unknown date";

		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

		return new Intl.DateTimeFormat("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		}).format(date);
	};

	// Loading state
	if (isLoading || creatorQueries.isLoading) {
		return (
			<div className="flex flex-col items-center justify-center mt-10">
			<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
			<div className="text-center">Loading applications...</div>
		</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="w-full -mt-3 mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center">
				<p className="text-red-500">Error: {error.message}</p>
				<Button onClick={() => refetch()} className="mt-4">
					Try Again
				</Button>
			</div>
		);
	}

	// If an application is selected, show its details
	if (selectedApplication) {
		const creator = selectedApplication.creator || {
			id: "",
			userId: "",
			verificationId: "",
			creator: "",
			status: "",
			createdAt: "",
			logoUrl: "",
			bio: "",
			socialMedia: {
				instagram: "",
				twitter: "",
				facebook: "",
				youtube: "",
				tiktok: "@unknown",
			},
			firstName: "",
			lastName: "",
			email: "Unknown",
			username: "Unknown Creator",
			contentTypes: [],
			contentLinks: [],
			country: "",
			gender: "",
			ethnicity: null,
			dateOfBirth: "",
			verifiableIDUrl: null,
			verificationVideoUrl: null,
			following: 0,
			gmv: 0,
		};

		return (
			<>
				<ApproveModal />
				<RejectModal />

				<div className="flex flex-col md:flex-row gap-6 mx-auto p-4 text-start">
					{/* Left panel - Application details */}
					<div className="flex-1 bg-white rounded-lg border border-[#FFD9C3] p-6">
						<button
							onClick={handleBackToList}
							className="inline-flex items-center text-black hover:text-gray-900 mb-6"
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							<span>Back to Applications</span>
						</button>

						<h1 className="text-xl font-semibold mb-6 text-[#101828]">
							Project Application Submission - #
							{selectedApplication.id.slice(0, 6)}
						</h1>

						<div className="space-y-4">
							<div>
								<p className="text-sm text-[#667085]">Creator Full Name</p>
								<p className="font-normal text-[#101828]">
									{creator.firstName} {creator.lastName}
								</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Creator TikTok Profile:
								</p>
								<Link
									href={creator.socialMedia.tiktok || ""}
									className="font-normal text-orange-500 hover:underline"
								>
									<p>{creator.socialMedia.tiktok || ""}</p>
								</Link>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Do you own the product already, or will you need it shipped?
								</p>
								<p className="font-normal text-[#101828]">
									I {selectedApplication.productOwnership} it
								</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">Your Pitch</p>
								<div className="mt-1">
									{selectedApplication.reason
										.split("\n\n")
										.map((paragraph, idx) => (
											<p key={idx} className="mb-3">
												{paragraph}
											</p>
										))}
								</div>
							</div>

							{selectedApplication.productOwnership === "need" && (
								<div className="flex flex-col space-y-1">
									<p className="text-sm text-[#667085]">Shipping Address</p>
									{!shippingAddress ? (
										<div>
											<p className="font-normal text-[#101828]">
												Loading shipping address...
											</p>
										</div>
									) : (
										<>
											<p className="font-normal text-[#101828]">
												{shippingAddress?.name}
											</p>
											<p className="font-normal text-[#101828]">
												{shippingAddress?.addressLine1}
											</p>
											{shippingAddress?.addressLine2 && (
												<p className="font-normal text-[#101828]">
													{shippingAddress?.addressLine2}
												</p>
											)}
											<p className="font-normal text-[#101828]">
												{shippingAddress?.city}, {shippingAddress?.state}{" "}
												{shippingAddress?.zipCode}
											</p>
											<p className="font-normal text-[#101828]">
												{shippingAddress?.country}
											</p>
											<p className="font-normal text-[#101828]">
												Phone: {shippingAddress?.phoneNumber}
											</p>
										</>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Right panel - Status and actions */}
					<div className="w-full md:w-72">
						<div className="bg-white rounded-lg border border-[#FFD9C3] p-6 space-y-4">
							<div>
								<p className="text-sm text-[#667085]">Application Date</p>
								<p className="font-medium text-[#101828] text-sm">
									{formatDate(selectedApplication.createdAt)}
								</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">Status</p>
								<div
									className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles(
										selectedApplication.status
									)}`}
								>
									{renderStatusIndicator(selectedApplication.status)}
									<span>
										{selectedApplication.status.charAt(0).toUpperCase() +
											selectedApplication.status.slice(1)}
									</span>
								</div>
							</div>

							<Button
								onClick={() =>
									selectedApplication?.creator &&
									handleSendMessage(selectedApplication.creator)
								}
								className="w-full bg-pink-500 hover:bg-pink-600 text-white flex justify-center items-center rounded-lg"
							>
								<Mail className="mr-1 h-4 w-4" />
								Message Creator
							</Button>

							{selectedApplication.status.toLowerCase() === "pending" && (
								<>
									<Button
										onClick={() => openApproveModal(selectedApplication.id)}
										className="w-full bg-black hover:bg-gray-800 text-white"
										disabled={approveApplicationMutation.isPending}
									>
										<Check className="mr-2 h-4 w-4" />
										{approveApplicationMutation.isPending ? "Approving..." : "Approve Application"}
									</Button>
									<Button
										onClick={() => openRejectModal(selectedApplication.id)}
										className="w-full bg-white hover:bg-gray-50 text-red-500 border border-red-200"
										disabled={rejectApplicationMutation.isPending}
									>
										<X className="mr-2 h-4 w-4" />
										{rejectApplicationMutation.isPending ? "Rejecting..." : "Reject Application"}
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</>
		);
	}

	// If no applications are found
	if (applicationsWithCreators.length === 0) {
		return (
			<div className="w-full -mt-3 mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center">
				<div className="max-w-md mx-auto">
					<div className="flex justify-center mb-4">
						<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
							<Mail size={24} className="text-orange-500" />
						</div>
					</div>
					<h2 className="text-xl font-semibold mb-3">No Applications Yet</h2>
					<p className="text-gray-600 mb-6">
						No creators have applied to your project yet. Check back later or
						share your project with more creators.
					</p>
				</div>
			</div>
		);
	}

	// Main applications list view
	return (
		<>
			<ApproveModal />
			<RejectModal />

			<div className="w-full mx-auto">
				{/* Filters and search */}
				<div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
					<div className="flex relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<Search className="h-4 w-4 text-gray-400" />
						</div>
						<Input
							placeholder="Search by creator name or TikTok handle"
							className="pl-10"
							value={searchQuery}
							onChange={handleSearch}
						/>
					</div>

					<div className="flex flex-col sm:flex-row gap-4">
						<Select value={statusFilter} onValueChange={handleStatusFilter}>
							<SelectTrigger className="w-full sm:w-40">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="approved">Approved</SelectItem>
								<SelectItem value="rejected">Rejected</SelectItem>
							</SelectContent>
						</Select>

						<Select value={sortOrder} onValueChange={handleSort}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="date-desc">Date (Newest First)</SelectItem>
								<SelectItem value="date-asc">Date (Oldest First)</SelectItem>
								<SelectItem value="name-asc">Name (A-Z)</SelectItem>
								<SelectItem value="name-desc">Name (Z-A)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Applications table */}
				<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
					{/* Table header */}
					<div className="grid grid-cols-12 px-6 py-4 bg-gray-50 border-b">
						<div className="col-span-3 font-medium text-sm text-gray-600">
							Creator Username
						</div>
						<div className="col-span-3 font-medium text-sm text-gray-600">
							TikTok Profile
						</div>
						<div className="col-span-2 font-medium text-sm text-gray-600">
							Application Date
						</div>
						<div className="col-span-2 font-medium text-sm text-gray-600">
							Status
						</div>
						<div className="col-span-2 font-medium text-sm text-gray-600 text-right"></div>
					</div>

					{/* Table body */}
					<div className="divide-y divide-gray-200">
						{filteredApplications.length === 0 ? (
							<div className="p-6 text-center text-gray-500">
								No applications match your filter criteria
							</div>
						) : (
							filteredApplications.map((application) => {
								const creator = application?.creator;

								return (
									<div
										key={application.id}
										className="grid grid-cols-12 px-6 py-4 items-center"
									>
										<div className="col-span-3 flex items-center ml-16">
											<div className="flex-shrink-0 mr-3">
												<Image
													src={creator?.logoUrl || "/placeholder-avatar.png"}
													alt="Creator profile"
													className="h-8 w-8 rounded-full object-cover"
													width={32}
													height={32}
												/>
											</div>
											<div className="truncate">
												<span className="font-medium text-gray-800">
													{creator?.username || "Unknown Creator"}
												</span>
											</div>
										</div>

										<div className="col-span-3">
											{creator?.socialMedia?.tiktok ? (
												<Link
												href={`https://${creator.socialMedia.tiktok}`}
												className="text-orange-500 hover:underline"
												target="_blank"
												rel="noopener noreferrer"
											  >
												View Profile
											  </Link>
											) : (
												<span className="text-gray-400">Not Provided</span>
											)}
										</div>

										<div className="col-span-2 text-gray-600">
											{formatDate(application?.createdAt)}
										</div>

										<div className="col-span-2">
											<div
												className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles(
													application.status
												)}`}
											>
												{renderStatusIndicator(application.status)}
												<span>
													{application.status.charAt(0).toUpperCase() +
														application.status.slice(1)}
												</span>
											</div>
										</div>

										<div className="col-span-2 text-right">
											<button
												onClick={() => handleViewApplication(application.id)}
												className={`px-3 py-1 text-sm font-medium rounded-md ${getActionButtonStyle(
													application.status
												)}`}
											>
												{getActionText(application.status)}
											</button>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default ProjectApplications;
