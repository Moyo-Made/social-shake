"use client";

import Image from "next/image";
import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";

interface UploadDropzoneProps {
	onFileSelect: (file: File) => void;
	acceptedFileTypes: string;
	maxSize: number;
	selectedFile: File | null;
	instructionText: string;
	fileTypeText: string;
}

export function UploadDropzone({
	onFileSelect,
	acceptedFileTypes,
	maxSize,
	selectedFile,
	instructionText,
	fileTypeText,
}: UploadDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileType, setFileType] = useState<"image" | "video" | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Create preview when a file is selected
	useEffect(() => {
		if (!selectedFile) {
			setPreviewUrl(null);
			setFileType(null);
			return;
		}

		// Determine file type
		if (selectedFile.type.startsWith("image/")) {
			setFileType("image");
		} else if (selectedFile.type.startsWith("video/")) {
			setFileType("video");
		} else {
			setFileType(null);
		}

		// Create preview URL
		const url = URL.createObjectURL(selectedFile);
		setPreviewUrl(url);

		// Clean up the URL when component unmounts or when file changes
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [selectedFile]);

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			validateAndProcessFile(files[0]);
		}
	};

	const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			validateAndProcessFile(e.target.files[0]);
		}
	};

	const validateAndProcessFile = (file: File) => {
		// Check file size
		if (file.size > maxSize) {
			setErrorMessage(
				`File size exceeds maximum allowed size of ${Math.round(maxSize / (1024 * 1024))}MB`
			);
			return;
		}

		// Clear any previous error messages
		setErrorMessage(null);
		onFileSelect(file);
	};

	const triggerFileInput = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	return (
		<div
			className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
				isDragging
					? "border-orange-500 bg-orange-50"
					: "border-gray-300 hover:border-orange-500"
			}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={triggerFileInput}
		>
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileInput}
				accept={acceptedFileTypes}
				className="hidden"
			/>

			<div className="flex flex-col items-center justify-center py-4">
				{selectedFile ? (
					<div className="flex flex-col items-center space-y-3">
						{/* Preview container */}
						<div className="relative w-full max-w-md overflow-hidden rounded-lg border border-gray-200">
							{fileType === "image" && previewUrl && (
								<div className="relative h-48 w-full">
									<Image
										src={previewUrl}
										alt="File preview"
										fill
										className="object-contain"
									/>
								</div>
							)}

							{fileType === "video" && previewUrl && (
								<video
									src={previewUrl}
									controls
									className="w-full h-48 object-contain"
								/>
							)}

							{!fileType && (
								<div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto my-4">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
							)}
						</div>

						{/* File name */}
						<p className="text-sm text-gray-600">{selectedFile.name}</p>

						{/* File size */}
						<p className="text-xs text-gray-400">
							{(selectedFile.size / 1024).toFixed(1)} KB
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
						<p className="text-orange-500">{instructionText}</p>
						<p className="text-xs text-gray-500 mt-2">{fileTypeText}</p>
					</>
				)}
			</div>

			{/* Error message display */}
			{errorMessage && (
				<div className="text-red-500 text-sm mt-2">{errorMessage}</div>
			)}
		</div>
	);
}
