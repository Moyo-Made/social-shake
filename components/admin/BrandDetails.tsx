"use client";

import React, { useState, useEffect } from "react";
import { BrandStatus } from "@/types/user";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Brand {
	email: string;
	userId: string;
	brandName: string;
	logoUrl?: string;
	status: BrandStatus;
	createdAt: string;
	updatedAt: string;
	industry?: string;
	phoneNumber?: string;
	address?: string;
	website?: string;
	socialMedia?: {
		facebook?: string;
		twitter?: string;
		instagram?: string;
		youtube?: string;
	};
}

const BrandDetailsPage: React.FC = () => {
	const params = useParams();
	const userId = params?.userId as string;

	const [brand, setBrand] = useState<Brand | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// For action modals
	const [showModal, setShowModal] = useState(false);
	const [actionType, setActionType] = useState<string>("");
	const [actionMessage, setActionMessage] = useState<string>("");

	// Fetch brand details
	useEffect(() => {
		const fetchBrandDetails = async () => {
			try {
				setLoading(true);

				// In a real app, you'd fetch from API
				// For this example, we'll get from localStorage (simulating navigation from the list)
				const storedBrand = localStorage.getItem("viewingBrand");

				if (storedBrand) {
					setBrand(JSON.parse(storedBrand));
				} else {
					// If not in localStorage, fetch from API
					const response = await fetch(`/api/admin/brand/${userId}`);

					if (!response.ok) {
						throw new Error("Failed to fetch brand details");
					}

					const data = await response.json();
					setBrand(data.brand);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
				console.error("Error fetching brand details:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchBrandDetails();
	}, [userId]);

	// Handle brand action (approve, reject, request info)
	const handleBrandAction = async () => {
		if (!brand || !actionType) return;

		try {
			const response = await fetch("/api/admin/brand-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					brandEmail: brand.email,
					userId: brand.userId,
					action: actionType,
					message: actionMessage,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to perform action");
			}

			// Update local brand state to reflect the action
			let newStatus: BrandStatus;

			switch (actionType) {
				case "approve":
					newStatus = "approved" as BrandStatus;
					break;
				case "reject":
					newStatus = "rejected" as BrandStatus;
					break;
				case "request_info":
					newStatus = "info_requested" as BrandStatus;
					break;
				case "suspend":
					newStatus = "suspended" as BrandStatus;
					break;
				default:
					newStatus = brand.status;
			}

			setBrand({
				...brand,
				status: newStatus,
			});

			// Reset action state
			setShowModal(false);
			setActionType("");
			setActionMessage("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error performing brand action:", err);
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
				title = "Approve Brand";
				description =
					"Once approved, the brand will receive a notification and can start creating projects and contests";
				buttonText = "Yes, Approve Brand";
				buttonColor = "bg-green-600 hover:bg-green-700";
				break;
			case "reject":
				title = "Reject Brand";
				description =
					"Please provide a reason for rejection. This feedback will be shared with the Brand.";
				placeholder = "Type Reason for Rejection";
				buttonText = "Reject Brand";
				buttonColor = "bg-red-600 hover:bg-red-700";
				needsMessage = true;
				break;
			case "request_info":
				title = "Request More Information";
				description =
					"Type in the Information you need from the Brand to go ahead with Verification";
				placeholder = "Type Requests";
				buttonText = "Send";
				buttonColor = "bg-orange-500 hover:bg-orange-600";
				needsMessage = true;
				break;
			case "suspend":
				title = "Suspend Brand";
				description =
					"Please provide a reason for suspension. This will temporarily disable the brand account.";
				placeholder = "Type Reason for Suspension";
				buttonText = "Suspend Brand";
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
							onClick={handleBrandAction}
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
	const StatusBadge = ({ status }: { status: BrandStatus }) => {
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

	if (error || !brand) {
		return (
			<div className="p-6 w-full mx-auto">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error || "Brand not found"}
				</div>
				<div className="mt-4">
					<Link href="/admin/manage-users/brands" className="text-blue-600 hover:underline">
						&larr; Back to Brands
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
					href="/admin/manage-users/brands"
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
					Back to Brands
				</Link>
			</div>

			{/* Main brand card */}
			<div className="overflow-hidden mb-6">
				{/* Brand header with logo, name, and actions */}
				<div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center rounded-xl border border-[#6670854D] space-x-52">
					<div className="flex items-center mb-4 md:mb-0">
						{brand.logoUrl ? (
							<Image
								src={brand.logoUrl}
								alt={`${brand.brandName} logo`}
								width={120}
								height={120}
								className="rounded-full mr-6"
							/>
						) : (
							<div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mr-6">
								<span className="text-white text-4xl font-bold">
									{brand.brandName.substring(0, 2).toUpperCase()}
								</span>
							</div>
						)}
						<div>
							<h1 className="text-xl font-semibold text-gray-900">
								{brand.brandName}
							</h1>
							<p className="text-gray-600 mt-px text-sm">{brand.email}</p>
							<div className="mt-2">
								<StatusBadge status={brand.status} />
							</div>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex flex-wrap gap-2 mt-4 md:mt-0">
						{/* Show Approve Brand button only when status is pending, rejected, or suspended */}
						{(brand.status === "pending" ||
							brand.status === "rejected" ||
							brand.status === "suspended") && (
							<Button
								className="px-5 bg-[#067647] text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
								onClick={() => {
									setActionType("approve");
									setShowModal(true);
								}}
							>
								{brand.status === "suspended"
									? "Unsuspend Brand"
									: "Approve Brand"}
							</Button>
						)}

						{/* Show Reject Brand button only when status is pending */}
						{brand.status === "pending" && (
							<Button
								className="px-6 bg-[#E61A1A] text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
								onClick={() => {
									setActionType("reject");
									setShowModal(true);
								}}
							>
								Reject Brand
							</Button>
						)}

						{/* Show Suspend Brand button only when status is approved */}
						{brand.status === "approved" && (
							<Button
								className="px-6 bg-[#E61A1A] text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
								onClick={() => {
									setActionType("suspend");
									setShowModal(true);
								}}
							>
								Suspend Brand
							</Button>
						)}

						{/* Show Request More Info button for pending or info_requested statuses */}
						{(brand.status === "pending" ||
							brand.status === "info_requested") && (
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

				{/* Brand information section */}
				<div className="w-fit rounded-xl border border-[#6670854D] p-6 mt-6">
					<h2 className="text-xl font-semibold mb-6">Brand Information</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
						<div>
							<p className="text-gray-500 mb-1">Phone Number</p>
							<p className="text-black">{brand.phoneNumber}</p>
						</div>

						<div>
							<p className="text-gray-500 mb-1">Company Email Address</p>
							<p className="text-black">{brand.email}</p>
						</div>

						<div>
							<p className="text-gray-500 mb-1">Company Address</p>
							<p className="text-black">{brand.address}</p>
						</div>

						<div>
							<p className="text-gray-500 mb-1">Company Website</p>
							<p className="text-black">
								{brand.website ? (
									<a
										href={brand.website}
										target="_blank"
										rel="noopener noreferrer"
										className=" hover:text-orange-600"
									>
										{brand.website}
									</a>
								) : (
									"www.social-shake.com"
								)}
							</p>
						</div>

						<div className="md:col-span-2 ">
							<p className="text-gray-500 mb-1">Social Media</p>
							<div className="flex gap-6">
								<div className="flex items-center gap-2">
									<Image
										src="/icons/ig.svg"
										alt="Instagram"
										width={15}
										height={15}
									/>
									<Link href="#" className="text-black text-sm hover:underline">
										{brand.socialMedia?.instagram}
									</Link>
								</div>
								<div className="flex items-center gap-2">
									<Image
										src="/icons/facebook.svg"
										alt="Facebook"
										width={15}
										height={15}
									/>
									<Link href="#" className="text-black text-sm hover:underline">
										{brand.socialMedia?.facebook}
									</Link>
								</div>
								<div className="flex items-center gap-2">
									<Image
										src="/icons/x.svg"
										alt="Twitter"
										width={15}
										height={15}
									/>
									<Link href="#" className="text-black text-sm hover:underline">
										{brand.socialMedia?.twitter}
									</Link>
								</div>
								<div className="flex items-center gap-2">
									<Image
										src="/icons/youtube.svg"
										alt="Youtube"
										width={15}
										height={15}
									/>
									<Link href="#" className="text-black text-sm hover:underline">
										{brand.socialMedia?.youtube}
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Action modals */}
			{renderActionModal()}
		</div>
	);
};

export default BrandDetailsPage;
