"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useProjectForm } from "./ProjectFormContext";
import { ProjectType } from "@/types/contestFormData";

const ProjectDetails: React.FC = () => {
	// Use the contest form context instead of local state
	const { formData, updateProjectDetails, validateStep } = useProjectForm();

	// Get values from context
	const { projectDetails } = formData;

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	// Initialize preview URL from context if available
	useEffect(() => {
		// If there's a string URL in the context
		if (typeof projectDetails.projectThumbnail === "string") {
			setPreviewUrl(projectDetails.projectThumbnail as string);
		} else if (projectDetails.projectThumbnail instanceof File) {
			// If there's a File object
			setSelectedFile(projectDetails.projectThumbnail);
			const objectUrl = URL.createObjectURL(projectDetails.projectThumbnail);
			setPreviewUrl(objectUrl);
			return () => URL.revokeObjectURL(objectUrl);
		}
	}, [projectDetails.projectThumbnail]);

	// Create a preview URL when a file is selected
	useEffect(() => {
		if (!selectedFile) {
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile);
		setPreviewUrl(objectUrl);

		// Free memory when this component is unmounted
		return () => URL.revokeObjectURL(objectUrl);
	}, [selectedFile]);

	// Validate fields
	const validateFields = () => {
		const newErrors: Record<string, string> = {};
		
		if (!projectDetails.projectName.trim()) {
			newErrors.projectName = "Project name is required";
		}
		
		if (!projectDetails.projectType) {
			newErrors.projectType = "Please select a project type";
		}
		
		if (!projectDetails.productType) {
			newErrors.productType = "Please select a product type";
		}
		
		if (!projectDetails.projectDescription || !projectDetails.projectDescription[0]?.trim()) {
			newErrors.projectDescription = "Project description is required";
		}
		
		// Only validate product link for TikTok Shop
		if (projectDetails.projectType === "TikTok Shop" && !projectDetails.productLink?.trim()) {
			newErrors.productLink = "Product link is required for TikTok Shop";
		}
		
		// Make thumbnail optional as per your question
		// If you decide to make it required, uncomment the below code
		/*
		if (!projectDetails.projectThumbnail) {
			newErrors.projectThumbnail = "Project thumbnail is required";
		}
		*/
		
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Mark field as touched when user interacts with it
	const handleBlur = (field: string) => {
		setTouched(prev => ({ ...prev, [field]: true }));
		validateFields();
	};

	// Update validateStep in the context to use our validation logic
	useEffect(() => {
		validateStep("projectDetails", validateFields);
	}, [projectDetails]);

	// Update form fields using the context
	const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateProjectDetails({ projectName: e.target.value });
		if (touched.projectName) validateFields();
	};

	const handleProductTypeChange = (value: string) => {
		updateProjectDetails({ productType: value });
		setTouched(prev => ({ ...prev, productType: true }));
		validateFields();
	};

	const handleProductLinkChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		updateProjectDetails({ productLink: e.target.value });
		if (touched.productLink) validateFields();
	};

	const handleProjectDescriptionChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		updateProjectDetails({ projectDescription: [e.target.value] });
		if (touched.projectDescription) validateFields();
	};

	const handleDrag = (e: {
		preventDefault: () => void;
		stopPropagation: () => void;
		type: string;
	}) => {
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
			updateProjectDetails({ projectThumbnail: file });
			setTouched(prev => ({ ...prev, projectThumbnail: true }));
			validateFields();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setSelectedFile(file);
			updateProjectDetails({ projectThumbnail: file });
			setTouched(prev => ({ ...prev, projectThumbnail: true }));
			validateFields();
		}
	};

	const handleProjectTypeChange = (type: ProjectType) => {
		updateProjectDetails({ projectType: type });
		setTouched(prev => ({ ...prev, projectType: true }));
		validateFields();
	};

	return (
		<div className="w-[52rem] bg-white px-8 py-6 border border-[#FFBF9B] rounded-lg">
			<div className="mb-4">
				<label className="block text-base font-medium text-gray-700">
					Project Name <span className="text-red-500">*</span>
				</label>
				<Input
					className={cn(
						"mt-1",
						errors.projectName && touched.projectName ? "border-red-500" : ""
					)}
					placeholder="Spring Campaign UGC"
					value={projectDetails.projectName}
					onChange={handleProjectNameChange}
					onBlur={() => handleBlur('projectName')}
				/>
				{errors.projectName && touched.projectName && (
					<p className="text-red-500 text-sm mt-1">{errors.projectName}</p>
				)}
			</div>

			{/* ContestTypeSelector integrated directly in Basic component */}
			<div className="w-full mt-4">
				<h2 className="text-base font-medium text-gray-700 mb-2">
					Project Type <span className="text-red-500">*</span>
				</h2>
				{errors.projectType && touched.projectType && (
					<p className="text-red-500 text-sm mb-2">{errors.projectType}</p>
				)}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{/* UGC Contest Only */}
					<div
						className={cn(
							"relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
							projectDetails.projectType === "UGC Content Only"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300",
							errors.projectType && touched.projectType ? "border-red-500" : ""
						)}
						onClick={() => handleProjectTypeChange("UGC Content Only")}
					>
						<div className="absolute top-4 left-4">
							<div
								className={cn(
									"w-4 h-4 rounded-full flex items-center justify-center",
									projectDetails.projectType === "UGC Content Only"
										? "border-2 border-orange-500"
										: "border border-gray-300"
								)}
							>
								{projectDetails.projectType === "UGC Content Only" && (
									<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
								)}
							</div>
						</div>

						<div className="mt-6 flex flex-col items-start">
							<div className="mb-2 mt-6">
								<Image
									src="/icons/ugc.svg"
									alt="UGC Content"
									width={35}
									height={35}
								/>
							</div>

							<h3 className="text-lg text-start font-semibold mb-1">
								UGC Content Only
							</h3>

							<p className="text-sm text-[#667085] text-start">
								The Creator creates the video and provides the video files to
								you.
							</p>
						</div>
					</div>

					{/* Creator Posted UGC */}
					<div
						className={cn(
							"relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
							projectDetails.projectType === "Creator-Posted UGC"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300",
							errors.projectType && touched.projectType ? "border-red-500" : ""
						)}
						onClick={() => handleProjectTypeChange("Creator-Posted UGC")}
					>
						<div className="absolute top-4 left-4">
							<div
								className={cn(
									"w-4 h-4 rounded-full flex items-center justify-center",
									projectDetails.projectType === "Creator-Posted UGC"
										? "border-2 border-orange-500"
										: "border border-gray-300"
								)}
							>
								{projectDetails.projectType === "Creator-Posted UGC" && (
									<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
								)}
							</div>
						</div>

						<div className="mt-6 flex flex-col items-start">
							<div className="mb-2 mt-4 ">
								<Image
									src="/icons/creator-posted.svg"
									alt="Creator Posted UGC"
									width={35}
									height={35}
								/>
							</div>
							<h3 className="text-lg font-semibold mb-1">Creator-Posted UGC</h3>
							<p className="text-sm text-[#667085] text-start">
								The Creator creates the video, posts it on their account, and
								shares the video files with you.
							</p>
						</div>
					</div>

					{/* Spark Ads */}
					<div
						className={cn(
							"relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
							projectDetails.projectType === "Spark Ads"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300",
							errors.projectType && touched.projectType ? "border-red-500" : ""
						)}
						onClick={() => handleProjectTypeChange("Spark Ads")}
					>
						<div className="absolute top-4 left-4">
							<div
								className={cn(
									"w-4 h-4 rounded-full flex items-center justify-center",
									projectDetails.projectType === "Spark Ads"
										? "border-2 border-orange-500"
										: "border border-gray-300"
								)}
							>
								{projectDetails.projectType === "Spark Ads" && (
									<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
								)}
							</div>
						</div>

						<div className="mt-6 flex flex-col items-start">
							<div className="mb-2 mt-4 ">
								<Image
									src="/icons/ad.svg"
									alt="Spark Ads"
									width={35}
									height={35}
								/>
							</div>
							<h3 className="text-lg font-semibold mb-1">Spark Ads</h3>
							<p className="text-sm text-[#667085] text-start">
								The Creator creates the video, posts it as an ad, provides the
								Spark Code, and shares the video files with you.
							</p>
						</div>
					</div>

					{/* TikTok Shop*/}
					<div
						className={cn(
							"relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
							projectDetails.projectType === "TikTok Shop"
								? "border-2 border-orange-500 bg-orange-50"
								: "border border-gray-200 bg-white hover:border-gray-300",
							errors.projectType && touched.projectType ? "border-red-500" : ""
						)}
						onClick={() => handleProjectTypeChange("TikTok Shop")}
					>
						<div className="absolute top-4 left-4">
							<div
								className={cn(
									"w-4 h-4 rounded-full flex items-center justify-center",
									projectDetails.projectType === "TikTok Shop"
										? "border-2 border-orange-500"
										: "border border-gray-300"
								)}
							>
								{projectDetails.projectType === "TikTok Shop" && (
									<div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
								)}
							</div>
						</div>

						<div className="mt-6 flex flex-col items-start">
							<div className="mb-2 mt-4 ">
								<Image
									src="/icons/tiktok-shop.svg"
									alt="TikTok Shop"
									width={35}
									height={35}
								/>
							</div>
							<h3 className="text-lg font-semibold mb-1">TikTok Shop</h3>
							<p className="text-sm text-[#667085] text-start">
								The Creator produces and posts the video, links a product to it,
								earns affiliate commissions, and you receive the video files.
							</p>
						</div>
					</div>
				</div>
				{/* Product Link field - only show for TikTok Shop */}
				{projectDetails.projectType === "TikTok Shop" && (
					<div className="mt-4">
						<label className="block text-base font-medium text-gray-700">
							Product Link <span className="text-red-500">*</span>
						</label>
						<Input
							className={cn(
								"mt-1",
								errors.productLink && touched.productLink ? "border-red-500" : ""
							)}
							placeholder="www.summercream.com"
							value={projectDetails.productLink}
							onChange={handleProductLinkChange}
							onBlur={() => handleBlur('productLink')}
						/>
						{errors.productLink && touched.productLink && (
							<p className="text-red-500 text-sm mt-1">{errors.productLink}</p>
						)}
					</div>
				)}
			</div>

			<div className="mt-4">
				<label className="block text-base font-medium text-gray-700 mb-1">
					What type of product will creators be making content for? <span className="text-red-500">*</span>
				</label>
				<Select
					value={projectDetails.productType}
					onValueChange={handleProductTypeChange}
				>
					<SelectTrigger className={cn(
						"w-full mt-1",
						errors.productType && touched.productType ? "border-red-500" : ""
					)}>
						<SelectValue
							placeholder="Select a product type"
							className="placeholder:text-gray-600"
						/>
					</SelectTrigger>
					<SelectContent className="bg-[#f7f7f7]">
						<SelectItem value="physical">
							Physical Product - A tangible item that will be shipped to creators
						</SelectItem>
						<SelectItem value="virtual">
							Virtual Product – A digital or online service that does not require
							shipping
						</SelectItem>
					</SelectContent>
				</Select>
				{errors.productType && touched.productType && (
					<p className="text-red-500 text-sm mt-1">{errors.productType}</p>
				)}
			</div>

			<div className="mt-4">
				<label className="block text-base font-medium text-gray-700">
					Project Description <span className="text-red-500">*</span>
				</label>
				<Textarea
					className={cn(
						"mt-1",
						errors.projectDescription && touched.projectDescription ? "border-red-500" : ""
					)}
					rows={3}
					placeholder="Describe your goals and what kind of content you're looking for."
					value={projectDetails.projectDescription}
					onChange={handleProjectDescriptionChange}
					onBlur={() => handleBlur('projectDescription')}
				/>
				{errors.projectDescription && touched.projectDescription && (
					<p className="text-red-500 text-sm mt-1">{errors.projectDescription}</p>
				)}
			</div>

			<div className="mt-4">
				<label className="block text-base font-medium text-gray-700 mb-1">
					Project Thumbnail {/* Optional - removed required asterisk */}
				</label>
				<div
					className={cn(
						"border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
						dragActive ? "border-[#FD5C02] bg-orange-50" : "border-gray-300",
						selectedFile && "border-green-500 bg-green-50",
						errors.projectThumbnail && touched.projectThumbnail ? "border-red-500" : ""
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
				{errors.projectThumbnail && touched.projectThumbnail && (
					<p className="text-red-500 text-sm mt-1">{errors.projectThumbnail}</p>
				)}
			</div>
		</div>
	);
};

export default ProjectDetails;