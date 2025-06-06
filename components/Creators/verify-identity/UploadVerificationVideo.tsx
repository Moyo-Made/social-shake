"use client";

import { useEffect } from "react";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { useCreatorVerification } from "@/components/Creators/verify-identity/CreatorVerificationContext";

function VerificationVideo() {
	const {
		verificationData,
		updateVerificationData,
		fieldErrors,
		clearFieldError,
		touched,
		setTouched,
		isCompressing,
		compressionProgress,
	} = useCreatorVerification();

	const { verificationVideo, verifiableID } = verificationData;

	// Improved useEffect for loading stored flags and handling errors
	useEffect(() => {
		// Check if verification data is already loaded from context
		if (verificationVideo || verifiableID) {
			return; // Don't show toast if we already have the files loaded
		}

		// Set these fields as touched if user revisits the page and files were previously loaded
		if (!touched.verificationVideo && !touched.verifiableID) {
			const storedFlags = sessionStorage.getItem("verificationDataFlags");
			if (storedFlags) {
				try {
					const flags = JSON.parse(storedFlags);
					// Update touched state if files were previously uploaded
					const updatedTouched = { ...touched };
					if (flags.verificationVideoExists) {
						updatedTouched.verificationVideo = true;
						toast.info(
							"Your verification video was previously uploaded but couldn't be loaded. Please re-upload."
						);
					}
					if (flags.verifiableIDExists) {
						updatedTouched.verifiableID = true;
						toast.info(
							"Your ID was previously uploaded but couldn't be loaded. Please re-upload."
						);
					}
					setTouched(updatedTouched);
				} catch (error) {
					console.error("Error parsing verification flags:", error);
				}
			}
		}
	}, [verificationVideo, verifiableID, touched, setTouched]);

	// Enhanced upload handler for videos with compression feedback
	const handleVideoUpload = async (file: File) => {
		// Clear any previous errors
		clearFieldError("verificationVideo");

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

			// Update context data with proper async handling
			await toast.promise(updateVerificationData({ verificationVideo: file }), {
				loading: isCompressing
					? "Compressing and uploading video..."
					: "Uploading verification video...",
				success: "Your verification video has been uploaded successfully.",
				error: "Failed to upload video. Please try again.",
			});

			// Mark field as touched after upload
			setTouched((prev) => ({ ...prev, verificationVideo: true }));
		} catch (error) {
			console.error("Error in video upload:", error);
			toast.error(
				"An error occurred while processing your video. Please try again."
			);
		}
	};

	// Enhanced upload handler for ID with better context integration
	const handleIDUpload = async (file: File) => {
		// Clear any previous errors
		clearFieldError("verifiableID");

		// Validate file type (should be an image)
		const validImageTypes = ["image/png", "image/jpeg", "image/jpg"];
		if (!validImageTypes.includes(file.type)) {
			toast.error("Invalid file type. Please upload a PNG or JPG image.");
			return;
		}

		try {
			// Check file size before processing (5MB limit)
			if (file.size > 5 * 1024 * 1024) {
				toast.error("File too large. Maximum image size is 5MB.");
				return;
			}

			// Update context data with proper async handling
			await toast.promise(updateVerificationData({ verifiableID: file }), {
				loading: "Uploading ID...",
				success: "Your ID has been uploaded successfully.",
				error: "Failed to upload ID. Please try again.",
			});

			// Mark field as touched after upload
			setTouched((prev) => ({ ...prev, verifiableID: true }));
		} catch (error) {
			console.error("Error in ID upload:", error);
			toast.error(
				"An error occurred while processing your ID. Please try again."
			);
		}
	};

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-semibold mb-2">Verify Your Identity</h1>
				<p className="text-gray-600">
					To keep our platform secure and authentic, upload a short verification
					video to confirm your identity.
					<br /> Your privacy is our priority.
				</p>
			</div>
			<div className="mb-5">
				<div className="space-y-2 mb-8">
					<div className="flex gap-3">
						<Image src="/icons/audio.svg" alt="Audio" width={20} height={20} />
						<p className="text-[#667085]">
							Ensure good lighting and clear audio.
						</p>
					</div>
					<div className="flex gap-3">
						<Image src="/icons/speak.svg" alt="Speak" width={20} height={20} />
						<p className="text-[#667085]">
							State your full name as it appears in your account and your ID.
						</p>
					</div>
					<div className="flex gap-3">
						<Image src="/icons/date.svg" alt="Date" width={20} height={20} />
						<p className="text-[#667085]">
							Mention today&apos;s date for verification purposes:{" "}
							{formatDate(new Date())}.
						</p>
					</div>
					<div className="flex gap-3">
						<Image src="/icons/id.svg" alt="ID" width={20} height={20} />
						<p className="text-[#667085]">
							Hold up a valid ID for a few seconds, ensuring it&apos;s clearly
							visible.
						</p>
					</div>
					<div className="flex gap-3">
						<Image
							src="/icons/cancel.svg"
							alt="Cancel"
							width={20}
							height={20}
						/>
						<p className="text-[#667085]">
							No Use of Filters or Effect is allowed
						</p>
					</div>
				</div>
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-semibold mb-2">
					Upload your Verification Video
				</h2>
				<p className="text-sm text-[#667085] mb-4">
					All documents and files you upload will be kept strictly confidential
					and used only for verification purposes.
				</p>

				{/* Compression progress indicator */}
				{isCompressing && (
					<div className="mb-4">
						<p className="text-sm text-blue-600 mb-2">
							Compressing video ({Math.round(compressionProgress * 100)}%)...
						</p>
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div
								className="bg-blue-600 h-2.5 rounded-full"
								style={{ width: `${compressionProgress * 100}%` }}
							></div>
						</div>
					</div>
				)}

				<UploadDropzone
					onFileSelect={handleVideoUpload}
					acceptedFileTypes="video/*"
					maxSize={50 * 1024 * 1024} // 50MB max size
					selectedFile={verificationVideo}
					instructionText="Click to upload or drag and drop"
					fileTypeText="Video file (max 50MB, large files will be compressed)"
					disabled={isCompressing}
				/>
				{verificationVideo && !isCompressing && (
					<p className="text-sm text-green-600 mt-2">
						Video uploaded: {verificationVideo.name} (
						{(verificationVideo.size / (1024 * 1024)).toFixed(2)}MB)
					</p>
				)}
				{touched.verificationVideo && fieldErrors.verificationVideo && (
					<p className="text-sm text-red-500 mt-2">
						{fieldErrors.verificationVideo}
					</p>
				)}
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-semibold mb-2">
					Upload your Verifiable ID
				</h2>
				<p className="text-sm text-[#667085] mb-4">
					All documents and files you upload will be kept strictly confidential
					and used only for verification purposes.
				</p>
				<UploadDropzone
					onFileSelect={handleIDUpload}
					acceptedFileTypes="image/png, image/jpeg, image/jpg"
					maxSize={5 * 1024 * 1024} // 5MB max size
					selectedFile={verifiableID}
					instructionText="Click to upload or drag and drop"
					fileTypeText="PNG, or JPG (max. 5MB)"
					disabled={isCompressing}
				/>
				{verifiableID && (
					<p className="text-sm text-green-600 mt-2">
						ID uploaded: {verifiableID.name} (
						{(verifiableID.size / (1024 * 1024)).toFixed(2)}MB)
					</p>
				)}
				{touched.verifiableID && fieldErrors.verifiableID && (
					<p className="text-sm text-red-500 mt-2">
						{fieldErrors.verifiableID}
					</p>
				)}
			</div>
		</div>
	);
}

export default function UploadVerificationVideo() {
	return <VerificationVideo />;
}
