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
import React, { useState, useEffect } from "react";
import { useContestForm } from "./ContestFormContext"; // Add this import

const Basic: React.FC = () => {
    // Use the contest form context instead of local state
    const { formData, updateBasicData } = useContestForm();
    
    // Get values from context
    const { basic } = formData;
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Initialize preview URL from context if available
    useEffect(() => {
        // If there's a string URL in the context
        if (typeof basic.thumbnail === 'string') {
            setPreviewUrl(basic.thumbnail as string);
        } else if (basic.thumbnail instanceof File) {
            // If there's a File object
            setSelectedFile(basic.thumbnail);
            const objectUrl = URL.createObjectURL(basic.thumbnail);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [basic.thumbnail]);

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

    // Update form fields using the context
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateBasicData({ contestName: e.target.value });
    };

    const handleIndustryChange = (value: string) => {
        updateBasicData({ industry: value });
    };

    const handleDescriptionChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        updateBasicData({ description: e.target.value });
    };

    const handleRulesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateBasicData({ rules: e.target.value });
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
            updateBasicData({ thumbnail: file });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            updateBasicData({ thumbnail: file });
        }
    };

    const handleContestTypeChange = (type: "Leaderboard" | "GMV") => {
        updateBasicData({ contestType: type });
    };

    return (
        <div className="w-[44rem] bg-white px-8 py-6 border border-[#FFBF9B] rounded-lg">
            <label className="block text-base font-medium text-gray-700">
                Contest Name
            </label>
            <Input
                className="mt-1"
                placeholder="Best TikTok Ad for XYZ Shoes"
                value={basic.contestName}
                onChange={handleNameChange}
            />

            {/* ContestTypeSelector integrated directly in Basic component */}
            <div className="w-full max-w-3xl mx-auto mt-4">
                <h2 className="text-base font-medium text-gray-700 mb-2">Contest Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Leaderboard Contest */}
                    <div
                        className={cn(
                            "relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
                            basic.contestType === "Leaderboard"
                                ? "border-2 border-orange-500 bg-orange-50"
                                : "border border-gray-200 bg-white hover:border-gray-300"
                        )}
                        onClick={() => handleContestTypeChange("Leaderboard")}
                    >
                        <div className="absolute top-4 left-4">
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center",
                                    basic.contestType === "Leaderboard"
                                        ? "border-2 border-orange-500"
                                        : "border border-gray-300"
                                )}
                            >
                                {basic.contestType === "Leaderboard" && (
                                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col items-start">
                            <div className="mb-2 mt-6">
                                <Image
                                    src="/icons/trophy.svg"
                                    alt="Trophy"
                                    width={35}
                                    height={35}
                                />
                            </div>

                            <h3 className="text-lg text-start font-semibold mb-1">
                                Leaderboard Contest
                            </h3>

                            <p className="text-sm text-[#667085] text-start">
                                Compete for the top spot! Creators are ranked based on views,
                                likes, or impressions, and the highest-performing entries win the
                                prizes.
                            </p>
                        </div>
                    </div>

                    {/* GMV Contest */}
                    <div 
                        className={cn(
                            "relative rounded-2xl p-5 cursor-pointer transition-all duration-200",
                            basic.contestType === "GMV"
                                ? "border-2 border-orange-500 bg-orange-50"
                                : "border border-gray-200 bg-white hover:border-gray-300"
                        )}
                        onClick={() => handleContestTypeChange("GMV")}
                    >
                        <div className="absolute top-4 left-4">
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center",
                                    basic.contestType === "GMV"
                                        ? "border-2 border-orange-500"
                                        : "border border-gray-300"
                                )}
                            >
                                {basic.contestType === "GMV" && (
                                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col items-start">
                            <div className="mb-2 mt-4 ">
                                <Image
                                    src="/icons/money-bag.svg"
                                    alt="Money Bag"
                                    width={35}
                                    height={35}
                                />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">GMV Contest</h3>
                            <p className="text-sm text-[#667085] text-start">
                                Drive sales and earn rewards! Creators are ranked based on the
                                total Gross Merchandise Value (GMV) they generate, with top
                                performers winning prizes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <label className="block text-base font-medium text-gray-700 mt-4 mb-1">
                Contest Industry
            </label>
            <Select value={basic.industry} onValueChange={handleIndustryChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="skincare">Skincare</SelectItem>
                </SelectContent>
            </Select>

            <label className="block text-base font-medium text-gray-700 mt-4">
                Contest Description
            </label>
            <Textarea
                className="mt-1"
                rows={3}
                placeholder="We're looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!"
                value={basic.description}
                onChange={handleDescriptionChange}
            />

            <label className="block text-base font-medium text-gray-700 mt-4">
                Contest Rules
            </label>
            <Textarea
                className="mt-1"
                rows={5}
                placeholder={` • Content must meet all brand guidelines (duration, aspect ratio, tone).\n • Only original content will be accepted—no copyrighted material.\n • Winners will be determined based on leaderboard rankings (views/likes).\n • The brand reserves the right to request revisions or disqualify incomplete entries.`}
                value={basic.rules}
                onChange={handleRulesChange}
            />

            <label className="block text-base font-medium text-gray-700 mt-4 mb-1">
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
        </div>
    );
};

export default Basic;