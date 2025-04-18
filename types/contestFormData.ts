import { Incentive } from "@/components/brand/brandProfile/dashboard/newContest/ContestFormContext";
import { ProjectStatus } from "./projects";

export interface BasicFormData {
	contestName: string;
	contestType: ContestType;
	industry: string;
	description: string;
	rules: string;
	thumbnail: File | string | null;
	thumbnailName?: string;
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
	contestId: string;
}

//Project Details Type
export type ProjectType =
	| "UGC Content Only"
	| "Creator-Posted UGC"
	| "Spark Ads"
	| "TikTok Shop";

export interface ProjectDetails {
	projectName: string;
	projectType: ProjectType;
	productLink: string;
	productType: string;
	projectDescription: string[];
	projectThumbnail: File | null;
}

export interface ProjectRequirements {
	contentType: string;
	platform: string[];
	aspectRatio: string;
	duration: string;
	videoType: string;
	script: string;
	contentLinks: string[];
	brandAssets: string;
}

export interface CreatorPricing {
	selectionMethod: "Invite Specific Creators" | "Post Public Brief";
	selectedCreators?: Creator[];
	ageGroup?: string;
	gender?: string;
	industry?: string;
	language?: string;
	creatorCount: number;
	videosPerCreator: number;
	totalVideos: number;

	// Cost information moved here
	budgetPerVideo: number;
	totalBudget: number;
	extras: {
		captions: boolean;
		captionsPrice: number;
		captionsTotal: number;
		music: boolean;
		musicPrice: number;
		musicTotal: number;
		rawFiles: boolean;
		rawFilesPrice: number;
		rawFilesTotal: number;
	};
	extrasTotal: number;
	totalAmount: number;
	creator: CreatorSelection;
	cost: CostBreakdown;
}

export interface Creator {
	name: string;
	avatar: string;
}

interface CreatorSelection {
	selectionMethod?: "Invite Specific Creators" | "Post Public Brief";
	selectedCreators?: Creator[];
	ageGroup?: string;
	gender?: string;
	industry?: string;
	language?: string;
	countries?: string[];
	creatorCount: number;
	videosPerCreator: number;
	totalVideos: number;
}

interface Extras {
	music: boolean;
	musicPrice: number;
	musicTotal: number;
	rawFiles: boolean;
	rawFilesPrice: number;
	rawFilesTotal: number;
}

interface CostBreakdown {
	budgetPerVideo: number;
	totalBudget: number;
	extras: Extras;
	extrasTotal: number;
	totalAmount: number;
	commissionPerSale: number;
}

export interface ProjectFormData {
	userId: string;
	status: ProjectStatus;
	projectDetails: ProjectDetails;
	projectRequirements: ProjectRequirements;
	creatorPricing: CreatorPricing;
	createdAt: string;
}
