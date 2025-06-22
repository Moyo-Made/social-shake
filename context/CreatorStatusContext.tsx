"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { toast } from "sonner";
import io, { Socket } from "socket.io-client";

interface CreatorStatus {
	status: string;
	rejectionReason?: string;
	infoRequest?: string;
	suspensionReason?: string;
	updatedAt: string;
}

interface CreatorStatusContextType {
	creatorStatus: string;
	realTimeStatus: CreatorStatus | null;
	loading: boolean;
	error: unknown;
	isInitialized: boolean;
}

const CreatorStatusContext = createContext<CreatorStatusContextType | null>(
	null
);

export function CreatorStatusProvider({
	children,
	userId,
}: {
	children: React.ReactNode;
	userId: string;
}) {
	const [realTimeStatus, setRealTimeStatus] = useState<CreatorStatus | null>(
		null
	);
	const [isInitialized, setIsInitialized] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const previousStatusRef = useRef<string | null>(null);
	const hasShownApprovalToastRef = useRef(false);

	// Use the hook with complete profile data access (as fallback)
	const { creatorProfile, loading, error } = useCreatorProfile("view");

	// Initialize socket connection ONCE
	useEffect(() => {
		if (!userId || socketRef.current) return; // Don't reconnect if already connected

		// Check if approval toast has already been shown in this session
		const approvalToastShown = sessionStorage.getItem(
			`approval_toast_${userId}`
		);
		if (approvalToastShown) {
			hasShownApprovalToastRef.current = true;
		}

		const socket = io(
			process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001",
			{
				transports: ["polling", "websocket"],
				reconnection: true,
				reconnectionDelay: 1000,
				reconnectionAttempts: 3,
			}
		);

		socket.on("connect", () => {
			socket.emit("subscribe-user", userId);
			socket.emit("subscribe-verification", userId);
			setIsInitialized(true);
		});

		socket.on("verification-status-update", (data: CreatorStatus) => {
			const { status, rejectionReason, infoRequest, suspensionReason } = data;
			const previousStatus = previousStatusRef.current;

			setRealTimeStatus(data);

			// Initialize previous status on first update if not set
			if (previousStatus === null) {
				previousStatusRef.current = status.toLowerCase();
				return;
			}

			// Handle status change to approved
			if (
				previousStatus !== "approved" &&
				status.toLowerCase() === "approved" &&
				!hasShownApprovalToastRef.current
			) {
				toast.success("🎉 Your creator profile has been approved!", {
					description: "You can now participate in projects and contests!",
					duration: 5000,
				});

				hasShownApprovalToastRef.current = true;
				sessionStorage.setItem(`approval_toast_${userId}`, "true");

				// Emit custom event for modal
				window.dispatchEvent(
					new CustomEvent("creator-approved", { detail: data })
				);
			}

			// Handle status change to rejected
			if (
				previousStatus !== "rejected" &&
				status.toLowerCase() === "rejected"
			) {
				const reason =
					rejectionReason || "Please check your profile for details.";
				toast.error("Profile Rejected", {
					description: reason,
					duration: 7000,
				});
			}

			// Handle status change to info_requested
			if (
				previousStatus !== "info_requested" &&
				status.toLowerCase() === "info_requested"
			) {
				const request = infoRequest || "Additional information is required.";
				toast.info("Information Requested", {
					description: request,
					duration: 7000,
				});
			}

			// Handle status change to suspended
			if (
				previousStatus !== "suspended" &&
				status.toLowerCase() === "suspended"
			) {
				const reason = suspensionReason || "Your profile has been suspended.";
				toast.error("Profile Suspended", {
					description: reason,
					duration: 7000,
				});
			}

			// Handle status change from suspended/rejected back to pending (resubmission)
			if (
				(previousStatus === "suspended" || previousStatus === "rejected") &&
				status.toLowerCase() === "pending"
			) {
				toast.info("Profile Under Review", {
					description:
						"Your profile has been resubmitted and is now under review.",
					duration: 5000,
				});
			}

			previousStatusRef.current = status.toLowerCase();
		});

		socket.on("connect_error", (error) => {
			console.error("Socket connection error:", error);
		});

		socketRef.current = socket;

		// Cleanup only when provider unmounts (app-level)
		return () => {
			if (socket.connected) {
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [userId]); // Only run when userId changes

	// Get verification status from WebSocket first, then fall back to profile hook
	const getCreatorStatus = (): string => {
		if (realTimeStatus?.status) {
			return realTimeStatus.status.toLowerCase();
		}

		if (error) {
			return "error";
		}

		if (!creatorProfile) {
			return "missing";
		}

		const status =
			creatorProfile?.status ||
			creatorProfile?.verificationStatus ||
			(creatorProfile?.profileData?.status as string);

		return status?.toLowerCase() || "pending";
	};

	return (
		<CreatorStatusContext.Provider
			value={{
				creatorStatus: getCreatorStatus(),
				realTimeStatus,
				loading: loading && !realTimeStatus,
				error,
				isInitialized,
			}}
		>
			{children}
		</CreatorStatusContext.Provider>
	);
}

export function useCreatorStatus() {
	const context = useContext(CreatorStatusContext);
	if (!context) {
		throw new Error(
			"useCreatorStatus must be used within a CreatorStatusProvider"
		);
	}
	return context;
}
