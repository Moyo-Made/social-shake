"use client";

import {
	BasicFormData,
	ContestFormData,
	PrizeTimelineFormData,
	RequirementsFormData,
} from "@/types/contestFormData";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
		contestType: "leaderboard",
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
	incentives: [],
};

interface ContestFormContextType {
	formData: ContestFormData;
	updateBasicData: (data: Partial<BasicFormData>) => void;
	updateRequirementsData: (data: Partial<RequirementsFormData>) => void;
	updatePrizeTimelineData: (data: Partial<PrizeTimelineFormData>) => void;
	updateIncentivesData: (incentives: Incentive[]) => void;
	saveDraft: () => void;
	resetDraft: () => void; // New method to reset draft
	draftSaved: boolean;
	setDraftSaved: (saved: boolean) => void;
}

const ContestFormContext = createContext<ContestFormContextType | undefined>(
	undefined
);

export const useContestForm = () => {
	const context = useContext(ContestFormContext);
	if (!context) {
		throw new Error("useContestForm must be used within a ContestFormProvider");
	}
	return context;
};

export const ContestFormProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [formData, setFormData] = useState<ContestFormData>(defaultFormData);
	const [draftSaved, setDraftSaved] = useState(false);

	// Load data from localStorage on first render
	useEffect(() => {
		const savedData = localStorage.getItem("contestFormDraft");
		if (savedData) {
			try {
				const parsedData = JSON.parse(savedData);

				console.log("Loaded data from localStorage:", parsedData);

				// Ensure contest type is consistent
				if (parsedData.basic?.contestType) {
					parsedData.contestType = parsedData.basic.contestType;
				}

				// Handle dates - convert string dates back to Date objects
				if (parsedData.prizeTimeline.startDate) {
					parsedData.prizeTimeline.startDate = new Date(
						parsedData.prizeTimeline.startDate
					);
				}
				if (parsedData.prizeTimeline.endDate) {
					parsedData.prizeTimeline.endDate = new Date(
						parsedData.prizeTimeline.endDate
					);
				}

				// We can't restore the File object from localStorage, so we keep it null
				parsedData.basic.thumbnail = null;

				// Force default contest type if not set
				parsedData.basic.contestType =
					parsedData.basic.contestType || "leaderboard";
				parsedData.contestType = parsedData.basic.contestType;

				console.log("Processed data:", parsedData);

				setFormData(parsedData);
			} catch (error) {
				console.error("Error parsing saved form data:", error);
				// Fallback to default if parsing fails
				setFormData(defaultFormData);
			}
		}
	}, []);

	// Improved update method with more explicit state management
	const updateBasicData = useCallback((data: Partial<BasicFormData>) => {
		console.log("Context - Updating Basic Data:", data);

		setFormData((prevData) => {
			// Create a completely new object to ensure re-render
			const updatedData: ContestFormData = {
				...prevData,
				basic: {
					...prevData.basic,
					...data,
				},
			};

			// Explicitly update top-level contest type if changed
			if (data.contestType) {
				updatedData.contestType = data.contestType;
				console.log("Context - Updated Contest Type:", data.contestType);
			}

			// Save to localStorage immediately
			try {
				localStorage.setItem("contestFormDraft", JSON.stringify(updatedData));
				console.log("Context - Saved to localStorage:", updatedData);
			} catch (error) {
				console.error("Error saving to localStorage:", error);
			}

			return updatedData;
		});

		setDraftSaved(false);
	}, []);

	const updateRequirementsData = (data: Partial<RequirementsFormData>) => {
		setFormData((prev) => ({
			...prev,
			requirements: { ...prev.requirements, ...data },
		}));
		setDraftSaved(false);
	};

	const updatePrizeTimelineData = (data: Partial<PrizeTimelineFormData>) => {
		setFormData((prev) => ({
			...prev,
			prizeTimeline: { ...prev.prizeTimeline, ...data },
		}));
		setDraftSaved(false);
	};

	const updateIncentivesData = (incentives: Incentive[]) => {
		setFormData((prev) => ({
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

	// New method to reset draft and local storage
	const resetDraft = () => {
		localStorage.removeItem("contestFormDraft");
		setFormData(defaultFormData);
		setDraftSaved(false);
	};

	return (
		<ContestFormContext.Provider
			value={{
				formData,
				updateBasicData,
				updateRequirementsData,
				updatePrizeTimelineData,
				updateIncentivesData,
				saveDraft,
				resetDraft,
				draftSaved,
				setDraftSaved,
			}}
		>
			{children}
		</ContestFormContext.Provider>
	);
};
