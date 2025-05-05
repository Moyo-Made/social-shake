"use client";

import React, { useState, useEffect } from "react";
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

const AccountSettings: React.FC = () => {
	const { currentUser } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("account");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [, setProfileData] = useState<CreatorProfileData | null>(null);
	const [formData, setFormData] = useState<CreatorProfileData | null>(null);

	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [charCount, setCharCount] = useState<number>(0);
	const [contentLinks, setContentLinks] = useState<string[]>([""]);

	// Define available tabs
	const tabs: TabItem[] = [
		{ id: "account", label: "General Settings" },
		{ id: "shipping-details", label: "Shipping Details" },
		{ id: "security", label: "Security & Login" },
		{ id: "payments", label: "Payment & Payouts" },
		{ id: "notifications", label: "Notifications" },
	];

	useEffect(() => {
		const fetchCreatorProfile = async (): Promise<void> => {
			if (!currentUser?.email) {
				console.warn("No user email found");
				setIsLoading(false);
				return;
			}

			try {
				console.log("Fetching creator profile for email:", currentUser.email);

				// Use the new complete profile endpoint
				const response = await fetch(
					`/api/admin/creator-approval?email=${encodeURIComponent(currentUser.email)}`,
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

				const responseData = await response.json();
				console.log("Fetched profile data:", responseData);

				// Extract the current creator's data from the response
				// The response includes an array of creators in the "creators" property
				let creatorData = null;

				if (responseData.creators && Array.isArray(responseData.creators)) {
					// Find the creator that matches the current user's email
					creatorData = responseData.creators.find(
						(creator: { email: string }) => creator.email === currentUser.email
					);
				} else if (responseData.email === currentUser.email) {
					// If the response is already a single creator object
					creatorData = responseData;
				}

				if (!creatorData) {
					throw new Error("Creator profile not found");
				}

				console.log("Current creator data:", creatorData);

				// Initialize content links array from data
				const links = creatorData.contentLinks || [];
				setContentLinks(links.length > 0 ? links : [""]);

				// Initialize bio char count
				if (creatorData.bio) {
					setCharCount(creatorData.bio.length);
				}

				setProfileData(creatorData);
				setFormData(creatorData);
			} catch (err) {
				console.error("Detailed error fetching creator profile:", err);
				setError(err instanceof Error ? err.message : "Failed to load profile");
			} finally {
				setIsLoading(false);
			}
		};

		fetchCreatorProfile();
	}, [currentUser]);

	const handleSelectChange = (value: string) => {
		setFormData({
			...formData!,
			country: value,
		});
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;

		// Handle nested socialMedia object
		if (name.startsWith("socialMedia.")) {
			const socialMediaKey = name.split(".")[1];
			setFormData((prevFormData) => ({
				...prevFormData!,
				socialMedia: {
					...prevFormData?.socialMedia,
					[socialMediaKey]: value || "",
				} as Required<CreatorProfileData>["socialMedia"],
			}));
		} else if (name.startsWith("pricing.")) {
			const pricingKey = name.split(".")[1];
			setFormData((prevFormData) => {
				// Handle the case where prevFormData is null
				if (!prevFormData) return null;

				return {
					...prevFormData,
					pricing: {
						...(prevFormData.pricing || {}), // Ensure pricing exists
						[pricingKey]: pricingKey.includes("Note")
							? value
							: value === ""
								? undefined
								: Number(value) || 0,
					},
				};
			});
		}
		// Handle all other fields
		else {
			setFormData((prevFormData) => ({
				...prevFormData!,
				[name]: value,
			}));
		}
	};

	const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const text = e.target.value;
		// Limit to 500 characters
		if (text.length <= 500) {
			setFormData((prevFormData) => ({
				...prevFormData!,
				bio: text,
			}));
			setCharCount(text.length);
		}
	};

	const handleContentLinkChange = (index: number, value: string) => {
		const newLinks = [...contentLinks];
		newLinks[index] = value;
		setContentLinks(newLinks);

		setFormData((prevFormData) => ({
			...prevFormData!,
			contentLinks: newLinks,
		}));
	};

	const addContentLink = () => {
		setContentLinks([...contentLinks, ""]);
	};

	const removeContentLink = (index: number) => {
		if (contentLinks.length > 1) {
			const newLinks = contentLinks.filter((_, i) => i !== index);
			setContentLinks(newLinks);

			setFormData((prevFormData) => ({
				...prevFormData!,
				contentLinks: newLinks,
			}));
		}
	};

	const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || !e.target.files[0]) return;

		setError(null);
		const file = e.target.files[0];

		// Create a preview URL for immediate visual feedback
		const previewUrl = URL.createObjectURL(file);
		setImagePreview(previewUrl);

		// Show loading state
		setIsLoading(true);

		// Verify we have the necessary data
		if (!currentUser?.email || !formData?.verificationId) {
			setError(
				"User email and verification ID are required for uploading a logo"
			);
			setIsLoading(false);
			return;
		}

		// Create FormData object with required fields
		const uploadData = new FormData();
		uploadData.append("logo", file);
		uploadData.append("email", currentUser.email);
		uploadData.append("verificationId", formData.verificationId);

		try {
			const response = await fetch(`/api/admin/creator-approval`, {
				method: "POST",
				body: uploadData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Error response:", errorText);

				try {
					// Try to parse as JSON if possible
					const errorData = JSON.parse(errorText);
					throw new Error(errorData.error || "Failed to upload logo");
				} catch {
					// If not JSON, use the raw text
					throw new Error(`Upload failed: ${errorText}`);
				}
			}

			// Get the response data
			const responseData = await response.json();
			console.log("Logo upload response:", responseData);

			// Extract the logoUrl from the response
			const logoUrl = responseData.logoUrl;

			if (logoUrl) {
				// Update formData with the new logoUrl - this is crucial
				setFormData((prevFormData) => {
					if (!prevFormData) return null;
					return {
						...prevFormData,
						logoUrl: logoUrl,
					};
				});

				// Also update profileData to ensure it's reflected in the UI
				setProfileData((prevProfileData) => {
					if (!prevProfileData) return null;
					return {
						...prevProfileData,
						logoUrl: logoUrl,
					};
				});

				setSuccessMessage("Profile picture uploaded successfully");
			} else {
				throw new Error("Logo URL not found in response");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to upload profile picture. Please try again."
			);
			console.error("Error uploading logo:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Updated handleSaveChanges function to include logoUrl when updating verification data
	const handleSaveChanges = async () => {
		if (!formData || !currentUser?.email) return;

		setError(null);
		setSuccessMessage(null);

		// Make sure socialMedia is properly structured as an object
		const dataToSend = {
			...formData,
			email: currentUser.email,
			// Ensure socialMedia is an object, not individual dot-notation fields
			socialMedia: {
				facebook: formData.socialMedia?.facebook || "",
				instagram: formData.socialMedia?.instagram || "",
				twitter: formData.socialMedia?.twitter || "",
				youtube: formData.socialMedia?.youtube || "",
			},
			// Include content links
			contentLinks: contentLinks.filter((link) => link.trim().length > 0),
		};

		try {
			setIsSaving(true);
			// Use both endpoints to update data
			const response = await fetch("/api/creator-profile", {
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

			// If we have a verification ID, update that data too
			if (formData.verificationId) {
				// Ensure contentTypes is always an array
				const contentTypesArray =
					(Array.isArray(formData.contentTypes) &&
						formData?.contentTypes.filter((item: string) => item).join(", ")) ||
					[];

				const verificationUpdate = await fetch("/api/admin/creator-approval", {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						verificationId: formData.verificationId,
						// Send profile data in 'updates' field as expected by the API
						updates: {
							profileData: {
								bio: formData.bio || "",
								contentTypes: contentTypesArray,
								contentLinks: dataToSend.contentLinks || [],
								pricing: formData.pricing || {},
								socialMedia: dataToSend.socialMedia || {},
								tiktokUrl:
									formData.tiktokUrl || formData.socialMedia?.tiktok || "",
								logoUrl: formData.logoUrl || "",
								email: currentUser.email,
								country: formData.country || "",
								username: formData.username || "",
								firstName: formData.firstName || "",
								lastName: formData.lastName || "",
								gender: formData.gender || "",
							},
						},
					}),
				});

				if (!verificationUpdate.ok) {
					const errorData = await verificationUpdate
						.json()
						.catch(() => ({ error: "Unknown error" }));
					console.error("Failed to update verification data:", errorData);
					throw new Error(
						errorData.error || "Failed to update verification data"
					);
				}
			}

			setSuccessMessage("Profile updated successfully");
			// Update the profile data with the new form data
			setProfileData({ ...formData });

			// Clear success message after 3 seconds
			setTimeout(() => {
				setSuccessMessage(null);
			}, 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			if (imagePreview) {
				URL.revokeObjectURL(imagePreview);
			}
		};
	}, [imagePreview]);

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading account settings...
			</div>
		);
	}

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

						{successMessage && (
							<div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
								{successMessage}
							</div>
						)}

						<div className="mb-6">
							<label className="block mb-2 font-medium">Profile Picture</label>
							<div className="flex items-center space-x-4">
								<div className="w-24 h-24 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full overflow-hidden">
									{formData?.logoUrl || imagePreview ? (
										<Image
											src={imagePreview || formData?.logoUrl || ""}
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
										/>
									</label>
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
							<label htmlFor="tiktok" className="block mb-2 font-medium">
								Your TikTok Profile URL
							</label>
							<Input
								id="tiktok"
								name="tiktok"
								value={formData?.socialMedia.tiktok || ""}
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
								disabled={isSaving}
							>
								{isSaving ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</div>
				)}

				{/* Billing & Payments Tab */}
				{activeTab === "shipping-details" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto"><ShippingAddressPage /></div>
				)}

				{/* Project Preference Tab */}
				{activeTab === "security" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<SecurityPage />
					</div>
				)}

				{/* Notifications & Alerts Tab */}
				{activeTab === "payments" && (
					<div className="md:w-[50rem] max-w-4xl mx-auto">
						<PayoutPage />
					</div>
				)}

				{/* Security & Privacy Tab */}
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
