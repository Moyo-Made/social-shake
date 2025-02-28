import React from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface MenuItemProps {
	icon: React.ReactNode;
	text: string;
	active?: boolean;
	badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
	icon,
	text,
	active = false,
	badge,
}) => {
	return (
		<div
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
		</div>
	);
};

const NewContestSideNav: React.FC = () => {
	return (
		<div className="w-64 bg-[#1A1A1A] text-white min-h-screen flex flex-col justify-between font-satoshi">
			<nav className="p-4 mt-9">
				<div className="space-y-2">
					<MenuItem
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
						icon={
							<Image
								src="/icons/creators.svg"
								alt="creators"
								width={20}
								height={20}
							/>
						}
						text="Creators"
					/>
					<MenuItem
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
			<div className="flex-1 flex flex-col bg-gray-100 font-satoshi">
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
