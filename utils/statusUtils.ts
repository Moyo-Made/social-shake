export const getStatusStyle = (status: string) => {
	const normalizedStatus = status.toLowerCase();
	
	switch (normalizedStatus) {
	  case "accepting pitches":
		return "bg-yellow-100 text-[#1A1A1A] border border-[#FDD849]";
	  case "ongoing project":
		return "bg-[#FFE5FB] text-[#FC52E4] border border-[#FC52E4]";
	  case "completed":
		return "bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]";
	  case "draft":
		return "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]";
	  default:
		return "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]";
	}
  };

  // Function to determine status dot color
	export const getStatusDot = (status: string) => {
		const normalizedStatus = status.toLowerCase();

		switch (normalizedStatus) {
			case "accepting pitches":
				return "bg-[#1A1A1A]";
			case "ongoing project":
				return "bg-[#FC52E4]";
			case "completed":
				return "bg-[#17B26A]";
			case "draft":
				return "bg-[#667085]";
			default:
				return "bg-[#667085]";
		}
	};