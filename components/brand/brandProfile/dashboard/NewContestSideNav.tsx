"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

interface MenuItemProps {
	icon: React.ReactNode;
	text: string;
	active?: boolean;
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
	active = false,
	badge,
	href,
	subItems,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const hasSubItems = subItems && subItems.length > 0;

	const toggleDropdown = () => {
		if (hasSubItems) {
			setIsOpen(!isOpen);
		}
	};

	if (hasSubItems) {
		return (
			<div>
				<div
					onClick={toggleDropdown}
					className={`flex items-center space-x-3 px-4 py-2 rounded-lg cursor-pointer font-satoshi
          ${active ? "bg-orange-500" : "hover:bg-gray-700"}`}
				>
					{icon}
					<span>{text}</span>
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
						{subItems.map((item, index) => (
							<Link
								key={index}
								href={item.href}
								className="flex items-center space-x-3 px-4 py-2 ml-4 rounded-lg cursor-pointer font-satoshi hover:bg-gray-700"
							>
								<span>{item.text}</span>
							</Link>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<Link
			href={href}
			className={`flex items-center space-x-3 px-4 py-2 rounded-lg cursor-pointer font-satoshi
      ${active ? "bg-orange-500" : "hover:bg-gray-700"}`}
		>
			{icon}
			<span>{text}</span>
			{badge && (
				<span className="bg-red-500 text-xs px-2 py-0.5 rounded-full ml-auto">
					{badge}
				</span>
			)}
		</Link>
	);
};

const NewContestSideNav: React.FC = () => {
	return (
		<div className="w-64 bg-[#1A1A1A] text-white min-h-screen flex flex-col justify-between font-satoshi">
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
						active
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
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 overflow-hidden ">
							<img
								src="/icons/social-shake-profile.svg"
								alt="Social Shake Profile"
								className="w-full h-full object-cover"
							/>
						</div>
						<div>
							<h2 className="text-base font-bold">Social Shake</h2>
							<p className="text-gray-300 text-sm">sociashake@gmail.com</p>
						</div>
					</div>
					<ChevronDown className="h-4 w-4 text-gray-300" />
				</div>
			</div>
		</div>
	);
};

const NewContestSideNavLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<div className="flex min-h-screen">
			<NewContestSideNav />
			<div className="flex-1 flex flex-col bg-[#FFF9F6] font-satoshi">
				<header className="bg-white p-4 w-full flex justify-between items-center border-b border-[#FD5C02]">
					<h1 className="text-xl font-semibold">New Contest</h1>
					<div className="flex items-center space-x-4">
						<Image
							src="/icons/notification.svg"
							alt="Notifications"
							width={20}
							height={20}
						/>
						<div className="flex gap-2">
							<Image
								src="/icons/profile-icon.svg"
								alt="Profile"
								width={30}
								height={30}
							/>
							<ChevronDown className="h-4 w-4 text-gray-600 mt-1.5" />
						</div>
					</div>
				</header>
				<div className="flex-1 w-full overflow-y-auto">
					<div className="p-4">{children}</div>
				</div>
			</div>
		</div>
	);
};

export default NewContestSideNavLayout;
