"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import BillingPage from "./billingPayments/Billing";
import ProjectPreference from "./ProjectPreference";
import NotificationPreferences from "./notification/NotificationsPreferences";
import SecurityPage from "./SecurityPage";
import { countries } from "@/types/countries";
import SubscriptionManager from "../subscription/SubscriptionManager";

// Interface for social media data
interface SocialMedia {
	facebook: string;
	instagram: string;
	tiktok: string;
}

// Interface for the profile data
interface BrandProfileData {
	brandName: string;
	phoneNumber: string;
	email: string;
	address: string;
	website: string;
	industry: string;
	logoUrl?: string;
	marketingGoal: string;
	otherGoal?: string;
	socialMedia: SocialMedia;
	country?: string;
	targetAudience: string;
	userId?: string;
	createdAt: string;
	updatedAt: string;
}

// Tabs interface
interface TabItem {
	id: string;
	label: string;
}

// API functions
const fetchBrandProfile = async (email: string): Promise<BrandProfileData> => {
	const response = await fetch(
		`/api/brand-profile?email=${encodeURIComponent(email)}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error("Failed to fetch brand profile: " + errorText);
	}

	const data = await response.json();

	// Updated logic to prioritize flattened fields over the nested object
	const socialMedia: SocialMedia = {
		facebook: data["socialMedia.facebook"] || data.socialMedia?.facebook || "",
		instagram: data["socialMedia.instagram"] || data.socialMedia?.instagram || "",
		tiktok: data["socialMedia.tiktok"] || data.socialMedia?.tiktok || "",
	};

	return {
		...data,
		socialMedia,
	} as BrandProfileData;
};

const updateBrandProfile = async (profileData: BrandProfileData): Promise<BrandProfileData> => {
	const dataToSend = {
		...profileData,
		// Ensure socialMedia is an object, not individual dot-notation fields
		socialMedia: {
			facebook: profileData.socialMedia?.facebook || "",
			instagram: profileData.socialMedia?.instagram || "",
			tiktok: profileData.socialMedia?.tiktok || "",
		},
	};

	const response = await fetch("/api/brand-profile", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(dataToSend),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to update profile");
	}

	return await response.json();
};

const uploadLogo = async (file: File, email: string): Promise<{ logoUrl: string }> => {
	const uploadData = new FormData();
	uploadData.append("logo", file);
	uploadData.append("email", email);

	const response = await fetch("/api/brand-profile", {
		method: "POST",
		body: uploadData,
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to upload logo");
	}

	const data = await response.json();
	
	if (!data.data?.logoUrl) {
		throw new Error("Logo URL not found in response");
	}

	return { logoUrl: data.data.logoUrl };
};

const AccountSettings: React.FC = () => {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<string>("account");
	const [formData, setFormData] = useState<BrandProfileData | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Query for fetching brand profile
	const {
		data: profileData,
		isLoading,
		error: queryError,
		isError
	} = useQuery({
		queryKey: ["brandProfile", currentUser?.email],
		queryFn: () => {
			if (!currentUser?.email) {
				throw new Error("User email is undefined");
			}
			return fetchBrandProfile(currentUser.email);
		},
		enabled: !!currentUser?.email,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
	});

	// Mutation for updating brand profile
	const updateProfileMutation = useMutation({
		mutationFn: updateBrandProfile,
		onSuccess: (data) => {
			// Update the cache with new data
			queryClient.setQueryData(["brandProfile", currentUser?.email], data);
			setSuccessMessage("Profile updated successfully");
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				setSuccessMessage(null);
			}, 3000);
		},
		onError: (error: Error) => {
			console.error("Update profile error:", error);
		},
	});

	// Mutation for uploading logo
	const uploadLogoMutation = useMutation({
		mutationFn: ({ file, email }: { file: File; email: string }) => 
			uploadLogo(file, email),
		onSuccess: (data) => {
			// Update form data with new logo URL
			setFormData((prevFormData) => ({
				...prevFormData!,
				logoUrl: data.logoUrl,
			}));

			// Clean up the preview
			if (imagePreview) {
				URL.revokeObjectURL(imagePreview);
				setImagePreview(null);
			}

			setSuccessMessage("Logo uploaded successfully");

			// Invalidate and refetch the profile data to get the latest logoUrl
			queryClient.invalidateQueries({ queryKey: ["brandProfile", currentUser?.email] });
			
			setTimeout(() => {
				setSuccessMessage(null);
			}, 3000);
		},
		onError: (error: Error) => {
			console.error("Upload logo error:", error);
		},
	});

	// Initialize form data when profile data is loaded
	useEffect(() => {
		if (profileData && !formData) {
			setFormData(profileData);
		}
	}, [profileData, formData]);

	// Define available tabs
	const tabs: TabItem[] = [
		{ id: "account", label: "Account Settings" },
		{ id: "billing", label: "Billing & Payments" },
		{ id: "project", label: "Project Preference" },
		{ id: "manage-subscriptions", label: "Manage Subscriptions" },
		{ id: "notifications", label: "Notifications & Alerts" },
		{ id: "security", label: "Security & Privacy" },
	];

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		if (name.startsWith("socialMedia.")) {
			const socialMediaKey = name.split(".")[1] as keyof SocialMedia;
			setFormData({
				...formData!,
				socialMedia: {
					...formData!.socialMedia,
					[socialMediaKey]: value,
				},
			});
		} else {
			setFormData({
				...formData!,
				[name]: value,
			});
		}
	};

	const handleSelectChange = (value: string) => {
		setFormData({
			...formData!,
			country: value,
		});
	};

	const handleSaveChanges = async () => {
		if (!formData || !currentUser?.email) return;

		const dataToSave = {
			...formData,
			email: currentUser.email,
		};

		updateProfileMutation.mutate(dataToSave);
	};

	const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || !e.target.files[0] || !currentUser?.email) return;

		const file = e.target.files[0];

		// Create a preview URL
		const previewUrl = URL.createObjectURL(file);
		setImagePreview(previewUrl);

		uploadLogoMutation.mutate({ file, email: currentUser.email });
	};

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			if (imagePreview) {
				URL.revokeObjectURL(imagePreview);
			}
		};
	}, [imagePreview]);

	// Handle loading state
	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading account settings...
			</div>
		);
	}

	// Handle error state
	const error = isError ? (queryError as Error)?.message : 
		updateProfileMutation.error?.message || 
		uploadLogoMutation.error?.message;

	return (
		<div className="flex flex-col md:flex-row w-full">
			{/* Left sidebar for tabs */}
			<div className="w-full md:w-64  p-6">
				<div className="flex flex-col space-y-2">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`text-left p-3 rounded-md ${
								activeTab === tab.id
									? "text-[#FD5C02] bg-[#FFF4EE] border-b-2 border-[#FC52E4] rounded-none"
									: "text-[#667085] hover:bg-gray-100"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Main content area */}
			<div className="flex-1 p-6 ">
				{/* Account Settings Tab */}
				{activeTab === "account" && (
					<div className="bg-white border border-[#FFD9C3] rounded-lg p-6 md:w-[50rem] max-w-4xl mx-auto">
						<h2 className="text-2xl font-medium mb-2">Account Settings</h2>
						<p className="text-gray-500 mb-2">
							Manage your brand details and contact information
						</p>
						<hr className="my-4" />

						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
								{error}
							</div>
						)}

						{successMessage && (
							<div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
								{successMessage}
							</div>
						)}

						<div className="mb-6">
							<label className="block mb-2 font-medium">Brand Logo</label>
							<div className="flex items-center space-x-4">
								<div className="w-24 h-24 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full">
									{formData?.logoUrl || imagePreview ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={imagePreview || formData?.logoUrl}
											alt="Brand Logo"
											className="max-w-full max-h-full"
										/>
									) : (
										<div className="w-full h-full bg-[url('/pattern-bg.png')] bg-repeat"></div>
									)}
								</div>
								<div>
									<label
										htmlFor="logo-upload"
										className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md inline-flex items-center cursor-pointer"
									>
										{uploadLogoMutation.isPending ? "Uploading..." : "Upload Logo"} 
										<span className="ml-2">↑</span>
										<input
											id="logo-upload"
											type="file"
											className="hidden"
											accept="image/png,image/jpeg"
											onChange={handleLogoUpload}
											disabled={uploadLogoMutation.isPending}
										/>
									</label>
									<p className="text-gray-500 text-sm mt-2">
										Recommended: 400×400px, PNG or JPG
									</p>
								</div>
							</div>
						</div>

						<div className="mb-6">
							<label htmlFor="brandName" className="block mb-2 font-medium">
								Brand Name
							</label>
							<Input
								id="brandName"
								name="brandName"
								value={formData?.brandName || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div>
								<label htmlFor="phoneNumber" className="block mb-2 font-medium">
									Phone Number
								</label>
								<Input
									id="phoneNumber"
									name="phoneNumber"
									value={formData?.phoneNumber || ""}
									onChange={handleInputChange}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="email" className="block mb-2 font-medium">
									Company Email Address
								</label>
								<Input
									id="email"
									name="email"
									value={formData?.email || ""}
									onChange={handleInputChange}
									className="w-full"
								/>
							</div>
						</div>

						<div className="mb-6">
							<label htmlFor="address" className="block mb-2 font-medium">
								Company Address
							</label>
							<Input
								id="address"
								name="address"
								value={formData?.address || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="website" className="block mb-2 font-medium">
								Company&apos;s Website
							</label>
							<Input
								id="website"
								name="website"
								value={formData?.website || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<Label htmlFor="country" className="block mb-2 font-medium">
								Country
							</Label>
							<Select
								onValueChange={handleSelectChange}
								value={formData?.country || ""}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a country" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									{countries.map((country) => (
										<SelectItem key={country.code} value={country.name}>
											{country.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="mb-6">
							<label className="block mb-2 font-medium">
								Social Media Handles
							</label>
							<div className="space-y-4">
								<div className="relative w-full">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
										<Image
											src="/icons/tiktok.svg"
											alt="Tiktok"
											className="w-4 h-4"
											width={4}
											height={4}
										/>
									</div>
									<Input
										name="socialMedia.tiktok"
										value={formData?.socialMedia?.tiktok || ""}
										onChange={handleInputChange}
										placeholder="@social_shake"
										className="pl-10"
									/>
								</div>
								<div className="relative w-full">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
										<Image
											src="/icons/ig.svg"
											alt="Instagram"
											className="w-4 h-4"
											width={4}
											height={4}
										/>
									</div>
									<Input
										name="socialMedia.instagram"
										value={formData?.socialMedia?.instagram || ""}
										onChange={handleInputChange}
										placeholder="@social_shake"
										className="pl-10"
									/>
								</div>
								<div className="relative w-full">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
										<Image
											src="/icons/facebook.svg"
											alt="Facebook"
											className="w-4 h-4"
											width={4}
											height={4}
										/>
									</div>
									<Input
										name="socialMedia.facebook"
										value={formData?.socialMedia?.facebook || ""}
										onChange={handleInputChange}
										placeholder="@social_shake"
										className="pl-10"
									/>
								</div>
							</div>
						</div>

						<div className="mb-6">
							<label
								htmlFor="targetAudience"
								className="block mb-2 font-medium"
							>
								Who is your target audience?
							</label>
							<Input
								id="targetAudience"
								name="targetAudience"
								value={formData?.targetAudience || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="flex justify-end">
							<Button
								onClick={handleSaveChanges}
								className="bg-[#FD5C02] hover:bg-orange-600 text-white px-6"
								disabled={updateProfileMutation.isPending}
							>
								{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</div>
				)}

				{/* Billing & Payments Tab */}
				{activeTab === "billing" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<BillingPage />
					</div>
				)}

				{/* Project Preference Tab */}
				{activeTab === "project" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<ProjectPreference />
					</div>
				)}

				{activeTab === "manage-subscriptions" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<SubscriptionManager userId={currentUser?.uid || ""} />
					</div>
				)}

				{/* Notifications & Alerts Tab */}
				{activeTab === "notifications" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<NotificationPreferences />
					</div>
				)}

				{/* Security & Privacy Tab */}
				{activeTab === "security" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<SecurityPage />
					</div>
				)}
			</div>
		</div>
	);
};

export default AccountSettings;