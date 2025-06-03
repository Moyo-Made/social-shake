export enum ContestStatus {
	PENDING = "pending",
	ACTIVE = "active",
	COMPLETED = "completed",
	REJECTED = "rejected",
	REQUEST_EDIT = "request_edit",
}

export enum ProjectStatus {
	PENDING = "pending",
	ACTIVE = "active",
	INVITE = "invite",
	COMPLETED = "completed",
	REJECTED = "rejected",
	REQUEST_EDIT = "request_edit",
	APPROVED = "approved",
	INTERESTED = "interested",
}

export interface DraftStatus {
	draftStatus: "draft";
}

export const getProjectTypeIcon = (projectType: string) => {
	switch (projectType) {
		case "UGC Videos Only":
			return "/icons/ugc.svg";
		case "Creator-Posted UGC":
			return "/icons/creator-posted.svg";
		case "UGC Content Only":
			return "/icons/ugc.svg";
		case "Spark Ads":
			return "/icons/ad.svg";
		case "TikTok Shop":
			return "/icons/tiktok-shop.svg";
		default:
			return "/icons/default.svg";
	}
};

export const getStatusInfo = (status: string) => {
	switch (status) {
		case "pending":
			return {
				prefix: "Status:",
				label: "• Application Pending",
				color: "text-[#F04438]",
				bgColor: "bg-[#FFE9E7]",
				borderColor: "border border-[#F04438]",
			};
		case "interested":
			return {
				prefix: "Status:",
				label: "• Interested",
				color: "text-[#FC52E4]",
				bgColor: "bg-[#FFE5FB]",
				borderColor: "border border-[#FC52E4]",
			};
		case "rejected":
			return {
				prefix: "Status:",
				label: "• Rejected",
				color: "text-[#667085]",
				bgColor: "bg-[#F6F6F6]",
				borderColor: "border border-[#667085]",
			};
		case "completed":
			return {
				prefix: "Status:",
				label: "√ Completed",
				color: "text-[#067647]",
				bgColor: "bg-[#ECFDF3]",
				borderColor: "border border-[#ABEFC6]",
			};
		case "approved":
			return {
				prefix: "Status:",
				label: "• In Progress",
				color: "text-[#FC52E4]",
				bgColor: "bg-[#FFE5FB]",
				borderColor: "border border-[#FC52E4]",
			};
		default:
			return {
				prefix: "Status:",
				label: status.charAt(0).toUpperCase() + status.slice(1),
				color: "text-gray-600",
				bgColor: "bg-gray-100",
				borderColor: "border border-gray-600",
			};
	}
};

export const getProjectStatusInfo = (status: string) => {
	switch (status) {
		case "pending":
			return {
				prefix: "Status:",
				label: "• Application Pending",
				color: "text-[#F04438]",
				bgColor: "bg-[#FFE9E7]",
				borderColor: "border border-[#F04438]",
			};
		case "interested":
			return {
				prefix: "Status:",
				label: "• Interested",
				color: "text-[#FC52E4]",
				bgColor: "bg-[#FFE5FB]",
				borderColor: "border border-[#FC52E4]",
			};
		case "rejected":
			return {
				prefix: "Status:",
				label: "• Rejected",
				color: "text-[#667085]",
				bgColor: "bg-[#F6F6F6]",
				borderColor: "border border-[#667085]",
			};
		case "completed":
			return {
				prefix: "Status:",
				label: "√ Completed",
				color: "text-[#067647]",
				bgColor: "bg-[#ECFDF3]",
				borderColor: "border border-[#ABEFC6]",
			};
		case "active":
			return {
				prefix: "Status:",
				label: "• Ongoing Project",
				color: "text-[#FC52E4]",
				bgColor: "bg-[#FFE5FB]",
				borderColor: "border border-[#FC52E4]",
			};
		default:
			return {
				prefix: "Status:",
				label: status.charAt(0).toUpperCase() + status.slice(1),
				color: "text-gray-600",
				bgColor: "bg-gray-100",
				borderColor: "border border-gray-600",
			};
	}
};
