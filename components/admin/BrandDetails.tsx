"use client";

import React, { useState, useEffect } from "react";
import { BrandStatus } from "@/types/user";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

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
							onClick={() => {
								setShowModal(false);
								setActionType("");
								setActionMessage("");
							}}
						>
							Cancel
						</button>
						<button
							className={`px-4 py-2 text-white rounded ${buttonColor} flex items-center`}
							onClick={handleBrandAction}
							disabled={needsMessage && !actionMessage.trim()}
						>
							{buttonText}
							{actionType === "request_info" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 ml-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
								</svg>
							)}
							{(actionType === "approve" ||
								actionType === "reject" ||
								actionType === "suspend") && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 ml-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Status badge component
	const StatusBadge = ({ status }: { status: BrandStatus }) => {
		const statusConfig = {
			pending: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
			approved: { color: "bg-green-100 text-green-800", text: "Approved" },
			rejected: { color: "bg-red-100 text-red-800", text: "Rejected" },
			suspended: { color: "bg-gray-100 text-gray-800", text: "Suspended" },
			info_requested: {
				color: "bg-blue-100 text-blue-800",
				text: "Info Requested",
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
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (error || !brand) {
		return (
			<div className="p-6 max-w-4xl mx-auto">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error || "Brand not found"}
				</div>
				<div className="mt-4">
					<Link
						href="/admin/dashboard"
						className="text-blue-600 hover:underline"
					>
						&larr; Back to Brand Management
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-4xl mx-auto">
			{/* Back button and header */}
			<Link
				href="/admin/dashboard"
				className="text-gray-600 hover:text-gray-800 flex items-center mb-6"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5 mr-1"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
						clipRule="evenodd"
					/>
				</svg>
				Back to Brand Management
			</Link>

			<div className="bg-white rounded-lg shadow-md overflow-hidden">
				{/* Brand header with logo and status */}
				<div className="flex justify-between items-center p-6 border-b">
					<div className="flex items-center">
						{brand.logoUrl ? (
							<Image
								src={brand.logoUrl}
								alt={`${brand.brandName} logo`}
								width={64}
								height={64}
								className="rounded-lg mr-4"
							/>
						) : (
							<div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
								<span className="text-gray-500 text-xl font-bold">
									{brand.brandName.substring(0, 2).toUpperCase()}
								</span>
							</div>
						)}
						<div>
							<h1 className="text-2xl font-bold">{brand.brandName}</h1>
							<div className="mt-2">
								<StatusBadge status={brand.status} />
							</div>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex space-x-2">
						{/* Approve button - show for pending, info_requested, rejected, and suspended statuses */}
						{(brand.status === "pending" ||
							brand.status === "info_requested" ||
							brand.status === "rejected" ||
							brand.status === "suspended") && (
							<button
								className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
								onClick={() => {
									setActionType("approve");
									setShowModal(true);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 mr-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								{brand.status === "rejected" || brand.status === "suspended"
									? "Reactivate"
									: "Approve"}
							</button>
						)}

						{/* Reject button - show for pending, info_requested, and approved statuses */}
						{(brand.status === "pending" ||
							brand.status === "info_requested" ||
							brand.status === "approved") && (
							<button
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
								onClick={() => {
									setActionType("reject");
									setShowModal(true);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 mr-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
								Reject
							</button>
						)}

						{/* Request Info button - show for pending, info_requested, and approved statuses */}
						{(brand.status === "pending" ||
							brand.status === "info_requested" ||
							brand.status === "approved") && (
							<button
								className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center"
								onClick={() => {
									setActionType("request_info");
									setShowModal(true);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 mr-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
										clipRule="evenodd"
									/>
								</svg>
								Request Info
							</button>
						)}

						{/* Suspend button - show only for approved status */}
						{brand.status === "approved" && (
							<button
								className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
								onClick={() => {
									setActionType("suspend");
									setShowModal(true);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 mr-2"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M13 10a1 1 0 011 1v3a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h6zm-1-7a1 1 0 00-1 1v3a1 1 0 001 1h.01a1 1 0 100-2H12V5h.01a1 1 0 100-2H12zm-6 7a1 1 0 011 1v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3a1 1 0 011-1h3zm-1-7a1 1 0 00-1 1v3a1 1 0 001 1h.01a1 1 0 100-2H6V5h.01a1 1 0 100-2H6z"
										clipRule="evenodd"
									/>
								</svg>
								Suspend
							</button>
						)}
					</div>

					{/* Brand details */}
					<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h2 className="text-lg font-semibold mb-4">Brand Information</h2>
							<div className="space-y-4">
								<div>
									<p className="text-sm text-gray-500">Industry</p>
									<p className="font-medium">
										{brand.industry || "Not specified"}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Phone Number</p>
									<p className="font-medium">
										{brand.phoneNumber || "Not specified"}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Website</p>
									<p className="font-medium">
										{brand.website ? (
											<a
												href={brand.website}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:underline"
											>
												{brand.website}
											</a>
										) : (
											"Not specified"
										)}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Address</p>
									<p className="font-medium">
										{brand.address || "Not specified"}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Registration Date</p>
									<p className="font-medium">
										{new Date(brand.createdAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Social Media Links */}
					{brand.socialMedia &&
						Object.keys(brand.socialMedia).some(
							(key) =>
								brand.socialMedia?.[key as keyof typeof brand.socialMedia]
						) && (
							<div className="p-6 border-t">
								<h2 className="text-lg font-semibold mb-4">Social Media</h2>
								<div className="flex space-x-4">
									{brand.socialMedia.facebook && (
										<a
											href={brand.socialMedia.facebook}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:text-blue-800"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
											</svg>
										</a>
									)}
									{brand.socialMedia.twitter && (
										<a
											href={brand.socialMedia.twitter}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-400 hover:text-blue-600"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
											</svg>
										</a>
									)}
									{brand.socialMedia.instagram && (
										<a
											href={brand.socialMedia.instagram}
											target="_blank"
											rel="noopener noreferrer"
											className="text-pink-600 hover:text-pink-800"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
											</svg>
										</a>
									)}
									{brand.socialMedia.youtube && (
										<a
											href={brand.socialMedia.youtube}
											target="_blank"
											rel="noopener noreferrer"
											className="text-red-600 hover:text-red-800"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
											</svg>
										</a>
									)}
								</div>
							</div>
						)}
				</div>
			</div>
			{/* Action modals */}
			{renderActionModal()}
		</div>
	);
};

export default BrandDetailsPage;
