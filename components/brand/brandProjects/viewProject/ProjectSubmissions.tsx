"use client";

import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Download, ChevronDown, ChevronUp, Copy } from "lucide-react";
import Image from "next/image";
import ReviewVideoModal from "./VideoReviewModal";
import ProjectApprovalModal from "./ProjectApprovalModal";
import VerifySparkCodeModal from "./VerifySparkCodeModal";
import { CreatorSubmission } from "@/types/submission";
import { ProjectFormData } from "@/types/contestFormData";
import VerifyTikTokLinkModal from "./VerifyTikTokLinkModal";
import toast from "react-hot-toast";
import Link from "next/link";

interface ProjectSubmissionsProps {
	projectFormData: ProjectFormData;
	userId?: string;
	projectId: string;
}

export default function ProjectSubmissions({
	projectFormData,
	userId,
	projectId,
}: ProjectSubmissionsProps) {
	const projectType = projectFormData?.projectDetails?.projectType;

	const [activeView, setActiveView] = useState<"project" | "creator">(
		"project"
	);
	const [openReviewDialog, setOpenReviewDialog] = useState(false);
	const [openApproveDialog, setOpenApproveDialog] = useState(false);
	const [openVerifySparkDialog, setOpenVerifySparkDialog] = useState(false);
	const [openVerifyTiktokLinkDialog, setOpenVerifyTiktokLinkDialog] =
		useState(false);
	const [currentSubmission, setCurrentSubmission] =
		useState<CreatorSubmission | null>(null);
	const [revisionUsed, setRevisionUsed] = useState<number>(1);
	const [submissionsList, setSubmissionsList] = useState<CreatorSubmission[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedCreators, setExpandedCreators] = useState<
		Record<string, boolean>
	>({});
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("newest");

	// Fetch submissions data
	useEffect(() => {
		const fetchSubmissions = async () => {
			try {
				setLoading(true);

				const response = await fetch(
					`/api/project-submissions?projectId=${projectId}`
				);

				if (!response.ok) {
					throw new Error(`Error fetching submissions: ${response.statusText}`);
				}

				const data = await response.json();

				if (data.success && data.submissions) {
					// First set basic submissions data
					const basicSubmissions = data.submissions;

					// Fetch all creator data in parallel
					const userIds = [
						...new Set(
							basicSubmissions.map((sub: CreatorSubmission) => sub.userId)
						),
					];
					const creatorDataMap = new Map();

					await Promise.all(
						userIds.map(async (userId) => {
							try {
								const creatorRes = await fetch(
									`/api/admin/creator-approval?userId=${userId}`
								);

								if (creatorRes.ok) {
									const response = await creatorRes.json();

									// Store the first creator from the response
									if (response.creators && response.creators.length > 0) {
										creatorDataMap.set(userId, response.creators[0]);
									}
								}
							} catch (err) {
								console.error(
									`Error fetching creator data for user ID ${userId}:`,
									err
								);
							}
						})
					);

					// Transform the API response to match our Submission interface with creator data
					const transformedSubmissions = basicSubmissions.map(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(submission: any, index: number) => {
							const creatorData = creatorDataMap.get(submission.userId);

							return {
								id: submission.id,
								userId: submission.userId,
								projectId: submission.projectId,
								creatorName:
									creatorData?.username || submission.creatorName || "Creator",
								creatorIcon:
									creatorData?.logoUrl ||
									submission.creatorIcon ||
									"/placeholder-profile.jpg",
								videoUrl: submission.videoUrl || "/placeholder-video.jpg",
								videoNumber: submission.videoNumber || `#${index + 1}`,
								revisionNumber: submission.revisionNumber
									? `#${submission.revisionNumber}`
									: "",
								status: submission.status || "new",
								createdAt: new Date(submission.createdAt).toLocaleDateString(),
								sparkCode: submission.sparkCode || "",
								tiktokLink: submission.tiktokLink || "",
								affiliate: submission.affiliateLink || "",
								creator: creatorData || null,
							};
						}
					);

					setSubmissionsList(transformedSubmissions);

					// Initialize expanded state for creators
					const creatorExpandState: Record<string, boolean> = {};
					transformedSubmissions.forEach((submission: CreatorSubmission) => {
						if (
							submission.creatorName &&
							!creatorExpandState[submission.creatorName]
						) {
							creatorExpandState[submission.creatorName] = true; // Default to expanded
						}
					});
					setExpandedCreators(creatorExpandState);
				} else {
					throw new Error(data.error || "Failed to fetch submissions");
				}
			} catch (err) {
				console.error("Error fetching submissions:", err);
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
				if (toast) {
					toast.error("Failed to fetch submissions");
				}
			} finally {
				setLoading(false);
			}
		};

		fetchSubmissions();
	}, [userId, projectId]);

	// Function to update submission status
	const updateSubmissionStatus = async (
		submissionId: string,
		newStatus: string,
		additionalData: Record<string, unknown> = {}
	) => {
		try {
			// Get current user token from Firebase Auth
			const auth = getAuth();
			const currentUser = auth.currentUser;

			if (!currentUser) {
				toast.error("You must be logged in to update submissions");
				return false;
			}

			// Get the authentication token
			const token = await currentUser.getIdToken();

			// Ensure statuses match between frontend and backend
			const apiStatus = newStatus;
			// Both backend and frontend use the same status values now

			const response = await fetch("/api/project-submissions/update-status", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`, // Add the auth token
				},
				body: JSON.stringify({
					submissionId,
					status: apiStatus,
					...additionalData,
				}),
			});

			if (!response.ok) {
				// Log more detailed error info
				const errorData = await response.json();
				console.error("API Response Error:", {
					status: response.status,
					statusText: response.statusText,
					data: errorData,
				});
				throw new Error(`Failed to update status: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success) {
				// Update local state with new status
				setSubmissionsList((prevList) =>
					prevList.map((sub) =>
						sub.id === submissionId
							? {
									...sub,
									status: newStatus as CreatorSubmission["status"],
									...additionalData,
								}
							: sub
					)
				);

				toast.success(`Status updated to ${newStatus}`);
				return true;
			} else {
				throw new Error(data.error || "Failed to update status");
			}
		} catch (err) {
			console.error("Error updating submission status:", err);
			toast.error("Failed to update submission status");
			return false;
		}
	};

	const handleReview = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setOpenReviewDialog(true);
		// Determine revision number based on submission data
		setRevisionUsed(
			parseInt(String(submission.revisionNumber)?.replace("#", "") || "1")
		);
	};

	const handleApproveClick = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setOpenApproveDialog(true);
	};

	const handleApprove = async () => {
		if (currentSubmission) {
			const success = await updateSubmissionStatus(
				currentSubmission.id,
				"approved"
			);

			if (success) {
				setOpenApproveDialog(false);
			}
		}
	};

	const handleRequestSparkCode = async (submission: CreatorSubmission) => {
		// First update the status to spark_requested and don't change it automatically
		const success = await updateSubmissionStatus(
			submission.id,
			"spark_requested"
		);

		if (success) {
			try {
				// When fetching the spark code, don't automatically update the status
				const response = await fetch(
					"/api/project-submissions/get-spark-code",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							submissionId: submission.id,
						}),
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					console.error("Failed to fetch spark code:", errorData);
					// Don't change the status here, leave it as spark_requested
					return;
				}

				const data = await response.json();

				if (data.success && data.data.sparkCode) {
					// Only if we successfully got a spark code, update the status
					await updateSubmissionStatus(submission.id, "spark_received", {
						sparkCode: data.data.sparkCode,
					});
				}
				// If no spark code was found, the status remains as spark_requested
			} catch (error) {
				console.error("Error fetching spark code:", error);
				// Don't change the status on error
			}
		}
	};

	const handleRequestTiktokLink = async (submission: CreatorSubmission) => {
		// First update the status to tiktokLink_requested and don't change it automatically
		const success = await updateSubmissionStatus(
			submission.id,
			"tiktokLink_requested"
		);

		if (success) {
			try {
				// When fetching the tiktok link, don't automatically update the status
				const response = await fetch(
					"/api/project-submissions/get-tiktok-link",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							submissionId: submission.id,
						}),
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					console.error("Failed to fetch tiktok link:", errorData);
					// Don't change the status here, leave it as tiktokLink_requested
					return;
				}

				const data = await response.json();

				if (data.success && data.data.tiktokLink) {
					// Only if we successfully got a tiktok code, update the status
					await updateSubmissionStatus(submission.id, "tiktokLink_received", {
						tiktokLink: data.data.tiktokLink,
					});
				}
				// If no tiktok link was found, the status remains as tiktkLink_requested
			} catch (error) {
				console.error("Error fetching tiktok link:", error);
				// Don't change the status on error
			}
		}
	}

		const handleVerifySparkCode = (submission: CreatorSubmission) => {
			setCurrentSubmission(submission);
			setOpenVerifySparkDialog(true);
		};

		const handleVerifyTiktokLink = (submission: CreatorSubmission) => {
			setCurrentSubmission(submission);
			setOpenVerifyTiktokLinkDialog(true);
		};

		const handleConfirmPayment = async (submission: CreatorSubmission) => {
			const success = await updateSubmissionStatus(
				submission.id,
				"awaiting_payment"
			);

			if (success) {
				// Simulate payment confirmation after delay
				setTimeout(async () => {
					await updateSubmissionStatus(submission.id, "payment_confirmed");
				}, 3000);
			}
		};

		const confirmSparkCodeVerification = async () => {
			if (currentSubmission) {
				const success = await updateSubmissionStatus(
					currentSubmission.id,
					"spark_verified"
				);

				if (success) {
					setOpenVerifySparkDialog(false);
				}
			}
		};

		const confirmTiktokLinkVerification = async () => {
			if (currentSubmission) {
				const success = await updateSubmissionStatus(
					currentSubmission.id,
					"tiktokLink_verified" // Changed to tiktokLink_verified
				);

				if (success) {
					setOpenVerifyTiktokLinkDialog(false);
				}
			}
		};

		const handleRequestNewCode = async (
			submission: CreatorSubmission,
			setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
		) => {
			setIsModalOpen(false);

			// Set status to spark_requested
			const success = await updateSubmissionStatus(
				submission.id,
				"spark_requested"
			);

			// Don't do anything else automatically - leave it in the requested state
			if (success) {
				toast.success("New spark code requested successfully");
			}
		};

		const handleRequestNewLink = async (
			submission: CreatorSubmission,
			setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
		) => {
			setIsModalOpen(false);

			// Set status to tiktokLink_requested
			const success = await updateSubmissionStatus(
				submission.id,
				"tiktokLink_requested"
			);

			// Don't do anything else automatically - leave it in the requested state
			if (success) {
				toast.success("New tiktok link requested successfully");
			}
		};


		const handleSubmit = async (
			approved: boolean,
			feedback?: string,
			issues?: string[],
			videoTimestamps?: { time: number; note: string }[]
		) => {
			if (currentSubmission) {
				if (approved) {
					await updateSubmissionStatus(currentSubmission.id, "approved", {
						feedback,
						issues,
						videoTimestamps,
					});
				} else {
					await updateSubmissionStatus(
						currentSubmission.id,
						"revision_requested",
						{
							feedback,
							issues,
							videoTimestamps, // Include timestamps in the update
						}
					);
				}
			}
			setOpenReviewDialog(false);
		};

		const handleCloseModals = () => {
			setOpenReviewDialog(false);
			setOpenApproveDialog(false);
			setOpenVerifySparkDialog(false);
			setOpenVerifyTiktokLinkDialog(false);
		};

		const toggleCreatorExpand = (creatorName: string) => {
			setExpandedCreators({
				...expandedCreators,
				[creatorName]: !expandedCreators[creatorName],
			});
		};

		// Filter and sort submissions
		const filteredSubmissions = submissionsList.filter((submission) => {
			if (statusFilter === "all") return true;
			return submission.status === statusFilter;
		});

		const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return (
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
					);
				case "oldest":
					return (
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
					);
				case "creator":
					return a.createdAt.localeCompare(b.createdAt);
				default:
					return 0;
			}
		});

		// Group submissions by creator for creator view
		const groupedSubmissions = sortedSubmissions.reduce(
			(groups, submission) => {
				if (!groups[submission.creatorName]) {
					groups[submission.creatorName] = [];
				}
				groups[submission.creatorName].push(submission);
				return groups;
			},
			{} as Record<string, CreatorSubmission[]>
		);

		// Calculate progress metrics
		const totalVideos = submissionsList.length;
		const completedVideos = submissionsList.filter(
			(sub) =>
				sub.status === "pending" ||
				sub.status === "approved" ||
				sub.status === "spark_requested" ||
				sub.status === "spark_received" ||
				sub.status === "spark_verified" ||
				sub.status === "tiktokLink_requested" ||
				sub.status === "tiktokLink_received" ||
				sub.status === "tiktokLink_verified" ||
				sub.status === "awaiting_payment" ||
				sub.status === "payment_confirmed"
		).length;

		const completionPercentage =
			totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

		// Render buttons based on submission status
		const renderSubmissionButtons = (submission: CreatorSubmission) => {
			switch (submission.status) {
				case "submitted":
				case "new":
				case "pending":
					return (
						<>
							<Button
								variant="secondary"
								className="flex-1 mr-2 bg-[#FD5C02] text-white"
								onClick={() => handleReview(submission)}
							>
								Review
							</Button>
							<Button
								variant="default"
								className="flex-1 bg-[#067647] hover:bg-green-700 text-white"
								onClick={() => handleApproveClick(submission)}
							>
								Approve
								<Check className="h-5 w-5 ml-1" />
							</Button>
						</>
					);
				case "revision_requested":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => handleReview(submission)}
						>
							Review
						</Button>
					);
				case "approved":
					// For UGC, show download directly after approval
					if (
						projectType === "UGC Content Only" ||
						projectType === "TikTok Shop"
					) {
						return (
							<Button
								variant="secondary"
								className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
								onClick={() => window.open(submission.videoUrl, "_blank")}
							>
								Download Video
								<Download className="h-4 w-4 ml-2" />
							</Button>
						);
					}
					// For Spark Ads, start with request spark code
					else if (projectType === "Spark Ads") {
						return (
							<Button
								variant="secondary"
								className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
								onClick={() => handleRequestSparkCode(submission)}
							>
								Request Spark Code
							</Button>
						);
					}
					// For TikTok, start with request TikTok link
					else if (projectType === "Creator-Posted UGC") {
						return (
							<Button
								variant="secondary"
								className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
								onClick={() => handleRequestTiktokLink(submission)}
							>
								Request TikTok Link
							</Button>
						);
					}
					break;

				case "spark_requested":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white opacity-70 flex items-center justify-center"
							disabled
						>
							Spark Code Requested
						</Button>
					);

				case "tiktokLink_requested":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white opacity-70 flex items-center justify-center"
							disabled
						>
							TikTok Link Requested
						</Button>
					);

				case "spark_received":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => handleVerifySparkCode(submission)}
						>
							Verify Spark Code
						</Button>
					);

				case "tiktokLink_received":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => handleVerifyTiktokLink(submission)}
						>
							Verify TikTok Link
						</Button>
					);

				case "spark_verified":
				case "tiktokLink_verified":
					return (
						<div className="flex flex-col w-full gap-2">
							<Button
								variant="secondary"
								className="bg-[#FD5C02] text-white flex items-center justify-center w-full"
								onClick={() => window.open(submission.videoUrl, "_blank")}
							>
								Download Video
								<Download className="h-4 w-4 ml-2" />
							</Button>
							<Button
								variant="secondary"
								className="bg-[#000] text-white w-full"
								onClick={() => handleConfirmPayment(submission)}
							>
								Confirm Payment
								<Check className="h-5 w-5 ml-1" />
							</Button>
						</div>
					);
				case "awaiting_payment":
					return (
						<div className="flex flex-col w-full gap-2">
							<Button
								variant="secondary"
								className="bg-[#FD5C02] text-white flex items-center justify-center w-full"
								onClick={() => window.open(submission.videoUrl, "_blank")}
							>
								Download Video
								<Download className="h-4 w-4 ml-2" />
							</Button>
							<Button
								variant="secondary"
								className="w-full bg-[#F0F7F4] text-center text-[#067647] py-2"
								disabled
							>
								Awaiting Admin Payment
							</Button>
						</div>
					);
				case "payment_confirmed":
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => window.open(submission.videoUrl, "_blank")}
						>
							Download Video
							<Download className="h-4 w-4 ml-2" />
						</Button>
					);
				default:
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => window.open(submission.videoUrl, "_blank")}
						>
							Download Video
							<Download className="h-4 w-4 ml-2" />
						</Button>
					);
			}
		};

		// Loading state
		if (loading) {
			return (
				<div className="flex flex-col items-center justify-center mt-10">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
					<div className="text-center">Loading project submissions...</div>
				</div>
			);
		}

		// Error state
		if (error) {
			return (
				<div className="container mx-auto p-6">
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
						<strong className="font-bold">Error: </strong>
						<span className="block sm:inline">{error}</span>
					</div>
				</div>
			);
		}

		// Empty state
		if (submissionsList.length === 0) {
			return (
				<div className="container mx-auto p-6">
					<div className="text-center p-10 border border-dashed border-gray-300 rounded-lg">
						<h2 className="text-2xl font-medium mb-2">No submissions yet</h2>
						<p className="text-gray-500 mb-4">
							There are no submissions for this project currently.
						</p>
					</div>
				</div>
			);
		}

		// Render Project View (original grid layout)
		const renderProjectView = () => (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{sortedSubmissions.map((submission) => (
					<Card
						key={submission.id}
						className="overflow-hidden border border-[#FFBF9BBA]"
					>
						<CardContent className="p-0">
							<div className="p-4">
								<div className="flex items-center mb-2">
									<div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden mr-2">
										<Image
											src={submission.creatorIcon}
											alt={submission.creatorName}
											width={40}
											height={40}
											className="w-full h-full object-cover"
											priority
										/>
									</div>
									<div>
										<div className="flex items-center">
											<div className="text-sm text-black font-medium">
												{submission.creatorName}
											</div>
											<span className="mx-2">-</span>
											<div className="text-sm font-medium text-orange-500">
												Video {submission.videoNumber}
											</div>
										</div>
										<div className="flex text-xs text-orange-500">
											{submission.revisionNumber && (
												<div className="mr-4">
													Revision {submission.revisionNumber}
												</div>
											)}
											{submission.status === "new" && (
												<Badge
													variant="outline"
													className="bg-orange-500 text-white rounded-full mr-2 py-1"
												>
													<div className="flex items-center gap-1">
														<span className="">New</span>
														<Image
															src="/icons/star.svg"
															alt="Star"
															width={15}
															height={15}
														/>
													</div>
												</Badge>
											)}
											<div className="flex gap-1 text-gray-500 text-xs items-center">
												{submission.status === "approved" ||
												submission.status === "spark_requested" ||
												submission.status === "spark_received" ||
												submission.status === "spark_verified" ||
												submission.status === "tiktokLink_requested" ||
												submission.status === "tiktokLink_received" ||
												submission.status === "tiktokLink_verified" ||
												submission.status === "awaiting_payment" ||
												submission.status === "payment_confirmed"
													? "Approved:"
													: "Submitted:"}
												<p className="text-black text-xs">
													{submission.createdAt}
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="w-full h-64 relative">
									<video
										src={submission.videoUrl}
										className="absolute inset-0 w-full h-full object-cover rounded-md"
										controls
									/>
								</div>

								<div className="mt-4 flex">
									{renderSubmissionButtons(submission)}
								</div>

								{(submission.status === "spark_received" ||
									submission.status === "spark_verified" ||
									submission.status === "awaiting_payment") &&
									submission.sparkCode && (
										<div className="mt-1 flex items-center gap-1 justify-center">
											<span className="text-sm">
												Spark Code:{" "}
												<span className="text-black">
													{submission.sparkCode}
												</span>
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												onClick={() => {
													navigator.clipboard.writeText(
														submission.sparkCode || ""
													);
													toast.success("Spark code copied to clipboard");
												}}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									)}

								{(submission.status === "tiktokLink_received" ||
									submission.status === "tiktokLink_verified" ||
									submission.status === "awaiting_payment") &&
									submission.tiktokLink && (
										<div className="mt-1 flex items-center gap-1 justify-center">
											<span className="text-sm">
												<Link
													href={submission.tiktokLink}
													target="_blank"
													className="text-black text-center underline"
												>
													TikTok Link
												</Link>
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												onClick={() => {
													navigator.clipboard.writeText(
														submission.tiktokLink || ""
													);
													toast.success("TikTok link copied to clipboard");
												}}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);

		// Render Creator View
		const renderCreatorView = () => (
			<div className="space-y-6">
				{Object.entries(groupedSubmissions).map(
					([creatorName, creatorSubmissions]) => {
						// Count total and completed videos for each creator
						const totalCreatorVideos = creatorSubmissions.length;
						const completedCreatorVideos = creatorSubmissions.filter(
							(sub) =>
								sub.status === "approved" ||
								sub.status === "spark_requested" ||
								sub.status === "spark_received" ||
								sub.status === "spark_verified" ||
								sub.status === "awaiting_payment" ||
								sub.status === "payment_confirmed"
						).length;

						const sortedSubmissions = [...creatorSubmissions].sort((a, b) => {
							// Sort by video number
							const aVideoNum = parseInt(
								String(a.videoNumber).replace("#", "")
							);
							const bVideoNum = parseInt(
								String(b.videoNumber).replace("#", "")
							);
							return aVideoNum - bVideoNum;
						});

						return (
							<div
								key={creatorName}
								className="border border-gray-200 rounded-lg overflow-hidden"
							>
								<div
									className="flex justify-between items-center p-4 cursor-pointer"
									onClick={() => toggleCreatorExpand(creatorName)}
								>
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
											<Image
												src={creatorSubmissions[0].creatorIcon}
												alt={creatorName}
												width={48}
												height={48}
												className="w-full h-full object-cover"
												priority
											/>
										</div>
										<div>
											<h3 className="text-base text-start text-black">
												{creatorName}
											</h3>
											<p className="text-sm text-start text-gray-600">
												Total Videos: {completedCreatorVideos}/
												{totalCreatorVideos}
											</p>
										</div>
									</div>
									<div className="flex items-center">
										<p className="text-sm text-gray-600 mr-4">
											Latest Update: {creatorSubmissions[0].createdAt}
										</p>
										{expandedCreators[creatorName] ? (
											<ChevronUp className="h-5 w-5 text-gray-600" />
										) : (
											<ChevronDown className="h-5 w-5 text-gray-600" />
										)}
									</div>
								</div>

								{expandedCreators[creatorName] && (
									<div className="p-6 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-6">
										{sortedSubmissions.map((submission) => {
											const isNew = submission.status === "new";
											const isApproved =
												submission.status === "approved" ||
												submission.status === "spark_requested" ||
												submission.status === "spark_received" ||
												submission.status === "spark_verified" ||
												submission.status === "awaiting_payment" ||
												submission.status === "payment_confirmed";
											const hasRevision =
												submission.revisionNumber !== undefined &&
												submission.revisionNumber !== null;

											return (
												<div
													key={submission.id}
													className={`border rounded-lg overflow-hidden ${isNew ? "border-orange-500" : "border-[#FFBF9BBA]"}`}
												>
													<div className=" p-4">
														<div className="flex justify-between mb-1">
															<div className="flex items-center">
																<div className="text-orange-500 font-medium">
																	Video #
																	{String(submission.videoNumber).replace(
																		"#",
																		""
																	)}
																</div>
															</div>
														</div>

														<div className="flex gap-2 text-start items-center mb-2 text-sm">
															{hasRevision && (
																<div className="text-orange-500 text-sm">
																	Revision #
																	{String(submission.revisionNumber).replace(
																		"#",
																		""
																	)}
																</div>
															)}
															{isNew && (
																<Badge
																	variant="outline"
																	className="bg-orange-500 text-white rounded-full py-1 px-2"
																>
																	<div className="flex items-center gap-1">
																		<span>New</span>
																		<Image
																			src="/icons/star.svg"
																			alt="Star"
																			width={15}
																			height={15}
																		/>
																	</div>
																</Badge>
															)}
															{isApproved ? (
																<div>Approved: {submission.createdAt}</div>
															) : (
																<div>Submitted: {submission.createdAt}</div>
															)}
														</div>

														<div className=" relative p-4">
															{submission.videoUrl && (
																<div className="w-full h-64 relative">
																	<video
																		src={submission.videoUrl}
																		className="absolute inset-0 w-full h-full object-cover rounded-md"
																		controls
																	/>
																</div>
															)}
														</div>

														<div className="flex">
															{renderSubmissionButtons(submission)}
														</div>

														{(submission.status === "spark_received" ||
															submission.status === "spark_verified" ||
															submission.status === "awaiting_payment") &&
															submission.sparkCode && (
																<div className="mt-2 flex items-center gap-1 justify-center">
																	<span className="text-sm">
																		Spark Code:{" "}
																		<span className="text-black">
																			{submission.sparkCode}
																		</span>
																	</span>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-8 w-8 p-0"
																		onClick={() => {
																			navigator.clipboard.writeText(
																				submission.sparkCode || ""
																			);
																			toast.success(
																				"Spark code copied to clipboard"
																			);
																		}}
																	>
																		<Copy className="h-4 w-4" />
																	</Button>
																</div>
															)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					}
				)}
			</div>
		);

		return (
			<div className="container mx-auto p-6">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl text-black font-bold">
						Project Submissions ({totalVideos})
					</h1>
					<div className="inline-flex rounded-full border border-orange-500 overflow-hidden">
						<Button
							variant="ghost"
							onClick={() => setActiveView("project")}
							className={`px-6 py-4 font-medium rounded-none ${
								activeView === "project"
									? "bg-orange-500 text-white hover:bg-orange-500 rounded-full"
									: "bg-white text-black hover:bg-gray-50"
							}`}
						>
							Project View
						</Button>
						<Button
							variant="ghost"
							onClick={() => setActiveView("creator")}
							className={`px-6 py-4 font-medium rounded-none ${
								activeView === "creator"
									? "bg-orange-500 text-white hover:bg-orange-500 rounded-full"
									: "bg-white text-black hover:bg-gray-50"
							}`}
						>
							Creator View
						</Button>
					</div>
				</div>

				<div className="flex justify-between items-center mb-4">
					<div className="w-[60%] mb-6">
						<div className="flex justify-between mb-2">
							<div className="text-sm font-normal text-black">
								Submission Progress
							</div>
							<div className="text-sm text-black">
								{completedVideos}/{totalVideos} videos (
								{Math.round(completionPercentage)}%)
							</div>
						</div>
						<div className="h-3 bg-[#FFD9C3] rounded-full w-full overflow-hidden">
							<div
								className="h-full bg-orange-500 rounded-full"
								style={{ width: `${completionPercentage}%` }}
							></div>
						</div>
					</div>
					<div className="flex justify-end mb-4 space-x-2">
					<Select onValueChange={(value) => setStatusFilter(value)}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent className="bg-[#f7f7f7]">
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="submitted">Submitted</SelectItem>
								<SelectItem value="approved">Approved</SelectItem>
								<SelectItem value="new">New</SelectItem>
								<SelectItem value="spark_requested">Spark Requested</SelectItem>
								<SelectItem value="spark_received">Spark Received</SelectItem>
								<SelectItem value="spark_verified">Spark Verified</SelectItem>
								<SelectItem value="awaiting_payment">
									Awaiting Payment
								</SelectItem>
								<SelectItem value="payment_confirmed">
									Payment Confirmed
								</SelectItem>
							</SelectContent>
						</Select>

						<Select onValueChange={(value) => setSortBy(value)}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Sort By" />
							</SelectTrigger>
							<SelectContent className="bg-[#f7f7f7]">
								<SelectItem value="newest">Newest</SelectItem>
								<SelectItem value="oldest">Oldest</SelectItem>
								<SelectItem value="creator">Creator Name</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{activeView === "project" ? renderProjectView() : renderCreatorView()}

				{/* Review Modal */}
				<ReviewVideoModal
					isOpen={openReviewDialog}
					onClose={handleCloseModals}
					onSubmit={handleSubmit}
					submission={currentSubmission}
					revisionUsed={revisionUsed}
				/>

				{/* Approval Modal */}
				<ProjectApprovalModal
					isOpen={openApproveDialog}
					onClose={handleCloseModals}
					onApprove={handleApprove}
				/>

				{/* Spark Code Modal */}
				<VerifySparkCodeModal
					isOpen={openVerifySparkDialog}
					onClose={handleCloseModals}
					onVerify={confirmSparkCodeVerification}
					onRequestNewCode={() =>
						handleRequestNewCode(currentSubmission!, setOpenVerifySparkDialog)
					}
				/>

				{/* Spark Code Modal */}
				<VerifyTikTokLinkModal
					isOpen={openVerifyTiktokLinkDialog}
					onClose={handleCloseModals}
					onVerify={confirmTiktokLinkVerification}
					onRequestNewLink={() =>
						handleRequestNewLink(
							currentSubmission!,
							setOpenVerifyTiktokLinkDialog
						)
					}
				/>
			</div>
		);
	};

