interface StatusTabsProps {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	counts: Record<string, number>;
}

export default function StatusTabs({
	activeTab,
	setActiveTab,
	counts,
}: StatusTabsProps) {
	const tabs = [
		{ id: "All Projects", label: "All Projects" },
		{ id: "Applied", label: "Applied" },
		{ id: "In Progress", label: "In Progress" },
		{ id: "Interested", label: "Interested" },
		{ id: "Rejected", label: "Rejected" },
		{ id: "Completed", label: "Completed" },
	];

	return (
		<div className="flex gap-3 overflow-x-auto w-full">
			{tabs.map((tab) => (
				<div key={tab.id} className="flex-1">
					<button
						className={`w-full px-4 bg-white rounded-lg py-2 font-medium ${
							activeTab === tab.id
								? "text-orange-500 border border-[#FD5C02] "
								: "text-gray-500 hover:text-gray-700 border border-[#FFD9C3]"
						}`}
						onClick={() => setActiveTab(tab.id)}
					>
						<div className="flex flex-col items-start text-sm">
							<span>{tab.label}</span>
							<span
								className={`mt-1 ${
									activeTab === tab.id ? "text-orange-500" : "text-gray-400"
								}`}
							>
								{counts[tab.id]}
							</span>
						</div>
					</button>
				</div>
			))}
		</div>
	);
}