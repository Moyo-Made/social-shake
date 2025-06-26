"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface BrandProfileDropdownProps {
	brandProfile: {
		brandName?: string;
		logoUrl?: string;
		industry?: string;
		email?: string;
		subscriptionStatus?: string;
	};
	loading: boolean;
	dropdownPosition?: "header" | "sidenav";
	userId?: string; // Add userId prop for fetching subscription
}

interface SubscriptionStatus {
	id: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialStart: string | null;
	trialEnd: string | null;
	amount: number;
}

const BrandProfileDropdown: React.FC<BrandProfileDropdownProps> = ({
	brandProfile,
	loading,
	dropdownPosition = "header",
	userId,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
	const [subscriptionLoading, setSubscriptionLoading] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { logout, currentUser } = useAuth();
	const router = useRouter();
	
	// Use userId prop first, then fall back to user from AuthContext
	const currentUserId = currentUser?.uid || userId;

	// Function to call subscription API
	const callSubscriptionAPI = async (action: string) => {
		try {
			const response = await fetch("/api/subscription/manage", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action,
					userId: currentUserId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Something went wrong");
			}

			return data;
		} catch (err) {
			throw err;
		}
	};

	// Fetch subscription status
	const fetchSubscriptionStatus = async () => {
		if (!currentUserId) {
			console.log("No userId provided, skipping subscription fetch");
			return;
		}
		
		try {
			console.log("Fetching subscription for userId:", currentUserId);
			setSubscriptionLoading(true);
			const data = await callSubscriptionAPI("get_status");
			console.log("Subscription data received:", data);
			setSubscription(data.subscription);
		} catch (err) {
			console.error("Failed to fetch subscription:", err);
		} finally {
			setSubscriptionLoading(false);
		}
	};

	// Fetch subscription when component mounts or userId changes
	useEffect(() => {
		if (currentUserId) {
			console.log("Component mounted/userId changed, fetching subscription");
			fetchSubscriptionStatus();
		} else {
			console.log("No userId available for subscription fetch");
		}
	}, [currentUserId]);

	// Function to get brand initials
	const getBrandInitials = () => {
		if (!brandProfile?.brandName) return "BR";

		const words = brandProfile.brandName.split(" ");
		if (words.length === 1) {
			return words[0].substring(0, 2).toUpperCase();
		}
		return (words[0][0] + words[1][0]).toUpperCase();
	};

	const getSubscriptionStatusDisplay = (status?: string) => {
		if (!status) return null;

		const statusConfig: {
			[key: string]: { label: string; className: string };
		} = {
			active: {
				label: "Active",
				className:
					"px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full",
			},
			trialing: {
				label: "Trial",
				className:
					"px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full",
			},
			canceled: {
				label: "Canceled",
				className:
					"px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full",
			},
			past_due: {
				label: "Past Due",
				className:
					"px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full",
			},
		};

		return (
			statusConfig[status.toLowerCase()] || {
				label: status.charAt(0).toUpperCase() + status.slice(1),
				className:
					"px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full",
			}
		);
	};

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Handle logout
	const handleLogout = async () => {
		try {
			await logout();
			router.push("/brand/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	// Use subscription status from API if available, otherwise fall back to prop
	const currentSubscriptionStatus = subscription?.status || brandProfile?.subscriptionStatus;

	return (
		<div className="relative" ref={dropdownRef}>
			<div
				className={`flex items-center cursor-pointer ${
					dropdownPosition === "header"
						? "gap-1"
						: "gap-3 justify-between w-full"
				}`}
				onClick={() => setIsOpen(!isOpen)}
			>
				{dropdownPosition === "sidenav" && (
					<div className="flex items-center gap-2">
						<div className="h-10 w-10 overflow-hidden rounded-full">
							{loading ? (
								<div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
							) : brandProfile?.logoUrl ? (
								<Image
									src={brandProfile.logoUrl}
									alt={brandProfile.brandName || "Brand Logo"}
									className="w-full h-full object-cover"
									width={32}
									height={32}
								/>
							) : (
								<div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
									{getBrandInitials()}
								</div>
							)}
						</div>
						<div>
							<h2 className="text-base font-bold">
								{loading
									? "Loading..."
									: brandProfile?.brandName || "Complete Your Profile"}
							</h2>
							{brandProfile?.email && (
								<p className="text-xs text-gray-400">{brandProfile.email}</p>
							)}
						</div>
					</div>
				)}

				{dropdownPosition === "header" && (
					<div className="h-8 w-8 first-letter:overflow-hidden rounded-full flex items-center justify-center">
						{loading ? (
							<div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
						) : brandProfile?.logoUrl ? (
							<Image
								src={brandProfile.logoUrl}
								alt={brandProfile.brandName || "Brand Logo"}
								className="object-cover w-full h-full"
								width={32}
								height={32}
								style={{ objectFit: "cover" }}
							/>
						) : (
							<div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
								{getBrandInitials()}
							</div>
						)}
					</div>
				)}

				<ChevronDown
					className={`h-4 w-4 ${
						dropdownPosition === "header" ? "text-gray-600" : "text-gray-300"
					} transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</div>

			{isOpen && (
				<div
					className={`absolute z-50 ${
						dropdownPosition === "header"
							? "right-0 mt-2 w-56 bg-white shadow-lg rounded-lg"
							: "left-0 bottom-full w-full bg-[#222] shadow-lg rounded-lg border border-gray-700"
					}`}
				>
					<div
						className={`flex justify-between px-4 py-3 border-b ${
							dropdownPosition === "header"
								? "border-gray-200"
								: "border-gray-700"
						}`}
					>
						<div>

						
						<p
							className={`text-sm font-medium ${
								dropdownPosition === "header" ? "text-gray-800" : "text-white"
							}`}
						>
							{brandProfile?.brandName || "Complete Your Profile"}
						</p>
						<p
							className={`text-xs capitalize ${
								dropdownPosition === "header"
									? "text-gray-500"
									: "text-gray-400"
							}`}
						>
							{brandProfile?.industry
								?.split("-")
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(" & ") || "Update your profile"}
						</p>
						</div>

						{/* Show subscription status with loading state */}
						<div className="mt-2">
							{subscriptionLoading ? (
								<div className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full animate-pulse">
									Loading subscription...
								</div>
							) : currentSubscriptionStatus ? (
								<span
									className={
										getSubscriptionStatusDisplay(currentSubscriptionStatus)
											?.className
									}
								>
									{
										getSubscriptionStatusDisplay(currentSubscriptionStatus)
											?.label
									}
								</span>
							) : currentUserId ? (
								<div className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
									No subscription found
								</div>
							) : (
								<div className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
									No user ID provided
								</div>
							)}
						</div>
					</div>

					<div className="py-1">
						<Link
							href="/brand/dashboard/settings"
							className={`flex items-center px-4 py-2 text-sm ${
								dropdownPosition === "header"
									? "text-gray-700 hover:bg-gray-100"
									: "text-gray-200 hover:bg-gray-700"
							}`}
							onClick={() => setIsOpen(false)}
						>
							<Settings className="mr-2 h-4 w-4" />
							Account Settings
						</Link>

						<button
							onClick={handleLogout}
							className={`flex items-center w-full text-left px-4 py-2 text-sm ${
								dropdownPosition === "header"
									? "text-red-600 hover:bg-gray-100"
									: "text-red-400 hover:bg-gray-700"
							}`}
						>
							<LogOut className="mr-2 h-4 w-4" />
							Logout
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default BrandProfileDropdown;