"use client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useState } from "react";

const Basic = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [dragActive, setDragActive] = useState(false);

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
			setSelectedFile(e.dataTransfer.files[0]);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700">
				Contest Name
			</label>
			<Input className="mt-1" placeholder="Best TikTok Ad for XYZ Shoes" />

			<label className="block text-sm font-medium text-gray-700 mt-4">
				Contest Industry
			</label>
			<Select>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select Industry" />
				</SelectTrigger>
				<SelectContent className="bg-white">
					<SelectItem value="fashion">Fashion</SelectItem>
					<SelectItem value="technology">Technology</SelectItem>
					<SelectItem value="food">Food</SelectItem>
				</SelectContent>
			</Select>

			<label className="block text-sm font-medium text-gray-700 mt-4">
				Contest Description
			</label>
			<Textarea
				className="mt-1"
				rows={3}
				placeholder="We’re looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!"
			/>

			<label className="block text-sm font-medium text-gray-700 mt-4">
				Contest Rules
			</label>
			<Textarea
				className="mt-1"
				rows={5}
				placeholder={` • Content must meet all brand guidelines (duration, aspect ratio, tone).\n • Only original content will be accepted—no copyrighted material.\n • Winners will be determined based on leaderboard rankings (views/likes).\n • The brand reserves the right to request revisions or disqualify incomplete entries.`}
			/>

			<label className="block text-sm font-medium text-gray-700 mt-4">
				Contest Thumbnail
			</label>
			<div
				className={cn(
					"border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
					dragActive ? "border-[#FD5C02] bg-orange-50" : "border-gray-300",
					selectedFile && "border-green-500 bg-green-50"
				)}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={() => document.getElementById("file-upload")?.click()}
			>
				{selectedFile ? (
					<p className="text-green-600">Selected: {selectedFile.name}</p>
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
		</div>
	);
};

export default Basic;
