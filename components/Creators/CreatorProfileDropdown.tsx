"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreatorProfile, useCreatorProfile } from "@/hooks/useCreatorProfile";
import { toast } from "sonner";
import { MdIncompleteCircle } from "react-icons/md";

interface CreatorProfileDropdownProps {
	dropdownPosition?: "header" | "sidenav";
	creatorProfile: CreatorProfile;
}

const CreatorProfileDropdown: React.FC<CreatorProfileDropdownProps> = ({
	dropdownPosition = "header",
}) => {
	// Use the hook with complete profile data access
	const { creatorProfile, loading, error, refreshCreatorProfile } =
		useCreatorProfile("view");

	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { logout, currentUser } = useAuth();
	const router = useRouter();
	const [localTikTokStatus, setLocalTikTokStatus] = useState<boolean | null>(
		null
	);

	// Function to handle connecting to TikTok
	const handleConnectTikTok = () => {
		if (!currentUser?.uid) {
			toast.error("You need to be logged in to connect your TikTok account");
			return;
		}

		// Close the dropdown
		setIsOpen(false);

		// Redirect to the TikTok connect route with the user ID
		window.location.href = `/api/auth/tiktok/connect?user_id=${currentUser.uid}`;
	};

	// Function to handle disconnecting TikTok
	const handleDisconnectTikTok = async () => {
		if (!currentUser?.uid) {
			toast.error("You need to be logged in to disconnect your TikTok account");
			return;
		}

		try {
			// Call API endpoint to disconnect TikTok
			const response = await fetch(`/api/auth/tiktok/disconnect`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId: currentUser.uid }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to disconnect TikTok account");
			}

			// Immediately update local state
			setLocalTikTokStatus(false);

			// Then refresh profile data
			await refreshCreatorProfile();

			// Refresh creator profile to update UI
			await refreshCreatorProfile();

			// Show success toast
			toast.success("TikTok account successfully disconnected");

			// Close dropdown
			setIsOpen(false);
		} catch (error) {
			console.error("Error disconnecting TikTok:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to disconnect TikTok account"
			);
		}
	};

	// Function to get creator initials from whatever data is available
	const getCreatorInitials = () => {
		// First try to use name if available
		if (creatorProfile?.displayUsername) {
			const words = creatorProfile.displayUsername.split(" ");
			if (words.length === 1) {
				return words[0].substring(0, 2).toUpperCase();
			}
			return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
		}

		// Then try email
		if (creatorProfile?.email) {
			// Extract first letter of email username
			const emailParts = creatorProfile.email.split("@");
			if (emailParts?.length > 0) {
				return emailParts[0].substring(0, 2).toUpperCase();
			}
		}

		// If no name or email but we have a bio, use first letters of first two words
		if (creatorProfile?.bio) {
			const words = creatorProfile.bio.split(" ");
			if (words.length === 1) {
				return words[0].substring(0, 2).toUpperCase();
			}
			return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
		}

		// Default initials
		return "CR";
	};

	// Get display name from available profile data
	const getDisplayName = () => {
		// First try verification data if available
		if (creatorProfile?.profileData?.fullName) {
			return String(creatorProfile.profileData.fullName);
		}

		if (creatorProfile?.tiktokUsername) {
			return String(creatorProfile.tiktokUsername);
		}

		// Then check displayUsername
		if (creatorProfile?.displayUsername) {
			return String(creatorProfile.displayUsername);
		}

		if (creatorProfile?.username) {
			return String(creatorProfile.username);
		}

		if (creatorProfile?.displayName) {
			return String(creatorProfile.displayName);
		}

		// Check email as fallback
		if (creatorProfile?.email) {
			// Extract username part of email
			const emailParts = creatorProfile.email.split("@");
			if (emailParts.length > 0) {
				return String(emailParts[0]);
			}
		}

		return "Complete Your Profile" as string;
	};

	const needsProfileCompletion = () => {
		const status = creatorProfile?.status || creatorProfile?.verificationStatus;

		// If no status at all, definitely needs completion
		if (!status) return true;

		// If status exists but is not submitted/pending/approved, needs completion
		const completedStatuses = ["submitted", "pending", "approved"];
		return !completedStatuses.includes(status.toLowerCase());
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
			router.push("/creator/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	// Get the content type label for display - prioritize profile data from verification
	const getContentTypeLabel = () => {
		// First check if we have contentType in profileData
		if (creatorProfile?.profileData?.contentType) {
			return creatorProfile.profileData.contentType as string;
		}

		// Then check if we have content categories
		if (
			creatorProfile?.profileData?.contentCategories &&
			Array.isArray(creatorProfile.profileData.contentCategories) &&
			creatorProfile.profileData.contentCategories.length > 0
		) {
			return (creatorProfile.profileData.contentCategories as string[])[0];
		}

		// Fallback to contentTypes array
		if (
			creatorProfile?.contentTypes &&
			creatorProfile.contentTypes.length > 0
		) {
			return creatorProfile.contentTypes[0];
		}

		return "Content Creator";
	};

	// Get verification status badge info
	const getVerificationStatusInfo = () => {
		// Get status from verification data first, then fall back to profile data
		const status = creatorProfile?.status || creatorProfile?.verificationStatus;

		if (!status) return null;

		const statusColors = {
			pending: "bg-yellow-100 text-yellow-800",
			approved: "bg-green-100 text-green-800",
			rejected: "bg-red-100 text-red-800",
			submitted: "bg-blue-100 text-blue-800",
		};

		const statusColor =
			statusColors[status.toLowerCase() as keyof typeof statusColors] ||
			"bg-gray-100 text-gray-800";

		return {
			label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
			color: statusColor,
		};
	};

	// Function to get profile picture from either source
	const getProfilePictureUrl = () => {
		if (!creatorProfile) return null;

		// First try the Tiktok profile picture if available

		// Then check for logoUrl which is used in AccountSettings
		if (creatorProfile.logoUrl) {
			return creatorProfile.logoUrl as string;
		}

		if (creatorProfile.tiktokAvatarUrl) {
			return creatorProfile.tiktokAvatarUrl as string;
		}

		if (creatorProfile.profilePictureUrl) {
			return creatorProfile.profilePictureUrl;
		}

		// Then check if it's in the profileData
		if (creatorProfile.profileData?.profilePictureUrl) {
			return creatorProfile.profileData.profilePictureUrl as string;
		}

		// Finally check if logoUrl is in profileData
		if (creatorProfile.profileData?.logoUrl) {
			return creatorProfile.profileData.logoUrl as string;
		}

		return null;
	};

	// Improved TikTok connection status check - checks multiple possible locations
	const hasTikTokConnected = () => {
		// If no profile data at all, definitely not connected
		if (!creatorProfile) return false;

		// Most reliable approach: check if we have explicit false values
		if (creatorProfile.tiktokConnected === false) return false;
		if (creatorProfile.profileData?.tiktokConnected === false) return false;

		// Only consider connected if we have BOTH an explicit connected flag AND TikTok data
		const hasExplicitFlag =
			creatorProfile.tiktokConnected === true ||
			creatorProfile.profileData?.tiktokConnected === true;

		const hasTikTokData =
			Boolean(creatorProfile.tiktokId) &&
			Boolean(creatorProfile.tiktokUsername);

		return hasExplicitFlag && hasTikTokData;
	};

	useEffect(() => {
		if (localTikTokStatus === null && creatorProfile) {
			// Initialize local state from fetched data
			setLocalTikTokStatus(hasTikTokConnected());
		}
	}, [creatorProfile]);

	// Run a profile refresh on mount and when the dropdown is opened
	// This ensures we always have the latest connection status
	useEffect(() => {
		refreshCreatorProfile();
	}, []);

	if (error) {
		return (
			<div className="text-red-500 text-sm flex items-center gap-2">
				<span>Error loading profile</span>
				<button
					onClick={() => refreshCreatorProfile()}
					className="text-blue-500 underline"
				>
					Reload
				</button>
			</div>
		);
	}

	const profilePicture = getProfilePictureUrl();
	const verificationStatus = getVerificationStatusInfo();
	const isTikTokConnected = hasTikTokConnected();

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
							) : profilePicture ? (
								<Image
									src={profilePicture}
									alt={getDisplayName()}
									className="w-full h-full object-cover"
									width={40}
									height={40}
								/>
							) : (
								<div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
									{getCreatorInitials()}
								</div>
							)}
						</div>
						<div>
							<h2 className="text-base font-bold">
								{loading ? "Loading..." : getDisplayName()}
							</h2>
							{creatorProfile?.email && (
								<p className="text-xs text-gray-400">{creatorProfile.email}</p>
							)}
						</div>
					</div>
				)}

				{dropdownPosition === "header" && (
					<>
						{loading ? (
							<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
						) : profilePicture ? (
							<div className="w-8 h-8 overflow-hidden rounded-full flex items-center justify-center">
								<Image
									src={profilePicture}
									alt={getDisplayName()}
									width={32}
									height={32}
									className="w-full h-full object-cover"
									style={{ objectFit: "cover" }}
								/>
							</div>
						) : (
							<div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
								{getCreatorInitials()}
							</div>
						)}
					</>
				)}

				<ChevronDown
					className={`h-4 w-4 ${
						dropdownPosition === "header" ? "text-gray-600" : "text-gray-300"
					} transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</div>

			{isOpen && (
				<div
					className={`absolute z-10 ${
						dropdownPosition === "header"
							? "right-0 mt-2 w-56 bg-white shadow-lg rounded-lg"
							: "left-0 bottom-full w-full bg-[#222] shadow-lg rounded-lg border border-gray-700"
					}`}
				>
					<div
						className={`px-4 py-3 border-b ${
							dropdownPosition === "header"
								? "border-gray-200"
								: "border-gray-700"
						}`}
					>
						<div className="flex items-center justify-between">
							<p
								className={`text-sm font-medium ${
									dropdownPosition === "header" ? "text-gray-800" : "text-white"
								}`}
							>
								{getDisplayName()}
							</p>

							{verificationStatus && (
								<span
									className={`text-xs px-2 py-1 rounded-full ${verificationStatus.color}`}
								>
									{verificationStatus.label}
								</span>
							)}
						</div>

						<p
							className={`text-xs ${
								dropdownPosition === "header"
									? "text-gray-500"
									: "text-gray-400"
							}`}
						>
							{getContentTypeLabel()}
						</p>
					</div>

					{needsProfileCompletion() && (
						<Link
							href="/creator/verify-identity"
							className={`flex items-center w-full px-4 py-2 text-sm font-medium ${
								dropdownPosition === "header"
									? "text-orange-600 hover:bg-orange-50 bg-orange-25"
									: "text-orange-400 hover:bg-gray-700 bg-gray-800"
							}`}
							onClick={() => setIsOpen(false)}
						>
							<MdIncompleteCircle className="mr-2 h-4 w-4" />
							Complete Your Profile
						</Link>
					)}

					<div className="py-1">
						{/* TikTok Connection Button */}
						{isTikTokConnected ? (
							<div className="flex flex-col px-4 py-2">
								<div
									className={`flex items-center text-sm ${
										dropdownPosition === "header"
											? "text-green-600"
											: "text-green-400"
									}`}
								>
									<Image
										src="/icons/tiktok.svg"
										alt="Tiktok"
										width={10}
										height={10}
										className="mr-2 h-4 w-4"
									/>
									TikTok Connected
								</div>
								<button
									onClick={handleDisconnectTikTok}
									className={`text-start ml-6 text-xs mt-1 ${
										dropdownPosition === "header"
											? "text-red-500 hover:text-red-700"
											: "text-red-400 hover:text-red-300"
									}`}
								>
									Disconnect account
								</button>
							</div>
						) : (
							<button
								onClick={handleConnectTikTok}
								className={`flex items-center w-full text-left px-4 py-2 text-sm ${
									dropdownPosition === "header"
										? "text-blue-600 hover:bg-gray-100"
										: "text-blue-400 hover:bg-gray-700"
								}`}
							>
								<Image
									src="/icons/tiktok.svg"
									alt="Tiktok"
									width={10}
									height={10}
									className="mr-2 h-4 w-4"
								/>
								Connect to TikTok
							</button>
						)}

						<Link
							href="/creator/dashboard/settings"
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

export default CreatorProfileDropdown;
