"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { countries } from "@/types/countries";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import {
	CreatorVerificationProvider,
	useCreatorVerification,
} from "@/components/Creators/verify-identity/CreatorVerificationContext";

const CompleteCreatorProfile = () => {
	const { profileData, updateProfileData, fieldErrors } =
		useCreatorVerification();

	// State for form fields
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [bio, setBio] = useState("");
	const [bioWarning, setBioWarning] = useState("");
	const maxBioLength = 500;

	const [contentTypes, setContentTypes] = useState<string[]>([]);
	const [contentTypeInput, setContentTypeInput] = useState("");
	const [, setTouched] = useState<Record<string, boolean>>({});

	const [tiktokUrl, setTiktokUrl] = useState("");
	const [ethnicity, setEthnicity] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [gender, setGender] = useState("");
	const [selectedCountry, setSelectedCountry] = useState("");
	const [contentLinks, setContentLinks] = useState<string[]>([""]);

	const [socialMedia, setSocialMedia] = useState({
		instagram: "",
		twitter: "",
		facebook: "",
		youtube: "",
	});


	// Load data from context when profileData changes
	useEffect(() => {
		if (profileData && Object.keys(profileData).length > 0) {
			// Always update the form with the latest data from context
			setBio(profileData.bio || "");
			setTiktokUrl(profileData.tiktokUrl || "");
			setEthnicity(profileData.ethnicity || "");
			setDateOfBirth(profileData.dateOfBirth || "");
			setGender(profileData.gender || "");
			setSelectedCountry(profileData.country || "");

			// Handle arrays and objects
			setContentTypes(
				profileData.contentTypes?.length > 0 ? profileData.contentTypes : []
			);
			setContentLinks(
				profileData.contentLinks?.length > 0 ? profileData.contentLinks : [""]
			);

			setSocialMedia({
				instagram: profileData.socialMedia?.instagram || "",
				twitter: profileData.socialMedia?.twitter || "",
				facebook: profileData.socialMedia?.facebook || "",
				youtube: profileData.socialMedia?.youtube || "",
			});
		}
	}, [profileData]); // Add selectedFile as a dependency

  useEffect(() => {
    if (profileData?.picture && (!selectedFile || selectedFile.name !== profileData.picture.name)) {
      setSelectedFile(profileData.picture);
      const objectUrl = URL.createObjectURL(profileData.picture);
      setPreviewUrl(objectUrl);
      
      // Cleanup function
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData.picture]);

	// Ensure cleanup of object URL for memory management
	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	// Create preview URL when selected file changes
	useEffect(() => {
		if (!selectedFile) return;

		try {
			const objectUrl = URL.createObjectURL(selectedFile);
			setPreviewUrl(objectUrl);

			// Update context with a small delay to avoid excessive operations
			const timeoutId = setTimeout(() => {
				updateProfileData({ picture: selectedFile });
			}, 300);

			return () => {
				URL.revokeObjectURL(objectUrl);
				clearTimeout(timeoutId);
			};
		} catch (error) {
			console.error("Error creating file preview:", error);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedFile]);

	const handleContentTypeKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>
	) => {
		// Check if user pressed Enter or comma
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addContentType();
		}
	};

	const addContentType = () => {
		// Trim whitespace and check if input is not empty
		const trimmedInput = contentTypeInput.trim();
		if (trimmedInput && !contentTypes.includes(trimmedInput)) {
			const newContentTypes = [...contentTypes, trimmedInput];
			setContentTypes(newContentTypes);
			setContentTypeInput("");
			updateProfileData({ contentTypes: newContentTypes });
		}
	};

	const removeContentType = (indexToRemove: number) => {
		const newContentTypes = contentTypes.filter(
			(_, index) => index !== indexToRemove
		);
		setContentTypes(newContentTypes);
		updateProfileData({ contentTypes: newContentTypes });
	};

	const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const inputText = e.target.value;

		if (inputText.length <= maxBioLength) {
			setBio(inputText);
			updateProfileData({ bio: inputText });
			setBioWarning("");
		} else {
			// Keep the first 500 characters only
			const truncated = inputText.slice(0, maxBioLength);
			setBio(truncated);
			updateProfileData({ bio: truncated });
			setBioWarning("You've reached the maximum character limit");

			// Clear the warning after 3 seconds
			setTimeout(() => {
				setBioWarning("");
			}, 3000);
		}
	};

	const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			const file = e.dataTransfer.files[0];
			setSelectedFile(file);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setSelectedFile(file);
		}
	};

	// Handle input blur to track touched fields
	const handleBlur = (name: string) => {
		setTouched((prev) => ({ ...prev, [name]: true }));
	};

	const handleTextInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		fieldName: string
	) => {
		const { value } = e.target;

		// Update local state
		switch (fieldName) {
			case "tiktokUrl":
				setTiktokUrl(value);
				break;
			case "ethnicity":
				setEthnicity(value);
				break;
			case "dateOfBirth":
				setDateOfBirth(value);
				break;
			case "gender":
				setGender(value);
				break;
			default:
				break;
		}

		// Update context
		updateProfileData({ [fieldName]: value });
	};

	const handleSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		const updatedSocialMedia = { ...socialMedia, [name]: value };
		setSocialMedia(updatedSocialMedia);
		updateProfileData({ socialMedia: updatedSocialMedia });
	};

	const handleCountryChange = (value: string) => {
		setSelectedCountry(value);
		updateProfileData({ country: value });
	};

	const addNewLink = () => {
		const newLinks = [...contentLinks, ""];
		setContentLinks(newLinks);
		updateProfileData({ contentLinks: newLinks });
	};

	const removeLink = (index: number) => {
		if (index === 0) return;
		const newLinks = contentLinks.filter((_, i) => i !== index);
		setContentLinks(newLinks);
		updateProfileData({ contentLinks: newLinks });
	};

	const updateLink = (index: number, value: string) => {
		const newLinks = [...contentLinks];
		newLinks[index] = value;
		setContentLinks(newLinks);
		updateProfileData({ contentLinks: newLinks });
	};

  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return <p className="text-red-500 text-sm mt-1">{fieldErrors[fieldName]}</p>;
    }
    return null;
  };
  

	return (
		<div className="">
			<label className="block text-base font-medium text-gray-700 mt-3 mb-2">
				Upload your Picture
			</label>
      <div
        className={cn(
          "border rounded-lg p-6 text-center cursor-pointer",
          dragActive ? "border-[#FD5C02] bg-orange-50" : "border-gray-300",
          selectedFile && "border-green-500 bg-green-50",
          fieldErrors.picture && !selectedFile ? "border-red-500" : "border-[#D0D5DD]"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
				{previewUrl ? (
					<div className="space-y-3">
						<div className="relative w-full max-w-md mx-auto h-48 rounded-lg overflow-hidden">
							<Image
								src={previewUrl}
								alt="Thumbnail preview"
								fill
								className="object-cover"
							/>
						</div>
						<p className="text-green-600">
							{selectedFile?.name || "Uploaded image"} - Click or drop to change
						</p>
					</div>
				) : (
					<>
						<div className="bg-white border border-gray-200 rounded-lg py-1 px-2 w-12 mx-auto mb-2">
							<Image
								src="/icons/upload.svg"
								alt="Upload"
								width={40}
								height={40}
							/>
						</div>
						<p className="text-gray-600 text-sm md:text-base">
							<span className="text-[#FD5C02]">Click to upload</span> or drag
							and drop
						</p>
						<p className="text-sm text-gray-500 mt-1">PNG or JPG (800x400px)</p>
					</>
				)}
				<input
					id="file-upload"
					type="file"
					className="hidden"
					accept="image/png, image/jpeg"
					onChange={handleFileChange}
				/>
			</div>
      {renderFieldError('picture')}

			{/* Bio */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Bio
			</label>
      <Textarea
        className={`mt-1 ${fieldErrors.bio ? "border-red-500" : "border-[#D0D5DD]"}`}
        rows={5}
        placeholder="Hi, I'm Alex, a passionate content creator specializing in lifestyle, travel, and fashion. With a knack for storytelling and creating engaging visuals, I love collaborating with brands to bring their vision to life!"
        value={bio}
        onChange={handleBioChange}
        onBlur={() => handleBlur("bio")}
      />
      {renderFieldError('bio')}
      <div className="flex justify-between items-center mt-1">
        <span
          className={`text-sm ${bioWarning ? "text-red-500 font-medium" : "text-[#475467]"}`}
        >
          {bioWarning || `(${bio.length}/${maxBioLength} characters)`}
        </span>
      </div>

			{/* TikTok URL */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Tiktok Profile URL
			</label>
      <Input
        className={`mt-1 ${fieldErrors.tiktokUrl ? "border-red-500" : ""}`}
        placeholder="https://www.tiktok.com/@username"
        value={tiktokUrl}
        onChange={(e) => handleTextInputChange(e, "tiktokUrl")}
        onBlur={() => handleBlur("tiktokUrl")}
      />
      {renderFieldError('tiktokUrl')}

			{/* Ethnicity */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Ethnicity
			</label>
			<Input
				className="mt-1 placeholder:text-[#667085]"
				placeholder="African-American"
				value={ethnicity}
				onChange={(e) => handleTextInputChange(e, "ethnicity")}
				onBlur={() => handleBlur("ethnicity")}
			/>
      {renderFieldError('ethnicity')}

			{/* Your Date of Birth */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Date of Birth
			</label>
			<Input
				className="mt-1 placeholder:text-[#667085]"
				placeholder="12/8/1999"
				value={dateOfBirth}
				onChange={(e) => handleTextInputChange(e, "dateOfBirth")}
				onBlur={() => handleBlur("dateOfBirth")}
			/>
      {renderFieldError('dateOfBirth')}

			{/* Your Gender */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Gender
			</label>
			<Input
				className="mt-1 placeholder:text-[#667085]"
				placeholder="Male"
				value={gender}
				onChange={(e) => handleTextInputChange(e, "gender")}
				onBlur={() => handleBlur("gender")}
			/>
      {renderFieldError('gender')}

			{/* What types of content do you specialize in? */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				What types of content do you specialize in?
			</label>
			<div className="mt-1 border border-[#D0D5DD] rounded-md focus-within:ring-gray-500 focus-within:border-gray-500">
				<div className="p-2 flex flex-wrap gap-2">
					{contentTypes.map((type, index) => (
						<div
							key={index}
							className="bg-white border border-[#D0D5DD] text-gray-600 px-2 py-1 rounded-md flex items-center"
						>
							{type}
							<button
								type="button"
								onClick={() => removeContentType(index)}
								className="ml-2 text-gray-600 hover:text-gray-800"
							>
								×
							</button>
						</div>
					))}
					<input
						type="text"
						className="flex-grow outline-none min-w-[200px] p-1"
						placeholder="Type and press Enter or comma to add content types (e.g., Fashion, Travel, Tech Reviews)"
						value={contentTypeInput}
						onChange={(e) => setContentTypeInput(e.target.value)}
						onKeyDown={handleContentTypeKeyDown}
						onBlur={addContentType}
					/>
				</div>
			</div>
			<p className="text-sm text-[#475467] mt-1">
				Press Enter or comma after each content type
			</p>
      {renderFieldError('contentTypes')}

			{/* Social Media Handles */}
			<div className="space-y-2 mt-4" id="socialMedia">
				<Label className="text-sm md:text-base font-medium text-gray-700">
					Other Social Media Handles
				</Label>
				<div className="relative">
					<Image
						src="/icons/ig.svg"
						alt="Instagram"
						width={4}
						height={4}
						className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
					/>
					<Input
						name="instagram"
						value={socialMedia.instagram}
						onChange={handleSocialMediaChange}
						onBlur={() => handleBlur("socialMedia")}
						placeholder="social_shake"
						className="pl-8"
					/>
				</div>
				<div className="relative">
					<Image
						src="/icons/x.svg"
						alt="Twitter"
						width={4}
						height={4}
						className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
					/>
					<Input
						name="twitter"
						value={socialMedia.twitter}
						onChange={handleSocialMediaChange}
						onBlur={() => handleBlur("socialMedia")}
						placeholder="social_shake"
						className="pl-8"
					/>
				</div>
				<div className="relative">
					<Image
						src="/icons/facebook.svg"
						alt="Facebook"
						width={4}
						height={4}
						className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
					/>
					<Input
						name="facebook"
						value={socialMedia.facebook}
						onChange={handleSocialMediaChange}
						onBlur={() => handleBlur("socialMedia")}
						placeholder="social_shake"
						className="pl-8"
					/>
				</div>

				<div className="relative">
					<Image
						src="/icons/youtube.svg"
						alt="Youtube"
						width={4}
						height={4}
						className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
					/>
					<Input
						name="youtube"
						value={socialMedia.youtube}
						onChange={handleSocialMediaChange}
						onBlur={() => handleBlur("socialMedia")}
						placeholder="social_shake"
						className="pl-8"
					/>
				</div>
			</div>
      {renderFieldError('socialMedia')}


			{/* Your Country? */}
			<div className="space-y-1 mt-4">
				<label
					htmlFor="country-select"
					className="block text-base font-medium text-gray-700"
				>
					Your Country?
				</label>
				<Select value={selectedCountry} onValueChange={handleCountryChange}>
					<SelectTrigger id="country-select" className="w-full">
						<SelectValue placeholder="Select your country" />
					</SelectTrigger>
					<SelectContent className="bg-[#f7f7f7]">
						{countries.map((country) => (
							<SelectItem key={country.code} value={country.code}>
								{country.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
      {renderFieldError('country')}

			{/* Best Tiktok Links */}
			<div className="space-y-1 mt-4">
				<Label className="text-base text-gray-700">
					Paste links of your best TikToks to build your Portfolio
				</Label>

				{contentLinks.map((link, index) => (
					<div key={index} className="flex gap-2 mt-2">
						   <Input
              type="text"
              value={link}
              onChange={(e) => updateLink(index, e.target.value)}
              onBlur={() => handleBlur(`contentLink-${index}`)}
              placeholder="https://vt.tiktok.com/ZS6KEanvB/"
              className={`flex-1 ${fieldErrors.contentLinks && index === 0 ? "border-red-500" : ""}`}
            />
						<div className="flex gap-2">
							{index === contentLinks.length - 1 && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={addNewLink}
								>
									<Plus className="h-4 w-4" />
								</Button>
							)}
							{index !== 0 && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeLink(index)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
				))}
           {renderFieldError('contentLinks')}
			</div>
		</div>
	);
};

export default function CreatorProfileForm() {
	return (
		<CreatorVerificationProvider>
			<CompleteCreatorProfile />
		</CreatorVerificationProvider>
	);
}
