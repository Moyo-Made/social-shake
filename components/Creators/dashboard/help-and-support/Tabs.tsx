"use client";

import React, { useState } from "react";
import ContactSupportForm from "./ContactSupportForm";
import Image from "next/image";
// import SupportTicketHistory from "./TicketHistory";
import FAQComponent from "./Help";

const Tabs = () => {
	const [activeTab, setActiveTab] = useState("helpCenter");

	// Tab data with icons and labels
	const tabs = [
		{
			id: "helpCenter",
			label: "Help Center",
			icon: (
				<div className="flex items-center justify-center">
					<Image
						src="/icons/help.svg"
						alt="Help Center"
						width={80}
						height={80}
					/>
				</div>
			),
			content: <div className="p-6"><FAQComponent /></div>,
		},
		{
			id: "contactSupport",
			label: "Contact Support",
			icon: (
				<div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
					<Image
						src="/icons/contact-support.svg"
						alt="Contact Support"
						width={80}
						height={80}
					/>
				</div>
			),
			content: (
				<div className="p-6">
					<ContactSupportForm />
				</div>
			),
		},
		// {
		// 	id: "supportHistory",
		// 	label: "Support History",
		// 	icon: (
		// 		<div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
		// 			<Image
		// 				src="/icons/support-history.svg"
		// 				alt="Support History"
		// 				width={80}
		// 				height={80}
		// 			/>
		// 		</div>
		// 	),
		// 	content: (
		// 		<div className="p-6">
		// 			<SupportTicketHistory />
		// 		</div>
		// 	),
		// },
	];

	return (
		<div className="w-full max-w-6xl mx-auto pt-10 p-8">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				{tabs.map((tab) => (
					<div
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`
			  bg-white rounded-xl border p-6 flex flex-col items-center justify-center cursor-pointer transition-all
			  ${activeTab === tab.id ? "border-[#FD5C02]" : "border-[#6670854D] hover:border-orange-300"}
			`}
					>
						{tab.icon}
						<h2 className="text-xl font-medium mt-3 text-center">
							{tab.label}
						</h2>
					</div>
				))}
			</div>

			<div className="bg-white rounded-lg border border-[#FFD9C3] min-h-64">
				{tabs.find((tab) => tab.id === activeTab)?.content}
			</div>
		</div>
	);
};

export default Tabs;
