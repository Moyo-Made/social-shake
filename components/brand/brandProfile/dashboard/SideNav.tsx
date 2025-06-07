"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, VideoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import BrandProfileDropdown from "@/components/brand/brandProfile/BrandProfileDropdown";
import { useNotifications } from "@/context/NotificationContext";
import NotificationSystem from "@/components/notifications/NotificationSystem";

interface MenuItemProps {
	icon: React.ReactNode;
	text: string;
	badge?: string;
	href: string;
	subItems?: Array<{
		href: string;
		text: string;
	}>;
}

const MenuItem: React.FC<MenuItemProps> = ({
	icon,
	text,
	badge,
	href,
	subItems,
}) => {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const hasSubItems = subItems && subItems.length > 0;

	// Modified isActive condition to handle special case for contests
	const isActive =
		pathname === href ||
		(href === "/brand/dashboard" && pathname === "/brand/dashboard") ||
		(href === "/brand/dashboard/contests" &&
			pathname.startsWith("/brand/dashboard/contests/")) ||
		(href === "/brand/dashboard/projects" &&
			pathname.startsWith("/brand/dashboard/projects/")) ||
		(href === "/brand/dashboard/creators" &&
			pathname.startsWith("/brand/dashboard/creators/")) ||
		(href === "/brand/dashboard/messages" &&
			pathname.startsWith("/brand/dashboard/messages/")) ||
		(href === "/brand/dashboard/transactions" &&
			pathname.startsWith("/brand/dashboard/transactions/")) ||
		(href === "/brand/dashboard/settings" &&
			pathname.startsWith("/brand/dashboard/settings/")) ||
		(href === "/brand/dashboard/help-support" &&
			pathname.startsWith("/brand/dashboard/help-support/"));

	const hasActiveSubItem =
		hasSubItems && subItems.some((item) => pathname === item.href);

	useEffect(() => {
		if (hasActiveSubItem) {
			setIsOpen(true);
		}
	}, [pathname, hasActiveSubItem]);

	const toggleDropdown = (e: React.MouseEvent) => {
		if (hasSubItems) {
			e.preventDefault();
			setIsOpen(!isOpen);
		}
	};

	if (hasSubItems) {
		return (
			<div>
				<div
					onClick={toggleDropdown}
					className={`flex items-center space-x-3 px-4 py-2 rounded-lg cursor-pointer font-satoshi
          ${
						isActive || hasActiveSubItem ? "bg-orange-500" : "hover:bg-gray-700"
					}`}
				>
					{icon}
					<span className="ml-3">{text}</span>
					{badge && (
						<span className="bg-red-500 text-xs px-2 py-0.5 rounded-full ml-auto mr-2">
							{badge}
						</span>
					)}
					{isOpen ? (
						<ChevronDown className="h-4 w-4 ml-auto mt-px" />
					) : (
						<ChevronRight className="h-4 w-4 ml-auto mt-px" />
					)}
				</div>
				{isOpen && (
					<div className="mt-1">
						{subItems.map((item, index) => {
							const isSubItemActive = pathname === item.href;
							return (
								<Link
									key={index}
									href={item.href}
									className={`flex items-center space-x-3 px-4 py-2 ml-4 rounded-lg cursor-pointer font-satoshi 
									${isSubItemActive ? "text-orange-500" : "hover:bg-gray-700"}`}
								>
									<span>{item.text}</span>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	return (
		<Link
			href={href}
			className={`flex items-center space-x-3 px-4 py-2 rounded-lg cursor-pointer font-satoshi
      ${isActive ? "bg-orange-500" : "hover:bg-gray-700"}`}
		>
			{icon}
			<span className="ml-3">{text}</span>
			{badge && (
				<span className="bg-red-500 text-xs px-2 py-0.5 rounded-full ml-auto">
					{badge}
				</span>
			)}
		</Link>
	);
};

const SideNav: React.FC = () => {
	const { totalUnreadCount } = useNotifications();

	return (
		<div className="min-w-64 max-w-screen-sm bg-[#1A1A1A] text-white h-screen flex flex-col font-satoshi">
			{/* Scrollable main navigation area */}
			<nav className="flex-1 overflow-y-auto p-4 mt-9">
				<div className="space-y-2">
					<MenuItem
						href="/brand/dashboard"
						icon={
							<Image
								src="/icons/dashboard.svg"
								alt="dashboard"
								width={20}
								height={20}
							/>
						}
						text="Dashboard"
					/>

					<MenuItem
						href="/brand/dashboard/projects"
						icon={
							<Image
								src="/icons/projects.svg"
								alt="projects"
								width={20}
								height={20}
							/>
						}
						text="Projects"
					/>
					{/* <MenuItem
						href="/brand/dashboard/contests"
						icon={
							<Image
								src="/icons/contests.svg"
								alt="contests"
								width={20}
								height={20}
							/>
						}
						text="Contests"
					/> */}
					<MenuItem
						href="/brand/dashboard/creators"
						icon={
							<Image
								src="/icons/creators.svg"
								alt="creators"
								width={20}
								height={20}
							/>
						}
						text="Creators"
						subItems={[
							{ href: "/brand/dashboard/creators/all", text: "All creators" },
							{
								href: "/brand/dashboard/creators/saved",
								text: "Saved creators",
							},
						]}
					/>

					<MenuItem
						href="/brand/dashboard/videos/purchased"
						icon={<VideoIcon size={20} />}
						text="My Videos"
					/>

					<MenuItem
						href="/brand/dashboard/messages"
						icon={
							<Image
								src="/icons/messages.svg"
								alt="messages"
								width={20}
								height={20}
							/>
						}
						text="Messages"
						badge={
							totalUnreadCount > 0 ? totalUnreadCount.toString() : undefined
						}
					/>
					<MenuItem
						href="/brand/dashboard/transactions"
						icon={
							<Image
								src="/icons/transactions.svg"
								alt="transactions"
								width={20}
								height={20}
							/>
						}
						text="Transactions"
					/>

					
				</div>
			</nav>

			{/* Fixed bottom section */}
			<div className="flex-shrink-0 p-4 space-y-2 border-t border-gray-700">
				<MenuItem
					href="/brand/dashboard/settings"
					icon={
						<Image
							src="/icons/settings.svg"
							alt="settings"
							width={20}
							height={20}
						/>
					}
					text="Settings"
				/>
				<MenuItem
					href="/brand/dashboard/help-support"
					icon={
						<Image
							src="/icons/help-icon.svg"
							alt="Help and support"
							width={20}
							height={20}
						/>
					}
					text="Help & Support"
				/>
			</div>
		</div>
	);
};

// Configuration for page titles based on routes
const getPageTitle = (pathname: string): string => {
	// You can expand this object with all your routes that need specific titles
	const routeTitles: Record<string, string> = {
		"/brand/dashboard": "Dashboard",
		"/brand/dashboard/projects": "Projects",
		"/brand/dashboard/projects/new": "Add New Project",
		"/brand/dashboard/contests": "Contests",
		"/brand/dashboard/contests/new": "New Contest",
		"/brand/dashboard/contests/edit": "Edit Contest",
		"/brand/dashboard/creators": "Creators",
		"/brand/dashboard/creators/all": "All Creators",
		"/brand/dashboard/creators/saved": "Saved Creators",
		"/brand/dashboard/videos/purchased": "My Videos",
		"/brand/dashboard/messages": "Messages",
		"/brand/dashboard/transactions": "Transactions",
		"/brand/dashboard/settings": "Settings",
		"/brand/dashboard/help-support": "Help & Support",
	};

	// Check for exact match first
	if (routeTitles[pathname]) {
		return routeTitles[pathname];
	}
	// More specific matching for different route sections
	if (pathname.startsWith("/brand/dashboard/contests/")) {
		return "Contests";
	}

	if (pathname.startsWith("/brand/dashboard/new-contest/")) {
		return "New Contest";
	}

	if (pathname.startsWith("/brand/dashboard/projects")) {
		return "Projects";
	}
	if (pathname.startsWith("/brand/dashboard/projects/new")) {
		return "Add New Project";
	}

	if (pathname.startsWith("/brand/dashboard/creators/")) {
		return "Creators";
	}

	if (pathname.startsWith("/brand/dashboard/videos/")) {
		return "My Videos";
	}

	if (pathname.startsWith("/brand/dashboard/settings/")) {
		return "Settings";
	}
	if (pathname.startsWith("/brand/dashboard/messages/")) {
		return "Messages";
	}
	if (pathname.startsWith("/brand/dashboard/transactions/")) {
		return "Transactions";
	}
	if (pathname.startsWith("/brand/dashboard/ai-actor/")) {
		return "AI Actor";
	}

	if (pathname.startsWith("/brand/dashboard/help-support/")) {
		return "Help & Support";
	}

	// Default fallback
	return "Dashboard";
};

const SideNavLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const pathname = usePathname();
	const pageTitle = getPageTitle(pathname);
	const { brandProfile, loading } = useBrandProfile();

	return (
		<div className="h-screen flex">
			<SideNav />
			<div className="flex-1 flex flex-col items-center justify-center bg-[#FFF9F6] font-satoshi ">
				<header className="bg-white p-4 w-full flex justify-between items-center border-b border-[#FD5C02]">
					<h1 className="text-xl font-semibold">{pageTitle}</h1>
					<div className="flex items-center">
						<NotificationSystem />
						{brandProfile && (
							<BrandProfileDropdown
								brandProfile={brandProfile}
								loading={loading}
								dropdownPosition="header"
							/>
						)}
					</div>
				</header>

				<main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
					<div className="md:w-[calc(100vw-16rem)] container mx-auto h-screen">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
};

export default SideNavLayout;
