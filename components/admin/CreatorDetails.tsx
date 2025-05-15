"use client";

import React, { useState, useEffect } from "react";
import { CreatorStatus } from "@/types/user";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Creator } from "@/types/creators";

const CreatorDetailsPage: React.FC = () => {
	const params = useParams();
	const userId = params?.userId as string;

	const [creator, setCreator] = useState<Creator | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// For action modals
	const [showModal, setShowModal] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");

	const getProfilePictureUrl = () => {
		if (!creator) return null;

		// First try the Tiktok profile picture if available
		if (creator.creatorProfileData?.tiktokAvatarUrl) {
			return creator.creatorProfileData?.tiktokAvatarUrl;
		}

		// Check for logoUrl which is already being used
		if (creator.logoUrl) {
			return creator.logoUrl;
		}

		return null;
	};

	// 2. Add a function to get display name similar to CreatorProfileDropdown's getDisplayName
	const getDisplayName = () => {
		if (!creator) return "";

		// Check the creator name field which is already being used
		if (creator.creator) {
			return String(creator.creator);
		}

		// Try username
		if (creator.username) {
			return String(creator.username);
		}

		// Check displayName field
		if (creator.displayName) {
			return String(creator.displayName);
		}

		// Email as fallback
		if (creator.email) {
			const emailParts = creator.email.split("@");
			if (emailParts.length > 0) {
				return String(emailParts[0]);
			}
		}

		return "Creator";
	};

	const profilePicture = getProfilePictureUrl();

	// Fetch creator details
	// Fixed useEffect code for fetchCreatorDetails
	useEffect(() => {
		// When fetching creator details, find the specific creator by userId
		const fetchCreatorDetails = async () => {
			try {
				setLoading(true);

				// We'll use the raw userId from params to make the API call
				const encodedUserId = encodeURIComponent(userId);

				const response = await fetch(
					`/api/admin/creator-approval?userId=${encodedUserId}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch creator details");
				}

				const data = await response.json();

				// Check if creators array exists and contains at least one creator
				if (data.creators && data.creators.length > 0) {
					// Find the creator by comparing userId directly without additional processing
					const foundCreator = data.creators.find(
						(c: { userId: string }) => c.userId === userId
					);

					if (foundCreator) {
						setCreator(foundCreator);
					} else {
						// If no exact match, try comparing normalized userId values
						const normalizedUserId = userId.replace(/%3A/g, ":");
						const foundByNormalized = data.creators.find(
							(c: { userId: string }) => c.userId === normalizedUserId
						);

						if (foundByNormalized) {
							setCreator(foundByNormalized);
						} else {
							console.error("User ID mismatch. Looking for:", userId);
							console.error(
								"Available user IDs:",
								data.creators.map((c: { userId: string }) => c.userId)
							);
							setError("Creator not found with the specified userId");
						}
					}
				} else {
					setError("No creators found");
				}
			} catch (err) {
				console.error("Error fetching creator details:", err);
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};
		if (userId) {
			fetchCreatorDetails();
		}
	}, [userId]);

	// Handle creator action (approve, reject, request info)
	const handleCreatorAction = async () => {
		if (!creator || !actionType) return;

		try {
			const response = await fetch("/api/admin/creator-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: creator.userId,
					verificationId: creator.verificationId,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Update local creator state to reflect the action
			let newStatus: CreatorStatus;

			switch (actionType) {
				case "approve":
					newStatus = "approved" as CreatorStatus;
					break;
				case "reject":
					newStatus = "rejected" as CreatorStatus;
					break;
				case "request_info":
					newStatus = "info_requested" as CreatorStatus;
					break;
				case "suspend":
					newStatus = "suspended" as CreatorStatus;
					break;
				default:
					newStatus = creator.status as CreatorStatus;
			}

			setCreator({
				...creator,
				status: newStatus,
			});

			// Reset action state
			setShowModal(false);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing creator action:", err);
		}
	};

	// Render action modal
	const renderActionModal = () => {
		if (!showModal) return null;

		let title = "";
		let description = "";
		let placeholder = "";
		let buttonText = "";
		let buttonColor = "";
		let needsMessage = false;

		switch (actionType) {
			case "approve":
				title = "Approve Creator";
				description =
					"Once approved, the creator will receive a notification and can start creating content";
				buttonText = "Yes, Approve Creator";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "reject":
				title = "Reject Creator";
				description =
					"Please provide a reason for rejection. This feedback will be shared with the Creator.";
				placeholder = "Type Reason for Rejection";
				buttonText = "Reject Creator";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			case "request_info":
				title = "Request More Information";
				description =
					"Type in the Information you need from the Creator to go ahead with Verification";
				placeholder = "Type Requests";
				buttonText = "Send";
				buttonColor = "bg-orange-500 hover:bg-orange-600";
				needsMessage = true;
				break;
			case "suspend":
				title = "Suspend Creator";
				description =
					"Please provide a reason for suspension. This will temporarily disable the creator account.";
				placeholder = "Type Reason for Suspension";
				buttonText = "Suspend Creator";
				buttonColor = "bg-gray-600 hover:bg-gray-700";
				needsMessage = true;
				break;
			default:
				return null;
		}

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-xl p-6 max-w-md w-full">
					<h2 className="text-xl font-semibold mb-4">{title}</h2>
					<p className="mb-4 text-gray-600">{description}</p>

					{needsMessage && (
						<Input
							className="w-full border border-gray-300 rounded p-2 mb-4"
							value={actionMessage}
							onChange={(e) => setActionMessage(e.target.value)}
							placeholder={placeholder}
						/>
					)}

					<div className="flex justify-end space-x-2">
						<button
							className="px-4 py-2 text-[#667085]"
							onClick={() => {
								setShowModal(false);
								setActionType("");
								setActionMessage("");
							}}
						>
							Cancel
						</button>
						<button
							className={`px-4 py-2 text-white text-sm rounded-lg ${buttonColor} flex items-center`}
							onClick={handleCreatorAction}
							disabled={needsMessage && !actionMessage.trim()}
						>
							{buttonText}
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: CreatorStatus }) => {
		const statusConfig = {
			pending: {
				color: "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]",
				text: "• Pending",
			},
			approved: {
				color: "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647]",
				text: "✓ Verified",
			},
			rejected: {
				color: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]",
				text: "• Rejected",
			},
			suspended: {
				color: "bg-[#FFE5FB] border border-[#FC52E4] text-[#FC52E4]",
				text: "• Suspended",
			},
			info_requested: {
				color: "bg-blue-100 text-blue-800",
				text: "• Info Requested",
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

	if (loading) {
		return (
			<div className="flex justify-center items-center py-20">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
			</div>
		);
	}

	if (error || !creator) {
		return (
			<div className="p-6 w-full mx-auto">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error || "Creator not found"}
				</div>
				<div className="mt-4">
					<Link
						href="/admin/manage-users/creators"
						className="text-orange-600 hover:underline"
					>
						&larr; Back to Creators
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white p-6 w-full mx-auto">
			{/* Back button */}
			<div className="mb-4">
				<Link
					href="/admin/manage-users/creators"
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
					Back to Creators
				</Link>
			</div>

			{/* Main creator card */}
			<div className="overflow-hidden mb-6">
				{/* Creator header with avatar, name, and actions */}
				<div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center rounded-xl border border-[#6670854D] space-x-52">
					<div className="flex items-center mb-4 md:mb-0">
						{profilePicture ? (
							<Image
								src={profilePicture}
								alt={`${getDisplayName()} profile`}
								width={100}
								height={100}
								className="w-24 h-24 object-cover rounded-full mr-6"
							/>
						) : (
							<div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mr-6">
								<span className="text-white text-4xl font-bold">
									{getDisplayName().substring(0, 2).toUpperCase()}
								</span>
							</div>
						)}
						<div>
							<h1 className="text-xl font-semibold ">{creator.creatorProfileData?.tiktokDisplayName || creator.creator}</h1>
							<p className=" text-base">@{creator.creatorProfileData?.tiktokUsername || creator.username}</p>
							<p className="text-gray-600 mt-px text-sm">{creator.email}</p>
						</div>
					</div>

					{/* Action buttons */}
					<div>
						<div className="flex justify-end mb-2">
							<StatusBadge status={creator.status as CreatorStatus} />
						</div>
						<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
							{/* Show Approve Creator button only when status is pending, rejected, or suspended */}
							{(creator.status === "pending" ||
								creator.status === "rejected" ||
								creator.status === "suspended") && (
								<Button
									className="px-5 bg-[#067647] text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
									onClick={() => {
										setActionType("approve");
										setShowModal(true);
									}}
								>
									{creator.status === "suspended"
										? "Unsuspend Creator"
										: "Approve Creator"}
								</Button>
							)}

							{/* Show Reject Creator button only when status is pending */}
							{creator.status === "pending" && (
								<Button
									className="px-6 bg-[#E61A1A] text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
									onClick={() => {
										setActionType("reject");
										setShowModal(true);
									}}
								>
									Reject Creator
								</Button>
							)}

							{/* Show Suspend Creator button only when status is approved */}
							{creator.status === "approved" && (
								<Button
									className="px-6 bg-[#E61A1A] text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
									onClick={() => {
										setActionType("suspend");
										setShowModal(true);
									}}
								>
									Suspend Creator
								</Button>
							)}

							{/* Show Request More Info button for pending or info_requested statuses */}
							{(creator.status === "pending" ||
								creator.status === "info_requested") && (
								<button
									className="px-6 bg-white border border-[#6670854D] text-[#667085] text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200"
									onClick={() => {
										setActionType("request_info");
										setShowModal(true);
									}}
								>
									Request More Info
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="flex flex-col md:flex-row justify-between items-start mt-6 gap-6">
					{/* Creator information section */}
					<div className="w-fit rounded-xl border border-[#6670854D] p-6 mt-6">
						<h2 className="text-xl font-semibold mb-4">Creator Information</h2>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
							<div>
								<p className="text-gray-500 mb-1">First Name</p>
								<p className="text-black">
									{creator.firstName || creator.creator}
								</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Last Name</p>
								<p className="text-black">{creator.lastName}</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Username</p>
								<p className="text-black">
									@{creator.creatorProfileData?.tiktokUsername || creator.username }{" "}
								</p>
							</div>

							<div className="md:col-span-3">
								<p className="text-gray-500 mb-1">Creator Bio</p>
								<p className="text-black">{creator.bio}</p>
							</div>
							{/* //placeholder */}
							<div>
								<p className="text-gray-500 mb-1">Phone Number</p>
								<p className="text-black">08100566962</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Creator Country</p>
								<p className="text-black">{creator.country}</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Date of Birth</p>
								<p className="text-black text-sm">
									{creator.dateOfBirth} (
									{new Date().getFullYear() -
										new Date(creator.dateOfBirth).getFullYear()}{" "}
									years)
								</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Gender</p>
								<p className="text-black">{creator.gender}</p>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Ethnicity</p>
								<p className="text-black">
									{creator.ethnicity || "Not specified"}
								</p>
							</div>

							<div className="">
								<p className="text-gray-500 mb-1">Tiktok Profile</p>
								<Link
									href={creator.socialMedia.tiktok || ""}
									className="text-black hover:underline"
								>
									View Profile
								</Link>
							</div>

							<div>
								<p className="text-gray-500 mb-1">Languages</p>
								{/* Placeholder */}
								<p className="text-black">English, Spanish </p>
							</div>

							<div className="md:col-span-2">
								<p className="text-gray-500 mb-1">Types of content</p>
								<p className="text-black">{creator.contentTypes}</p>
							</div>

							<div className="md:col-span-3">
								<p className="text-gray-500 mb-1">Social Media</p>
								<div className="flex flex-wrap gap-6">
									{creator.socialMedia?.instagram && (
										<div className="flex items-center gap-2">
											<Image
												src="/icons/ig.svg"
												alt="Instagram"
												width={15}
												height={15}
											/>
											@{creator.socialMedia.instagram}
										</div>
									)}
									{creator.socialMedia?.facebook && (
										<div className="flex items-center gap-2">
											<Image
												src="/icons/facebook.svg"
												alt="Facebook"
												width={15}
												height={15}
											/>
											@{creator.socialMedia.facebook}
										</div>
									)}
									{creator.socialMedia?.twitter && (
										<div className="flex items-center gap-2">
											<Image
												src="/icons/x.svg"
												alt="Twitter/X"
												width={15}
												height={15}
											/>

											{creator.socialMedia.twitter}
										</div>
									)}

									{creator.socialMedia?.youtube && (
										<div className="flex items-center gap-2">
											<Image
												src="/icons/youtube.svg"
												alt="YouTube"
												width={15}
												height={15}
											/>
											@{creator.socialMedia.youtube}
										</div>
									)}
								</div>

								{/* Links of best tiktok */}
								<div className="md:col-span-1">
									<p className="text-gray-500 mb-1 mt-4">Best TikTok Links</p>
									{creator.contentLinks?.map((link, index) => (
										<Link
											key={index}
											href={link}
											target="_blank"
											rel="noopener noreferrer"
											className="text-orange-600 hover:underline block"
										>
											{link}
										</Link>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Content metrics section */}
					<div className="w-1/2 flex flex-col rounded-xl border border-[#6670854D] p-6 mt-6">
						<h2 className="text-xl font-semibold mb-5">Verification</h2>

						<div>
							<p className="text-gray-500 mb-2">Verification Video</p>
							{creator.verificationVideoUrl && (
								<video
									controls
									className="w-full h-48 max-w-lg "
									src={creator.verificationVideoUrl}
									preload="metadata"
								>
									Your browser does not support the video tag.
								</video>
							)}
						</div>

						<div className="mt-5">
							<p className="text-gray-500 mb-2">Verification ID</p>
							<div
								className="text-gray-500 border border-gray-300 rounded-lg py-2 px-4 w-fit cursor-pointer hover:bg-gray-100 transition"
								onClick={() => setIsModalOpen(true)}
							>
								<p className="font-medium text-orange-600">
									View Verification Document
								</p>
							</div>

							{/* Modal */}
							{isModalOpen && (
								<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
									<div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
										<button
											className="text-orange-500 mb-2 float-right font-bold"
											onClick={() => setIsModalOpen(false)}
										>
											✕
										</button>
										<Image
											src={creator.verifiableIDUrl || ""}
											width={500}
											height={500}
											alt="Verification ID"
											className="w-full h-auto rounded"
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			{/* Action modals */}
			{renderActionModal()}
		</div>
	);
};

export default CreatorDetailsPage;
