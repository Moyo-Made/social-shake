interface SearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
  }
  
  export default function SearchBar({ searchQuery, setSearchQuery }: SearchBarProps) {
	return (
	  <div className="relative">
		<input
		  type="text"
		  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
		  placeholder="Search Contest"
		  value={searchQuery}
		  onChange={(e) => setSearchQuery(e.target.value)}
		/>
		<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
		  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		  </svg>
		</div>
	  </div>
	);
  }