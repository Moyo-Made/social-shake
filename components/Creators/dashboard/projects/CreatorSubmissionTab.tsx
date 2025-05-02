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

interface ProjectSubmissionsProps {
	projectFormData: ProjectFormData;
	projectId: string;
}

export default function CreatorSubmissionTab({
	projectFormData,
	projectId,
}: ProjectSubmissionsProps) {
	const { currentUser } = useAuth();

	const [openApproveDialog, setOpenApproveDialog] = useState(false);
	const [currentSubmission, setCurrentSubmission] =
		useState<CreatorSubmission | null>(null);
	const [submissionsList, setSubmissionsList] = useState<CreatorSubmission[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState(true);
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

	const totalVideos = projectFormData?.creatorPricing?.videosPerCreator || 0;
	const completedVideos = submissionsList.length || 0;
	const completionPercentage = (completedVideos / totalVideos) * 100;

	// Fetch submissions via API endpoint when component mounts
	useEffect(() => {
		if (currentUser && projectId) {
			fetchSubmissions();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser, projectId]);

	// Fetch tiktok links for submissions that need them
	useEffect(() => {
		const fetchTiktokLink = async () => {
			if (submissionsList.length > 0 && !fetchingTiktokLink) {
				setFetchingTiktokLink(true);

				const tiktokNeedSubmissions = submissionsList.filter(
					(sub) =>
						(sub.status === "tiktokLink_verified" ||
							sub.status === "tiktokLink_received") &&
						!sub.sparkCode
				);

				if (tiktokNeedSubmissions.length > 0) {
					try {
						// Create an array of promises for each submission that needs a spark code
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
						const results = await Promise.all(tiktokLinkPromises);

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

		fetchTiktokLink();
	}, [submissionsList, fetchingTiktokLink]);

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
	}, [submissionsList, fetchingSparkCodes]);

	const fetchSubmissions = async () => {
		try {
			setIsLoading(true);

			// Use the API endpoint to fetch submissions
			const response = await fetch(
				`/api/project-submissions?userId=${currentUser?.uid}&projectId=${projectId}`
			);

			if (!response.ok) {
				throw new Error(`Error fetching submissions: ${response.status}`);
			}

			const data = await response.json();

			// Transform the API response to match the expected submission format
			const submissions: CreatorSubmission[] = data.submissions.map(
				(submission: CreatorSubmission, index: number) => {
					// Convert server timestamp to readable date format if needed
					const timestamp = submission.createdAt
						? new Date(submission.createdAt)
						: new Date();
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
					};
				}
			);

			setSubmissionsList(submissions);
		} catch (error) {
			console.error("Error fetching submissions:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleApprove = async () => {
		if (currentSubmission) {
			try {
				// Use API endpoint to update submission status
				const response = await fetch(
					`/api/project-submissions/${currentSubmission.id}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							status: "approved",
							userId: currentUser?.uid,
						}),
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to approve submission: ${response.status}`);
				}

				// Update local state
				const updatedSubmissions = submissionsList.map((sub) =>
					sub.id === currentSubmission.id ? { ...sub, status: "approved" } : sub
				);

				setSubmissionsList(updatedSubmissions as CreatorSubmission[]);
				setOpenApproveDialog(false);
				console.log(`Submission ${currentSubmission.id} approved successfully`);
			} catch (error) {
				console.error("Error approving submission:", error);
			}
		}
	};

	const openProjectModal = () => {
		setIsProjectModalOpen(true);
	};

	const closeProjectModal = () => {
		setIsProjectModalOpen(false);
	};

	const handleSubmitSuccess = async (newParticipantCount: number) => {
		// Update participant count
		setCurrentParticipantCount(newParticipantCount);

		// Also update the projectData state to reflect the new count
		if (projectData) {
			setProjectData({
				...projectData,
				participantsCount: newParticipantCount,
			});
		}

		// Refresh submissions after successful upload
		fetchSubmissions();
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
				return (
					<Button
						variant="secondary"
						className="flex-grow bg-[#067411] text-white flex items-center justify-center"
						disabled
					>
						Approved
					</Button>
				);
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
			<div className="flex items-center justify-center p-8">
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
						<button
							onClick={openProjectModal}
							className="bg-orange-500 text-white shadow-none px-10 py-2 rounded-md"
						>
							Upload Video Now
						</button>
					</div>
				</div>
			) : (
				<div className="container mx-auto p-6">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-2xl text-black font-bold">Your Submissions</h1>

						<Button
							className="bg-orange-500 text-white shadow-none"
							onClick={openProjectModal}
						>
							Submit New Video <span className="text-base">+</span>
						</Button>
					</div>

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
									className="h-full bg-orange-500 rounded-full"
									style={{ width: `${completionPercentage}%` }}
								></div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2  gap-6">
						{submissionsList.map((submission) => (
							<Card
								key={`submission-${submission.id}`}
								className="overflow-hidden border border-[#FFBF9BBA]"
							>
								<CardContent className="">
									<div className="pt-4">
										<div className=" relative">
											{/* If we have a videoUrl, create a video thumbnail */}
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
										<div className="flex items-center mt-4 gap-4">
											<div className="flex flex-col">
												<div className="flex gap-3 items-center mb-1">
													<div className="text-sm font-medium text-black">
														Video #{submission.videoNumber}
													</div>

													<div className="">
														<p>
															{submission.status === "pending" ? (
																<span className="bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A] text-xs py-0.5 px-1 rounded-full">
																	• Pending
																</span>
															) : submission.status === "approved" ? (
																<span className="text-[#067647] text-xs bg-[#ECFDF3] border border-[#ABEFC6] py-0.5 px-1 rounded-full">
																	√ Approved
																</span>
															) : submission.status === "spark_received" ||
															  submission.status === "spark_verified" ? (
																<span className="text-[#067647] text-xs bg-[#ECFDF3] border border-[#ABEFC6] py-0.5 px-1 rounded-full">
																	√ Spark Code Verified
																</span>
															) : submission.status === "revision_requested" ? (
																<span className="bg-[#FFE5FB] border border-[#FC52E4] text-[#F04438] text-xs py-0.5 px-1 rounded-full">
																	• Requested Revision
																</span>
															) : null}{" "}
														</p>
													</div>
												</div>
												<div className="flex justify-between text-xs text-black">
													<div className="flex gap-1 text-gray-500 text-xs items-center">
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

														<p className="text-black text-xs">
															{submission.createdAt}
														</p>
													</div>
												</div>

												{/* Display Spark Code if present */}
												{(submission.status === "spark_verified" ||
													submission.status === "spark_received") &&
													submission.sparkCode && (
														<div className="mt-4 -mb-4">
															<p className="text-start text-xs text-black">
																<span className="font-medium">Spark Code:</span>{" "}
																{submission.sparkCode}
															</p>
														</div>
													)}

												{/* Display Spark Code if present */}
												{(submission.status === "tiktokLink_verified" ||
													submission.status === "tiktokLink_received") &&
													submission.sparkCode && (
														<Link
															href={submission.tiktokLink}
															className="mt-4 -mb-4"
														>
															<p className="text-start text-xs text-black hover:underline">
																View TikTok
															</p>
														</Link>
													)}
											</div>
										</div>
										<div className="flex mt-4">
											{renderSubmissionButtons(submission)}
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
									await fetchSubmissions();
									setIsTiktokLinkModalOpen(false);
								} catch (error) {
									console.error("Error submitting tiktok link:", error);
									throw error;
								}
							}}
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
									await fetchSubmissions();
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
					/>
				</div>
			)}

			<ProjectSubmissionModal
				isOpen={isProjectModalOpen}
				onClose={closeProjectModal}
				projectId={projectId}
				onSubmitSuccess={handleSubmitSuccess}
			/>
		</div>
	);
}
