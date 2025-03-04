"use client";

import { BasicFormData, ContestFormData, PrizeTimelineFormData, RequirementsFormData } from "@/types/contestFormData";
import React, { createContext, useContext, useState, useEffect } from "react";

// Update the type for Incentive to match our previous implementation
export type Incentive = {
  name: string;
  worth: number;
  description: string;
  length: number;
};

const defaultFormData: ContestFormData = {
  basic: {
    contestName: "",
    industry: "",
    description: "",
    rules: "",
    thumbnail: null,
    contestType: "leaderboard"
  },
  requirements: {
    whoCanJoin: "allow-applications",
    duration: "30-seconds",
    videoType: "client-script",
    script: "",
    contentLinks: [""],
    brandAssets: "",
  },
  prizeTimeline: {
    totalBudget: 1500,
    winnerCount: 5,
    positions: [1000, 300, 100, 50, 50],
    startDate: undefined,
    endDate: undefined,
    criteria: "views",
  },
  contestType: "leaderboard",
  incentives: []
};

// Update the context type to include incentives method
interface ContestFormContextType {
  formData: ContestFormData;
  updateBasicData: (data: Partial<BasicFormData>) => void;
  updateRequirementsData: (data: Partial<RequirementsFormData>) => void;
  updatePrizeTimelineData: (data: Partial<PrizeTimelineFormData>) => void;
  updateIncentivesData: (incentives: Incentive[]) => void;
  saveDraft: () => void;
  draftSaved: boolean;
  setDraftSaved: (saved: boolean) => void;
}

const ContestFormContext = createContext<ContestFormContextType | undefined>(undefined);

export const useContestForm = () => {
  const context = useContext(ContestFormContext);
  if (!context) {
    throw new Error("useContestForm must be used within a ContestFormProvider");
  }
  return context;
};

export const ContestFormProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [formData, setFormData] = useState<ContestFormData>(defaultFormData);
  const [draftSaved, setDraftSaved] = useState(false);

  // Load data from localStorage on first render
  useEffect(() => {
    const savedData = localStorage.getItem("contestFormDraft");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Handle dates - convert string dates back to Date objects
        if (parsedData.prizeTimeline.startDate) {
          parsedData.prizeTimeline.startDate = new Date(parsedData.prizeTimeline.startDate);
        }
        if (parsedData.prizeTimeline.endDate) {
          parsedData.prizeTimeline.endDate = new Date(parsedData.prizeTimeline.endDate);
        }
        
        // We can't restore the File object from localStorage, so we keep it null
        parsedData.basic.thumbnail = null;
        
        setFormData(parsedData);
      } catch (error) {
        console.error("Error parsing saved form data:", error);
      }
    }
  }, []);

  const updateBasicData = (data: Partial<BasicFormData>) => {
    setFormData(prev => ({
      ...prev,
      basic: { ...prev.basic, ...data },
    }));
    setDraftSaved(false);
  };

  const updateRequirementsData = (data: Partial<RequirementsFormData>) => {
    setFormData(prev => ({
      ...prev,
      requirements: { ...prev.requirements, ...data },
    }));
    setDraftSaved(false);
  };

  const updatePrizeTimelineData = (data: Partial<PrizeTimelineFormData>) => {
    setFormData(prev => ({
      ...prev,
      prizeTimeline: { ...prev.prizeTimeline, ...data },
    }));
    setDraftSaved(false);
  };

  // New method to update incentives
  const updateIncentivesData = (incentives: Incentive[]) => {
    setFormData(prev => ({
      ...prev,
      incentives,
    }));
    setDraftSaved(false);
  };

  const saveDraft = () => {
    try {
      // Create a copy of formData that we can safely stringify
      const dataToSave = { ...formData };
      
      // Convert File object to a string representation of the filename
      if (formData.basic.thumbnail) {
        // @ts-expect-error - we're just saving the filename for display purposes
        dataToSave.basic.thumbnailName = formData.basic.thumbnail.name;
      }
      
      localStorage.setItem("contestFormDraft", JSON.stringify(dataToSave));
      setDraftSaved(true);
      
      // Reset the saved status after 3 seconds
      setTimeout(() => {
        setDraftSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  };

  return (
    <ContestFormContext.Provider value={{
      formData,
      updateBasicData,
      updateRequirementsData,
      updatePrizeTimelineData,
      updateIncentivesData,
      saveDraft,
      draftSaved,
      setDraftSaved
    }}>
      {children}
    </ContestFormContext.Provider>
  );
};