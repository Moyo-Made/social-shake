import React, { useState } from "react";
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

const Applications = () => {
	// Sample data for creators
	const initialCreators = [
		{
			id: 1,
			username: "ColineDzf",
			handle: "@colinedzfr",
			date: "March 14, 2025",
			status: "Pending",
			avatarSrc: "https://i.pravatar.cc/150?img=1",
			hasMarketplace: true,
			whySelected: `Hi Social Shake,

I'm thrilled about the opportunity to participate in your contest! As a content creator with 10,000 Followers and an engagement rate of 60%, I've honed my skills in crafting TikTok videos that are not only visually appealing but also resonate with audiences and drive engagement.

I understand that your campaign focuses on young adults who love trending shoes, and I'm confident in my ability to deliver content that aligns with your vision and stands out. Whether it's incorporating creative transitions, storytelling, or unique movement styles, I'll ensure the video captures attention while adhering to your guidelines.

I've worked on similar projects before, and I'm always eager to experiment and push creative boundaries. Let's collaborate to create something impactful that showcases the best of your brand!`,
		},
		{
			id: 2,
			username: "OlumaWeb",
			handle: "@olumawebb",
			date: "March 22, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=2",
			hasMarketplace: true,
			whySelected: `Hi Social Shake,

As a sneaker enthusiast and fashion content creator, I believe I'm the perfect fit for your campaign. My audience of 15,000 followers is primarily in the 18-24 age range and highly engaged with footwear content.

My videos feature a unique blend of streetwear fashion and urban culture that resonates well with your target demographic. I've previously collaborated with three shoe brands, creating content that achieved above-average engagement rates.

I'm excited about the creative direction of your campaign and have several ideas for how to showcase your products in an authentic way that will connect with potential customers.`,
		},
		{
			id: 3,
			username: "tripalmez94",
			handle: "@tripalmezKek",
			date: "March 24, 2025",
			status: "Rejected",
			avatarSrc: "https://i.pravatar.cc/150?img=3",
			hasMarketplace: false,
			whySelected: `Hello Social Shake,

I would love to be part of your contest as I believe my content style would be a perfect match. I create lifestyle and fashion videos with a focus on authentic storytelling.

With 8,500 followers who are primarily interested in fashion trends, I can create content that will showcase your products in real-world situations that resonate with your audience.

My strength is in creating relatable content that feels genuine rather than promotional, which helps drive higher engagement and conversion rates.`,
		},
		{
			id: 4,
			username: "ColineDzf",
			handle: "@colinedzfr",
			date: "March 14, 2025",
			status: "Pending",
			avatarSrc: "https://i.pravatar.cc/150?img=4",
			hasMarketplace: true,
			whySelected: `Hi Social Shake,

I'm excited to be part of this contest! With my background in fashion content creation and my audience of 12,000 followers, I can create engaging content that will showcase your shoes in the best light possible.

My content style focuses on authentic storytelling and creative visuals that capture attention in the first few seconds - perfect for TikTok's fast-paced environment.

I've worked with similar brands before and achieved great engagement rates. Looking forward to the opportunity to collaborate!`,
		},
		{
			id: 5,
			username: "OlumaWeb",
			handle: "@olumawebb",
			date: "March 22, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=5",
			hasMarketplace: true,
			whySelected: `Hi Social Shake,

I'm excited about this opportunity! With 18,000 followers who are actively engaged in fashion and lifestyle content, I can create videos that will resonate with your target audience.

My content has a unique aesthetic that combines street style with high fashion elements, making it perfect for showcasing versatile footwear products.

I have experience working with brands in the fashion industry and know how to create content that drives both engagement and conversions.`,
		},
		{
			id: 6,
			username: "tripalmez94",
			handle: "@tripalmezKek",
			date: "March 24, 2025",
			status: "Approved",
			avatarSrc: "https://i.pravatar.cc/150?img=6",
			hasMarketplace: true,
			whySelected: `Hello Social Shake,

I'd love to participate in your contest as my content style aligns perfectly with your brand. I specialize in creating footwear and fashion content that showcases products in real-world situations.

With my audience of 14,000 followers who are primarily interested in streetwear and sneaker culture, I can help your products reach potential customers who are already interested in this space.

My videos maintain a balance between being entertaining and informative, which helps drive higher engagement and conversion rates.`,
		},
	];

	// State for filtering and search
	const [creators, setCreators] = useState(initialCreators);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortOrder, setSortOrder] = useState("");
	const [selectedApplication, setSelectedApplication] = useState<{
		id: number;
		username: string;
		handle: string;
		date: string;
		status: string;
		avatarSrc: string;
		hasMarketplace: boolean;
		whySelected: string;
	} | null>(null);

	// Modal states
	const [showApproveModal, setShowApproveModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [pendingActionId, setPendingActionId] = useState<number | null>(null);

	// Handle search input
	const handleSearch = (e: { target: { value: string } }) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);

		filterCreators(query, statusFilter);
	};

	// Handle status filter
	const handleStatusFilter = (value: React.SetStateAction<string>) => {
		setStatusFilter(value);
		filterCreators(searchQuery, value);
	};

	// Handle sorting
	const handleSort = (value: React.SetStateAction<string>) => {
		setSortOrder(value);

		const sortedCreators = [...creators];

		if (value === "date-asc") {
			sortedCreators.sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
			);
		} else if (value === "date-desc") {
			sortedCreators.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);
		} else if (value === "name-asc") {
			sortedCreators.sort((a, b) => a.username.localeCompare(b.username));
		} else if (value === "name-desc") {
			sortedCreators.sort((a, b) => b.username.localeCompare(a.username));
		}

		setCreators(sortedCreators);
	};

	// Filter creators based on search query and status
	const filterCreators = (
		query: string,
		status: React.SetStateAction<string>
	) => {
		let filtered = initialCreators;

		if (query) {
			filtered = filtered.filter(
				(creator) =>
					creator.username.toLowerCase().includes(query) ||
					creator.handle.toLowerCase().includes(query)
			);
		}

		if (status && status !== "All") {
			filtered = filtered.filter((creator) => creator.status === status);
		}

		setCreators(filtered);
	};

	// Get button styling based on status
	const getStatusStyles = (status: string) => {
		switch (status) {
			case "Pending":
				return "bg-yellow-100 text-yellow-800 border border-yellow-200";
			case "Approved":
				return "bg-green-100 text-green-800 border border-green-200";
			case "Rejected":
				return "bg-red-100 text-red-800 border border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border border-gray-200";
		}
	};

	// Get action button styling
	const getActionButtonStyle = (status: string) => {
		return status === "Pending" ? "text-orange-500" : "text-orange-500";
	};

	// Get action button text
	const getActionText = (status: string) => {
		return status === "Pending" ? "Review Application" : "View Application";
	};

	// Render status indicator
	const renderStatusIndicator = (status: string) => {
		if (status === "Approved") {
			return <Check size={12} className="mr-1 text-green-600" />;
		} else if (status === "Pending") {
			return <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />;
		} else if (status === "Rejected") {
			return <div className="w-2 h-2 bg-red-400 rounded-full mr-1" />;
		}
		return null;
	};

	// View application details
	const handleViewApplication = (id: number) => {
		const application = creators.find((creator) => creator.id === id);
		if (application) {
			setSelectedApplication(application);
		}
	};

	// Go back to application list
	const handleBackToList = () => {
		setSelectedApplication(null);
	};

	// Open approve modal
	const openApproveModal = (id: number) => {
		setPendingActionId(id);
		setShowApproveModal(true);
	};

	// Open reject modal
	const openRejectModal = (id: number) => {
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
			const updatedCreators = creators.map((creator) =>
				creator.id === pendingActionId
					? { ...creator, status: "Approved" }
					: creator
			);
			setCreators(updatedCreators);
			setSelectedApplication(
				selectedApplication && selectedApplication.id === pendingActionId
					? { ...selectedApplication, status: "Approved" }
					: selectedApplication
			);
			closeModals();
		}
	};

	// Handle rejecting an application
	const handleRejectApplication = () => {
		if (pendingActionId) {
			const updatedCreators = creators.map((creator) =>
				creator.id === pendingActionId
					? { ...creator, status: "Rejected" }
					: creator
			);
			setCreators(updatedCreators);
			setSelectedApplication(
				selectedApplication && selectedApplication.id === pendingActionId
					? { ...selectedApplication, status: "Rejected" }
					: selectedApplication
			);
			closeModals();
		}
	};

	// Define header columns for more direct alignment
	const headerColumns = [
		"Creator Username",
		"Tiktok Profile",
		"Application Date",
		"Status",
		"",
	];

	// Approve Confirmation Modal
	const ApproveModal = () => {
		if (!showApproveModal) return null;

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
						be notified, and they won't be able to participate in the contest.
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

	// If an application is selected, show its details
	if (selectedApplication) {
		return (
			<div className="flex flex-col md:flex-row gap-6 mx-auto p-4">
				{/* Left panel - Application details */}
				<div className="flex-1 bg-white rounded-lg border border-[#FFD9C3] p-6">
					<button
						onClick={handleBackToList}
						className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
					>
						<ChevronLeft className="h-4 w-4 mr-1" />
						<span>Back to Applications</span>
					</button>

					<h1 className="text-xl font-bold mb-6">
						Contest Application Submission - #{selectedApplication.id}
					</h1>

					<div className="space-y-4">
						<div>
							<p className="text-sm text-gray-500">Creator Full Name</p>
							<p className="font-medium">{selectedApplication.username}</p>
						</div>

						<div>
							<p className="text-sm text-gray-500">Creator Tiktok Profile:</p>
							<p className="font-medium text-orange-500">
								{selectedApplication.handle}
							</p>
						</div>

						<div>
							<p className="text-sm text-gray-500">
								Do you have Tiktok Creator Marketplace Account:
							</p>
							<p className="font-medium">
								{selectedApplication.hasMarketplace ? "Yes" : "No"}
							</p>
						</div>

						<div>
							<p className="text-sm text-gray-500">
								Why should you be selected?
							</p>
							<div className="mt-1">
								{selectedApplication.whySelected
									.split("\n\n")
									.map((paragraph, idx) => (
										<p key={idx} className="mb-3">
											{paragraph}
										</p>
									))}
							</div>
						</div>
					</div>
				</div>

				{/* Right panel - Status and actions */}
				<div className="w-full md:w-72">
					<div className="bg-white rounded-lg border border-[#FFD9C3] p-6 space-y-4">
						<div>
							<p className="text-sm text-gray-500">Application Date</p>
							<p className="font-medium">{selectedApplication.date}</p>
						</div>

						<div>
							<p className="text-sm text-gray-500">Status</p>
							<div
								className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles(
									selectedApplication.status
								)}`}
							>
								{renderStatusIndicator(selectedApplication.status)}
								<span>{selectedApplication.status}</span>
							</div>
						</div>

						<Button className="w-full bg-pink-500 hover:bg-pink-600 text-white">
							<Mail className="mr-2 h-4 w-4" />
							Message Creator
						</Button>

						{selectedApplication.status === "Pending" && (
							<>
								<Button
									className="w-full bg-black hover:bg-gray-800 text-white"
									onClick={() => openApproveModal(selectedApplication.id)}
								>
									Approve Application
								</Button>
								<Button
									variant="outline"
									className="w-full text-red-500 hover:bg-red-50"
									onClick={() => openRejectModal(selectedApplication.id)}
								>
									Reject Application
								</Button>
							</>
						)}
					</div>
				</div>

				{/* Render modals */}
				<ApproveModal />
				<RejectModal />
			</div>
		);
	}

	return (
		<div className="w-full -mt-3 mx-auto bg-white p-4 rounded-lg">
			<div className="flex justify-between mb-6">
				<div className="relative w-64">
					<Input
						type="text"
						placeholder="Search Creator"
						value={searchQuery}
						onChange={handleSearch}
						className="pl-8 pr-4 py-2 border rounded-md"
					/>
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
				</div>
				<div className="flex gap-2">
					<Select value={statusFilter} onValueChange={handleStatusFilter}>
						<SelectTrigger className="w-32">
							<div className="flex items-center">
								{statusFilter ? <SelectValue /> : <span>Status</span>}
							</div>
						</SelectTrigger>
						<SelectContent className="bg-white">
							<SelectItem value="All">All</SelectItem>
							<SelectItem value="Pending">Pending</SelectItem>
							<SelectItem value="Approved">Approved</SelectItem>
							<SelectItem value="Rejected">Rejected</SelectItem>
						</SelectContent>
					</Select>

					<Select value={sortOrder} onValueChange={handleSort}>
						<SelectTrigger className="w-36">
							<div className="flex items-center">
								{sortOrder ? <SelectValue /> : <span>Sort by Date</span>}
							</div>
						</SelectTrigger>
						<SelectContent className="bg-white">
							<SelectItem value="date-desc">Date (Newest)</SelectItem>
							<SelectItem value="date-asc">Date (Oldest)</SelectItem>
							<SelectItem value="name-asc">Name (A-Z)</SelectItem>
							<SelectItem value="name-desc">Name (Z-A)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Table with column headers directly underneath */}
			<div className="overflow-hidden border rounded-md">
				{/* Column Headers */}
				<div className="grid grid-cols-5 gap-4 bg-gray-50 p-3 border-b">
					{headerColumns.map((header, index) => (
						<div key={index} className="text-gray-600 font-medium">
							{header}
						</div>
					))}
				</div>

				{/* Table Body */}
				<div className="bg-white">
					{creators.length > 0 ? (
						creators.map((creator) => (
							<div
								key={creator.id}
								className="grid grid-cols-5 gap-4 p-3 border-b items-center"
							>
								<div className="flex items-center">
									<div className="h-8 w-8 rounded-full overflow-hidden mr-2">
										<img src={creator.avatarSrc} alt={creator.username} />
									</div>
									<span>{creator.username}</span>
								</div>
								<div className="text-orange-500">{creator.handle}</div>
								<div>{creator.date}</div>
								<div>
									<div
										className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles(
											creator.status
										)}`}
									>
										{renderStatusIndicator(creator.status)}
										<span>{creator.status}</span>
									</div>
								</div>
								<div>
									<Button
										variant="link"
										className={getActionButtonStyle(creator.status)}
										onClick={() => handleViewApplication(creator.id)}
									>
										{getActionText(creator.status)}
									</Button>
								</div>
							</div>
						))
					) : (
						<div className="p-8 text-center text-gray-500">
							Applications were not enabled for this contest.
						</div>
					)}
				</div>
			</div>

			{/* Render modals */}
			<ApproveModal />
			<RejectModal />
		</div>
	);
};

export default Applications;
