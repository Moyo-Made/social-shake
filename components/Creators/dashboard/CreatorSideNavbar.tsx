"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import CreatorProfileDropdown from "../CreatorProfileDropdown";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { useNotifications } from "@/context/NotificationContext";

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
		(href === "/creator/dashboard" && pathname === "/creator/dashboard") ||
		(href === "/creator/dashboard/contest" &&
			pathname.startsWith("/creator/dashboard/contest/")) ||
		(href === "/creator/dashboard/project" &&
			pathname.startsWith("/creator/dashboard/project/")) ||
		(href === "/creator/dashboard/messages" &&
			pathname.startsWith("/creator/dashboard/messages/")) ||
		(href === "/creator/dashboard/transactions" &&
			pathname.startsWith("/creator/dashboard/transactions/")) ||
		(href === "/creator/dashboard/settings" &&
			pathname.startsWith("/creator/dashboard/settings/")) ||
		(href === "/creator/dashboard/help-support" &&
			pathname.startsWith("/creator/dashboard/help-support/"));

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
		<div className="min-w-64 max-w-screen-sm bg-[#1A1A1A] text-white min-h-screen flex flex-col justify-between font-satoshi">
			<nav className="p-4 mt-9">
				<div className="space-y-2">
					<MenuItem
						href="/creator/dashboard"
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
						href="/creator/dashboard/project"
						icon={
							<Image
								src="/icons/projects.svg"
								alt="projects"
								width={20}
								height={20}
							/>
						}
						text="Projects"
						subItems={[
							{
								href: "/creator/dashboard/project/all",
								text: "Available Projects",
							},
							{
								href: "/creator/dashboard/project/applied",
								text: "My Projects",
							},
						]}
					/>
					<MenuItem
						href="/creator/dashboard/contest"
						icon={
							<Image
								src="/icons/contests.svg"
								alt="contests"
								width={20}
								height={20}
							/>
						}
						text="Contests"
						subItems={[
							{
								href: "/creator/dashboard/contest/all",
								text: "Available Contests",
							},
							{
								href: "/creator/dashboard/contest/applied",
								text: "My Contests",
							},
						]}
					/>

					<MenuItem
						href="/creator/dashboard/messages"
						icon={
							<Image
								src="/icons/messages.svg"
								alt="messages"
								width={20}
								height={20}
							/>
						}
						text="Messages"
						badge={totalUnreadCount > 0 ? totalUnreadCount.toString() : undefined}
					/>
					<MenuItem
						href="/creator/dashboard/transactions"
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

			<div className="p-4 space-y-2">
				<MenuItem
					href="/creator/dashboard/settings"
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
					href="/creator/dashboard/help-support"
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
		"/creator/dashboard": "Dashboard",
		"/creator/dashboard/project/all": "Available Projects",
		"/creator/dashboard/project": "Available Projects",
		"/creator/dashboard/project/applied": "My Projects",
		"/creator/dashboard/contest/all": "Available Contests",
		"/creator/dashboard/contest": "Available Contests",
		"/creator/dashboard/contest/applied": "My Contests",
		"/creator/dashboard/messages": "Messages",
		"/creator/dashboard/transactions": "Transactions",
		"/creator/dashboard/settings": "Settings",
		"/creator/dashboard/help-support": "Help & Support",
	};

	// Check for exact match first
	if (routeTitles[pathname]) {
		return routeTitles[pathname];
	}
	// More specific matching for different route sections
	if (pathname.startsWith("/creator/dashboard/contest/all")) {
		return "Available Contests";
	}

	if (pathname.startsWith("/creator/dashboard/contest")) {
		return "Available Contests";
	}

	if (pathname.startsWith("/creator/dashboard/contest/applied")) {
		return "My Contests";
	}

	if (pathname.startsWith("/creator/dashboard/project")) {
		return "Available Projects";
	}
	
	if (pathname.startsWith("/creator/dashboard/project/all")) {
		return "Available Projects";
	}
	if (pathname.startsWith("/creator/dashboard/project/applied")) {
		return "My Projects";
	}

	if (pathname.startsWith("/creator/dashboard/settings/")) {
		return "Settings";
	}
	if (pathname.startsWith("/creator/dashboard/messages/")) {
		return "Messages";
	}
	if (pathname.startsWith("/creator/dashboard/transactions/")) {
		return "Transactions";
	}

	if (pathname.startsWith("/creator/dashboard/help-support/")) {
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
	const { creatorProfile } = useCreatorProfile();

	return (
		<div className="flex min-h-screen">
			<SideNav />
			<div className="flex-1 flex flex-col items-center justify-center bg-[#FFF9F6] font-satoshi ">
				<header className="bg-white p-4 w-full flex justify-between items-center border-b border-[#FD5C02]">
					<h1 className="text-xl font-semibold">{pageTitle}</h1>
					<div className="flex items-center">
						<Link href="/creator/dashboard/notifications">
							<Image
								src="/icons/notification.svg"
								alt="Notifications"
								width={20}
								height={20}
								className="mr-4"
							/>
						</Link>
						{creatorProfile && (
							<CreatorProfileDropdown
								creatorProfile={creatorProfile}
								dropdownPosition="header"
							/>
						)}
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center w-full">
					{children}
				</div>
			</div>
		</div>
	);
};

export default SideNavLayout;
