"use client";

import { ReactNode, useState, useEffect } from "react";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { useRef } from "react";
import io, { Socket } from "socket.io-client";
import {
	Clock,
	AlertTriangle,
	FileQuestion,
	CheckCircle,
	X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreatorContentWrapperProps {
	userId: string;
	children: ReactNode;
	pageType?: "dashboard" | "contests" | "projects" | "portfolio";
}

export default function CreatorContentWrapper({
	userId,
	children,
	pageType = "dashboard",
}: CreatorContentWrapperProps) {
	const [showApprovedMessage, setShowApprovedMessage] = useState(false);
	const [hasShownToast, setHasShownToast] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const [showApprovedModal, setShowApprovedModal] = useState(false);
	const [, setHasShownModal] = useState(false);
	const previousStatusRef = useRef<string | null>(null);
	const [realTimeStatus, setRealTimeStatus] = useState<{
		status: string;
		rejectionReason?: string;
		infoRequest?: string;
		suspensionReason?: string;
		updatedAt: string;
	} | null>(null);

	// Use the hook with complete profile data access (as fallback)
	const { creatorProfile, loading, error } = useCreatorProfile("view");

	useEffect(() => {
		if (!userId) return;

		 // Initialize socket connection to your Render server
		 const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001", {
			transports: ["polling", "websocket"],
		});
	
		socketRef.current = socket;
		socketRef.current = socket;

		socket.on("connect", () => {
			console.log("Connected to socket server");
			socket.emit("subscribe-user", userId);
			socket.emit("subscribe-verification", userId);
		});

		socket.on(
			"verification-status-update",
			(data: {
				status: string;
				rejectionReason?: string;
				infoRequest?: string;
				suspensionReason?: string;
				updatedAt: string;
			}) => {
				const { status } = data;
				const previousStatus = previousStatusRef.current;

				// Update real-time status
				setRealTimeStatus(data);

				// Check if status changed to approved
				if (
					previousStatus &&
					previousStatus !== "approved" &&
					status.toLowerCase() === "approved"
				) {
					setShowApprovedMessage(true);
					setShowApprovedModal(true);
				}

				// Update previous status
				previousStatusRef.current = status.toLowerCase();
			}
		);

		// Cleanup on unmount
		return () => {
			if (socket.connected) {
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [userId]);

	// Get verification status from WebSocket first, then fall back to profile hook
	const getCreatorStatus = (): string => {
		// Use real-time status first if available
		if (realTimeStatus?.status) {
			console.log("Using real-time status:", realTimeStatus.status);
			return realTimeStatus.status.toLowerCase();
		}

		// Fall back to profile hook data
		if (error) {
			console.log("Profile error, returning error status");
			return "error";
		}

		if (!creatorProfile) {
			console.log("No creator profile, returning missing status");
			return "missing";
		}

		const status =
			creatorProfile?.status ||
			creatorProfile?.verificationStatus ||
			(creatorProfile?.profileData?.status as string);

		console.log("Creator Profile Status from hook:", status);
		console.log("Full creator profile:", creatorProfile);

		return status?.toLowerCase() || "pending";
	};

	

	// Close modal handler
	const closeModal = () => {
		setShowApprovedModal(false);
		setHasShownModal(true);
	};

	// Show approval toast only once
	useEffect(() => {
		if (showApprovedMessage && !hasShownToast) {
			toast.success(
				<div className="flex items-center">
					<span className="text-white">Creator Profile Approved!</span>
				</div>
			);
			setHasShownToast(true);
		}
	}, [showApprovedMessage, hasShownToast]);

	// Show loading while either the profile hook or WebSocket is loading
	if (loading && !realTimeStatus) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	// Get page-specific text based on pageType
	const getPageTypeText = (
		pageType: "dashboard" | "contests" | "projects" | "portfolio"
	) => {
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
	console.log("Final creator status:", creatorStatus);

	// Approval Modal Component
	const ApprovalModal = () => {
		if (!showApprovedModal) return null;

		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				{/* Black overlay */}
				<div
					className="absolute inset-0 bg-black bg-opacity-75"
					onClick={closeModal}
				/>

				{/* Modal content */}
				<div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
					{/* Close button */}
					<button
						onClick={closeModal}
						className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="h-6 w-6" />
					</button>

					{/* Success icon */}
					<div className="flex justify-center mb-6">
						<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
							<CheckCircle className="h-12 w-12 text-green-600" />
						</div>
					</div>

					{/* Title */}
					<h2 className="text-2xl font-bold text-gray-900 mb-4">
						Account Verified Successfully
					</h2>

					{/* Description */}
					<p className="text-gray-600 mb-6 leading-relaxed">
						Your profile is now active. You can start exploring your dashboard
						and apply for brand projects.
					</p>

					{/* Action buttons */}
					<div className="flex flex-col sm:flex-row gap-3 justify-center px-6">
						<Button
							className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg"
							onClick={closeModal}
						>
							Create My AI Actor
						</Button>
						<Link href="/creator/dashboard" className="flex-1">
							<Button
								variant="outline"
								className="w-full bg-gray-900 text-white hover:bg-gray-800 border-gray-900 py-3 rounded-lg"
								onClick={closeModal}
							>
								Explore Dashboard
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	};

	// Show the appropriate message based on creator status
	if (creatorStatus !== "approved") {
		return (
			<div className="w-full max-w-2xl mx-auto">
				<div className="mt-10 md:mt-20 bg-white border rounded-lg shadow-sm p-8 text-center">
					{(creatorStatus === "not_submitted" ||
						creatorStatus === "missing") && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<FileQuestion className="h-16 w-16 text-orange-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Creator Profile Required
							</h2>
							<p className="text-gray-600 mb-6">
								You need to create a creator profile before you can{" "}
								{getPageTypeText(pageType)}.
							</p>
							<Link href="/creator/verify-identity">
								<Button className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white">Complete Creator Profile</Button>
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
								Once approved, you&apos;ll be able to{" "}
								{getPageTypeText(pageType)}. We&apos;ll notify you via email
								when your profile has been approved.
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
							<p className="text-gray-600 mb-4">
								Your creator profile was not approved.
								{realTimeStatus?.rejectionReason && (
									<span className="block mt-2 text-sm text-red-600">
										Reason: {realTimeStatus.rejectionReason}
									</span>
								)}
							</p>
							<p className="text-gray-600 mb-6">
								Please review the feedback and update your profile to{" "}
								{getPageTypeText(pageType)}.
							</p>
							<Link href="/creator/dashboard/settings">
								<Button variant="destructive" className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white">
									Edit Creator Profile
								</Button>
							</Link>
						</div>
					)}

					{creatorStatus === "info_requested" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<AlertTriangle className="h-16 w-16 text-blue-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">
								Information Requested
							</h2>
							<p className="text-gray-600 mb-4">
								Additional information is required for your profile.
								{realTimeStatus?.infoRequest && (
									<span className="block mt-2 text-sm text-blue-600">
										Request: {realTimeStatus.infoRequest}
									</span>
								)}
							</p>
							<Link href="/creator/dashboard/settings">
								<Button className="w-full">Update Profile</Button>
							</Link>
						</div>
					)}

					{creatorStatus === "suspended" && (
						<div className="max-w-md mx-auto">
							<div className="flex justify-center mb-4">
								<AlertTriangle className="h-16 w-16 text-gray-500" />
							</div>
							<h2 className="text-xl font-semibold mb-2">Profile Suspended</h2>
							<p className="text-gray-600 mb-4">
								Your profile has been suspended.
								{realTimeStatus?.suspensionReason && (
									<span className="block mt-2 text-sm text-gray-600">
										Reason: {realTimeStatus.suspensionReason}
									</span>
								)}
							</p>
							<p className="text-gray-600 mb-6">
								Please contact support for assistance.
							</p>
							<Link href="/contact-us">
								
							<Button variant="outline" className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800">
								Contact Support
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
								className="px-6 py-2"
								onClick={() => {
									window.location.reload();
								}}
							>
								Refresh Status
							</Button>
						</div>
					)}
				</div>
			</div>
		);
	}

	// If creator is approved, show the content
	console.log("Creator is approved, showing children");
	return (
		<div className="w-full">
			{children}
			<ApprovalModal />
		</div>
	);
}
