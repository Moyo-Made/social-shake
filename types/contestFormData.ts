import { Incentive } from "@/components/brandProfile/dashboard/newContest/ContestFormContext";

export interface BasicFormData {
	contestName: string;
	contestType: ContestType;
	industry: string;
	description: string;
	rules: string;
	thumbnail: File | null;
}

export interface RequirementsFormData {
	whoCanJoin: string;
	duration: string;
	videoType: string;
	script: string;
	contentLinks: string[];
	brandAssets: string;
}

export interface PrizeTimelineFormData {
	totalBudget: number;
	winnerCount: number;
	positions: number[];
	startDate: Date | undefined;
	endDate: Date | undefined;
	criteria: string;
}

export type ContestType = "Leaderboard" | "GMV";

export interface ContestFormData {
	brandEmail: string;
	status: string;
	contestType: ContestType | undefined;
	basic: BasicFormData;
	requirements: RequirementsFormData;
	prizeTimeline: PrizeTimelineFormData;
	incentives: Incentive[];
}
