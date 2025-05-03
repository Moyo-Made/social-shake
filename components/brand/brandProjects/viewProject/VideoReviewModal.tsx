import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import Image from "next/image";
import { CreatorSubmission } from "@/types/submission";
import { toast } from "react-hot-toast";

interface ReviewVideoModalProps {
	submission: CreatorSubmission | null;
	onClose: () => void;
	isOpen: boolean;
	onSubmit: (
        approved: boolean,
        feedback?: string,
        issues?: string[],
        videoTimestamps?: { time: number; note: string }[]
    ) => Promise<void>;
	revisionUsed: number;
	onReviewComplete?: (approved: boolean, revisionsUsed: number) => void;
}

const ReviewVideoModal: React.FC<ReviewVideoModalProps> = ({
	submission,
	onClose,
	isOpen,
	onReviewComplete,
}) => {
	const [feedback, setFeedback] = useState<string>("");
	const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
	const [revisionsUsed, setRevisionsUsed] = useState<number>(0);
	const [maxRevisions, ] = useState<number>(3);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Fetch current revision data when submission changes
	useEffect(() => {
		if (submission?.id) {
			fetchRevisionsData(submission.id);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [submission]);

	// Fetch revision data
	const fetchRevisionsData = async (submissionId: string) => {
		try {
			const response = await fetch(`/api/reviews?submissionId=${submissionId}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				console.error("Error fetching revision data:", errorData);
				return;
			}
			
			const data = await response.json();
			
			// If we have a submission with revisionsUsed field, use that
			if (submission?.revisionsUsed !== undefined) {
				setRevisionsUsed(submission.revisionsUsed);
			} 
			// Otherwise calculate from reviews data
			else if (data.reviews && Array.isArray(data.reviews)) {
				// Count reviews that were not approvals
				const revisionRequests = data.reviews.filter(
					(review: { approved: boolean }) => !review.approved
				).length;
				setRevisionsUsed(revisionRequests);
			}
			
		} catch (error) {
			console.error("Failed to fetch revisions data:", error);
		}
	};

	const issuesList = [
		"Wrong aspect ratio",
		"Off-brand messaging",
		"Low video quality",
		"Poor lighting",
		"Bad audio quality",
		"Missing key product features",
		"Incorrect pronunciation of brand name",
		"Lack of engagement or energy",
		"Unclear call-to-action",
		"Video too long or too short",
		"Poor framing or composition",
		"Distracting background or noise",
		"Incorrect use of brand assets",
		"Missing required hashtags or tags",
		"Inappropriate tone or language",
		"Off-topic content",
		"Overuse of filters or effects",
		"Competitor branding visible",
		"Music copyright issues",
		"Script deviation from brand guidelines",
		"Misrepresentation of the product",
		"Blurry or pixelated footage",
		"Lack of enthusiasm or authenticity",
		"Unapproved sponsorships or promotions",
	];

	const toggleIssue = (issue: string) => {
		if (selectedIssues.includes(issue)) {
			setSelectedIssues(selectedIssues.filter((item) => item !== issue));
		} else {
			setSelectedIssues([...selectedIssues, issue]);
		}
	};

	const removeIssue = (issue: string) => {
		setSelectedIssues(selectedIssues.filter((item) => item !== issue));
	};


	const handleSubmitReview = async (approved: boolean) => {
		if (!submission?.id) {
			toast.error("No submission selected");
			return;
		}

		if (!approved && revisionsUsed >= maxRevisions) {
			toast.error(`Maximum revisions (${maxRevisions}) already used`);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/reviews", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					submissionId: submission.id,
					approved,
					feedback,
					issues: selectedIssues,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit review");
			}

			// Update local revision count
			const newRevisionsUsed = approved 
				? revisionsUsed  // No change if approved
				: revisionsUsed + 1;
			
			setRevisionsUsed(newRevisionsUsed);
			
			// Show success message
			toast.success(
				approved 
					? "Video approved successfully!" 
					: `Revision request sent (${newRevisionsUsed}/${maxRevisions} revisions used)`
			);
			
			// Trigger callback if provided
			if (onReviewComplete) {
				onReviewComplete(approved, newRevisionsUsed);
			}
			
			// Reset form
			setFeedback("");
			setSelectedIssues([]);
			
			// Close modal
			onClose();
			
		} catch (error) {
			console.error("Error submitting review:", error);
			toast.error(error instanceof Error ? error.message : "Failed to submit review");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Don't render if not open or no submission
	if (!isOpen || !submission) {
		return null;
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
			<Card className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden relative">
				{/* Back button - Positioned in the top left */}
				<button
					onClick={onClose}
					className="absolute top-4 left-4 inline-flex items-center text-gray-600 hover:text-black z-10"
					disabled={isSubmitting}
				>
					<ChevronLeft className="h-5 w-5 mr-1" />
					<span>Back</span>
				</button>

				<CardHeader className="pb-0 pt-8">
					<h2 className="text-xl font-bold text-center text-black">
						Review Video
					</h2>
				</CardHeader>

				<CardContent className="p-6">
					<div className="flex flex-row gap-8">
						{/* Left side */}
						<div className="flex flex-col">
							<div className="flex items-start mb-6">
								<div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden mr-2 ">
									<Image
										src={submission.creatorIcon}
										alt="Creator avatar"
										className="w-full h-full object-cover"
										width={64}
										height={64}
									/>
								</div>

								<div className="flex flex-col justify-start items-start">
									<div className="flex items-center gap-2">
										<div className="text-[#667085]">
											Creator Name:{" "}
											<span className="text-black font-medium">
												{submission.creatorName}
											</span>
										</div>
									</div>
									<div className="text-[#667085]">
										Submitted:{" "}
										<span className="text-black">{submission.createdAt}</span>
									</div>
									<div className="text-orange-500 font-medium">
										Video {submission.videoNumber}
									</div>
								</div>
							</div>

							<div className="relative rounded-lg overflow-hidden h-[350px] mb-6">
								<div className="w-full h-64 relative">
									<video
										src={submission.videoUrl}
										className="absolute inset-0 w-full h-full object-cover rounded-md"
										controls
									/>
								</div>
							</div>
						</div>

						{/* Right side */}
						<div className="w-1/2 pl-4">
							<div className="bg-[#FDEFE7] p-3 rounded-md mb-2">
								<p className="text-[#BE4501] text-sm text-start">
									Please ensure all comments relate to the original brand
									requirements and the video itself.
								</p>
							</div>

							<div className="mb-2">
								<p className="text-base text-black text-start font-medium mb-1">
									Revision: {revisionsUsed}/{maxRevisions} used
								</p>
							</div>

							<div className="mb-2 relative">
								<p className="text-base text-black text-start font-medium mb-4">
									Select Your Issues
								</p>

								{/* Selected issues tags */}
								{selectedIssues.length > 0 && (
									<div className="flex flex-wrap gap-2 mb-2">
										{selectedIssues.map((issue) => (
											<div
												key={issue}
												className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm flex items-center"
											>
												{issue}
												<button
													onClick={() => removeIssue(issue)}
													className="ml-1 text-gray-500 hover:text-gray-700"
													disabled={isSubmitting}
												>
													<X className="h-3 w-3" />
												</button>
											</div>
										))}
									</div>
								)}

								{/* Custom multi-select dropdown */}
								<div className="relative">
									<button
										type="button"
										className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
										onClick={() => setIsDropdownOpen(!isDropdownOpen)}
										disabled={isSubmitting}
									>
										<span className="text-gray-500">
											{selectedIssues.length > 0
												? `${selectedIssues.length} issue(s) selected`
												: "Select Issues"}
										</span>
										<ChevronDown className="h-4 w-4 text-gray-500" />
									</button>

									{isDropdownOpen && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-56 overflow-y-auto">
											{issuesList.map((issue) => (
												<div
													key={issue}
													className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
													onClick={() => toggleIssue(issue)}
												>
													<Checkbox
														checked={selectedIssues.includes(issue)}
														onCheckedChange={() => toggleIssue(issue)}
														className="mr-2 h-4 w-4"
													/>
													<span>{issue}</span>
												</div>
											))}
										</div>
									)}
								</div>
							</div>

							<div className="mb-2">
								<p className="text-base text-black text-start font-medium mb-2">
									Provide Detailed Feedback {!selectedIssues.length && "(Required)"}
								</p>
								<Textarea
									placeholder="Enter your feedback..."
									className="resize-none min-h-[120px]"
									value={feedback}
									onChange={(e) => setFeedback(e.target.value)}
									disabled={isSubmitting}
								/>
								<p className="text-sm text-start text-gray-500 mt-2">
									(Max: 2000 characters)
								</p>
							</div>

							<div className="flex gap-4 mt-6">
								
								<Button
									className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 text-base"
									onClick={() => handleSubmitReview(false)}
									disabled={
										isSubmitting || 
										revisionsUsed >= maxRevisions || 
										(!selectedIssues.length && !feedback.trim())
									}
								>
									{isSubmitting ? "Sending..." : "Send Review"}
								</Button>
							</div>
							
							{revisionsUsed >= maxRevisions && (
								<p className="text-red-500 text-sm mt-2 text-center">
									Maximum revisions reached. Only approval is possible.
								</p>
							)}
							
							{!selectedIssues.length && !feedback.trim() && (
								<p className="text-orange-500 text-sm mt-2 text-center">
									Please select issues or provide feedback to send a review.
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default ReviewVideoModal;