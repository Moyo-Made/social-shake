export type CriteriaType = "views" | "likes" | "impressions" | "gmv-sales";

export interface PrizePoolProps {
  totalBudget: number;
  setTotalBudget: (value: number) => void;
  winnerCount: number;
  setWinnerCount: (value: number) => void;
  positions: number[];
  setPositions: (positions: number[]) => void;
}

export interface ContestDurationProps {
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
}

export interface LeaderboardCriteriaProps {
  criteria: CriteriaType;
  setCriteria: (criteria: CriteriaType) => void;
}