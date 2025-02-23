import React from "react";
import Image from "next/image";

interface MenuItemProps {
	icon: React.ReactNode;
	text: string;
	active?: boolean;
	badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, text, active = false, badge }) => {
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

const SideNav: React.FC = () => {
	return (
		<div className="w-64 bg-[#1A1A1A] text-white h-screen flex flex-col justify-between font-satoshi">
			<nav className="p-4 mt-9">
				<div className="space-y-2">
					<MenuItem
						icon={<Image src="/icons/dashboard.svg" alt="dashboard" width={20} height={20} />}
						text="Dashboard"
					/>
					<MenuItem
						icon={<Image src="/icons/projects.svg" alt="projects" width={20} height={20} />}
						text="Projects"
					/>
					<MenuItem
						icon={<Image src="/icons/contests.svg" alt="contests" width={20} height={20} />}
						text="Contests"
						active
					/>
					<MenuItem
						icon={<Image src="/icons/creators.svg" alt="creators" width={20} height={20} />}
						text="Creators"
					/>
					<MenuItem
						icon={<Image src="/icons/messages.svg" alt="messages" width={20} height={20} />}
						text="Messages"
						badge="1"
					/>
					<MenuItem
						icon={<Image src="/icons/transactions.svg" alt="transactions" width={20} height={20} />}
						text="Transactions"
					/>
				</div>
			</nav>

			<div className="p-4 space-y-2">
				<MenuItem
					icon={<Image src="/icons/settings.svg" alt="settings" width={20} height={20} />}
					text="Settings"
				/>
				<MenuItem
					icon={<Image src="/icons/help-icon.svg" alt="Help and support" width={20} height={20} />}
					text="Help & Support"
				/>
			</div>
		</div>
	);
};

const SideNavLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<div className="flex h-screen">
			<SideNav />
			<div className="flex-1 flex flex-col items-center justify-center bg-gray-100 font-satoshi ">
				<header className="bg-white p-4 w-full flex justify-between items-center border-b border-[#FD5C02]">
					<h1 className="text-xl font-semibold">Contests</h1>
					<div className="flex items-center space-x-4">
						<Image src="/icons/notification.svg" alt="Notifications" width={20} height={20} />
						<div className="w-8 h-8 bg-orange-500 rounded-full"></div>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center w-full">{children}</div>
			</div>
		</div>
	);
};

export default SideNavLayout;
