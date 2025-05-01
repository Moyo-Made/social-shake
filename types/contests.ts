import { ContestType } from "./contestFormData";

export interface ContestData {
	id: string;
	contestType: string;
	contestTitle: string;
	contestStatus: "Active" | "Draft" | "Completed" | "Scheduled" | "Expired";
	startDate: string;
	endDate: string;
	totalBudget: number;
	publishedDate: string;
	description: string;
	rules: string;
	industry: string;
	duration: string;
	videoType: string;
	clientScript: string;
	winnerCount: number;
	positions: number[];
	criteria: string;
	incentives: {
	  name: string;
	  worth: number;
	  description: string;
	}[];
  }
  
  export interface ContestViewProps {
	contestData: ContestData;
	contestId: string;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	formatDate: (date: string) => string;
  }
  
  export interface AllCreatorsViewProps extends ContestViewProps {
	joinCheckComplete: boolean;
	hasJoined: boolean;
	handleSubmitSuccess: () => void;
	isContestModalOpen: boolean;
	openContestModal: () => void;
	closeContestModal: () => void;
  }
  
  export interface ApplicationViewProps extends ContestViewProps {
	hasApplied: boolean;
	setHasApplied: (hasApplied: boolean) => void;
  }

  export interface Contest {
	views: number | undefined;
	id: string;
	userId: string;
	contestId: string;
	basic: {
	  contestName: string;
	  industry: string;
	  description: string;
	  rules: string;
	  thumbnail: string | null;
	  contestType: string;
	  thumbnailName?: string;
	};
	requirements: {
	  skills: string[] | undefined;
	  whoCanJoin: string;
	  duration: string;
	  videoType: string;
	  script: string;
	  contentLinks: string[];
	  brandAssets: string;
	  allowedPlatforms?: string[];
	  requiredCategories?: { id: string; name: string }[];
	  minFollowers?: number;
	  maxFollowers?: number | null;
	  experienceLevel?: string;
	  estimatedCompletionTime?: string | null;
	};
	prizeTimeline: {
	  totalBudget: number;
	  winnerCount: number;
	  positions: number[];
	  criteria: string;
	  startDate: string;
	  endDate: string;
	  applicationDeadline?: string;
	};
	contestType: ContestType | undefined;
	incentives: {
	  type: string;
	  details: string;
	  value: number;
	};
	status: string;
	createdAt: { _seconds: number; _nanoseconds: number } | string;
	updatedAt: { _seconds: number; _nanoseconds: number } | string;
	brandInfo?: {
	  brandId: string;
	  brandName: string;
	  brandLogo: string | null;
	  brandSlogan: string | null;
	};
	applicantsCount?: number;
	participantsCount?: number;
	joinedAt?: {
	  _seconds: number;
	  _nanoseconds: number;
	};
	applicationId?: string;
	interestId?: string;
	rejectionReason?: string;
	applicationCreatedAt?: { _seconds: number; _nanoseconds: number } | string;
	submissionCreatedAt?: { _seconds: number; _nanoseconds: number } | string;
	interestCreatedAt?: { _seconds: number; _nanoseconds: number } | string;
  }
