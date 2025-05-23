import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Creator } from "@/types/creators";

interface ApplicationsProps {
	contestData: {
		id: string;
		requirements: {
			whoCanJoin: string;
		};
	};
}

interface Application {
	id: string;
	userId: string;
	contestId: string;
	postUrl: string;
	applicationText: string;
	sampleUrls: string[];
	hasBusinessAccount: boolean;
	status: string;
	createdAt: unknown;
	creator?: Creator;
}

const Applications: React.FC<ApplicationsProps> = ({ contestData }) => {
	// Get whoCanJoin value from contest data with a default fallback
	const whoCanJoin =
		contestData?.requirements?.whoCanJoin || "allow-applications";

	// States
	const [applications, setApplications] = useState<Application[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortOrder, setSortOrder] = useState("");
	const [selectedApplication, setSelectedApplication] =
		useState<Application | null>(null);
	const [filteredApplications, setFilteredApplications] = useState<
		Application[]
	>([]);

	// Modal states
	const [showApproveModal, setShowApproveModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [pendingActionId, setPendingActionId] = useState<string | null>(null);
	const { currentUser } = useAuth();
	const router = useRouter();

	const handleSendMessage = async (creator: Creator) => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		try {
			console.log("Starting conversation with creator:", creator.id);

			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: currentUser.uid,
					creatorId: creator.id,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
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
				throw new Error(data.error || "Failed to handle conversation");
			}

			// The endpoint returns conversationId for both new and existing conversations
			console.log(
				`Conversation ${response.status === 201 ? "created" : "found"}`
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
					<h3 className="text-lg font-medium mb-4">Confirm Approval</h3>
					<p className="text-gray-600 mb-6">
						Are you sure you want to approve this application? Once approved,
						the creator will be allowed to participate in the contest.
					</p>
					<div className="flex justify-end space-x-3">
						<Button
							variant="outline"
							onClick={closeModals}
							className="bg-white"
						>
							Cancel
						</Button>
						<Button
							onClick={handleApproveApplication}
							className="bg-orange-500 hover:bg-orange-600 text-white"
						>
							Approve <Check className="ml-px h-4 w-4" />
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
						contest.
					</p>
					<div className="flex justify-end space-x-3">
						<Button
							variant="outline"
							onClick={closeModals}
							className="bg-white"
						>
							Cancel
						</Button>
						<Button
							onClick={handleRejectApplication}
							className="bg-red-500 hover:bg-red-600 text-white"
						>
							Reject <X className="ml-px h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	// Fetch applications data
	useEffect(() => {
		const fetchData = async () => {
			if (!contestData?.id) return;

			try {
				setLoading(true);
				const response = await fetch(
					`/api/contest-applications?contestId=${contestData.id}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch applications");
				}

				const data = await response.json();

				// First, set the applications without creator data
				setApplications(data);

				// Fetch all user data in parallel
				const userIds = [
					...new Set(data.map((app: Application) => app.userId)),
				];
				const creatorDataMap = new Map();

				await Promise.all(
					userIds.map(async (userId) => {
						try {
							const creatorRes = await fetch(
								`/api/admin/creator-approval?userId=${userId}`
							);

							if (creatorRes.ok) {
								const response = await creatorRes.json();

								// Store the first creator from the response (assuming it's the one we want)
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

				// Update applications with creator data
				const updatedApplications = data.map((app: Application) => {
					const creatorData = creatorDataMap.get(app.userId);
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

				setApplications(updatedApplications);
				setFilteredApplications(updatedApplications);
				setLoading(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
				console.error("Error fetching applications:", err);
				setLoading(false);
			}
		};

		fetchData();
	}, [contestData?.id]);

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
				// Simplified date conversion
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
		let filtered = [...applications];

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
	const handleViewApplication = async (id: string) => {
		const application = applications.find((app) => app.id === id);
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

	useEffect(() => {}, [pendingActionId]);

	// Handle approving an application
	const handleApproveApplication = async () => {
		if (pendingActionId) {
			try {
				const response = await fetch(
					`/api/contest-applications?applicationId=${pendingActionId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ status: "approved" }),
					}
				);

				if (!response.ok) {
					throw new Error("Failed to approve application");
				}

				// Add this line to log the response:
				const responseData = await response.json();
				console.log("Approval response:", responseData);

				// Update local state
				const updatedApplications = applications.map((app) =>
					app.id === pendingActionId ? { ...app, status: "approved" } : app
				);
				setApplications(updatedApplications);

				// Update filtered applications
				const updatedFiltered = filteredApplications.map((app) =>
					app.id === pendingActionId ? { ...app, status: "approved" } : app
				);
				setFilteredApplications(updatedFiltered);

				// Update selected application if it's the one being modified
				if (selectedApplication && selectedApplication.id === pendingActionId) {
					setSelectedApplication({
						...selectedApplication,
						status: "approved",
					});
				}

				closeModals();
			} catch (error) {
				console.error("Error approving application:", error);
				// Optionally show an error message to the user
			}
		}
	};

	// Handle rejecting an application
	const handleRejectApplication = async () => {
		if (pendingActionId) {
			try {
				const response = await fetch(
					`/api/contest-applications?applicationId=${pendingActionId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ status: "rejected" }),
					}
				);

				if (!response.ok) {
					throw new Error("Failed to reject application");
				}

				// Add this line to log the response:
				const responseData = await response.json();
				console.log("Approval response:", responseData);

				// Update local state
				const updatedApplications = applications.map((app) =>
					app.id === pendingActionId ? { ...app, status: "rejected" } : app
				);
				setApplications(updatedApplications);

				// Update filtered applications
				const updatedFiltered = filteredApplications.map((app) =>
					app.id === pendingActionId ? { ...app, status: "rejected" } : app
				);
				setFilteredApplications(updatedFiltered);

				// Update selected application if it's the one being modified
				if (selectedApplication && selectedApplication.id === pendingActionId) {
					setSelectedApplication({
						...selectedApplication,
						status: "rejected",
					});
				}

				closeModals();
			} catch (error) {
				console.error("Error rejecting application:", error);
				// Optionally show an error message to the user
			}
		}
	};

	// Format timestamp to readable date
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const formatDate = (timestamp: any) => {
		if (!timestamp) return "Unknown date";

		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

		// Format as "Month Day, Year"
		return new Intl.DateTimeFormat("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		}).format(date);
	};

	// Define header columns for more direct alignment
	const headerColumns = [
		"Creator Username",
		"TikTok Profile",
		"Application Date",
		"Status",
		"",
	];

	// Debug logs for modal state
	useEffect(() => {}, [showApproveModal, showRejectModal]);

	// Open to all creators message
	const OpenToAllCreatorsMessage = () => {
		return (
			<div className="w-full -mt-3 mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center">
				<div className="max-w-md mx-auto">
					<div className="flex justify-center mb-4">
						<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
							<Check size={32} className="text-orange-500" />
						</div>
					</div>
					<h2 className="text-xl font-semibold mb-3">
						Contest is Open to All Creators
					</h2>
					<p className="text-gray-600 mb-6">
						This contest has been configured to allow all creators to
						participate without requiring application approval. Any creator can
						join and submit content for this contest.
					</p>
					<Link href="/brand/dashboard/messages">
						<Button className="bg-orange-500 hover:bg-orange-600 text-white">
							<Mail className="mr-1 h-4 w-4" />
							Message Participants
						</Button>
					</Link>
				</div>
			</div>
		);
	};

	// Loading state
	if (loading) {
		return (
			<div className="w-full -mt-3 mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center">
				<p>Loading applications...</p>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="w-full -mt-3 mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center">
				<p className="text-red-500">Error: {error}</p>
				<Button onClick={() => window.location.reload()} className="mt-4">
					Try Again
				</Button>
			</div>
		);
	}

	// If an application is selected, show its details
	if (selectedApplication) {
		const creator = selectedApplication.creator as Creator;

		return (
			<>
				{/* Include modals at the top level so they're always rendered */}
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
							Contest Application Submission - #
							{selectedApplication.id.slice(0, 6)}
						</h1>

						<div className="space-y-4">
							<div>
								<p className="text-sm text-[#667085]">Creator Full Name</p>
								<p className="font-normal text-[#101828]">{creator.creator}</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Creator TikTok Profile:
								</p>
								<Link
									href={creator.socialMedia.tiktok || ""}
									className="font-normal text-orange-500 hover:underline"
								>
									<p>View Profile</p>
								</Link>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Do you have TikTok Creator Marketplace Account:
								</p>
								<p className="font-normal text-[#101828]">
									{selectedApplication.hasBusinessAccount ? "Yes" : "No"}
								</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Why should you be selected?
								</p>
								<div className="mt-1">
									{selectedApplication.applicationText
										.split("\n\n")
										.map((paragraph, idx) => (
											<p key={idx} className="mb-3">
												{paragraph}
											</p>
										))}
								</div>
							</div>

							<div>
								<p className="text-sm text-[#667085]">
									Some samples of your best TikTok:
								</p>
								<div className="font-normal flex flex-col gap-1 mt-1">
									{selectedApplication.sampleUrls.length > 0 ? (
										selectedApplication.sampleUrls.map((video, idx) => (
											<a
												key={idx}
												href={video}
												className="text-orange-500 hover:underline"
												target="_blank"
												rel="noopener noreferrer"
											>
												{video}
											</a>
										))
									) : (
										<p>No sample videos provided</p>
									)}
								</div>
							</div>

							<div>
								<p className="text-sm text-[#667085]">Post URL:</p>
								<a
									href={selectedApplication.postUrl}
									className="text-orange-500 hover:underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									{selectedApplication.postUrl}
								</a>
							</div>
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
								<p className="text-sm text-[#667085]">
									Creator TikTok Following
								</p>
								<p className="font-medium text-[#101828] text-sm">
									{creator.creatorProfileData?.tiktokMetrics?.followers.count || "Unknown"}
								</p>
							</div>

							<div>
								<p className="text-sm text-[#667085]">Total GMV</p>
								<p className="font-medium text-[#101828] text-sm">
									${creator.avgGMVPerVideo?.toLocaleString() || "0"}
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
									>
										<Check className="mr-2 h-4 w-4" />
										Approve Application
									</Button>
									<Button
										onClick={() => openRejectModal(selectedApplication.id)}
										className="w-full bg-white hover:bg-gray-50 text-red-500 border border-red-200"
									>
										<X className="mr-2 h-4 w-4" />
										Reject Application
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</>
		);
	}

	// Show the appropriate content based on whoCanJoin value
	if (whoCanJoin === "open-to-all") {
		return <OpenToAllCreatorsMessage />;
	}

	// If no applications are found
	if (applications.length === 0) {
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
						No creators have applied to your contest yet. Check back later or
						share your contest with more creators.
					</p>
				</div>
			</div>
		);
	}

	// Main applications list view
	return (
		<>
			{/* Render modals at the top level so they're always present */}
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
						{headerColumns.map((column, idx) => (
							<div
								key={idx}
								className={`font-medium text-sm text-gray-600 ${
									idx === 0
										? "col-span-3"
										: idx === 1
											? "col-span-3"
											: idx === 2
												? "col-span-2"
												: idx === 3
													? "col-span-2"
													: "col-span-2"
								}`}
							>
								{column}
							</div>
						))}
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
										className="grid grid-cols-12 px-6 py-4"
									>
										<div className="col-span-3 flex items-center">
											<div className="flex-shrink-0 mr-3">
												<Image
													src={
														creator?.creatorProfileData?.tiktokAvatarUrl || creator?.logoUrl || ""
													}
													alt="Creator profile"
													className="h-8 w-8 rounded-full object-cover"
													width={32}
													height={32}
												/>
											</div>
											<div className="truncate">
												<span className="font-medium text-gray-800">
													{creator?.creatorProfileData?.tiktokUsername || creator?.creator}
												</span>
											</div>
										</div>

										<div className="col-span-3 flex items-center">
											<Link
												href={creator?.socialMedia?.tiktok || "Not Provided"}
												className="text-orange-500 hover:underline"
											>
												View Profile
											</Link>
										</div>

										<div className="col-span-2 flex items-center">
											<span className="text-gray-600">
												{formatDate(application?.createdAt)}
											</span>
										</div>

										<div className="col-span-2 flex items-center">
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

										<div className="col-span-2 flex items-center justify-end">
											<button
												onClick={() => handleViewApplication(application.id)}
												className={`px-3 py-1 text-sm font-medium rounded-md ${getActionButtonStyle(application.status)}`}
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

export default Applications;
