"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorSubmission } from "@/types/submission";
import { ProjectFormData } from "@/types/contestFormData";
import ProjectApprovalModal from "@/components/brand/brandProjects/viewProject/ProjectApprovalModal";
import ProjectSubmissionModal from "./ProjectSubmissionModal";
import { useAuth } from "@/context/AuthContext";
import RevisionModal from "./RevisionModal";
import SparkCodeModal from "@/components/Creators/dashboard/projects/SparkCodeModal";
import Link from "next/link";
import TikTokLinkModal from "./TikTokLinkModal";
import AffiliateLinkModal from "./AffiliateLinkModal";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ProjectSubmissionsProps {
	projectFormData: ProjectFormData;
	projectId: string;
	contestId: string;
}

export default function CreatorSubmissionTab({
	projectFormData,
	projectId,
	contestId,
}: ProjectSubmissionsProps) {
	const { currentUser } = useAuth();

	const [openApproveDialog, setOpenApproveDialog] = useState(false);
	const [currentSubmission, setCurrentSubmission] =
		useState<CreatorSubmission | null>(null);
	const [submissionsList, setSubmissionsList] = useState<CreatorSubmission[]>(
		[]
	);
	const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
	const [, setCurrentParticipantCount] = useState<number>(0);
	const [projectData, setProjectData] = useState<ProjectFormData | null>(null);
	const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
	const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>("");
	const [isSparkCodeModalOpen, setIsSparkCodeModalOpen] = useState(false);
	const [sparkCodeSubmissionId, setSparkCodeSubmissionId] =
		useState<string>("");
	const [fetchingSparkCodes, setFetchingSparkCodes] = useState(false);
	const [isTiktokLinkModalOpen, setIsTiktokLinkModalOpen] = useState(false);
	const [tiktokLinkSubmissionId, setTiktokLinkSubmissionId] =
		useState<string>("");
	const [fetchingTiktokLink, setFetchingTiktokLink] = useState(false);
	const [isAffiliateLinkModalOpen, setIsAffiliateLinkModalOpen] =
		useState(false);
	const [affiliateLinkSubmissionId, setAffiliateLinkSubmissionId] =
		useState<string>("");
	const [fetchingAffiliateLink, setFetchingAffiliateLink] = useState(false);

	const totalVideos = projectFormData?.creatorPricing?.videosPerCreator || 0;
	const completedVideos = submissionsList.length || 0;
	const hasReachedLimit = completedVideos >= totalVideos;
	const completionPercentage =
		totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

	// Fetch submissions via API endpoint when component mounts
	useEffect(() => {
		if (currentUser && projectId) {
			refetchSubmissions();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser, projectId]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleRevisionSubmit = (newSubmissionData: any) => {
		// Update your submissions state with the new data
		setSubmissionsList((prevSubmissions) =>
			prevSubmissions.map((submission) =>
				submission.id === newSubmissionData.id ? newSubmissionData : submission
			)
		);
	};

	// Fetch tiktok links for submissions that need them
	useEffect(() => {
		const fetchTiktokLink = async () => {
			if (submissionsList.length > 0 && !fetchingTiktokLink) {
				setFetchingTiktokLink(true);

				const tiktokNeedSubmissions = submissionsList.filter(
					(sub) =>
						(sub.status === "tiktokLink_verified" ||
							sub.status === "tiktokLink_received") &&
						!sub.tiktokLink
				);

				if (tiktokNeedSubmissions.length > 0) {
					try {
						// Create an array of promises for each submission that needs a tiktok link
						const tiktokLinkPromises = tiktokNeedSubmissions.map(
							async (submission) => {
								const response = await fetch(
									`/api/project-submissions/get-tiktok-link`,
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
									console.warn(
										`Failed to fetch tiktok link for submission ${submission.id}`
									);
									return null;
								}

								const data = await response.json();
								return {
									submissionId: submission.id,
									tiktokLink: data.data.tiktokLink,
								};
							}
						);

						// Wait for all promises to resolve
						const results = await Promise.all(tiktokLinkPromises);

						// Update submissions with tiktok link
						const updatedSubmissions = [...submissionsList];

						results.forEach((result) => {
							if (result) {
								const index = updatedSubmissions.findIndex(
									(sub) => sub.id === result.submissionId
								);

								if (index !== -1) {
									updatedSubmissions[index] = {
										...updatedSubmissions[index],
										tiktokLink: result.tiktokLink,
									};
								}
							}
						});

						setSubmissionsList(updatedSubmissions);
					} catch (error) {
						console.error("Error fetching tiktok link:", error);
					}
				}

				setFetchingTiktokLink(false);
			}
		};

		fetchTiktokLink();
	}, [submissionsList, fetchingTiktokLink]);

	// Fetch affiliate links for submissions that need them
	useEffect(() => {
		const fetchAffiliateLink = async () => {
			if (submissionsList.length > 0 && !fetchingAffiliateLink) {
				setFetchingAffiliateLink(true);

				const affiliateLinkNeedSubmissions = submissionsList.filter(
					(sub) =>
						(sub.status === "approved" ||
							sub.status === "affiliateLink_received" ||
							sub.status === "affiliateLink_verified") &&
						!sub.affiliateLink
				);

				if (affiliateLinkNeedSubmissions.length > 0) {
					try {
						// Create an array of promises for each submission that needs an affiliate link
						const affiliateLinkPromises = affiliateLinkNeedSubmissions.map(
							async (submission) => {
								// Using GET to only retrieve existing links:
								const response = await fetch(
									`/api/project-submissions/generate-affiliate-link?submissionId=${submission.id}`,
									{
										method: "GET",
										headers: {
											"Content-Type": "application/json",
										},
									}
								);

								if (!response.ok) {
									console.warn(
										`Failed to fetch affiliate link for submission ${submission.id}`
									);
									return null;
								}

								const data = await response.json();
								return {
									submissionId: submission.id,
									affiliateLink: data.data.affiliateLink,
								};
							}
						);

						// Wait for all promises to resolve
						const results = await Promise.all(affiliateLinkPromises);

						// Update submissions with affiliate link
						const updatedSubmissions = [...submissionsList];

						results.forEach((result) => {
							if (result) {
								const index = updatedSubmissions.findIndex(
									(sub) => sub.id === result.submissionId
								);

								if (index !== -1) {
									updatedSubmissions[index] = {
										...updatedSubmissions[index],
										affiliateLink: result.affiliateLink,
									};
								}
							}
						});

						setSubmissionsList(updatedSubmissions);
					} catch (error) {
						console.error("Error fetching affiliate link:", error);
					}
				}

				setFetchingAffiliateLink(false);
			}
		};

		fetchAffiliateLink();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [submissionsList.length]);

	// Fetch spark codes for submissions that need them
	useEffect(() => {
		const fetchSparkCodes = async () => {
			if (submissionsList.length > 0 && !fetchingSparkCodes) {
				setFetchingSparkCodes(true);

				const sparkNeededSubmissions = submissionsList.filter(
					(sub) =>
						(sub.status === "spark_verified" ||
							sub.status === "spark_received") &&
						!sub.sparkCode
				);

				if (sparkNeededSubmissions.length > 0) {
					try {
						// Create an array of promises for each submission that needs a spark code
						const sparkCodePromises = sparkNeededSubmissions.map(
							async (submission) => {
								const response = await fetch(
									`/api/project-submissions/get-spark-code`,
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
									console.warn(
										`Failed to fetch spark code for submission ${submission.id}`
									);
									return null;
								}

								const data = await response.json();
								return {
									submissionId: submission.id,
									sparkCode: data.data.sparkCode,
								};
							}
						);

						// Wait for all promises to resolve
						const results = await Promise.all(sparkCodePromises);

						// Update submissions with spark codes
						const updatedSubmissions = [...submissionsList];

						results.forEach((result) => {
							if (result) {
								const index = updatedSubmissions.findIndex(
									(sub) => sub.id === result.submissionId
								);

								if (index !== -1) {
									updatedSubmissions[index] = {
										...updatedSubmissions[index],
										sparkCode: result.sparkCode,
									};
								}
							}
						});

						setSubmissionsList(updatedSubmissions);
					} catch (error) {
						console.error("Error fetching spark codes:", error);
					}
				}

				setFetchingSparkCodes(false);
			}
		};

		fetchSparkCodes();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [submissionsList.length, fetchingSparkCodes]);

	const queryClient = useQueryClient();

const { data: submissionsData, isLoading, refetch: refetchSubmissions } = useQuery({
  queryKey: ['project-submissions', currentUser?.uid, projectId],
  queryFn: async () => {
    const response = await fetch(
      `/api/project-submissions?userId=${currentUser?.uid}&projectId=${projectId}`
    );
    
    if (!response.ok) {
      throw new Error(`Error fetching submissions: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the data as before
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissions = data.submissions.map((submission: any, index: number) => {
      const timestamp = submission.createdAt ? new Date(submission.createdAt) : new Date();
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric", 
        year: "numeric",
      }).format(timestamp);

      return {
        id: submission.id,
        videoNumber: index + 1,
        status: submission.status || "pending",
        videoUrl: submission.videoUrl,
        note: submission.note || "",
        revisionNumber: 0,
        createdAt: formattedDate,
        updatedAt: submission.updatedAt || formattedDate,
        sparkCode: submission.sparkCode || "",
        tiktokLink: submission.tiktokLink || "",
      };
    });
    
    return { submissions };
  },
  enabled: !!currentUser && !!projectId,
});

const approveSubmissionMutation = useMutation({
	mutationFn: async (submissionId: string) => {
	  const response = await fetch(`/api/project-submissions/${submissionId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
		  status: "approved",
		  userId: currentUser?.uid,
		}),
	  });
	  
	  if (!response.ok) {
		throw new Error(`Failed to approve submission: ${response.status}`);
	  }
	  
	  return response.json();
	},
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ['project-submissions'] });
	  setOpenApproveDialog(false);
	},
  });

// Update local state when data changes
useEffect(() => {
  if (submissionsData?.submissions) {
    setSubmissionsList(submissionsData.submissions);
  }
}, [submissionsData]);

const handleApprove = async () => {
	if (currentSubmission) {
	  approveSubmissionMutation.mutate(currentSubmission.id);
	}
  };

	const openProjectModal = () => {
		setIsProjectModalOpen(true);
	};

	const closeProjectModal = () => {
		setIsProjectModalOpen(false);
	};

	// Enhanced function to handle successful submission with optimistic update

	const handleSubmitSuccess = async (
		newParticipantCount: number,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		newSubmissionData?: any
	) => {

		// Update participant count
		setCurrentParticipantCount(newParticipantCount);

		// Also update the projectData state to reflect the new count
		if (projectData) {
			setProjectData({
				...projectData,
				participantsCount: newParticipantCount,
			});
		}

		// If we have new submission data, add it optimistically to the list
		if (newSubmissionData) {
			const optimisticSubmission: CreatorSubmission = {
				id: newSubmissionData.id || `temp-${Date.now()}`,
				videoNumber: submissionsList.length + 1,
				status: "pending",
				videoUrl: newSubmissionData.videoUrl || "",
				note: newSubmissionData.note || "",
				revisionNumber: 0,
				createdAt: new Intl.DateTimeFormat("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}).format(new Date()),
				updatedAt: new Intl.DateTimeFormat("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}).format(new Date()),
				sparkCode: "",
				tiktokLink: "",
				creatorId: newSubmissionData.creatorId || "",
				creatorIcon: newSubmissionData.creatorIcon || "",
				creatorName: newSubmissionData.creatorName || "",
				userId: newSubmissionData.userId || "",
				affiliateLink: newSubmissionData.affiliateLink || "",
				brandFeedback: newSubmissionData.brandFeedback || "",
				brandRating: newSubmissionData.brandRating || 0,
				projectId: "",
				fileName: "",
				fileSize: 0,
				fileType: "",
			};

			// Add the new submission to the list immediately
			setSubmissionsList((prev) => [...prev, optimisticSubmission]);
		}

		// Refresh submissions after a short delay to ensure backend consistency
		setTimeout(() => {
			refetchSubmissions();
		}, 1000);
	};

	const handleCloseModals = () => {
		setOpenApproveDialog(false);
	};

	// Function to open the revision modal with the correct submission ID
	const openRevisionModal = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setSelectedSubmissionId(submission.id);
		setIsRevisionModalOpen(true);
	};

	const openSparkCodeModal = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setSparkCodeSubmissionId(submission.id);
		setIsSparkCodeModalOpen(true);
	};

	const openTiktokLinkModal = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setTiktokLinkSubmissionId(submission.id);
		setIsTiktokLinkModalOpen(true);
	};

	const openAffiliateLinkModal = (submission: CreatorSubmission) => {
		setCurrentSubmission(submission);
		setAffiliateLinkSubmissionId(submission.id);
		setIsAffiliateLinkModalOpen(true);
	};

	// Render buttons based on submission status
	const renderSubmissionButtons = (submission: CreatorSubmission) => {
		switch (submission.status) {
			case "pending":
				return (
					<>
						<Button
							variant="secondary"
							className="flex-grow bg-[#6670854D] text-white flex items-center justify-center"
						>
							Submission Sent
						</Button>
					</>
				);
			case "approved":
			case "approved":
				// For approved submissions and TikTok Shop projects, show Generate Affiliate Link button
				if (projectFormData?.projectDetails.projectType === "TikTok Shop") {
					return (
						<Button
							variant="secondary"
							className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
							onClick={() => openAffiliateLinkModal(submission)}
						>
							Generate Affiliate Link
						</Button>
					);
				}
				return;
			case "affiliateLink_received":
			case "affiliateLink_verified":
				return;
			case "spark_requested":
				return (
					<Button
						onClick={() => openSparkCodeModal(submission)}
						variant="secondary"
						className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
					>
						Submit Spark Code
					</Button>
				);
			case "spark_received":
			case "spark_verified":
				return;
			case "tiktokLink_requested":
				return (
					<Button
						onClick={() => openTiktokLinkModal(submission)}
						variant="secondary"
						className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
					>
						Submit Tiktok Link
					</Button>
				);
			case "tiktokLink_received":
			case "tiktokLink_verified":
				return;

			case "revision_requested":
				return (
					<Button
						onClick={() => openRevisionModal(submission)}
						variant="secondary"
						className="flex-grow bg-[#000] text-white flex items-center justify-center"
					>
						View Revision
					</Button>
				);
			default:
				return (
					<Button
						variant="secondary"
						className="flex-grow bg-[#6670854D] text-white flex items-center justify-center"
					>
						Submission Sent
					</Button>
				);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading submissions...</p>
			</div>
		);
	}

	return (
		<div>
			{submissionsList.length < 1 ? (
				<div className="flex flex-col items-center justify-center space-y-2 mt-6">
					<h2 className="text-xl font-semibold text-black">
						No Submission Made
					</h2>
					<p className="max-w-lg">
						You haven&apos;t uploaded your video yet. Submit your content to
						move forward with the project and receive feedback from the brand.
					</p>
					<div className="pt-2">
						{totalVideos > 0 ? (
							<button
								onClick={openProjectModal}
								className="bg-orange-500 text-white shadow-none px-10 py-2 rounded-md"
							>
								Upload Video Now
							</button>
						) : (
							<p className="text-gray-500">
								No videos required for this project
							</p>
						)}
					</div>
				</div>
			) : (
				<div className="container mx-auto p-6">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-2xl text-black font-bold">Your Submissions</h1>

						{!hasReachedLimit ? (
							<Button
								className="bg-orange-500 text-white shadow-none"
								onClick={openProjectModal}
							>
								Submit New Video <span className="text-base">+</span>
							</Button>
						) : (
							<div className="text-sm text-gray-500 font-medium">
								All videos submitted ({completedVideos}/{totalVideos})
							</div>
						)}
					</div>

					{/* Progress bar section with better validation */}
					<div className="flex justify-between items-center mb-4">
						<div className="w-full mb-6">
							<div className="flex justify-between mb-2">
								<div className="text-sm font-normal text-black">
									Project Progress
								</div>
								<div className="text-sm text-black">
									{completedVideos}/{totalVideos} videos (
									{Math.round(completionPercentage)}%)
								</div>
							</div>
							<div className="h-3 bg-[#FFD9C3] rounded-full w-full overflow-hidden">
								<div
									className="h-full bg-orange-500 rounded-full transition-all duration-300"
									style={{ width: `${Math.min(completionPercentage, 100)}%` }}
								></div>
							</div>
							{hasReachedLimit && (
								<div className="text-sm text-green-600 font-medium mt-2">
									✓ All required videos have been submitted!
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{submissionsList.map((submission) => (
							<Card
								key={`submission-${submission.id}`}
								className="w-full overflow-hidden border shadow-md"
							>
								<CardContent className="p-0">
									<div>
										{/* Video container */}
										{submission.videoUrl && (
											<div className="w-full aspect-square relative">
												<video
													src={submission.videoUrl}
													className="absolute inset-0 w-full h-full object-cover"
													controls
												/>
											</div>
										)}

										{/* Card content area */}
										<div className="p-4">
											{/* Header with title and status badge */}
											<div className="flex justify-between items-center mb-1">
												<div className="text-sm font-medium text-black">
													Video #{submission.videoNumber}
												</div>

												<div>
													{submission.status === "pending" ? (
														<span className="bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A] text-xs py-0.5 px-2 rounded-full">
															• Pending
														</span>
													) : submission.status === "approved" ? (
														<span className="text-[#067647] text-xs bg-[#ECFDF3] border border-[#ABEFC6] py-0.5 px-2 rounded-full">
															√ Approved
														</span>
													) : submission.status === "spark_received" ||
													  submission.status === "spark_verified" ? (
														<span className="text-[#067647] text-xs bg-[#ECFDF3] border border-[#ABEFC6] py-0.5 px-2 rounded-full">
															√ Spark Code Verified
														</span>
													) : submission.status === "revision_requested" ? (
														<span className="bg-[#FFE5FB] border border-[#FC52E4] text-[#F04438] text-xs py-0.5 px-2 rounded-full">
															• Requested Revision
														</span>
													) : null}
												</div>
											</div>

											{/* Submission information */}
											<div className="flex items-center justify-between text-xs mb-3">
												<div className="flex items-center gap-1 text-gray-500">
													<span>
														{submission.status === "approved"
															? "Approved:"
															: submission.status === "pending"
																? "Submitted:"
																: submission.status === "revision_requested"
																	? "Revision Requested:"
																	: submission.status === "spark_received" ||
																		  submission.status === "spark_verified"
																		? "Spark Verified:"
																		: "Submitted:"}
													</span>
													<span className="text-black">
														{submission.createdAt}
													</span>
												</div>

												{/* TikTok Link */}
												{(submission.status === "tiktokLink_verified" ||
													submission.status === "tiktokLink_received") &&
													submission.tiktokLink && (
														<Link
															href={submission.tiktokLink}
															className="text-sm text-black hover:underline"
														>
															View TikTok
														</Link>
													)}

												{(submission.status === "affiliateLink_received" ||
													submission.status === "affiliateLink_verified") &&
													submission.affiliateLink && (
														<Link
															href={submission.affiliateLink}
															className="text-sm text-black hover:underline"
														>
															View Affiliate Link
														</Link>
													)}
											</div>

											{/* Spark Code if present */}
											{(submission.status === "spark_verified" ||
												submission.status === "spark_received") &&
												submission.sparkCode && (
													<div className="mb-3 text-start">
														<p className="text-xs text-black">
															<span className="font-medium">Spark Code:</span>{" "}
															{submission.sparkCode}
														</p>
													</div>
												)}

											{/* Action buttons */}
											<div className="flex justify-center mt-2">
												{renderSubmissionButtons(submission)}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Approval Modal */}
					<ProjectApprovalModal
						isOpen={openApproveDialog}
						onClose={handleCloseModals}
						onApprove={handleApprove}
					/>

					{/* Tiktok Link Modal */}
					{isTiktokLinkModalOpen && (
						<TikTokLinkModal
							isSubmitting={false} // You'll need to track this state
							onClose={() => setIsTiktokLinkModalOpen(false)}
							onSubmit={async (tiktokLink) => {
								try {
									// Submit the tiktok link using fetch or your API method
									const response = await fetch(
										`/api/project-submissions/submit-tiktok-link`,
										{
											method: "POST",
											headers: {
												"Content-Type": "application/json",
											},
											body: JSON.stringify({
												tiktokLink,
												submissionId: tiktokLinkSubmissionId,
											}),
										}
									);
									if (!response.ok) {
										throw new Error("Failed to submit tiktok link");
									}
									// Refresh submissions after successful submission
									await refetchSubmissions();
									setIsTiktokLinkModalOpen(false);
								} catch (error) {
									console.error("Error submitting tiktok link:", error);
									throw error;
								}
							}}
						/>
					)}

					{isAffiliateLinkModalOpen && (
						<AffiliateLinkModal
							isOpen={isAffiliateLinkModalOpen}
							onClose={() => setIsAffiliateLinkModalOpen(false)}
							submissionId={affiliateLinkSubmissionId}
						/>
					)}

					{/* SparkCode Modal */}
					{isSparkCodeModalOpen && (
						<SparkCodeModal
							isSubmitting={false} // You'll need to track this state
							onClose={() => setIsSparkCodeModalOpen(false)}
							onSubmit={async (sparkCode) => {
								try {
									// Submit the spark code using fetch or your API method
									const response = await fetch(
										`/api/project-submissions/spark-code`,
										{
											method: "POST",
											headers: {
												"Content-Type": "application/json",
											},
											body: JSON.stringify({
												sparkCode,
												submissionId: sparkCodeSubmissionId,
											}),
										}
									);

									if (!response.ok) {
										throw new Error("Failed to submit spark code");
									}

									// Refresh submissions after successful submission
									await refetchSubmissions();
									setIsSparkCodeModalOpen(false);
								} catch (error) {
									console.error("Error submitting spark code:", error);
									throw error;
								}
							}}
						/>
					)}

					{/* Revision Modal */}
					<RevisionModal
						isOpen={isRevisionModalOpen}
						onClose={() => setIsRevisionModalOpen(false)}
						submissionId={selectedSubmissionId}
						onRevisionSubmit={handleRevisionSubmit}
					/>
				</div>
			)}

			<ProjectSubmissionModal
				isOpen={isProjectModalOpen}
				onClose={closeProjectModal}
				projectId={projectId}
				onSubmitSuccess={handleSubmitSuccess}
				contestId={contestId}
				maxVideos={totalVideos}
				currentVideoCount={completedVideos}
				hasReachedLimit={hasReachedLimit}
			/>
		</div>
	);
}
