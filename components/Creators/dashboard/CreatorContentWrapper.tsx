"use client";

import { ReactNode, useState, useEffect } from "react";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { Clock, AlertTriangle, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreatorContentWrapperProps {
	userId: string;
	children: ReactNode;
	pageType?: "dashboard" | "contests" | "projects" | "portfolio";
}

export default function CreatorContentWrapper({
	children,
	pageType = "dashboard",
}: CreatorContentWrapperProps) {
	const [showApprovedMessage, setShowApprovedMessage] = useState(false);
	const [hasShownToast, setHasShownToast] = useState(false);

	// Use the hook with complete profile data access
	const { creatorProfile, loading, error } = useCreatorProfile("view");

	// Get verification status from creatorProfile data
	const getCreatorStatus = () => {
		// If we couldn't load the profile at all
		if (error) return "error";

		// If no profile exists yet
		if (!creatorProfile) return "missing";

		// Get status from verification data first, then fall back to profile data
		const status =
			creatorProfile?.status ||
			creatorProfile?.verificationStatus ||
			(creatorProfile?.profileData?.status as string);

		// If we have a profile but no status info, assume pending
		return status?.toLowerCase() || "pending";
	};

	// Handle showing the approved message when status changes to approved
	useEffect(() => {
		const status = getCreatorStatus();
		if (status === "approved") {
			setShowApprovedMessage(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [creatorProfile]);

	useEffect(() => {
		// Only show toast if it hasn't been shown yet AND should be shown
		if (showApprovedMessage && !hasShownToast) {
			toast.success(
				<div className="flex items-center">
					<span className="text-white">Creator Profile Approved!</span>
				</div>
			);

			// Mark as shown so it doesn't appear again
			setHasShownToast(true);
		}
	}, [showApprovedMessage, hasShownToast]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	// Get page-specific text based on pageType
	const getPageTypeText = () => {
		switch (pageType) {
			case "contests":
				return "participate in contests";
			case "projects":
				return "accept projects";
			case "portfolio":
				return "showcase your portfolio";
			default:
				return "access your dashboard features";
		}
	};

	const creatorStatus = getCreatorStatus();

	// Show the appropriate message based on creator status
	if (creatorStatus !== "approved") {
		return (
			<div className="w-fit">
				<div className="mt-10 md:mt-20 bg-white border rounded-lg shadow-sm p-8 text-center">
					{creatorStatus === "not_submitted" && (
						<div className=" max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<FileQuestion className="h-16 w-16 text-orange-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Creator Profile Required
							</h2>
							<p className="text-gray-600 mb-6">
								You need to create a creator profile before you can{" "}
								{getPageTypeText()}.
							</p>
							<Link href="/creator/verify-identity">
								<Button className="w-full">Complete Creator Profile</Button>
							</Link>
						</div>
					)}

					{creatorStatus === "missing" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<FileQuestion className="h-16 w-16 text-orange-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Creator Profile Required
							</h2>
							<p className="text-gray-600 mb-6">
								You need to create a creator profile before you can{" "}
								{getPageTypeText()}.
							</p>
							<Link href="/creator/signup">
								<Button className="w-full">Create Creator Profile</Button>
							</Link>
						</div>
					)}

					{creatorStatus === "pending" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<Clock className="h-16 w-16 text-orange-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Profile Under Review
							</h2>
							<p className="text-gray-600 mb-2">
								Your creator profile is currently being reviewed by our team.
							</p>
							<p className="text-gray-600 mb-4">
								Once approved, you&apos;ll be able to {getPageTypeText()}.
								We&apos;ll notify you via email when your profile has been
								approved.
							</p>
							<div className="w-full bg-gray-200 rounded-full h-2 mb-2">
								<div className="bg-orange-500 h-2 rounded-full w-1/2"></div>
							</div>
							<p className="text-sm text-gray-500">Review in progress</p>
						</div>
					)}

					{creatorStatus === "rejected" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<AlertTriangle className="h-16 w-16 text-red-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Profile Needs Updates
							</h2>
							<p className="text-gray-600 mb-6">
								Your creator profile was not approved. Please review the
								feedback and update your profile to {getPageTypeText()}.
							</p>
							<Link href="/creator/dashboard/settings">
								<Button variant="destructive" className="w-full">
									Edit Creator Profile
								</Button>
							</Link>
						</div>
					)}

					{creatorStatus === "error" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<AlertTriangle className="h-16 w-16 text-red-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Error Checking Creator Status
							</h2>
							<p className="text-gray-600 mb-6">
								We couldn&apos;t verify your creator profile status. Please try
								refreshing the page or contact support.
							</p>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => window.location.reload()}
							>
								Refresh Page
							</Button>
						</div>
					)}
				</div>
			</div>
		);
	}

	// If creator is approved, show the content with possible approval message
	return <div className="w-full">{children}</div>;
}
