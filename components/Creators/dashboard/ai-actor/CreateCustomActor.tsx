"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ConfirmActorModal from "./ConfirmActionModal";

interface CreateActorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onActorCreated: () => void;
}

export default function CreateActorModal({
	isOpen,
	onClose,
	onActorCreated,
}: CreateActorModalProps) {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [referenceImages, setReferenceImages] = useState<
		{ file: File; url: string; name: string }[]
	>([]);
	const [portraitVideo, setPortraitVideo] = useState<{
		file: File;
		url: string | ArrayBuffer | null;
		name: string;
	} | null>(null);
	const [dragActive, setDragActive] = useState({ images: false, video: false });
	const [showConfirmModal, setShowConfirmModal] = useState(false);

	const imageInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);

	const [errors, setErrors] = useState({
		name: "",
		price: "",
		images: "",
		video: "",
	});

	// Clean up Object URLs when component unmounts
	useEffect(() => {
		return () => {
			if (portraitVideo?.url && typeof portraitVideo.url === "string") {
				URL.revokeObjectURL(portraitVideo.url);
			}
		};
	}, [portraitVideo?.url]);

	// Add validation function
	const validateForm = () => {
		const newErrors = {
			name: "",
			price: "",
			images: "",
			video: "",
		};

		if (!name.trim()) {
			newErrors.name = "Name is required";
		} else if (name.trim().length < 2) {
			newErrors.name = "Name must be at least 2 characters";
		}

		if (!price.trim()) {
			newErrors.price = "Price is required";
		} else if (!/^\$?\d+(\.\d{1,2})?$/.test(price.replace(/[,$]/g, ""))) {
			newErrors.price = "Please enter a valid price";
		}

		if (referenceImages.length < 5) {
			newErrors.images = "Please upload at least 5 reference images";
		}

		if (!portraitVideo) {
			newErrors.video = "Portrait video is required";
		}

		setErrors(newErrors);
		return Object.values(newErrors).every((error) => error === "");
	};

	const handleImageUpload = (
		files: Iterable<unknown> | ArrayLike<unknown> | null
	) => {
		if (files) {
			const newImages = Array.from(files).slice(0, 10 - referenceImages.length);
			const imagePromises = newImages.map((file) => {
				return new Promise<{ file: File; url: string; name: string }>(
					(resolve) => {
						const reader = new FileReader();
						reader.onload = (e) =>
							resolve({
								file: file as File,
								url: (e.target?.result as string) || "",
								name: (file as File).name,
							});
						reader.readAsDataURL(file as Blob);
					}
				);
			});

			Promise.all<{ file: File; url: string; name: string }>(
				imagePromises
			).then((images) => {
				setReferenceImages((prev) => [...prev, ...images]);
				// Clear error if minimum images are now uploaded
				if ([...referenceImages, ...images].length >= 5) {
					setErrors((prev) => ({ ...prev, images: "" }));
				}
			});
		}
	};

	const handleVideoUpload = (file: Blob | undefined) => {
		if (file && file.type.startsWith("video/")) {
			// Use Object URL instead of Data URL for better video support
			const objectUrl = URL.createObjectURL(file);
			setPortraitVideo({
				file: file as File,
				url: objectUrl,
				name: (file as File).name,
			});
			// Clear video error
			setErrors((prev) => ({ ...prev, video: "" }));
		}
	};

	const handleDrag = (e: React.DragEvent<HTMLDivElement>, type: string) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive((prev) => ({ ...prev, [type]: true }));
		} else if (e.type === "dragleave") {
			setDragActive((prev) => ({ ...prev, [type]: false }));
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: string) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive((prev) => ({ ...prev, [type]: false }));

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			if (type === "images") {
				handleImageUpload(e.dataTransfer.files);
			} else if (type === "video") {
				handleVideoUpload(e.dataTransfer.files[0]);
			}
		}
	};

	const removeImage = (index: number) => {
		setReferenceImages((prev) => prev.filter((_, i) => i !== index));
	};

	const removeVideo = () => {
		// Clean up Object URL to prevent memory leaks
		if (portraitVideo?.url && typeof portraitVideo.url === "string") {
			URL.revokeObjectURL(portraitVideo.url);
		}
		setPortraitVideo(null);
	};

	const handleSubmit = () => {
		if (validateForm()) {
			// Open confirmation modal
			setShowConfirmModal(true);
		}
	};

	const handleConfirmSubmit = () => {
		// Handle final submission here
		console.log("Creating AI Actor with:", {
			name,
			price,
			referenceImages,
			portraitVideo,
		});

		// Clean up Object URL
		if (portraitVideo?.url && typeof portraitVideo.url === "string") {
			URL.revokeObjectURL(portraitVideo.url);
		}

		setShowConfirmModal(false);
		onClose();

		// Call onActorCreated to switch to ActorProfile
		onActorCreated();
	};

	const handleConfirmBack = () => {
		setShowConfirmModal(false);
	};

	// Clear name error when typing
	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setName(e.target.value);
		if (errors.name && e.target.value.trim().length >= 2) {
			setErrors((prev) => ({ ...prev, name: "" }));
		}
	};

	// Clear price error when typing
	const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPrice(e.target.value);
		if (
			errors.price &&
			/^\$?\d+(\.\d{1,2})?$/.test(e.target.value.replace(/[,$]/g, ""))
		) {
			setErrors((prev) => ({ ...prev, price: "" }));
		}
	};

	if (!isOpen) return null;

	// Hide main modal when confirmation modal is open
	if (showConfirmModal) {
		return (
			<ConfirmActorModal
				isOpen={showConfirmModal}
				onClose={onClose}
				onConfirm={handleConfirmSubmit}
				onBack={handleConfirmBack}
			/>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="p-8 pb-6">
					<div className="flex justify-between items-start mb-2">
						<div>
							<h2 className="text-xl font-semibold text-gray-900 mb-1">
								Create Your Custom Actor
							</h2>
							<p className="text-gray-500">
								Customize a unique AI actor for yourself an.
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 p-2"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="px-8 pb-8 space-y-6">
					{/* Name Field */}
					<div>
						<Label className="block text-base font-medium text-gray-900 mb-2">
							Name
						</Label>
						<Input
							type="text"
							value={name}
							onChange={handleNameChange}
							className={`w-full px-4 py-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
								errors.name ? "border-red-500" : "border-gray-200"
							}`}
							placeholder="Enter actor name"
						/>
						{errors.name && (
							<p className="text-red-500 text-sm mt-1">{errors.name}</p>
						)}
					</div>

					{/* Price Field */}
					<div>
						<Label className="block text-base font-medium text-gray-900 mb-2">
							Price per usage
						</Label>
						<Input
							type="text"
							value={price}
							onChange={handlePriceChange}
							className={`w-full px-4 py-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
								errors.price ? "border-red-500" : "border-gray-200"
							}`}
							placeholder="$300"
						/>
						{errors.price && (
							<p className="text-red-500 text-sm mt-1">{errors.price}</p>
						)}
						<p className="text-gray-500 text-sm mt-2">
							A 15% service fee will be deducted from each payment or usage
							sale.
						</p>
					</div>

					{/* Reference Images Upload */}
					<div>
						<Label className="block text-base font-medium text-gray-900 mb-3">
							Upload Reference Images (Min. 5, Max. 10)
						</Label>

						{/* Upload Area */}
						<div
							className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
								dragActive.images
									? "border-orange-500 bg-orange-50"
									: errors.images
										? "border-red-500"
										: "border-gray-200 hover:border-gray-300"
							}`}
							onDragEnter={(e) => handleDrag(e, "images")}
							onDragLeave={(e) => handleDrag(e, "images")}
							onDragOver={(e) => handleDrag(e, "images")}
							onDrop={(e) => handleDrop(e, "images")}
						>
							<Upload className="mx-auto mb-4 text-gray-400" size={30} />
							<p className=" mb-2">
								<button
									onClick={() => imageInputRef.current?.click()}
									className="text-orange-500 hover:text-orange-600"
								>
									Click to upload
								</button>
								<span className="text-gray-600"> or drag and drop</span>
							</p>
							<p className="text-gray-500 text-sm">
								PNG, or JPG (max. 800x400px)
							</p>
						</div>

						<Input
							ref={imageInputRef}
							type="file"
							multiple
							accept="image/*"
							onChange={(e) => handleImageUpload(e.target.files)}
							className="hidden"
						/>

						{errors.images && (
							<p className="text-red-500 text-sm mt-2">{errors.images}</p>
						)}

						{/* Image Previews */}
						{referenceImages.length > 0 && (
							<div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
								{referenceImages.map((image, index) => (
									<div key={index} className="relative group">
										<Image
											src={image.url}
											alt={`Reference ${index + 1}`}
											className="w-full h-24 object-cover rounded-lg border border-gray-200"
											width={200}
											height={100}
										/>
										<Button
											onClick={() => removeImage(index)}
											className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<Trash2 size={14} />
										</Button>
									</div>
								))}
							</div>
						)}

						{referenceImages.length > 0 && (
							<p className="text-sm text-gray-600 mt-2">
								{referenceImages.length}/10 images uploaded
								{referenceImages.length >= 5 && (
									<span className="text-green-600">
										{" "}
										✓ Minimum requirement met
									</span>
								)}
							</p>
						)}
					</div>

					{/* Portrait Video Upload */}
					<div>
						<Label className="block text-base font-medium text-gray-900 mb-2">
							Upload a Portrait Video
						</Label>

						{!portraitVideo ? (
							<div
								className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
									dragActive.video
										? "border-orange-500 bg-orange-50"
										: errors.video
											? "border-red-500"
											: "border-gray-200 hover:border-gray-300"
								}`}
								onDragEnter={(e) => handleDrag(e, "video")}
								onDragLeave={(e) => handleDrag(e, "video")}
								onDragOver={(e) => handleDrag(e, "video")}
								onDrop={(e) => handleDrop(e, "video")}
							>
								<Upload className="mx-auto mb-4 text-gray-400" size={30} />
								<p className=" mb-2">
									<button
										onClick={() => videoInputRef.current?.click()}
										className="text-orange-500 hover:text-orange-600"
									>
										Click to upload
									</button>
									<span className="text-gray-600"> or drag and drop</span>
								</p>
								<p className="text-gray-500 text-sm">mp4 (max. 20mb)</p>
							</div>
						) : (
							<div className="relative">
								<video
									src={
										typeof portraitVideo.url === "string"
											? portraitVideo.url
											: ""
									}
									className="w-full h-48 object-contain rounded-xl border border-gray-200"
									controls
									muted
									preload="metadata"
								/>
								<Button
									onClick={removeVideo}
									className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
								>
									<Trash2 size={16} />
								</Button>
							</div>
						)}

						<Input
							ref={videoInputRef}
							type="file"
							accept="video/*"
							onChange={(e) => handleVideoUpload(e.target.files?.[0])}
							className="hidden"
						/>

						{errors.video && (
							<p className="text-red-500 text-sm mt-2">{errors.video}</p>
						)}
					</div>

					{/* Guidelines */}
					<div className="space-y-3">
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
							<p className="text-gray-700">
								<span className="font-medium">Use Clear Photos</span> —
								Well-lit, front-facing, no filters or sunglasses.
							</p>
						</div>
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
							<p className="text-gray-700">
								<span className="font-medium">Be Consistent</span> — Same
								hairstyle and background across all photos.
							</p>
						</div>
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
							<p className="text-gray-700">
								<span className="font-medium">Quality Matters</span> — High
								resolution images produce better AI results.
							</p>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-4 pt-4">
						<Button
							onClick={onClose}
							className="text-[#667085] hover:text-gray-600 px-4 py-2 border border-[#6670854D] rounded-md shadow-none"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							className="px-4 py-2 bg-orange-500 text-white rounded-md font-medium hover:bg-orange-600 transition-colors shadow-none"
						>
							Turn into AI Actor
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
