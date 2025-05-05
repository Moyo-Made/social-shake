"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProjectForm } from "@/components/brand/brandProjects/ProjectFormContext";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CreatorPricing } from "@/types/contestFormData";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ProjectPreference = () => {
	const { formData, updateProjectRequirementsData, updateCreatorPricing } =
		useProjectForm();
	const { creatorPricing } = formData;

	const { aspectRatio, duration, brandAssets } = formData.projectRequirements;
	const [selectionMethod, setSelectionMethod] = useState<
		CreatorPricing["selectionMethod"]
	>(creatorPricing.selectionMethod || "Invite Specific Creators");
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const { currentUser } = useAuth();

	// Fetch user preferences when component mounts
	useEffect(() => {
		const fetchUserPreferences = async () => {
			try {
				const userId = currentUser?.uid || "";
				if (!userId) {
					setIsLoading(false);
					return;
				}

				const response = await fetch(`/api/user-preferences?userId=${userId}`);
				if (response.ok) {
					const data = await response.json();
					if (data.success && data.data) {
						// Apply preferences to the form if they exist
						if (data.data.projectRequirements) {
							const prefs = data.data.projectRequirements;
							if (prefs.aspectRatio)
								updateProjectRequirementsData({
									aspectRatio: prefs.aspectRatio,
								});
							if (prefs.duration)
								updateProjectRequirementsData({ duration: prefs.duration });
							if (prefs.brandAssets)
								updateProjectRequirementsData({
									brandAssets: prefs.brandAssets,
								});
						}
						if (
							data.data.creatorPricing &&
							data.data.creatorPricing.selectionMethod
						) {
							setSelectionMethod(data.data.creatorPricing.selectionMethod);
							updateCreatorPricing({
								selectionMethod: data.data.creatorPricing.selectionMethod,
							});
						}
					}
				}
			} catch (error) {
				console.error("Error fetching user preferences:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserPreferences();
	}, [updateProjectRequirementsData, updateCreatorPricing, currentUser?.uid]);

	// Clear error message after 3 seconds
	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => {
				setError(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [error]);

	// Clear success message after 3 seconds (already implemented but moved to useEffect)
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => {
				setSuccessMessage(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [successMessage]);

	const updateAspectRatio = (value: string) => {
		updateProjectRequirementsData({ aspectRatio: value });
	};

	const updateDuration = (value: string) => {
		updateProjectRequirementsData({ duration: value });
	};

	const updateBrandAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateProjectRequirementsData({ brandAssets: e.target.value });
	};

	const updateSelectionMethod = (value: CreatorPricing["selectionMethod"]) => {
		setSelectionMethod(value);
		updateCreatorPricing({ selectionMethod: value });
	};

	const handleSavePreferences = async () => {
		setError(null);
		setSuccessMessage(null);
		try {
			setIsSaving(true);

			const userId = currentUser?.uid || "";
			if (!userId) {
				setError("User ID not found. Please log in again.");
				return;
			}

			// Prepare the data to save
			const preferencesData = {
				userId,
				projectRequirements: {
					aspectRatio,
					duration,
					brandAssets,
				},
				creatorPricing: {
					selectionMethod,
				},
			};

			// Save to your API
			const response = await fetch("/api/user-preferences", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(preferencesData),
			});

			const result = await response.json();

			if (result.success) {
				setSuccessMessage("Preferences saved successfully!");
			} else {
				setError(result.error || "Failed to save preferences");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading project preferences...
			</div>
		);
	}

	return (
		<div className=" bg-white border border-[#FFD9C3] flex flex-col rounded-lg p-6">
			<h2 className="text-2xl font-medium mb-2">Project Preferences</h2>
			<p className="text-gray-500 mb-3">
				Set default preferences for all your UGC projects
			</p>
			<hr className="my-4" />

			{/* Display error and success messages */}
			{error && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
					{error}
				</div>
			)}

			{successMessage && (
				<div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-md">
					{successMessage}
				</div>
			)}

			<div className="space-y-4">
				<div className="w-full">
					<Label className="text-base mb-1">Aspect Ratio?</Label>
					<RadioGroup
						className="flex flex-wrap gap-3 mt-2"
						value={aspectRatio}
						onValueChange={updateAspectRatio}
					>
						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={aspectRatio === "Vertical" ? "checked" : "unchecked"}
						>
							<RadioGroupItem value="Vertical" id="Vertical" className="" />
							<Label htmlFor="Vertical">9:16 (Vertical)</Label>
						</div>

						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={
								aspectRatio === "Horizontal" ? "checked" : "unchecked"
							}
						>
							<RadioGroupItem value="Horizontal" id="Horizontal" className="" />
							<Label htmlFor="Horizontal">16:9 (Horizontal)</Label>
						</div>

						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={aspectRatio === "Square" ? "checked" : "unchecked"}
						>
							<RadioGroupItem value="Square" id="Square" className="" />
							<Label htmlFor="Square">4:5 (Square)</Label>
						</div>
					</RadioGroup>
				</div>

				<div>
					<h2 className="text-base font-medium mb-1">
						How do you want to select Creators?
					</h2>

					<Select value={selectionMethod} onValueChange={updateSelectionMethod}>
						<SelectTrigger className="w-full border rounded-md">
							<SelectValue placeholder="Select method" />
						</SelectTrigger>
						<SelectContent className="bg-white">
							<SelectItem value="Invite Specific Creators">
								Invite Specific Creators
							</SelectItem>
							<SelectItem value="Post Public Brief">
								Post Public Brief
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label className="text-base mb-1">Duration?</Label>
					<RadioGroup
						className="flex flex-wrap gap-3 mt-2"
						value={duration}
						onValueChange={updateDuration}
					>
						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={duration === "15-seconds" ? "checked" : "unchecked"}
						>
							<RadioGroupItem value="15-seconds" id="15-seconds" className="" />
							<Label htmlFor="15-seconds">15 Seconds</Label>
						</div>

						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={duration === "30-seconds" ? "checked" : "unchecked"}
						>
							<RadioGroupItem value="30-seconds" id="30-seconds" className="" />
							<Label htmlFor="30-seconds">30 Seconds</Label>
						</div>

						<div
							className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
							data-state={duration === "60-seconds" ? "checked" : "unchecked"}
						>
							<RadioGroupItem value="60-seconds" id="60-seconds" className="" />
							<Label htmlFor="60-seconds">60 Seconds</Label>
						</div>
					</RadioGroup>
				</div>

				<div className="space-y-1">
					<Label className="text-base">Brand Assets</Label>
					<div className="flex gap-2">
						<Input
							type="text"
							placeholder="https://drive.google.com/file/d/1l31B5fb21SJf5P9LWNKW-pAF7kN7knTX/view?usp=sharing"
							value={brandAssets}
							onChange={updateBrandAssets}
						/>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon">
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Paste the Link of a folder containing your brand assets</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<p className="text-sm text-[#475467] pb-6">
						Paste the Link of a folder containing your brand assets
					</p>
				</div>

				<div className="flex justify-end">
					<Button
						className="w-fit bg-[#FD5C02] hover:bg-[#E55202] text-white font-medium py-3 rounded-md"
						onClick={handleSavePreferences}
						disabled={isSaving}
					>
						{isSaving ? "Saving..." : "Save Preferences"}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ProjectPreference;
