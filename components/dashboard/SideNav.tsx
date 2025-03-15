"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import BrandProfileDropdown from "@/components/BrandProfileDropdown";

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
		(pathname.startsWith(href + "/") && href !== "/dashboard") ||
		(href === "/dashboard/contests" &&
			pathname === "/dashboard/contests/new-contest");

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
									${isSubItemActive ? "bg-orange-500" : "hover:bg-gray-700"}`}
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
	const { brandProfile, loading } = useBrandProfile();
	return (
		<div className="min-w-64 max-w-screen-sm bg-[#1A1A1A] text-white min-h-screen flex flex-col justify-between font-satoshi">
			<nav className="p-4 mt-9">
				<div className="space-y-2">
					<MenuItem
						href="/dashboard"
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
						href="/projects"
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
					<MenuItem
						href="/dashboard/contests"
						icon={
							<Image
								src="/icons/contests.svg"
								alt="contests"
								width={20}
								height={20}
							/>
						}
						text="Contests"
					/>
					<MenuItem
						href="/dashboard/creators"
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
							{ href: "/dashboard/creators/all", text: "All creators" },
							{ href: "/dashboard/creators/saved", text: "Saved creators" },
						]}
					/>
					<MenuItem
						href="/dashboard/messages"
						icon={
							<Image
								src="/icons/messages.svg"
								alt="messages"
								width={20}
								height={20}
							/>
						}
						text="Messages"
						badge="1"
					/>
					<MenuItem
						href="/dashboard/transactions"
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
					href="/dashboard/settings"
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
					href="/dashboard/help"
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
				<div className="flex items-center justify-between text-white pt-3">
					{brandProfile ? (
						<BrandProfileDropdown
							brandProfile={brandProfile}
							loading={loading}
							dropdownPosition="sidenav"
						/>
					) : null}
				</div>
			</div>
		</div>
	);
};

// Configuration for page titles based on routes
const getPageTitle = (pathname: string): string => {
	// You can expand this object with all your routes that need specific titles
	const routeTitles: Record<string, string> = {
		"/dashboard": "Dashboard",
		"/projects": "Projects",
		"/dashboard/contests": "Contests",
		"/dashboard/new-contest": "New Contest",
		"/dashboard/edit-contest/": "Edit Contest",
		"/dashboard/creators": "Creators",
		"/dashboard/creators/all": "All Creators",
		"/dashboard/creators/saved": "Saved Creators",
		"/dashboard/messages": "Messages",
		"/dashboard/transactions": "Transactions",
		"/dashboard/settings": "Settings",
		"/dashboard/help": "Help & Support",
	};

	// Check for exact match first
	if (routeTitles[pathname]) {
		return routeTitles[pathname];
	}

	// More specific matching for different route sections
	if (pathname.startsWith("/dashboard/contests/")) {
		return "Contests";
	}

	if (pathname.startsWith("/dashboard/new-contest/")) {
		return "New Contest";
	}

	if (pathname.startsWith("/dashboard/creators/")) {
		return "Creators";
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
		<div className="flex min-h-screen">
			<SideNav />
			<div className="flex-1 flex flex-col items-center justify-center bg-[#FFF9F6] font-satoshi ">
				<header className="bg-white p-4 w-full flex justify-between items-center border-b border-[#FD5C02]">
					<h1 className="text-xl font-semibold">{pageTitle}</h1>
					<div className="flex items-center">
						<Image
							src="/icons/notification.svg"
							alt="Notifications"
							width={20}
							height={20}
							className="mr-4"
						/>
						{brandProfile && (
							<BrandProfileDropdown
								brandProfile={brandProfile}
								loading={loading}
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