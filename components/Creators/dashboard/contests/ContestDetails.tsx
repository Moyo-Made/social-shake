"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { BookmarkIcon, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ContestFormData } from "@/types/contestFormData";
import { useContestForm } from "@/components/brand/brandProfile/dashboard/newContest/ContestFormContext";
import ContestModal from "./available/JoinContestModal";
import { useAuth } from "@/context/AuthContext";
import ApplyModal from "./available/ApplyModal";

interface ContestDetailPageProps {
	contestId: string;
}

export default function ContestDetails({ contestId }: ContestDetailPageProps) {
	const { currentUser } = useAuth();
	const [contestData, setContestData] = useState<ContestFormData | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [isContestModalOpen, setIsContestModalOpen] = useState(false);
	const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
	const [, setCurrentParticipantCount] =
		useState<number>(0);
	const [hasJoined, setHasJoined] = useState<boolean>(false);
	const [hasApplied, setHasApplied] = useState<boolean>(false);
	const [joinCheckComplete, setJoinCheckComplete] = useState<boolean>(false);
	const [applicationCheckComplete, setApplicationCheckComplete] =
		useState<boolean>(false);

	// Function to check if user has joined the contest - made reusable
	const checkIfJoined = useCallback(async () => {
		if (!currentUser?.uid || !contestId) return false;

		try {
			const response = await fetch(
				`/api/contests/check-joined?userId=${currentUser.uid}&contestId=${contestId}`
			);
			if (response.ok) {
				const data = await response.json();
				setHasJoined(data.hasJoined);
				setJoinCheckComplete(true);
				return data.hasJoined;
			}
		} catch (error) {
			console.error("Error checking contest join status:", error);
		}
		return false;
	}, [currentUser?.uid, contestId]);

	// Function to check if user has applied for the contest
	const checkIfApplied = useCallback(async () => {
		if (!currentUser?.uid || !contestId) return false;

		try {
			const response = await fetch(
				`/api/contests/check-applied?userId=${currentUser.uid}&contestId=${contestId}`
			);
			if (response.ok) {
				const data = await response.json();
				setHasApplied(data.hasApplied);
				setApplicationCheckComplete(true);
				return data.hasApplied;
			}
		} catch (error) {
			console.error("Error checking contest application status:", error);
		}
		return false;
	}, [currentUser?.uid, contestId]);

	const openContestModal = () => {
		setIsContestModalOpen(true);
	};

	const closeContestModal = () => {
		setIsContestModalOpen(false);
	};

	const openApplyModal = () => {
		setIsApplyModalOpen(true);
	};

	const closeApplyModal = () => {
		setIsApplyModalOpen(false);
	};

	// This function will be called when submission is successful
	const handleSubmitSuccess = async (newParticipantCount: number) => {
		// Update participant count
		setCurrentParticipantCount(newParticipantCount);

		// Force a re-check of join status
		await checkIfJoined();

		// Also update the contestData state to reflect the new count
		if (contestData) {
			setContestData({
				...contestData,
				participantsCount: newParticipantCount,
			});
		}

		// Close the modal
		closeContestModal();
	};

	// Handle application success
	const handleApplySuccess = async () => {
		// Set the user as applied
		setHasApplied(true);

		// Close the apply modal
		closeApplyModal();
	};

	// Check if user has joined or applied to this contest on component mount
	useEffect(() => {
		if (currentUser?.uid && contestId) {
			checkIfJoined();
			checkIfApplied();
		}
	}, [currentUser?.uid, contestId, checkIfJoined, checkIfApplied]);

	const { formData } = useContestForm();
	const contestType =
		contestData?.contestType ||
		formData?.basic?.contestType?.toLowerCase() ||
		"Leaderboard";

	// Get who can join criteria
	const whoCanJoin =
		contestData?.requirements?.whoCanJoin || "Open to all Creators";

	// Format date for display
	const formatDate = (dateInput?: string | Date): string => {
		if (!dateInput) return "Not Set";
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		return date instanceof Date && !isNaN(date.getTime())
			? date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Not Set";
	};

	// Format status based on dates
	const getContestStatus = (data: ContestFormData | null): string => {
		if (!data) return "Draft";

		let status = data.status || "Draft";
		const now = new Date();
		const startDate = data.prizeTimeline?.startDate
			? new Date(data.prizeTimeline.startDate)
			: null;
		const endDate = data.prizeTimeline?.endDate
			? new Date(data.prizeTimeline.endDate)
			: null;

		if (status.toLowerCase() === "published" && (!startDate || !endDate)) {
			status = "Draft";
		} else if (
			status.toLowerCase() === "published" ||
			status.toLowerCase() === "active"
		) {
			if (startDate && endDate) {
				if (now < startDate) {
					status = "Scheduled";
				} else if (now >= startDate && now <= endDate) {
					status = "Active";
				} else if (now > endDate) {
					status = "Completed";
				}
			} else {
				status = "Draft";
			}
		}

		return status.charAt(0).toUpperCase() + status.slice(1);
	};

	useEffect(() => {
		const fetchContestData = async () => {
			if (!contestId) {
				setLoading(false);
				setError("Contest ID not found");
				return;
			}

			try {
				setLoading(true);
				const contestRef = doc(db, "contests", contestId.toString());
				const contestSnap = await getDoc(contestRef);

				if (contestSnap.exists()) {
					const data = contestSnap.data() as ContestFormData;
					setContestData(data);
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
	}, [contestId]);

	if (loading) {
		return (
			<div className="flex-col mx-auto my-5 flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p>Loading contest details...</p>
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
	const contestTitle = contestData?.basic?.contestName || "Untitled Contest";
	const contestStatus = getContestStatus(contestData);
	const startDate = formatDate(contestData?.prizeTimeline?.startDate);
	const endDate = formatDate(contestData?.prizeTimeline?.endDate);
	const totalBudget = contestData?.prizeTimeline?.totalBudget || 0;
	const publishedDate = formatDate(contestData?.createdAt);
	const description =
		contestData?.basic?.description || "No description provided.";
	const rules = contestData?.basic?.rules || "No rules specified.";
	const industry = contestData?.basic?.industry || "Not specified";
	const duration = contestData?.requirements?.duration || "Not specified";
	const videoType = contestData?.requirements?.videoType || "Not specified";
	const clientScript =
		contestData?.requirements?.script || "No script provided.";
	const winnerCount = contestData?.prizeTimeline?.winnerCount || 0;
	const positions = contestData?.prizeTimeline?.positions || [];
	const criteria = contestData?.prizeTimeline?.criteria || "Not specified";
	const incentives = Array.isArray(contestData?.incentives)
		? contestData?.incentives
		: [];

	// Check if content should be blurred based on join criteria and user status
	const shouldBlurContent =
		whoCanJoin === "allow-applications" && !hasApplied && !hasJoined;

	// Button component to reuse for both mobile and desktop
	const ContestActionButton = () => {
		// Render a loading state while checking join/application status
		if ((!joinCheckComplete || !applicationCheckComplete) && currentUser) {
			return (
				<button
					className="mt-4 block w-full text-center py-2 bg-gray-400 text-white rounded-md cursor-wait"
					disabled
				>
					<div className="inline-flex items-center">
						<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Checking...
					</div>
				</button>
			);
		}

		// Render the appropriate button based on join/application status
		if (hasJoined) {
			return (
				<button
					className="mt-4 block w-full text-center py-2 bg-green-500 cursor-not-allowed text-white rounded-md"
					disabled
				>
					<svg
						className="w-4 h-4 inline mr-2 mb-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
					</svg>
					Contest Joined
				</button>
			);
		}

		if (hasApplied) {
			return (
				<button
					className="mt-4 block w-full text-center py-2 bg-blue-500 cursor-not-allowed text-white rounded-md"
					disabled
				>
					<svg
						className="w-4 h-4 inline mr-2 mb-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
					</svg>
					Application Submitted
				</button>
			);
		}

		// Show Apply button or Join button based on whoCanJoin criteria
		if (whoCanJoin === "allow-applications") {
			return (
				<button
					onClick={openApplyModal}
					className="mt-4 block w-full text-center py-2 bg-orange-500 hover:bg-orange-600 cursor-pointer text-white rounded-md transition-colors"
				>
					Apply to Contest
				</button>
			);
		}

		// Default to Join Contest button
		return (
			<button
				onClick={openContestModal}
				className="mt-4 block w-full text-center py-2 bg-orange-500 hover:bg-orange-600 cursor-pointer text-white rounded-md transition-colors"
			>
				Join Contest
			</button>
		);
	};

	return (
		<div className="container px-4 sm:px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-auto my-5 relative">
			<div className="mb-5">
				<Link
					href="/creator/dashboard/contest/all"
					className="flex items-center gap-2"
				>
					&larr; <p className="hover:underline">Back to Available Contests</p>
				</Link>
			</div>
			<div className="mb-2 relative">
				<div className="flex flex-col sm:flex-row gap-3">
					<h1 className="text-xl sm:text-2xl font-bold">{contestTitle}</h1>
					<div
						className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${
							contestStatus === "Active"
								? "bg-[#ABEFC6] text-[#067647]"
								: contestStatus === "Draft"
									? "bg-[#F6F6F6] text-[#667085]"
									: contestStatus === "Completed"
										? "bg-[#FDD849] text-[#1A1A1A]"
										: contestStatus === "Scheduled"
											? "bg-[#DBEAFE] text-[#3B82F6]"
											: "bg-[#FFE9E7] border border-[#F04438] text-[#F04438]"
						}`}
					>
						{contestStatus === "Active" ? (
							<CheckCircle size={12} />
						) : (
							<Clock size={12} />
						)}
						<span>{contestStatus}</span>
					</div>
				</div>
				<div className="sm:absolute sm:top-1 sm:right-0 text-sm">
					<span className="text-gray-600">Published On</span>
					<p className="font-normal">{publishedDate}</p>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 mb-6">
				<div className="flex flex-col w-full lg:w-3/4">
					<div className="flex flex-col sm:flex-row gap-4 sm:gap-2 mb-6">
						<div className="flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Start Date:</span>
							<p className="text-base">{startDate}</p>
						</div>
						<div className="sm:border-l pl-0 sm:pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">End Date:</span>
							<p className="text-base">{endDate}</p>
						</div>
						<div className="sm:border-l pl-0 sm:pl-4 flex items-center gap-1">
							<span className="text-base text-[#FD5C02]">Total Budget:</span>
							<p className="text-base">${totalBudget}</p>
						</div>
					</div>

					{/* Prize Breakdown Card for Mobile */}
					<div className="lg:hidden mb-6">
						<Card className="bg-[#fff] border border-[#FFBF9B] shadow-none py-3 w-full h-auto min-h-36 flex flex-col items-center justify-start">
							<div className="flex justify-between items-center pb-4 text-sm w-full px-4 pt-1">
								<p className="text-[#667085]">Published On</p>
								<span className=" text-black font-normal">{publishedDate}</span>
							</div>

							{/* Contest Type Specific Criteria */}
							<div className="flex justify-between items-center pb-4 text-sm w-full px-4">
								<h3 className="text-sm text-[#667085]">
									{contestType === "Leaderboard"
										? "Leaderboard Criteria"
										: "GMV Criteria"}
								</h3>
								<p className="capitalize">{criteria.replace(/-/g, " ")}</p>
							</div>

							<div className="flex justify-between items-center pb-4 text-sm w-full px-4">
								<p className="mb-2 text-[#667085]">Winner Count </p>
								<span>{winnerCount} Winners</span>
							</div>

							{/* Who Can Join Information */}
							<div className="flex justify-between items-center pb-4 text-sm w-full px-4">
								<p className="mb-2 text-[#667085]">Participation</p>
								<span className="capitalize">
									{whoCanJoin === "allow-applications"
										? "By Application"
										: "Open to all Creators"}
								</span>
							</div>

							<button
								onClick={() => setIsOpen(!isOpen)}
								className="text-sm font-medium text-start mb-2 flex items-center justify-start gap-2 w-full px-4"
							>
								Prize Breakdown
								{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
							</button>

							<div
								className={`text-start transition-all duration-300 ease-in-out overflow-hidden ${
									isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
								}`}
							>
								{positions.length > 0 && (
									<div className="px-4">
										<ul className="flex flex-col justify-start text-start space-y-2 text-sm pt-2">
											{positions.map((prize, index) => (
												<li key={index} className="flex space-x-10 items-start">
													<span>Position {index + 1}</span>
													<span className="font-medium">${prize}</span>
												</li>
											))}
										</ul>
										<div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
											<span>Total</span>
											<span className="font-medium">${totalBudget}</span>
										</div>
									</div>
								)}
							</div>

							{/* Contest Action Button - Mobile */}
							<div className="px-4 w-full">
								<ContestActionButton />
							</div>

							{/* Contest Modal */}
							<ContestModal
								isOpen={isContestModalOpen}
								onClose={closeContestModal}
								contestId={contestId}
								onSubmitSuccess={handleSubmitSuccess}
							/>

							{/* We would need to create an ApplyModal component */}
							{/* (Implementation of ApplyModal component would be needed) */}

							<Link
								href=""
								className="mt-2  flex justify-center items-center w-full text-center py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
							>
								<p>Save for Later </p>
								<BookmarkIcon size={18} className="ml-2" />
							</Link>
						</Card>
					</div>

					{/* Contest Overview Content - with conditional blur overlay */}
					<div className="space-y-6 mt-4 relative">
						{/* Main content (will be blurred if needed) */}
						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
							<h3 className="text-base text-[#667085] mb-2">
								Contest Description
							</h3>
							<p>{description}</p>
						</div>

						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4`}>
							<h3 className="text-base text-[#667085] mb-2">Contest Rules</h3>
							<p>{rules}</p>
						</div>

						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
							<h3 className="text-base text-[#667085] mb-2">
								Contest Industry
							</h3>
							<p>{industry.charAt(0).toUpperCase() + industry.slice(1)}</p>
						</div>

						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
							<h3 className="text-base text-[#667085] mb-2">Duration</h3>
							<p className="capitalize">{duration.replace(/-/g, " ")}</p>
						</div>

						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
							<h3 className="text-base text-[#667085] mb-2">Video Type</h3>
							<p className="capitalize">{videoType.replace(/-/g, " ")}</p>
						</div>

						{/* How to Join */}
						<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
							<h3 className="text-base text-[#667085] mb-2">How to Join</h3>
							<p>
								{whoCanJoin === "allow-applications"
									? "This contest requires application approval. Please apply using the 'Apply for Contest' button."
									: "This contest is open to join for all eligible creators."}
							</p>
						</div>

						{/* Additional Incentives */}
						{incentives.length > 0 && (
							<div className={`grid grid-cols-1 md:grid-cols-2 border-b pb-4 `}>
								<h3 className="text-base text-[#667085] mb-2">
									Additional Incentives
								</h3>
								<ul className="list-disc pl-5 space-y-1">
									{incentives.map((incentive, index) => (
										<li key={index} className="text-base">
											{incentive.name}: ${incentive.worth} -{" "}
											{incentive.description}
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Content Creation Guidance */}
						<div>
							<div className="relative border-b pb-4">
								{/* Content to be blurred */}
								<div
									className={`grid grid-cols-1 md:grid-cols-2 ${shouldBlurContent ? "filter blur-sm" : ""}`}
								>
									<h3 className="text-base text-[#667085] mb-2">
										Client&apos;s Script
									</h3>
									<div className="space-y-2">{clientScript}</div>
								</div>

								{/* Overlay with clear text and button */}
								{shouldBlurContent && (
									<div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
										<div className=" backdrop-blur-sm">
											<h2 className="text-lg font-bold mb-2 text-gray-800">
												Join the contest to unlock full details and get started!
											</h2>
											<button
												onClick={openApplyModal}
												className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors text-base font-medium"
											>
												Apply to Join
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Right column with fixed width - desktop only */}
				<div className="hidden lg:block w-1/4 mt-14">
					{/* Prize breakdown card */}
					<Card className="bg-[#fff] border border-[#FFBF9B] shadow-none w-full h-auto min-h-36 flex flex-col items-center justify-start p-4">
						<div className="flex justify-between items-center pb-4 text-sm w-full ">
							<p className="text-[#667085]">Published On</p>
							<span className=" text-black font-normal">{publishedDate}</span>
						</div>

						{/* Contest Type Specific Criteria */}
						<div className="flex justify-between items-center pb-4 text-sm w-full">
							<h3 className="text-sm text-[#667085]">
								{contestType === "Leaderboard"
									? "Leaderboard Criteria"
									: "GMV Criteria"}
							</h3>
							<p className="capitalize">{criteria.replace(/-/g, " ")}</p>
						</div>

						<div className="flex justify-between items-center pb-4 text-sm w-full">
							<p className="mb-2 text-[#667085]">Winner Count </p>
							<span>{winnerCount} Winners</span>
						</div>

						{/* Who Can Join Information */}
						<div className="flex justify-between items-center pb-4 text-sm w-full">
							<p className="mb-2 text-[#667085]">Participation</p>
							<span className="capitalize">
								{whoCanJoin === "allow-applications"
									? "By Application"
									: "Open to all Creators"}
							</span>
						</div>

						<div className="w-full">
							<button
								onClick={() => setIsOpen(!isOpen)}
								className="text-sm font-medium text-start mb-2 flex items-center justify-start gap-2 w-full"
							>
								Prize Breakdown
								{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
							</button>

							<div
								className={`transition-all duration-300 ease-in-out overflow-hidden ${
									isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
								}`}
							>
								{positions.length > 0 && (
									<div className="px-4 w-full">
										<ul className="space-y-2 text-sm pt-2">
											{positions.map((prize, index) => (
												<li
													key={index}
													className="flex justify-between items-center"
												>
													<span>Position {index + 1}</span>
													<span className="font-medium">${prize}</span>
												</li>
											))}
										</ul>
										<div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
											<span>Total</span>
											<span className="font-medium">${totalBudget}</span>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Contest Action Button - Desktop */}
						<ContestActionButton />

						{/* Contest Modal */}
						<ContestModal
							isOpen={isContestModalOpen}
							onClose={closeContestModal}
							contestId={contestId}
							onSubmitSuccess={handleSubmitSuccess}
						/>

						<ApplyModal	
							isOpen={isApplyModalOpen}
							onClose={closeApplyModal}
							contestId={contestId}
							onSubmitSuccess={handleApplySuccess}
						/>

						<Link
							href=""
							className="mt-2 flex justify-center items-center w-full text-center py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
						>
							<p>Save for Later </p>
							<BookmarkIcon size={18} className="ml-2" />
						</Link>
					</Card>
				</div>
			</div>
		</div>
	);
}
