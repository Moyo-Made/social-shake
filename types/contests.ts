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