interface StatusTabsProps {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	counts: Record<string, number>;
  }
  
  export default function StatusTabs({ activeTab, setActiveTab, counts }: StatusTabsProps) {
	const tabs = [
	  { id: 'All Contests', label: 'All Contests' },
	  { id: 'Applied', label: 'Applied' },
	  { id: 'Joined', label: 'Joined' },
	  { id: 'Interested', label: 'Interested' },
	  { id: 'Rejected', label: 'Rejected' },
	  { id: 'Completed', label: 'Completed' },
	];
  
	return (
	  <div className="flex border-b border-gray-200 overflow-x-auto">
		{tabs.map((tab) => (
		  <button
			key={tab.id}
			className={`px-4 py-2 text-sm font-medium ${
			  activeTab === tab.id
				? 'text-orange-500 border-b-2 border-orange-500'
				: 'text-gray-500 hover:text-gray-700'
			}`}
			onClick={() => setActiveTab(tab.id)}
		  >
			<div className="flex flex-col items-center">
			  <span>{tab.label}</span>
			  <span className={`mt-1 ${
				activeTab === tab.id ? 'text-orange-500' : 'text-gray-400'
			  }`}>
				{counts[tab.id]}
			  </span>
			</div>
		  </button>
		))}
	  </div>
	);
  }
  