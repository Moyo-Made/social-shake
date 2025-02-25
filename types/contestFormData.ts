
export interface BasicFormData {
	contestName: string;
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
  
  export interface ContestFormData {
	basic: BasicFormData;
	requirements: RequirementsFormData;
	prizeTimeline: PrizeTimelineFormData;
  }