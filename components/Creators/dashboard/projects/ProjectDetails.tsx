"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BookmarkIcon } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Image from "next/image";

import { ProjectFormData } from "@/types/contestFormData";
import { useAuth } from "@/context/AuthContext";
import { BrandProfile } from "@/types/user";
import { ProjectStatus } from "@/types/projects";
import ApplyModal from "./available/ProjectApplyModal";

interface ProjectDetailPageProps {
	projectId: string;
	project: ProjectFormData;
}

export default function ProjectDetails({
	projectId,
	project,
}: ProjectDetailPageProps) {
	const { currentUser } = useAuth();
	const [projectData, setProjectData] = useState<ProjectFormData | null>(
		project || null
	);
	const [loading, setLoading] = useState<boolean>(project ? false : true);
	const [error, setError] = useState<string | null>(null);
	const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
	const [isSaved, setIsSaved] = useState<boolean>(false);
	const [saveLoading, setSaveLoading] = useState<boolean>(false);
	const [interestId, setInterestId] = useState<string | null>(null);
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [brandLoading, setBrandLoading] = useState<boolean>(true);
	const [hasApplied, setHasApplied] = useState<boolean>(false);
	const [, setApplicationCheckComplete] = useState<boolean>(false);
	const [applicationStatus, setApplicationStatus] = useState<string>("pending");
	const [, setCurrentParticipantCount] = useState<number>(0);

	// Function to check if user has applied for the project and get application status
	const checkIfApplied = useCallback(async () => {
		if (!currentUser?.uid || !projectId) return false;

		try {
			const response = await fetch(
				`/api/projects/check-applied?userId=${currentUser.uid}&projectId=${projectId}`
			);
			if (response.ok) {
				const data = await response.json();
				setHasApplied(data.hasApplied);
				// Store application status if available
				if (data.applicationStatus) {
					setApplicationStatus(data.applicationStatus);
				}
				setApplicationCheckComplete(true);
				return data.hasApplied;
			}
		} catch (error) {
			console.error("Error checking contest application status:", error);
		}
		return false;
	}, [currentUser?.uid, projectId]);

	// Function to check if the project is saved
	const checkIfSaved = useCallback(async () => {
		if (!currentUser?.uid || !projectId) return;

		try {
			const response = await fetch(
				`/api/projects/check-saved?userId=${currentUser.uid}&projectId=${projectId}`
			);

			if (response.ok) {
				const data = await response.json();
				setIsSaved(data.isSaved);
				setInterestId(data.interestId);
			}
		} catch (error) {
			console.error("Error checking saved status:", error);
		}
	}, [currentUser?.uid, projectId]);

	// Function to toggle saved status
	const toggleSaved = async () => {
		if (!currentUser?.uid || !projectId) return;

		try {
			setSaveLoading(true);

			const response = await fetch("/api/projects/toggle-saved", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser.uid,
					projectId,
					currentSavedState: isSaved,
					interestId,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setIsSaved(data.isSaved);
				setInterestId(data.isSaved ? data.interestId : null);
			}
		} catch (error) {
			console.error("Error toggling saved status:", error);
		} finally {
			setSaveLoading(false);
		}
	};

	// Fetch brand profile as soon as we have the project data
	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!projectData || !projectData.userId) {
				setBrandLoading(false);
				return;
			}

			try {
				setBrandLoading(true);
				console.log("Fetching brand profile for userId:", projectData.userId);

				const response = await fetch(
					`/api/admin/brand-approval?userId=${projectData.userId}`
				);

				if (response.ok) {
					const data = await response.json();
					console.log("Received brand profile:", data);
					setBrandProfile(data);
				} else {
					console.error("Error fetching brand profile:", response.status);
					// Set default brand profile with placeholders
					setBrandProfile({
						id: projectData.userId,
						userId: projectData.userId,
						email: "brand@example.com",
						brandName: "Brand Name",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error("Error in brand profile fetch:", error);
				setBrandProfile({
					id: projectData.userId,
					userId: projectData.userId,
					email: "brand@example.com",
					brandName: "Brand Name",
					logoUrl: "",
				});
			} finally {
				setBrandLoading(false);
			}
		};

		fetchBrandProfile();
	}, [projectData]);

	// If project prop changes, update projectData
	useEffect(() => {
		if (project) {
			setProjectData(project);
			setLoading(false);
		}
	}, [project]);

	// Check if user has applied or saved this project when component mounts
	useEffect(() => {
		if (currentUser?.uid && projectId) {
			checkIfApplied();
			checkIfSaved(); // Add check for saved status
		}
	}, [checkIfApplied, checkIfSaved, currentUser?.uid, projectId]);

	const openApplyModal = () => {
		setIsApplyModalOpen(true);
	};

	const closeApplyModal = () => {
		setIsApplyModalOpen(false);
	};

	// Format date for display
	const formatDate = (
		dateInput?: string | { _seconds: number } | Date
	): string => {
		if (!dateInput) return "Not Set";
		let date: Date;
		if (dateInput instanceof Date) {
			date = dateInput;
		} else if (typeof dateInput === "object" && "_seconds" in dateInput) {
			date = new Date(dateInput._seconds * 1000);
		} else {
			date = new Date(dateInput);
		}
		return date instanceof Date && !isNaN(date.getTime())
			? date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Not Set";
	};

	// Only fetch project data if it wasn't passed as a prop
	useEffect(() => {
		if (project) return; // Skip if we already have project data from props

		const fetchContestData = async () => {
			if (!projectId) {
				setLoading(false);
				setError("Project ID not found");
				return;
			}

			try {
				setLoading(true);
				const contestRef = doc(db, "projects", projectId.toString());
				const contestSnap = await getDoc(contestRef);

				if (contestSnap.exists()) {
					const data = contestSnap.data() as ProjectFormData;
					setProjectData(data);
				} else {
					setError("Contest not found");
				}

				setLoading(false);
			} catch (err) {
				console.error("Error fetching contest data:", err);
				setError("Failed to load contest data");
				setLoading(false);
			}
		};

		fetchContestData();
	}, [projectId, project]);

	// Handle application success
	const handleApplySuccess = async () => {
		// Set the user as applied
		setHasApplied(true);
	};

	// Check if user has joined or applied to this contest on component mount
	useEffect(() => {
		if (currentUser?.uid && projectId) {
			checkIfApplied();
		}
	}, [checkIfApplied, currentUser?.uid, projectId]);

	useEffect(() => {
		const fetchContestData = async () => {
			if (!projectId) {
				setLoading(false);
				setError("Contest ID not found");
				return;
			}

			try {
				setLoading(true);
				const contestRef = doc(db, "projects", projectId.toString());
				const contestSnap = await getDoc(contestRef);

				if (contestSnap.exists()) {
					const data = contestSnap.data() as ProjectFormData;
					setProjectData(data);
					// Initialize the current participant count
					setCurrentParticipantCount(data.participantsCount || 0);
				} else {
					setError("Contest not found");
				}

				setLoading(false);
			} catch (err) {
				console.error("Error fetching contest data:", err);
				setError("Failed to load contest data");
				setLoading(false);
			}
		};

		fetchContestData();
	}, [projectId]);

	if (loading) {
		return (
			<div className="flex-col mx-auto my-5 flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading project details...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container px-4 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 flex justify-center items-center h-64">
				<p className="text-red-500">{error}</p>
			</div>
		);
	}

	// Extract contest details from fetched data
	const projectTitle =
		projectData?.projectDetails.projectName || "Untitled Contest";
	const projectStatus = projectData?.status || ProjectStatus.ACTIVE;
	const paymentPerVideo = projectData?.creatorPricing.budgetPerVideo || 0;
	const publishedDate = formatDate(projectData?.createdAt);
	const projectType =
		projectData?.projectDetails.projectType || "Not specified";
	const description =
		projectData?.projectDetails.projectDescription ||
		"No description provided.";
	const contentType =
		projectData?.projectRequirements.contentType || "Not specified";
	const videoType =
		projectData?.projectRequirements.videoType || "Not specified";
	const aspectRatio =
		projectData?.projectRequirements.aspectRatio || "Not specified";
	const clientScript =
		projectData?.projectRequirements.script || "No script provided.";
	const productType =
		projectData?.projectDetails.productType || "Not specified";
	const numberOfVideos = projectData?.creatorPricing.videosPerCreator || 0;

	// Get the status display properties
	const getStatusDisplay = (status: string) => {
		switch (status) {
			case ProjectStatus.ACTIVE:
				return {
					text: "• Ongoing Project",
					className: "bg-pink-100 border border-pink-400 text-pink-500",
				};
			case ProjectStatus.COMPLETED:
				return {
					text: "✓ Completed",
					className: "bg-green-100 text-green-500",
				};
			case ProjectStatus.PENDING:
				return {
					text: "• Pending",
					className: "bg-yellow-100 text-yellow-500",
				};
			case ProjectStatus.REJECTED:
				return { text: "• Rejected", className: "bg-red-100 text-red-500" };
			case ProjectStatus.REQUEST_EDIT:
				return {
					text: "Edits Requested",
					className: "bg-blue-100 text-blue-500",
				};
			default:
				return {
					text: "• Ongoing Project",
					className: "bg-pink-100 text-pink-500",
				};
		}
	};

	const statusDisplay = getStatusDisplay(projectStatus);

	return (
		<div className="container px-4 sm:px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 relative">
			<div className="mb-5">
				<Link
					href="/creator/dashboard/project/all"
					className="flex items-center gap-2"
				>
					&larr; <p className="hover:underline">Back to Available Projects</p>
				</Link>
			</div>
			<div className="mb-2 relative">
				<div className="flex flex-col sm:flex-row gap-3 items-start">
					<h1 className="text-xl sm:text-2xl font-bold">{projectTitle}</h1>
					<span
						className={`mt-1.5 px-2 py-0.5 rounded-full text-xs ${statusDisplay.className}`}
					>
						{statusDisplay.text}
					</span>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 mb-6">
				<div className="flex flex-col w-full lg:w-2/3 xl:w-3/4">
					{/* Prize Breakdown Card for Mobile */}
					<div className="lg:hidden mb-6">
						<Card className="bg-[#fff] border border-[#FFBF9B] shadow-none py-3 w-full h-auto min-h-36 flex flex-col items-center justify-start">
							<div className="flex items-center gap-2 px-4 pb-4 w-full">
								{brandLoading ? (
									<div className="flex items-center">
										<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
											<div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full"></div>
										</div>
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
									</div>
								) : (
									<div className="flex items-center w-full">
										{brandProfile?.logoUrl ? (
											<Image
												className="h-8 w-8 rounded-full mr-2 object-cover"
												src={brandProfile.logoUrl}
												alt={brandProfile.brandName || "Brand"}
												width={32}
												height={32}
											/>
										) : (
											<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
												<span className="text-xs text-gray-500">
													{brandProfile?.brandName?.charAt(0) || "B"}
												</span>
											</div>
										)}
										<p className="text-sm font-medium">
											{brandProfile?.brandName || "Unknown Brand"}
										</p>
									</div>
								)}
							</div>

							<div className="flex justify-start items-center">
								<div className="flex gap-2 text-sm mb-2">
									<Image
										src="/icons/dateIcon.svg"
										alt="Date"
										width={20}
										height={20}
									/>
									<div className="flex flex-col">
										<p className="text-[#667085]">Published On</p>
										<span className="text-black font-normal">
											{publishedDate}
										</span>
									</div>
								</div>
							</div>

							<div className="flex gap-2 text-sm mb-2">
								<Image
									src="/icons/productType.svg"
									alt="Product Type"
									width={20}
									height={20}
								/>
								<div className="flex flex-col">
									<p className="text-[#667085]">Product Type</p>
									<span className="text-black font-normal">{productType}</span>
								</div>
							</div>

							<div className="flex gap-2 text-sm mb-2">
								<Image
									src="/icons/videos.svg"
									alt="Videos"
									width={20}
									height={20}
								/>
								<div className="flex flex-col ">
									<p className="text-[#667085]">Number of Videos</p>
									<span className="text-black font-normal">
										{numberOfVideos}
									</span>
								</div>
							</div>

							<div className="flex gap-2 text-sm mb-2">
								<Image
									src="/icons/money.svg"
									alt="Money"
									width={20}
									height={20}
								/>
								<div className="flex flex-col">
									<p className="mb-2 text-[#667085]">Payment Per Video</p>
									<span className="text-black font-normal">
										${paymentPerVideo}
									</span>
								</div>
							</div>

							<div className="px-4 w-full">
								<button
									onClick={hasApplied ? undefined : openApplyModal}
									disabled={hasApplied}
									className={`block w-full text-center py-2 ${
										hasApplied
											? applicationStatus === "approved"
												? "bg-green-500 cursor-not-allowed"
												: applicationStatus === "rejected"
													? "bg-red-500 cursor-not-allowed"
													: "bg-gray-400 cursor-not-allowed"
											: "bg-orange-500 hover:bg-orange-600"
									} text-white rounded-md transition-colors`}
								>
									{hasApplied
										? applicationStatus === "approved"
											? "Application Approved"
											: applicationStatus === "rejected"
												? "Application Rejected"
												: "Application Pending"
										: "Apply Now"}
								</button>
								<ApplyModal
									isOpen={isApplyModalOpen}
									onClose={closeApplyModal}
									projectId={projectId}
									onSubmitSuccess={handleApplySuccess}
								/>

								<button
									onClick={toggleSaved}
									disabled={saveLoading}
									className="mt-2 flex justify-center items-center w-full text-center py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
								>
									{saveLoading ? (
										<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									) : (
										<>
											<p>{isSaved ? "Unsave Project" : "Save for Later"}</p>
											<BookmarkIcon
												size={18}
												className={`ml-2 ${isSaved ? "fill-white" : ""}`}
											/>
										</>
									)}
								</button>
							</div>
						</Card>
					</div>

					{/* Project Overview Content */}
					<div className="space-y-6 mt-4">
						<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
							<h3 className="text-base text-[#667085] mb-2">Project Type</h3>
							<p>{projectType}</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
							<h3 className="text-base text-[#667085] mb-2">
								Project Description
							</h3>
							<p>{description}</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
							<h3 className="text-base text-[#667085] mb-2">Content Type</h3>
							<p className="capitalize">{contentType.replace(/-/g, " ")}</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
							<h3 className="text-base text-[#667085] mb-2">Video Type</h3>
							<p className="capitalize">{videoType.replace(/-/g, " ")}</p>
						</div>

						{projectType === "UGC Content Only" && (
							<div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
								<h3 className="text-base text-[#667085] mb-2">Aspect Ratio</h3>
								<p>{aspectRatio}</p>
							</div>
						)}

						{/* Content Creation Guidance */}
						<div>
							<div className="relative border-b pb-4">
								{hasApplied ? (
									// Show full content when user has applied
									<div className="grid grid-cols-1 md:grid-cols-2">
										<h3 className="text-base text-[#667085] mb-2">
											Client&apos;s Script
										</h3>
										<div className="space-y-2">{clientScript}</div>
									</div>
								) : (
									// Show blurred content with overlay for users who haven't applied
									<>
										<div className="grid grid-cols-1 md:grid-cols-2 filter blur-sm">
											<h3 className="text-base text-[#667085] mb-2">
												Client&apos;s Script
											</h3>
											<div className="space-y-2">{clientScript}</div>
										</div>

										{/* Overlay with clear text and apply button */}
										<div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
											<div className="backdrop-blur-sm">
												<h2 className="text-lg font-bold mb-2 text-gray-800">
													Apply to the project, and once accepted, you&apos;ll
													unlock full details to get started!
												</h2>
												<button
													onClick={openApplyModal}
													className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors text-base font-medium"
												>
													Apply Now
												</button>
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Right column with fixed width - desktop only */}
				<div className="hidden lg:block lg:w-1/3 xl:w-1/4 mt-14">
					<Card className="bg-[#fff] border border-[#FFBF9B] shadow-none w-full h-auto min-h-36 flex flex-col justify-start p-4">
						<div className="flex items-center gap-2 w-full mb-4">
							{brandLoading ? (
								<div className="flex items-center w-full">
									<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
										<div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full"></div>
									</div>
									<div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
								</div>
							) : (
								<div className="flex items-center w-full">
									{brandProfile?.logoUrl ? (
										<Image
											className="h-8 w-8 rounded-full mr-2 object-cover"
											src={brandProfile.logoUrl}
											alt={brandProfile.brandName || "Brand"}
											width={32}
											height={32}
										/>
									) : (
										<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
											<span className="text-xs text-gray-500">
												{brandProfile?.brandName?.charAt(0) || "B"}
											</span>
										</div>
									)}
									<p className="text-sm font-medium">
										{brandProfile?.brandName || "Unknown Brand"}
									</p>
								</div>
							)}
						</div>

						<div className="flex gap-2 text-sm mb-2">
							<Image
								src="/icons/dateIcon.svg"
								alt="Date"
								width={20}
								height={20}
							/>
							<div className="flex flex-col ">
								<p className="text-[#667085]">Published On</p>
								<span className="text-black font-normal">{publishedDate}</span>
							</div>
						</div>

						<div className="flex gap-2 text-sm mb-2">
							<Image
								src="/icons/productType.svg"
								alt="Product Type"
								width={20}
								height={20}
							/>
							<div className="flex flex-col">
								<p className="text-[#667085]">Product Type</p>
								<span className="text-black font-normal">{productType}</span>
							</div>
						</div>

						<div className="flex gap-2 text-sm mb-2">
							<Image
								src="/icons/videos.svg"
								alt="Videos"
								width={20}
								height={20}
							/>
							<div className="flex flex-col">
								<p className="text-[#667085]">Number of Videos</p>
								<span className="text-black font-normal">
									{numberOfVideos} {numberOfVideos > 1 ? "Videos" : "Video"}
								</span>
							</div>
						</div>

						<div className="flex gap-2 text-sm mb-6">
							<Image
								src="/icons/money.svg"
								alt="Money"
								width={20}
								height={20}
							/>

							<div className="flex flex-col ">
								<p className="text-[#667085]">Payment Per Video</p>
								<span className="text-black font-normal">
									${paymentPerVideo}
								</span>
							</div>
						</div>

						<button
							onClick={hasApplied ? undefined : openApplyModal}
							disabled={hasApplied}
							className={`block w-full text-center py-2 ${
								hasApplied
									? applicationStatus === "approved"
										? "bg-green-500 cursor-not-allowed"
										: applicationStatus === "rejected"
											? "bg-red-500 cursor-not-allowed"
											: "bg-gray-400 cursor-not-allowed"
									: "bg-orange-500 hover:bg-orange-600"
							} text-white rounded-md transition-colors`}
						>
							{hasApplied
								? applicationStatus === "approved"
									? "Application Approved"
									: applicationStatus === "rejected"
										? "Application Rejected"
										: "Application Pending"
								: "Apply Now"}
						</button>

						<ApplyModal
							isOpen={isApplyModalOpen}
							onClose={closeApplyModal}
							projectId={projectId}
							onSubmitSuccess={handleApplySuccess}
						/>

						<button
							onClick={toggleSaved}
							disabled={saveLoading}
							className="mt-2 flex justify-center items-center w-full text-center py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
						>
							{saveLoading ? (
								<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							) : (
								<>
									<p>{isSaved ? "Unsave Project" : "Save for Later"}</p>
									<BookmarkIcon
										size={18}
										className={`ml-2 ${isSaved ? "fill-white" : ""}`}
									/>
								</>
							)}
						</button>
					</Card>
				</div>
			</div>
		</div>
	);
}
