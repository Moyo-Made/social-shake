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
	submissionEndDate: string | number | Date;
	totalBudget: number;
	winnerCount: number;
	positions: number[];
	startDate: Date | undefined;
	endDate: Date | undefined;
	criteria: string;
}

export type ContestType = "Leaderboard" | "GMV";

export interface ContestFormData {
	computedStatus: unknown;
	userId: string;
	brandInfo: {
		name: string;
		logo: string;
		website?: string;
		description?: string;
	};
	participantsCount: number;
	createdAt: string;
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

export type ProductType = "Physical" | "Virtual";

export interface ProjectDetails {
	projectName: string;
	projectType: ProjectType;
	productLink: string;
	productType: ProductType;
	projectDescription: string;
	projectThumbnail: string | File | null;
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
interface CreatorPaymentData {
	needsCustomQuote: boolean;
	pricePerVideo: number;
	pricingTier: string;
	totalAmount: number;
	videosOrdered: number;
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
	totalAmount: number;
	creator: CreatorSelection;
	cost: CostBreakdown;
	lockedPricing: {
		[creatorId: string]: {
			pricePerVideo: number;
			totalPrice: number;
			pricingTier: string; // "per video", "3-video package", etc.
		};
	};
	budgetPerVideoLocked: number; // For Post Public Brief
	creatorPayments: {
		[creatorId: string]: CreatorPaymentData;
	  }; 
}

export interface Creator {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	id: any;
	name: string;
	avatar: string;
	pricing: {
		oneVideo: number;
		threeVideos: number;
		fiveVideos: number;
		bulkVideos: number;
	};
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

interface CostBreakdown {
	budgetPerVideo: number;
	totalBudget: number;
	totalAmount: number;
	commissionPerSale: string;
}

export interface ProjectFormData {
	projectTitle: string;
	brandEmail: string;
	paidfalse: boolean;
	paymentAmount: null;
	views: number;
	participantsCount: number;
	applicantsCount: number;
	userId: string;
	projectId: string;
	interestId: string;
	status: ProjectStatus;
	applicationCreatedAt?: { _seconds: number; _nanoseconds: number } | string;
	interestCreatedAt?: { _seconds: number; _nanoseconds: number } | string;
	projectDetails: ProjectDetails;
	projectRequirements: ProjectRequirements;
	creatorPricing: CreatorPricing;
	createdAt?: string | { _seconds: number };
	updatedAt?: string | { _seconds: number };
}
