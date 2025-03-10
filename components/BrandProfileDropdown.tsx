"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface BrandProfileDropdownProps {
	brandProfile: {
		brandName?: string;
		logoUrl?: string;
		industry?: string;
		email?: string;          
	};
	loading: boolean;
	dropdownPosition?: "header" | "sidenav";
}

const BrandProfileDropdown: React.FC<BrandProfileDropdownProps> = ({
	brandProfile,
	loading,
	dropdownPosition = "header",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { logout } = useAuth();
	const router = useRouter();

	// Function to get brand initials
	const getBrandInitials = () => {
		if (!brandProfile?.brandName) return "BR";

		const words = brandProfile.brandName.split(" ");
		if (words.length === 1) {
			return words[0].substring(0, 2).toUpperCase();
		}
		return (words[0][0] + words[1][0]).toUpperCase();
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
			router.push("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

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
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 overflow-hidden rounded-full">
							{loading ? (
								<div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
							) : brandProfile?.logoUrl ? (
								<Image
									src={brandProfile.logoUrl}
									alt={brandProfile.brandName || "Brand Logo"}
									className="w-full h-full object-cover"
									width={40}
									height={40}
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
					<>
						{loading ? (
							<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
						) : brandProfile?.logoUrl ? (
							<Image
								src={brandProfile.logoUrl}
								alt={brandProfile.brandName || "Brand Logo"}
								width={30}
								height={30}
								className="rounded-full object-cover"
							/>
						) : (
							<div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
								{getBrandInitials()}
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
						<p
							className={`text-sm font-medium ${
								dropdownPosition === "header" ? "text-gray-800" : "text-white"
							}`}
						>
							{brandProfile?.brandName || "Complete Your Profile"}
						</p>
						<p
							className={`text-xs ${
								dropdownPosition === "header"
									? "text-gray-500"
									: "text-gray-400"
							}`}
						>
							{brandProfile?.industry || "Update your profile"}
						</p>
					</div>

					<div className="py-1">
						<Link
							href="/dashboard/brand-profile"
							className={`flex items-center px-4 py-2 text-sm ${
								dropdownPosition === "header"
									? "text-gray-700 hover:bg-gray-100"
									: "text-gray-200 hover:bg-gray-700"
							}`}
							onClick={() => setIsOpen(false)}
						>
							<User className="mr-2 h-4 w-4" />
							Profile
						</Link>

						<Link
							href="/dashboard/settings"
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