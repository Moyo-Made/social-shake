"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash2, ArrowRight, Check, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	CreatorVerificationProvider,
	useCreatorVerification,
} from "@/components/Creators/verify-identity/CreatorVerificationContext";
import { useAuth } from "@/context/AuthContext";
import UploadProgress from "./UploadProgress";
import { UploadDropzone } from "@/components/ui/upload-dropzone";

const CompleteCreatorProfile = () => {
	const router = useRouter();
	const {
		profileData,
		updateProfileData,
		fieldErrors,
		setTouched,
		validateProfileData,
		clearFieldError,
		submitVerification,
		loading,
		isFormValid,
		isUploading,
		currentUploadingFile,
		uploadProgress,
		totalFilesToUpload,
		completedUploads,
	} = useCreatorVerification();

	// State for form fields
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [bio, setBio] = useState("");
	const [bioWarning, setBioWarning] = useState("");
	const maxBioLength = 500;

	const [contentTypes, setContentTypes] = useState<string[]>([]);

	const [tiktokUrl, setTiktokUrl] = useState("");
	const [ethnicity, setEthnicity] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [gender, setGender] = useState("");
	const [languages, setLanguages] = useState<string[]>([]);
	const [languageInput, setLanguageInput] = useState<string>("");
	const [selectedCountry, setSelectedCountry] = useState("");
	const [contentLinks, setContentLinks] = useState<string[]>([""]);
	const [aboutMeVideo, setAboutMeVideo] = useState<File | null>(null);
	const [abnNumber, setAbnNumber] = useState("");
	const [fileSizeError, setFileSizeError] = useState("");

	const [socialMedia, setSocialMedia] = useState({
		instagram: "",
		twitter: "",
		facebook: "",
		youtube: "",
		tiktok: "",
	});

	const [pricing, setPricing] = useState({
		oneVideo: "",
		threeVideos: "",
		fiveVideos: "",
		bulkVideos: "",
		bulkVideosNote: "",
		aiActorPricing: "",
	});

	const predefinedContentTypes = [
		"Apps",
		"Beauty",
		"Makeup",
		"Lifestyle",
		"Fashion",
		"Food",
		"Technology",
		"Health & Wellness",
		"Pets",
		"Automotive",
		"Family",
		"Home",
		"Business",
	];

	// State to track submission attempts
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Validate on important field changes with debounce
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			// Use the function as defined in context - pass false to not update error state during typing
			const { isValid } = validateProfileData(false);
			console.log("Form validation status:", isValid);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [
		bio,
		tiktokUrl,
		dateOfBirth,
		gender,
		selectedCountry,
		validateProfileData,
	]);

	// Load data from context when profileData changes
	useEffect(() => {
		if (profileData && Object.keys(profileData).length > 0) {
			// Always update the form with the latest data from context
			setBio(profileData.bio || "");
			setTiktokUrl(profileData.tiktokUrl || "");
			setEthnicity(profileData.ethnicity || "");
			setDateOfBirth(profileData.dateOfBirth || "");
			setGender(profileData.gender || "");
			setLanguages(
				Array.isArray(profileData?.languages) &&
					profileData.languages.length > 0
					? profileData.languages
					: []
			);
			setSelectedCountry(profileData.country || "");

			// Handle arrays and objects
			setContentTypes(
				Array.isArray(profileData?.contentTypes) &&
					profileData.contentTypes.length > 0
					? profileData.contentTypes
					: []
			);
			setContentLinks(
				profileData.contentLinks?.length > 0 ? profileData.contentLinks : [""]
			);

			setSocialMedia({
				instagram: profileData.socialMedia?.instagram || "",
				twitter: profileData.socialMedia?.twitter || "",
				facebook: profileData.socialMedia?.facebook || "",
				youtube: profileData.socialMedia?.youtube || "",
				tiktok: profileData.socialMedia?.tiktok || "",
			});

			setPricing({
				oneVideo: profileData.pricing?.oneVideo
					? String(profileData.pricing.oneVideo)
					: "",
				threeVideos: profileData.pricing?.threeVideos
					? String(profileData.pricing.threeVideos)
					: "",
				fiveVideos: profileData.pricing?.fiveVideos
					? String(profileData.pricing.fiveVideos)
					: "",
				bulkVideos: profileData.pricing?.bulkVideos
					? String(profileData.pricing.bulkVideos)
					: "",
				bulkVideosNote: profileData.pricing?.bulkVideosNote
					? String(profileData.pricing.bulkVideosNote)
					: "",
				aiActorPricing: profileData.pricing?.aiActorPricing
					? String(profileData.pricing.aiActorPricing)
					: "",
			});

			setAboutMeVideo(
				typeof profileData.aboutMeVideo === "string"
					? new File([], profileData.aboutMeVideo)
					: profileData.aboutMeVideo || null
			);
			setAboutMeVideo(
				typeof profileData.aboutMeVideo === "string"
					? new File([], profileData.aboutMeVideo)
					: profileData.aboutMeVideo || null
			);
			setAbnNumber(profileData.abnNumber || "");
		}
	}, [profileData]);

	// Handle profile picture from context
	useEffect(() => {
		if (
			profileData?.picture &&
			(!selectedFile || selectedFile.name !== profileData.picture.name)
		) {
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

	// Update context when selected file changes
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

	const addContentType = (contentType: string) => {
		// Check if content type is not already selected
		if (contentType && !contentTypes.includes(contentType)) {
			const newContentTypes = [...contentTypes, contentType];
			setContentTypes(newContentTypes);
			updateProfileData({ contentTypes: newContentTypes });
		}
	};

	// removeContentType function remains the same
	const removeContentType = (indexToRemove: number) => {
		const newContentTypes = contentTypes.filter(
			(_, index) => index !== indexToRemove
		);
		setContentTypes(newContentTypes);
		updateProfileData({ contentTypes: newContentTypes });
	};

	const handleAboutMeVideoUpload = async (file: File) => {
		clearFieldError("aboutMeVideo");

		// Validate file type (should be a video)
		const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
		if (!validVideoTypes.includes(file.type)) {
			toast.error("Invalid file type. Please upload a valid video file.");
			return;
		}

		try {
			// Check file size before processing (50MB limit)
			if (file.size > 50 * 1024 * 1024) {
				toast.warning(
					"Your video is large and will be automatically compressed."
				);
			}

			// Update local state with the actual File object
			setAboutMeVideo(file);

			// Update context with the File object (not a URL)
			toast.promise(updateProfileData({ aboutMeVideo: file }), {
				loading: "Uploading about me video...",
				success: "Your about me video has been uploaded successfully.",
				error: "Failed to upload video. Please try again.",
			});

			// Mark field as touched after upload
			setTouched((prev) => ({ ...prev, aboutMeVideo: true }));
		} catch (error) {
			console.error("Error in about me video upload:", error);
			toast.error(
				"An error occurred while processing your video. Please try again."
			);
		}
	};

	const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const inputText = e.target.value;

		if (inputText.length <= maxBioLength) {
			setBio(inputText);
			updateProfileData({ bio: inputText });
			setBioWarning("");
			// Clear any existing error for bio field
			clearFieldError("bio");
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

	// Update your useEffect to load languages from context
	useEffect(() => {
		if (profileData && Object.keys(profileData).length > 0) {
			// ... your existing code ...

			// Add this for languages
			setLanguages(
				Array.isArray(profileData?.languages) &&
					profileData.languages.length > 0
					? profileData.languages
					: []
			);

			// Remove the single language line:
			// setLanguage(profileData.language || "");
		}
	}, [profileData]);

	// Add these helper functions
	const addLanguages = (input: string) => {
		if (!input.trim()) return;

		// Split by comma, trim whitespace, filter out empty strings, and convert to proper case
		const newLanguages = input
			.split(",")
			.map((lang) => lang.trim())
			.filter((lang) => lang.length > 0)
			.map((lang) => lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase())
			.filter((lang) => !languages.includes(lang)); // Remove duplicates

		if (newLanguages.length > 0) {
			const updatedLanguages = [...languages, ...newLanguages];
			setLanguages(updatedLanguages);
			updateProfileData({ languages: updatedLanguages });
			setLanguageInput(""); // Clear input after adding
		}
	};

	const removeLanguage = (indexToRemove: number) => {
		const newLanguages = languages.filter(
			(_, index) => index !== indexToRemove
		);
		setLanguages(newLanguages);
		updateProfileData({ languages: newLanguages });
	};

	const handleLanguageInputChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setLanguageInput(e.target.value);
		clearFieldError("languages");
	};

	const handleLanguageInputKeyPress = (
		e: React.KeyboardEvent<HTMLInputElement>
	) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addLanguages(languageInput);
		}
	};

	const handleAddLanguagesClick = () => {
		addLanguages(languageInput);
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
			const maxSize = 5 * 1024 * 1024; // 5MB limit

			if (file.size > maxSize) {
				setFileSizeError(
					`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size of 5MB. Please choose a smaller image.`
				);
				return;
			}

			setFileSizeError(""); // Clear any previous error
			setSelectedFile(file);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			const maxSize = 5 * 1024 * 1024; // 5MB limit

			if (file.size > maxSize) {
				setFileSizeError(
					`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size of 5MB. Please choose a smaller image.`
				);
				return;
			}

			setFileSizeError(""); // Clear any previous error
			setSelectedFile(file);
			clearFieldError("picture");
		}
	};

	// Handle input blur to track touched fields
	const handleBlur = (name: string) => {
		setTouched((prev) => ({ ...prev, [name]: true }));

		// Validate the field when user leaves it
		const { isValid } = validateProfileData(true);
		console.log(`Field ${name} blurred, form valid: ${isValid}`);
	};

	// formatting function
	const formatDateOfBirth = (value: string) => {
		// Remove all non-numeric characters
		const numericOnly = value.replace(/\D/g, "");

		// Apply formatting based on length
		if (numericOnly.length <= 2) {
			return numericOnly;
		} else if (numericOnly.length <= 4) {
			return `${numericOnly.slice(0, 2)}/${numericOnly.slice(2)}`;
		} else {
			return `${numericOnly.slice(0, 2)}/${numericOnly.slice(2, 4)}/${numericOnly.slice(4, 8)}`;
		}
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
				// Format the date of birth with automatic slashes
				const formattedDate = formatDateOfBirth(value);
				setDateOfBirth(formattedDate);
				// Clear any existing error for this field
				clearFieldError(fieldName);
				// Update context
				updateProfileData({ [fieldName]: formattedDate });
				return; // Early return to avoid duplicate context update
				break;
			case "gender":
				setGender(value);
				break;
			default:
				break;
		}

		// Clear any existing error for this field
		clearFieldError(fieldName);

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
		// Clear ABN when changing away from Australia
		if (selectedCountry === "Australia" && value !== "Australia") {
			setAbnNumber("");
			updateProfileData({ abnNumber: "" });
		}

		setSelectedCountry(value);
		clearFieldError("country");
		updateProfileData({ country: value });
	};

	const handleAbnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setAbnNumber(value);
		clearFieldError("abnNumber");
		updateProfileData({ abnNumber: value });
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

		// Clear any content links error when user starts typing
		if (index === 0 && value.trim() !== "") {
			clearFieldError("contentLinks");
		}

		updateProfileData({ contentLinks: newLinks });
	};

	const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		// Create updated pricing object
		const updatedPricing = { ...pricing };

		// Handle numeric fields differently from text fields
		if (name === "bulkVideosNote") {
			// For the note field, accept any text
			updatedPricing[name as keyof typeof pricing] = value;
		} else {
			// For numeric fields, apply validation
			if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
				updatedPricing[name as keyof typeof pricing] = value;
			} else {
				// If invalid, don't update
				return;
			}
		}

		// Update local state
		setPricing(updatedPricing);

		// Update context with proper typing
		updateProfileData({
			pricing: {
				oneVideo: parseFloat(updatedPricing.oneVideo) || 0,
				threeVideos: parseFloat(updatedPricing.threeVideos) || 0,
				fiveVideos: parseFloat(updatedPricing.fiveVideos) || 0,
				bulkVideos: parseFloat(updatedPricing.bulkVideos) || 0,
				bulkVideosNote: updatedPricing.bulkVideosNote,
				aiActorPricing: parseFloat(updatedPricing.aiActorPricing) || 0,
			},
		});

		clearFieldError("pricing");
	};

	const renderFieldError = (fieldName: string) => {
		if (fieldErrors[fieldName]) {
			return (
				<p className="text-red-500 text-sm mt-1">{fieldErrors[fieldName]}</p>
			);
		}
		return null;
	};

	// Handle form submission
	const handleSubmitRegistration = async (e: {
		preventDefault: () => void;
	}) => {
		e.preventDefault(); // Prevent default form submission behavior

		// Set submitting state to true
		setIsSubmitting(true);

		try {
			// Force validation of all fields
			const { isValid, missingFields } = validateProfileData(true);

			if (!isValid) {
				toast.error(
					`Please complete these required fields: ${missingFields.join(", ")}`
				);
				setIsSubmitting(false);
				return;
			}

			// Submit both verification and profile data
			const result = await submitVerification();

			if (result.success) {
				toast.success(result.message || "Profile submitted successfully!");
				// Delay navigation slightly to allow toast to be seen
				setTimeout(() => {
					router.push("/creator/dashboard");
				}, 500);
			} else {
				toast.error(result.message || "Submission failed. Please try again.");
			}
		} catch (error) {
			console.error("Error during submission:", error);
			toast.error("An error occurred during submission. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Compute button disabled state
	const isButtonDisabled = loading || isSubmitting || !isFormValid;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-semibold mb-2">
					Complete Your Creator Profile
				</h1>
				<p className="text-gray-600">
					Add your details to build trust with your audience and unlock all
					platform features.
					<br /> A complete profile helps you get discovered and grow faster.
				</p>
			</div>
			{/* About Me Video */}
			<div className="mb-8">
				<h2 className="text-base font-medium mb-2">Upload About Me Video</h2>
				<p className="text-sm text-[#667085] mb-4">
					Upload a short video introducing yourself to potential brand partners.
					This will help brands get to know you better.
				</p>

				<UploadDropzone
					onFileSelect={handleAboutMeVideoUpload}
					acceptedFileTypes="video/*"
					maxSize={50 * 1024 * 1024} // 50MB
					selectedFile={aboutMeVideo}
					instructionText="Click to upload or drag and drop"
					fileTypeText="Video file (max 50MB, large files will be compressed)"
				/>

				{/* File name and size display - similar to verification video */}
				{aboutMeVideo && (
					<p className="text-sm text-green-600 mt-2">
						Video uploaded: {aboutMeVideo.name} (
						{(aboutMeVideo.size / (1024 * 1024)).toFixed(2)}MB)
					</p>
				)}

				{renderFieldError("aboutMeVideo")}
			</div>

			<label className="block text-base font-medium text-gray-700 mt-3 mb-2">
				Upload your Picture
			</label>
			<div
				className={cn(
					"border rounded-lg p-6 text-center cursor-pointer",
					dragActive ? "border-[#FD5C02] bg-orange-50" : "border-gray-300",
					selectedFile && !fileSizeError ? "border-green-500 bg-green-50" : "",
					(fieldErrors.picture && !selectedFile) || fileSizeError
						? "border-red-500 bg-red-50"
						: "border-[#D0D5DD]"
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
								className="object-contain"
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
			{renderFieldError("picture")}
			{fileSizeError && (
				<p className="text-red-500 text-sm mt-1">{fileSizeError}</p>
			)}

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
			{renderFieldError("bio")}
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
			{renderFieldError("tiktokUrl")}

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
			{renderFieldError("ethnicity")}

			{/* Your Date of Birth */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Date of Birth
			</label>
			<Input
				className={`mt-1 placeholder:text-[#667085] placeholder:text-sm ${fieldErrors.dateOfBirth ? "border-red-500" : ""}`}
				placeholder="DD/MM/YYYY"
				value={dateOfBirth}
				onChange={(e) => handleTextInputChange(e, "dateOfBirth")}
				onBlur={() => handleBlur("dateOfBirth")}
				maxLength={10} // Limit to DD/MM/YYYY format
				inputMode="numeric"
			/>
			{renderFieldError("dateOfBirth")}

			{/* Your Gender */}
			<label className="block text-base font-medium text-gray-700 mt-4">
				Your Gender
			</label>
			<Input
				className={`mt-1 placeholder:text-[#667085] ${fieldErrors.gender ? "border-red-500" : ""}`}
				placeholder="Male"
				value={gender}
				onChange={(e) => handleTextInputChange(e, "gender")}
				onBlur={() => handleBlur("gender")}
			/>
			{renderFieldError("gender")}

			{/* Content Types */}
			<div className="mt-4">
				<label className="block text-base font-medium text-gray-700 mb-2">
					What types of content do you specialize in?
				</label>

				{/* Display selected content types */}
				{contentTypes.length > 0 && (
					<div className="mb-3 flex flex-wrap gap-2">
						{contentTypes.map((type, index) => (
							<div
								key={index}
								className="bg-white border border-[#D0D5DD] text-gray-600 px-2 py-1 rounded-md flex items-center text-sm"
							>
								{type}
								<button
									type="button"
									onClick={() => removeContentType(index)}
									className="ml-2 text-gray-600 hover:text-gray-800"
								>
									<X size={14} />
								</button>
							</div>
						))}
					</div>
				)}

				<Select
					value=""
					onValueChange={(value) => {
						addContentType(value);
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select content types to add..." />
					</SelectTrigger>
					<SelectContent className="bg-white">
						{predefinedContentTypes.map((type) => (
							<SelectItem
								key={type}
								value={type}
								disabled={contentTypes.includes(type)}
								className={contentTypes.includes(type) ? "opacity-50" : ""}
							>
								<div className="flex items-center justify-between w-full">
									<span>{type}</span>
									{contentTypes.includes(type) && (
										<Check size={16} className="text-green-600 ml-2" />
									)}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<p className="text-sm text-[#475467] mt-1">
					Select from the dropdown to add content types
				</p>
				{renderFieldError("contentTypes")}
			</div>

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
			{renderFieldError("socialMedia")}

			{/* Your Country? */}
			<div className="space-y-1 mt-4">
				<label
					htmlFor="country-select"
					className="block text-base font-medium text-gray-700"
				>
					Your Country?
				</label>
				<Select value={selectedCountry} onValueChange={handleCountryChange}>
					<SelectTrigger
						id="country-select"
						className={`w-full ${fieldErrors.country ? "border-red-500" : ""}`}
					>
						<SelectValue placeholder="Select your country" />
					</SelectTrigger>
					<SelectContent className="bg-[#fff]">
						{countries.map((country) => (
							<SelectItem key={country.code} value={country.name}>
								{country.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{renderFieldError("country")}

			{/* ABN Field - Add this after the country selection */}
			{selectedCountry === "Australia" && (
				<div className="space-y-1 mt-4">
					<label className="block text-base font-medium text-gray-700">
						Australian Business Number (ABN) *
					</label>
					<Input
						className={`mt-1 placeholder:text-[#667085] ${fieldErrors.abnNumber ? "border-red-500" : ""}`}
						placeholder="12 345 678 901"
						value={abnNumber}
						onChange={handleAbnChange}
						onBlur={() => handleBlur("abnNumber")}
					/>
					{renderFieldError("abnNumber")}
					<p className="text-sm text-[#475467] mt-1">
						Required for Australian tax purposes
					</p>
				</div>
			)}

			{/* Your Language? */}
			<label className="block text-base font-medium text-gray-700 mt-4 mb-1">
				What Language(s) do you speak?
			</label>
			{languages.length > 0 && (
				<div className="mb-3 flex flex-wrap gap-2">
					{languages.map((lang, index) => (
						<div
							key={index}
							className="bg-white border border-[#D0D5DD] text-gray-600 px-2 py-1 rounded-md flex items-center text-sm"
						>
							{lang}
							<button
								type="button"
								onClick={() => removeLanguage(index)}
								className="ml-2 text-gray-600 hover:text-gray-800"
							>
								<X size={14} />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Language input field */}
			<div className="flex gap-2">
				<Input
					type="text"
					value={languageInput}
					onChange={handleLanguageInputChange}
					onKeyPress={handleLanguageInputKeyPress}
					placeholder="Enter languages separated by commas (e.g., English, Spanish, French)"
					className={`flex-1 px-3 py-2 border rounded-md  ${
						fieldErrors.languages ? "border-red-500" : "border-[#D0D5DD]"
					}`}
				/>
				<button
					type="button"
					onClick={handleAddLanguagesClick}
					disabled={!languageInput.trim()}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
				>
					Add
				</button>
			</div>

			<p className="text-sm text-[#475467] mt-1">
				Enter languages separated by commas and press Enter or click Add. You
				can add multiple languages at once.
			</p>
			{renderFieldError("languages")}

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
				{renderFieldError("contentLinks")}
			</div>

			<div className="mt-8">
				<h3 className="text-lg font-semibold text-gray-800 mb-3">
					Your Content Pricing
				</h3>
				<p className="text-sm text-gray-600 mb-4">
					Set your pricing rates for different content packages. These rates
					will be visible to brands looking to work with you.
				</p>

				<Card className="p-5 border border-[#D0D5DD] rounded-lg">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-medium text-gray-700">
								Single Video (Basic Rate) *
							</Label>
							<div className="relative mt-1">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									name="oneVideo"
									value={pricing.oneVideo}
									onChange={handlePricingChange}
									onBlur={() => handleBlur("pricing")}
									placeholder="49.99"
									className={`pl-7 ${fieldErrors.pricing ? "border-red-500" : ""}`}
								/>
							</div>
							{renderFieldError("pricing")}
						</div>

						<div>
							<Label className="text-sm font-medium text-gray-700">
								Package: 3 Videos
							</Label>
							<div className="relative mt-1">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									name="threeVideos"
									value={pricing.threeVideos}
									onChange={handlePricingChange}
									placeholder="129.99"
									className="pl-7"
								/>
							</div>
						</div>

						<div>
							<Label className="text-sm font-medium text-gray-700">
								Package: 5 Videos
							</Label>
							<div className="relative mt-1">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									name="fiveVideos"
									value={pricing.fiveVideos}
									onChange={handlePricingChange}
									placeholder="199.99"
									className="pl-7"
								/>
							</div>
						</div>

						<div>
							<Label className="text-sm font-medium text-gray-700">
								6 Videos Bulk Rate (per video)
							</Label>
							<div className="relative mt-1">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									name="bulkVideos"
									value={pricing.bulkVideos}
									onChange={handlePricingChange}
									placeholder="19.99"
									className="pl-7"
								/>
							</div>
							<div className="mt-2">
								<Input
									name="bulkVideosNote"
									value={pricing.bulkVideosNote || ""}
									onChange={handlePricingChange}
									placeholder="Contact for custom pricing packages"
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								Price per video when ordering 6 videos (shows bulk discount to
								brands)
							</p>
						</div>

						<div>
							<Label className="text-sm font-medium text-gray-700">
								AI Actors (Price per usage)
							</Label>
							<div className="relative mt-1">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									name="aiActorPricing"
									value={pricing.aiActorPricing}
									onChange={handlePricingChange}
									placeholder="29.99"
									className="pl-7"
								/>
							</div>
						</div>
					</div>
				</Card>
			</div>
			<UploadProgress
				isUploading={isUploading}
				currentFile={currentUploadingFile}
				progress={uploadProgress}
				totalFiles={totalFilesToUpload}
				completedFiles={completedUploads}
			/>
			{/* Submit Button - Fixed with proper event parameter and loading state */}
			<div className="mt-8 flex justify-end mb-10">
				<Button
					onClick={handleSubmitRegistration}
					className={`text-white px-4 py-2 rounded-md flex items-center ${
						isButtonDisabled
							? "bg-gray-400 cursor-not-allowed"
							: "bg-orange-500 hover:bg-orange-600"
					}`}
					disabled={isButtonDisabled}
					type="button"
				>
					{loading || isSubmitting ? "Submitting..." : "Submit Registration"}
					{!loading && !isSubmitting && (
						<ArrowRight size={20} className="ml-2" />
					)}
				</Button>
			</div>
		</div>
	);
};

export default function CreatorProfileForm() {
	const { currentUser } = useAuth();

	return (
		<CreatorVerificationProvider userId={currentUser?.uid}>
			<CompleteCreatorProfile />
		</CreatorVerificationProvider>
	);
}