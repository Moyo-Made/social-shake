"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContestStatus } from "@/types/projects";
import {
	BasicFormData,
	ContestType,
	PrizeTimelineFormData,
	RequirementsFormData,
} from "@/types/contestFormData";
import { BrandProfile } from "@/types/user";
import { Incentive } from "../brand/brandProfile/dashboard/newContest/ContestFormContext";

// Types
interface Contest {
	id: string;
	userId?: string;
	contestId: string;
	basic: BasicFormData;
	requirements: RequirementsFormData;
	prizeTimeline: PrizeTimelineFormData;
	incentives: Incentive[];
	contestType: ContestType;
	status: ContestStatus;
	createdAt: string;
	updatedAt: string;
	participants?: number;
}

interface ActionModalProps {
	actionType: string;
	actionMessage: string;
	setActionMessage: (message: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

interface StatusBadgeProps {
	status: ContestStatus;
}

const ContestDetailsPage: React.FC = () => {
	const params = useParams();
	const contestId = params?.contestId as string;

	// State
	const [contest, setContest] = useState<Contest | null>(null);
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");
	const [brandEmail, setBrandEmail] = useState<string>("");

	// Fetch contest details
	useEffect(() => {
		const fetchContestDetails = async () => {
			try {
				setLoading(true);

				// Try to get from localStorage first (if navigated from contest list)
				const storedContest = localStorage.getItem("viewingContest");

				if (storedContest) {
					setContest(JSON.parse(storedContest));
				} else {
					// If not in localStorage, fetch from API
					const response = await fetch(
						`/api/admin/contest-approval/${contestId}`
					);

					if (!response.ok) {
						throw new Error("Failed to fetch contest details");
					}

					const data = await response.json();
					setContest(data.contest);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
				console.error("Error fetching contest details:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchContestDetails();
	}, [contestId]);

	// Fetch brand profile when contest data is available
	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!contest || !contest.userId) return;

			try {
				// Skip if we already have this brand profile
				if (brandProfile && brandProfile.userId === contest.userId) {
					return;
				}

				const response = await fetch(
					`/api/admin/brand-approval?userId=${contest.userId}`
				);

				if (response.ok) {
					const data = await response.json();
					setBrandProfile(data);
					if (data.email) {
						setBrandEmail(data.email);
					}
				} else {
					// Handle 404 or other errors by setting a placeholder
					setBrandProfile({
						id: contest.userId,
						userId: contest.userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error(
					`Error fetching brand profile for userId ${contest.userId}:`,
					error
				);
			}
		};

		if (contest) {
			fetchBrandProfile();
		}
	}, [contest, brandProfile]);

	// Handle contest action (approve, reject, request info)
	const handleContestAction = async () => {
		if (!contest || !actionType) return;

		try {
			const response = await fetch("/api/admin/contest-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					brandEmail: brandEmail || brandProfile?.email || "",
					contestId: contest.id,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Update local contest state to reflect the action
			let newStatus: ContestStatus;

			switch (actionType) {
				case "approve":
					newStatus = "active" as ContestStatus;
					break;
				case "reject":
					newStatus = "rejected" as ContestStatus;
					break;
				case "request_info":
					newStatus = "request_edit" as ContestStatus;
					break;
				case "suspend":
					newStatus = "rejected" as ContestStatus;
					break;
				default:
					newStatus = contest.status;
			}

			setContest({
				...contest,
				status: newStatus,
			});

			// Reset action state
			setShowModal(false);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing contest action:", err);
		}
	};

	// Helper function to initiate action
	const initiateAction = (type: string) => {
		setActionType(type);
		setShowModal(true);
	};

	if (loading) {
		return <LoadingView />;
	}

	if (error || !contest) {
		return <ErrorView error={error} />;
	}

	return (
		<div className="bg-white p-6 w-full mx-auto">
			{/* Back button */}
			<BackButton />

			{/* Contest header with title and status */}
			<ContestHeader contest={contest} initiateAction={initiateAction} />

			{/* Main content - Two column layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left column - Contest details */}
				<div className="lg:col-span-2">
					<ContestDetails contest={contest} />
				</div>

				{/* Right column - Brand and contest info */}
				<div className="lg:col-span-1">
					<BrandInfoCard brandProfile={brandProfile} contest={contest} />
				</div>
			</div>

			{/* Action modals */}
			{showModal && (
				<ActionModal
					actionType={actionType}
					actionMessage={actionMessage}
					setActionMessage={setActionMessage}
					onCancel={() => {
						setShowModal(false);
						setActionType("");
						setActionMessage("");
					}}
					onConfirm={handleContestAction}
				/>
			)}
		</div>
	);
};

// Component for loading state
const LoadingView = () => (
	<div className="flex justify-center items-center py-20">
		<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
	</div>
);

// Component for error state
const ErrorView = ({ error }: { error: string | null }) => (
	<div className="p-6 w-full mx-auto">
		<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			{error || "Contest not found"}
		</div>
		<div className="mt-4">
			<Link
				href="/admin/campaigns/contests"
				className="text-orange-600 hover:underline"
			>
				&larr; Back to Contests
			</Link>
		</div>
	</div>
);

// Back button component
const BackButton = () => (
	<div className="mb-4">
		<Link
			href="/admin/campaigns/contests"
			className="text-gray-600 hover:text-gray-800 flex items-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-5 w-5 mr-2"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fillRule="evenodd"
					d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
					clipRule="evenodd"
				/>
			</svg>
			All Contests
		</Link>
	</div>
);

// Status badge component
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
	const statusConfig = {
		pending: {
			color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
			text: "• Pending",
		},
		active: {
			color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
			text: "✓ Active",
		},
		rejected: {
			color: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]",
			text: "• Rejected",
		},
		completed: {
			color: "bg-[#E0F2FE] border border-[#60A5FA] text-[#1D4ED8]",
			text: "✓ Completed",
		},
		request_edit: {
			color: "bg-[#FFF3CD] border border-[#FFBF47] text-[#856404]",
			text: "• Request Edit",
		},
	};

	const config = statusConfig[status] || statusConfig.pending;

	return (
		<span
			className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
		>
			{config.text}
		</span>
	);
};

// Contest header component
const ContestHeader = ({
	contest,
	initiateAction,
}: {
	contest: Contest;
	initiateAction: (type: string) => void;
}) => (
	<div className="flex flex-col md:flex-row justify-between items-start mb-6">
		<div className="flex items-center gap-2">
			<h1 className="text-2xl font-semibold text-gray-900">
				{contest.basic.contestName}
			</h1>
			<StatusBadge status={contest.status} />
		</div>

		{/* Action buttons */}
		<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
			{/* Show Approve Contest button when status is pending or request_edit */}
			{(contest.status === "pending" || contest.status === "request_edit") && (
				<Button
					onClick={() => initiateAction("approve")}
					className="px-5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
				>
					Approve Contest
				</Button>
			)}

			{/* Show Reject Contest button when status is pending or active */}
			{(contest.status === "pending" || contest.status === "active") && (
				<Button
					onClick={() => initiateAction("reject")}
					className="px-5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
				>
					Reject Contest
				</Button>
			)}

			{/* Show Request Info button when status is pending */}
			{contest.status === "pending" && (
				<Button
					onClick={() => initiateAction("request_info")}
					className="px-5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
				>
					Request Info
				</Button>
			)}

			{/* Show Suspend Contest button when status is active */}
			{contest.status === "active" && (
				<Button
					onClick={() => initiateAction("suspend")}
					className="px-5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
				>
					Suspend Contest
				</Button>
			)}
		</div>
	</div>
);

// Contest details component
const ContestDetails = ({ contest }: { contest: Contest }) => (
	<div className="mb-6">
		<DetailRow label="Contest Title" value={contest.basic.contestName} />
		<DetailRow label="Contest Type" value={contest.contestType} />
		<DetailRow label="Industry" value={contest.basic.industry} />
		<DetailRow label="Contest Description" value={contest.basic.description} />
		<DetailRow label="Contest Goal" value={contest.basic.rules} />

		{/* Requirements Section */}
		<h2 className="text-lg font-semibold mb-4 mt-8">Contest Requirements</h2>

		<DetailRow
			label="Who Can Join"
			value={contest.requirements.whoCanJoin || "Not specified"}
		/>
		<DetailRow
			label="Duration"
			value={contest.requirements.duration || "Not specified"}
		/>
		<DetailRow
			label="Video Type"
			value={contest.requirements.videoType || "Not specified"}
		/>
		<DetailRow
			label="Script"
			value={contest.requirements.script || "Not specified"}
		/>

		<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2 border-b border-gray-100">
			<div className="font-medium text-gray-500">Content Links</div>
			<div className="md:col-span-2">
				{contest.requirements.contentLinks.map((link, index) => (
					<a
						key={index}
						href={link}
						target="_blank"
						rel="noopener noreferrer"
						className="block hover:underline mb-1"
					>
						{link}
					</a>
				))}
			</div>
		</div>

		<DetailRow
			label="Brand Assets"
			value={contest.requirements.brandAssets || "Not specified"}
		/>

		<div>
			{/* Prize & Timeline Section */}
			<h2 className="text-lg font-semibold mb-4">Prize & Timeline</h2>

			<DetailRow
				label="Total Prize Pool"
				value={`$${contest.prizeTimeline.totalBudget.toLocaleString()}`}
			/>

			<DetailRow
				label="Number of Winners"
				value={`${contest.prizeTimeline.winnerCount} Winners`}
			/>

			<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2 border-b border-gray-100">
				<div className="font-medium text-gray-500">Prize Distribution</div>
				<div className="md:col-span-2">
					{contest.prizeTimeline.positions.map((position, index) => (
						<p key={index} className="mb-1">
							{`Position ${index + 1}: $${position.toLocaleString()}`}
						</p>
					))}
				</div>
			</div>
		</div>
	</div>
);

// Helper component for detail rows
const DetailRow = ({
	label,
	value,
}: {
	label: string;
	value: string | React.ReactNode;
}) => (
	<div className="grid grid-cols-1 md:grid-cols-3 mb-4 pb-2 border-b border-gray-100">
		<div className="font-medium text-gray-500">{label}</div>
		<div className="md:col-span-2">{value}</div>
	</div>
);

// Brand info card component
const BrandInfoCard = ({
	brandProfile,
	contest,
}: {
	brandProfile: BrandProfile | null;
	contest: Contest;
}) => (
	<div className="rounded-xl border border-[#FFBF9B] p-6 mb-6">
		<div className="flex items-center mb-4">
			{brandProfile?.logoUrl ? (
				<Image
					src={brandProfile.logoUrl}
					alt="Brand Logo"
					width={32}
					height={32}
					className="w-8 h-8 rounded-full mr-2"
				/>
			) : (
				<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
					<span className="text-[#101828] font-medium">
						{(brandProfile?.logoUrl || "B").charAt(0).toUpperCase()}
					</span>
				</div>
			)}
			<p className="font-semibold">{brandProfile?.brandName || ""}</p>
		</div>

		<div className="space-y-4">
			<div>
				<p className="text-gray-500 mb-1">Created On</p>
				<p className="text-black">
					{new Date(contest.createdAt).toLocaleDateString()}
				</p>
			</div>

			{contest.participants !== undefined && (
				<div>
					<p className="text-gray-500 mb-1">Current Participants</p>
					<p className="text-black">{contest.participants} Creators</p>
				</div>
			)}
		</div>

		{/* Contest incentives section */}
		{contest.incentives && contest.incentives.length > 0 && (
			<div className="rounded-xl bg-[#FFF4EE] mt-5 px-6 py-4">
				<h2 className="font-semibold text-lg mb-3">Incentives</h2>
				<div className="space-y-2">
					{contest.incentives.map((incentive, index) => (
						<div key={index}>
							<p className="text-black mb-1">{incentive.name}</p>
							<p className="text-gray-500 ">{incentive.description}</p>
						</div>
					))}
				</div>
			</div>
		)}
	</div>
);

// Action modal component
const ActionModal: React.FC<ActionModalProps> = ({
	actionType,
	actionMessage,
	setActionMessage,
	onCancel,
	onConfirm,
}) => {
	let title = "";
	let description = "";
	let placeholder = "";
	let buttonText = "";
	let buttonColor = "";
	let needsMessage = false;

	switch (actionType) {
		case "approve":
			title = "Approve Contest";
			description =
				"Once approved, the contest will be visible to creators and they can participate";
			buttonText = "Approve Contest";
			buttonColor = "bg-green-600 hover:bg-green-700";
			break;
		case "reject":
			title = "Reject Contest";
			description =
				"Please provide a reason for rejection. This feedback will be shared with the Brand.";
			placeholder = "Type Reason for Rejection";
			buttonText = "Reject Contest";
			buttonColor = "bg-red-600 hover:bg-red-700";
			needsMessage = true;
			break;
		case "request_info":
			title = "Request More Information";
			description =
				"Type in the Information you need from the Brand to approve their contest";
			placeholder = "Type Requests";
			buttonText = "Send Request";
			buttonColor = "bg-orange-500 hover:bg-orange-600";
			needsMessage = true;
			break;
		case "suspend":
			title = "Suspend Contest";
			description = "Please provide a reason for suspension.";
			placeholder = "Type Reason for Suspension";
			buttonText = "Suspend Contest";
			buttonColor = "bg-yellow-600 hover:bg-yellow-700";
			needsMessage = true;
			break;
		default:
			return null;
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 max-w-md w-full">
				<h2 className="text-xl font-semibold mb-4">{title}</h2>
				<p className="mb-4 text-gray-600">{description}</p>

				{needsMessage && (
					<textarea
						className="w-full border border-gray-300 rounded p-2 mb-4"
						rows={4}
						value={actionMessage}
						onChange={(e) => setActionMessage(e.target.value)}
						placeholder={placeholder}
					/>
				)}

				<div className="flex justify-end space-x-2">
					<button
						className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						className={`px-4 py-2 text-white rounded ${buttonColor} flex items-center`}
						onClick={onConfirm}
						disabled={needsMessage && !actionMessage.trim()}
					>
						{buttonText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ContestDetailsPage;
