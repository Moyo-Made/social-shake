"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import BrandProfileDropdown from "@/components/brand/brandProfile/BrandProfileDropdown";

interface MenuItemProps {
	icon: React.ReactNode;
	text: string;
	badge?: string;
	href: string;
	subItems?: Array<{
		href: string;
		text: string;
		activePaths?: string[];
	}>;
	activePaths?: string[];
}

const MenuItem: React.FC<MenuItemProps> = ({
	icon,
	text,
	badge,
	href,
	subItems,
	activePaths,
}) => {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const hasSubItems = subItems && subItems.length > 0;

	// Modified isActive condition to handle special case for contests
	const isActive =
		pathname === href ||
		activePaths?.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`)
		) ||
		(href === "/admin/dashboard" && pathname === "/admin/dashboard/") ||
		(href === "/admin/manage-users/brands" &&
			pathname.startsWith("/admin/manage-users/brands/")) ||
		(href === "/admin/manage-users/creators" &&
			pathname.startsWith("/admin/manage-users/creators/")) ||
		(href === "/admin/campaigns/projects" &&
			pathname.startsWith("/admin/campaigns/projects/")) ||
		(href === "/admin/campaigns/contests" &&
			pathname.startsWith("/admin/campaigns/contests/")) ||
		(href === "/admin/manage-projects" &&
			pathname.startsWith("/admin/manage-projects/")) ||
		(href === "/admin/manage-contests" &&
			pathname.startsWith("/admin/manage-contests/"));

	const hasActiveSubItem =
		hasSubItems &&
		subItems.some(
			(item) =>
				pathname === item.href ||
				pathname.startsWith(`${item.href}/`) ||
				(item.activePaths &&
					item.activePaths.some(
						(path) => pathname === path || pathname.startsWith(`${path}/`)
					))
		);

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
		  ${isActive || hasActiveSubItem ? "bg-orange-500" : "hover:bg-gray-700"}`}
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
							const isSubItemActive =
								pathname === item.href ||
								pathname.startsWith(`${item.href}/`) ||
								(item.activePaths &&
									item.activePaths.some(
										(path) =>
											pathname === path || pathname.startsWith(`${path}/`)
									));

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
	return (
		<div className="min-w-64 max-w-screen-sm bg-[#1A1A1A] text-white min-h-screen flex flex-col justify-between font-satoshi">
			<nav className="p-4 mt-12">
				<div className="space-y-2">
					<MenuItem
						href="/admin/dashboard"
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
						href="/admin/manage-users"
						icon={
							<Image
								src="/icons/creators.svg"
								alt="creators"
								width={20}
								height={20}
							/>
						}
						text="Manage Users"
						subItems={[
							{
								href: "/admin/manage-users/brands",
								text: "Brands",
							},
							{
								href: "/admin/manage-users/creators",
								text: "Creator",
							},
						]}
					/>

					<MenuItem
						href="/admin/campaigns"
						icon={
							<Image
								src="/icons/creators.svg"
								alt="creators"
								width={20}
								height={20}
							/>
						}
						text="Campaigns"
						activePaths={["/admin/campaigns", "/admin/manage-projects"]}
						subItems={[
							{
								href: "/admin/campaigns/projects",
								text: "Projects",
								activePaths: [
									"/admin/campaigns/projects",
									"/admin/manage-projects",
								],
							},
							{
								href: "/admin/campaigns/contests",
								text: "Contests",
								activePaths: [
									"/admin/campaigns/contests",
									"/admin/manage-contests",
								],
							},
						]}
					/>
					<MenuItem
						href="/admin/payouts"
						icon={
							<Image
								src="/icons/transactions.svg"
								alt="transactions"
								width={20}
								height={20}
							/>
						}
						text="Payouts"
					/>
				</div>
			</nav>
		</div>
	);
};

// Configuration for page titles based on routes
const getPageTitle = (pathname: string): string => {
	// You can expand this object with all your routes that need specific titles
	const routeTitles: Record<string, string> = {
		"/admin/dashboard": "Admin Dashboard",
		"/admin/manage-users": "Manage Users",
		"/admin/manage-users/brands": "Manage Brands",
		"/admin/manage-users/brands/": "Manage Brands",
		"/admin/manage-users/creators": "Manage Creators",
		"/admin/campaigns": "Campaigns",
		"/admin/campaigns/projects": "Campaign - Projects",
		"/admin/manage-projects": "Campaign - Projects",
		"/admin/manage-contests": "Campaign - Contests",
		"/admin/campaigns/contests": "Campaign - Contests",
		"/admin/payouts": "Payouts",
	};

	 // Check for paths with IDs first (more specific routes)
	 if (pathname.startsWith("/admin/manage-users/brands/")) {
		return "Manage Brands";
	  }
	  if (pathname.startsWith("/admin/manage-users/creators/")) {
		return "Manage Creators";
	  }
	  if (pathname.startsWith("/admin/manage-projects/")) {
		return "Campaign - Projects";
	  }
	  if (pathname.startsWith("/admin/manage-contests/")) {
		return "Campaign - Contests";
	  }
	
	  // Check for exact match
	  if (routeTitles[pathname]) {
		return routeTitles[pathname];
	  }
	  
	  // More general route matching
	  if (pathname.startsWith("/admin/dashboard/")) {
		return "Admin Dashboard";
	  }
	  if (pathname.startsWith("/admin/manage-users/brands")) {
		return "Manage Brands";
	  }
	  if (pathname.startsWith("/admin/manage-users/creators")) {
		return "Manage Creators";
	  }
	  if (pathname.startsWith("/admin/manage-users")) {
		return "Manage Users";
	  }
	  if (pathname.startsWith("/admin/manage-projects")) {
		return "Campaign - Projects";
	  }
	  if (pathname.startsWith("/admin/payouts")) {
		return "Payouts";
	  }
	
	  // Default fallback
	  return "Admin Dashboard";
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
						<Link href="/brand/dashboard/notifications">
							<Image
								src="/icons/notification.svg"
								alt="Notifications"
								width={20}
								height={20}
								className="mr-4"
							/>
						</Link>
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
