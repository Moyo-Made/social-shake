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
import { CreatorProfileData } from "@/types/creators";
import { Textarea } from "@/components/ui/textarea";
import { countries } from "@/types/countries";
import SecurityPage from "./SecurityPage";
import PayoutPage from "./payouts/PayoutPage";
import NotificationPreferences from "./notification/NotificationPreferences";
import ShippingAddressPage from "./shippingDetails/ShippingDetails";

// Tabs interface
interface TabItem {
	id: string;
	label: string;
}

// API functions
const fetchCreatorProfile = async (email: string): Promise<CreatorProfileData> => {
	const response = await fetch(
		`/api/creator-profile?email=${encodeURIComponent(email)}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error("Failed to fetch creator profile: " + errorText);
	}

	return response.json();
};

const updateCreatorProfile = async (data: CreatorProfileData & { email: string }): Promise<CreatorProfileData> => {
	const response = await fetch("/api/creator-profile", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "Failed to update profile");
	}

	return response.json();
};

const uploadProfilePicture = async (file: File, email: string): Promise<{ logoUrl: string }> => {
	const uploadData = new FormData();
	uploadData.append("logo", file);
	uploadData.append("email", email);

	const response = await fetch(`/api/creator-profile/profile-picture`, {
		method: "POST",
		body: uploadData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		try {
			const errorData = JSON.parse(errorText);
			throw new Error(errorData.error || "Failed to upload logo");
		} catch {
			throw new Error(`Upload failed: ${errorText}`);
		}
	}

	return response.json();
};

const AccountSettings: React.FC = () => {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<string>("account");
	const [formData, setFormData] = useState<CreatorProfileData | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [charCount, setCharCount] = useState<number>(0);
	const [contentLinks, setContentLinks] = useState<string[]>([""]);

	// Define available tabs
	const tabs: TabItem[] = [
		{ id: "account", label: "General Settings" },
		{ id: "shipping-details", label: "Shipping Details" },
		{ id: "security", label: "Security & Login" },
		{ id: "payments", label: "Stripe Connect" },
		{ id: "notifications", label: "Notifications" },
	];

	// Query for fetching creator profile
	const {
		data: profileData,
		isLoading,
		error: queryError,
		isError
	} = useQuery({
		queryKey: ['creator-profile', currentUser?.email],
		queryFn: () => fetchCreatorProfile(currentUser!.email),
		enabled: !!currentUser?.email,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Mutation for updating profile
	const updateProfileMutation = useMutation({
		mutationFn: updateCreatorProfile,
		onSuccess: (data) => {
			// Update the cache with new data
			queryClient.setQueryData(['creator-profile', currentUser?.email], data);
			
			// Dispatch custom event to notify other components
			window.dispatchEvent(new Event("creator-profile-updated"));
		},
		onError: (error) => {
			console.error("Profile update failed:", error);
		}
	});

	// Mutation for uploading profile picture
	const uploadPictureMutation = useMutation({
		mutationFn: ({ file, email }: { file: File; email: string }) => 
			uploadProfilePicture(file, email),
		onSuccess: (data) => {
			// Update the current form data with new logo URL
			setFormData(prev => prev ? { ...prev, logoUrl: data.logoUrl } : null);
			
			// Update the cache
			queryClient.setQueryData(['creator-profile', currentUser?.email], (oldData: CreatorProfileData) => ({
				...oldData,
				logoUrl: data.logoUrl
			}));
		},
		onError: (error) => {
			console.error("Profile picture upload failed:", error);
		}
	});

	// Initialize form data when profile data is loaded
	useEffect(() => {
		if (profileData) {
			setFormData(profileData);
			
			// Initialize content links
			const links = profileData.contentLinks || [];
			setContentLinks(links.length > 0 ? links : [""]);
			
			// Initialize bio char count
			if (profileData.bio) {
				setCharCount(profileData.bio.length);
			}
		}
	}, [profileData]);

	const handleSelectChange = (value: string) => {
		setFormData(prev => prev ? { ...prev, country: value } : null);
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;

		if (name.startsWith("socialMedia.")) {
			const socialMediaKey = name.split(".")[1];
			setFormData(prev => prev ? {
				...prev,
				socialMedia: {
					...prev.socialMedia,
					[socialMediaKey]: value || "",
				} as Required<CreatorProfileData>["socialMedia"],
			} : null);
		} else if (name.startsWith("pricing.")) {
			const pricingKey = name.split(".")[1];
			setFormData(prev => {
				if (!prev) return null;
				return {
					...prev,
					pricing: {
						...(prev.pricing || {}),
						[pricingKey]: pricingKey.includes("Note")
							? value
							: value === ""
								? undefined
								: Number(value) || 0,
					},
				};
			});
		} else {
			setFormData(prev => prev ? { ...prev, [name]: value } : null);
		}
	};

	const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const text = e.target.value;
		if (text.length <= 500) {
			setFormData(prev => prev ? { ...prev, bio: text } : null);
			setCharCount(text.length);
		}
	};

	const handleContentLinkChange = (index: number, value: string) => {
		const newLinks = [...contentLinks];
		newLinks[index] = value;
		setContentLinks(newLinks);
		setFormData(prev => prev ? { ...prev, contentLinks: newLinks } : null);
	};

	const addContentLink = () => {
		setContentLinks([...contentLinks, ""]);
	};

	const removeContentLink = (index: number) => {
		if (contentLinks.length > 1) {
			const newLinks = contentLinks.filter((_, i) => i !== index);
			setContentLinks(newLinks);
			setFormData(prev => prev ? { ...prev, contentLinks: newLinks } : null);
		}
	};

	const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || !e.target.files[0] || !currentUser?.email) return;

		const file = e.target.files[0];
		const previewUrl = URL.createObjectURL(file);
		setImagePreview(previewUrl);

		uploadPictureMutation.mutate({ file, email: currentUser.email });
	};

	const handleSaveChanges = async () => {
		if (!formData || !currentUser?.email) return;

		const dataToSend = {
			...formData,
			email: currentUser.email,
			socialMedia: {
				facebook: formData.socialMedia?.facebook || "",
				instagram: formData.socialMedia?.instagram || "",
				twitter: formData.socialMedia?.twitter || "",
				youtube: formData.socialMedia?.youtube || "",
				tiktok: formData.socialMedia?.tiktok || formData.tiktokUrl || "",
			},
			contentLinks: contentLinks.filter((link) => link.trim().length > 0),
		};

		updateProfileMutation.mutate(dataToSend);
	};

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			if (imagePreview) {
				URL.revokeObjectURL(imagePreview);
			}
		};
	}, [imagePreview]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading account settings...
			</div>
		);
	}

	// Error state
	const error = isError ? (queryError as Error)?.message : null;

	return (
		<div className="flex min-h-screen w-full">
			{/* Left sidebar for tabs */}
			<div className="md:w-64 min-w-[200px] p-6 ">
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
			<div className="flex-1 p-6 overflow-auto">
				{/* Account Settings Tab */}
				{activeTab === "account" && (
					<div className="bg-white border border-[#FFD9C3] rounded-lg p-6 w-[50rem] max-w-4xl mx-auto">
						<h2 className="text-2xl font-medium mb-2">General Settings</h2>
						<p className="text-gray-500 mb-2">
							Update your profile information and preferences
						</p>
						<hr className="my-4" />

						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
								{error}
							</div>
						)}

						{updateProfileMutation.isError && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
								{(updateProfileMutation.error as Error)?.message}
							</div>
						)}

						{uploadPictureMutation.isError && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
								{(uploadPictureMutation.error as Error)?.message}
							</div>
						)}

						{updateProfileMutation.isSuccess && (
							<div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
								Profile updated successfully
							</div>
						)}

						{uploadPictureMutation.isSuccess && (
							<div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
								Profile picture uploaded successfully
							</div>
						)}

						<div className="mb-6">
							<label className="block mb-2 font-medium">Profile Picture</label>
							<div className="flex items-center space-x-4">
								<div className="w-24 h-24 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full overflow-hidden">
									{formData?.logoUrl || formData?.profilePictureUrl || imagePreview ? (
										<Image
											src={imagePreview || formData?.logoUrl || formData?.profilePictureUrl ||""}
											alt="Creator Profile Picture"
											className="w-full h-full object-cover"
											width={96}
											height={96}
											key={imagePreview || formData?.logoUrl}
										/>
									) : (
										<div className="w-full h-full bg-[url('/pattern-bg.png')] bg-repeat"></div>
									)}
								</div>
								<div>
									<label
										htmlFor="logo-upload"
										className="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-md inline-flex items-center cursor-pointer"
									>
										Upload Profile Picture <span className="ml-2">↑</span>
										<input
											id="logo-upload"
											type="file"
											className="hidden"
											accept="image/png,image/jpeg"
											onChange={handleLogoUpload}
											disabled={uploadPictureMutation.isPending}
										/>
									</label>
									{uploadPictureMutation.isPending && (
										<p className="text-blue-500 text-sm mt-2">Uploading...</p>
									)}
									<p className="text-gray-500 text-sm mt-2">
										Upload a clear, professional photo to help brands recognize
										you.
									</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div>
								<label htmlFor="firstName" className="block mb-2 font-medium">
									First Name
								</label>
								<Input
									id="firstName"
									name="firstName"
									value={formData?.firstName || ""}
									onChange={handleInputChange}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="lastName" className="block mb-2 font-medium">
									Last Name
								</label>
								<Input
									id="lastName"
									name="lastName"
									value={formData?.lastName || ""}
									onChange={handleInputChange}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="username" className="block mb-2 font-medium">
									Username
								</label>
								<Input
									id="username"
									name="username"
									value={formData?.username || ""}
									onChange={handleInputChange}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="email" className="block mb-2 font-medium">
									Email Address
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
							<label htmlFor="bio" className="block mb-2 font-medium">
								Your bio
							</label>
							<Textarea
								id="bio"
								name="bio"
								value={formData?.bio || ""}
								onChange={handleBioChange}
								className="w-full"
								rows={4}
							/>
							<p
								className={`text-sm ${
									charCount > 450
										? charCount > 480
											? "text-red-500"
											: "text-orange-500"
										: "text-gray-500"
								}`}
							>
								{charCount}/500
							</p>
						</div>

						<div className="mb-6">
							<Label htmlFor="country" className="block mb-2 font-medium">
								Your Country
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
							<label htmlFor="language" className="block mb-2 font-medium">
								Your Language
							</label>
							<Input
								id="language"
								name="language"
								value={formData?.languages || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="tiktok" className="block mb-2 font-medium">
								Your TikTok Profile URL
							</label>
							<Input
								id="tiktok"
								name="tiktok"
								value={formData?.socialMedia?.tiktok || ""}
								onChange={handleInputChange}
								className="w-full"
								placeholder="https://www.tiktok.com/@username"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="ethnicity" className="block mb-2 font-medium">
								Your Ethnicity
							</label>
							<Input
								id="ethnicity"
								name="ethnicity"
								value={formData?.ethnicity || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="dateOfBirth" className="block mb-2 font-medium">
								Your Date of Birth
							</label>
							<Input
								id="dateOfBirth"
								name="dateOfBirth"
								value={formData?.dateOfBirth || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="gender" className="block mb-2 font-medium">
								Your Gender
							</label>
							<Input
								id="gender"
								name="gender"
								type="text"
								value={formData?.gender || ""}
								onChange={handleInputChange}
								className="w-full"
							/>
						</div>

						<div className="mb-6">
							<label htmlFor="contentTypes" className="block mb-2 font-medium">
								What type of content do you specialize in?
							</label>
							<Textarea
								id="contentTypes"
								name="contentTypes"
								value={formData?.contentTypes}
								onChange={handleInputChange}
								className="w-full"
								placeholder="E.g., Fashion, Beauty, Tech Reviews, Cooking, etc."
							/>
						</div>

						<div className="mb-6">
							<label className="block mb-2 font-medium">
								Paste links of your best TikToks to build your portfolio
							</label>
							<div className="space-y-3">
								{contentLinks.map((link, index) => (
									<div key={index} className="flex gap-2">
										<Input
											value={link}
											onChange={(e) =>
												handleContentLinkChange(index, e.target.value)
											}
											placeholder="https://www.tiktok.com/@username/video/1234567890"
											className="flex-1"
										/>
										<Button
											type="button"
											variant="outline"
											onClick={() => removeContentLink(index)}
											className="px-3"
										>
											✕
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									onClick={addContentLink}
									className="w-full border-dashed"
								>
									+ Add another link
								</Button>
							</div>
						</div>

						{/* Pricing information */}
						<div className="mb-6">
							<h3 className="text-lg font-medium mb-4">Your Pricing</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label htmlFor="oneVideo" className="block mb-2 font-medium">
										One Video ($)
									</label>
									<Input
										id="oneVideo"
										name="pricing.oneVideo"
										type="number"
										value={formData?.pricing?.oneVideo || 0}
										onChange={handleInputChange}
										className="w-full"
										min="0"
									/>
								</div>
								<div>
									<label
										htmlFor="threeVideos"
										className="block mb-2 font-medium"
									>
										Three Videos ($)
									</label>
									<Input
										id="threeVideos"
										name="pricing.threeVideos"
										type="number"
										value={formData?.pricing?.threeVideos || 0}
										onChange={handleInputChange}
										className="w-full"
										min="0"
									/>
								</div>
								<div>
									<label
										htmlFor="fiveVideos"
										className="block mb-2 font-medium"
									>
										Five Videos ($)
									</label>
									<Input
										id="fiveVideos"
										name="pricing.fiveVideos"
										type="number"
										value={formData?.pricing?.fiveVideos || 0}
										onChange={handleInputChange}
										className="w-full"
										min="0"
									/>
								</div>
								<div>
									<label
										htmlFor="bulkVideos"
										className="block mb-2 font-medium"
									>
										Bulk Videos ($)
									</label>
									<Input
										id="bulkVideos"
										name="pricing.bulkVideos"
										type="number"
										value={formData?.pricing?.bulkVideos || 0}
										onChange={handleInputChange}
										className="w-full"
										min="0"
									/>
								</div>
							</div>
							<div className="mt-4">
								<label
									htmlFor="bulkVideosNote"
									className="block mb-2 font-medium"
								>
									Notes on Bulk Pricing
								</label>
								<Textarea
									id="bulkVideosNote"
									name="pricing.bulkVideosNote"
									value={formData?.pricing?.bulkVideosNote || ""}
									onChange={handleInputChange}
									className="w-full"
									placeholder="Add any specific details about your bulk pricing here"
								/>
							</div>
						</div>

						<div className="mb-6">
							<label className="block mb-2 font-medium">
								Social Media Handles
							</label>
							<div className="space-y-4">
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

								<div className="relative w-full">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
										<Image
											src="/icons/x.svg"
											alt="Twitter"
											className="w-4 h-4"
											width={4}
											height={4}
										/>
									</div>
									<Input
										name="socialMedia.twitter"
										value={formData?.socialMedia?.twitter || ""}
										onChange={handleInputChange}
										placeholder="@social_shake"
										className="pl-10"
									/>
								</div>

								<div className="relative w-full">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
										<Image
											src="/icons/youtube.svg"
											alt="Youtube"
											className="w-4 h-4"
											width={4}
											height={4}
										/>
									</div>
									<Input
										name="socialMedia.youtube"
										value={formData?.socialMedia?.youtube || ""}
										onChange={handleInputChange}
										placeholder="@social_shake"
										className="pl-10"
									/>
								</div>
							</div>
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

				{/* Other tabs remain the same */}
				{activeTab === "shipping-details" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<ShippingAddressPage />
					</div>
				)}

				{activeTab === "security" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<SecurityPage />
					</div>
				)}

				{activeTab === "payments" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<PayoutPage />
					</div>
				)}

				{activeTab === "notifications" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<NotificationPreferences />
					</div>
				)}
			</div>
		</div>
	);
};

export default AccountSettings;