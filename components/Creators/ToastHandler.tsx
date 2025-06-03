"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import io, { Socket } from "socket.io-client";

export default function ToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const hasShownApprovalToastRef = useRef(false);
  const previousStatusRef = useRef<string | null>(null);
  
  // Handle URL-based toast messages (existing functionality)
  useEffect(() => {
    const toastType = searchParams.get("toast");
    const message = searchParams.get("message");
    
    if (toastType && message) {
      // Show toast based on type
      if (toastType === "success") {
        toast.success(message);
      } else if (toastType === "error") {
        toast.error(message);
      } else {
        toast(message); // Default toast
      }
      
      // Remove toast parameters from URL to prevent showing the same toast multiple times on refresh
      const currentUrl = window.location.pathname;
      window.history.replaceState({}, "", currentUrl);
    }
  }, [searchParams, router]);

  // Set up WebSocket connection for verification status updates
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Check if approval toast has already been shown in this session
    const approvalToastShown = sessionStorage.getItem(`approval_toast_${currentUser.uid}`);
    if (approvalToastShown) {
      hasShownApprovalToastRef.current = true;
    }

    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001", {
      transports: ["polling", "websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      
      // Subscribe to user-specific updates (this will also send current verification status)
      socket.emit("subscribe-user", currentUser.uid);
      
      // Also subscribe specifically to verification updates
      socket.emit("subscribe-verification", currentUser.uid);
    });

    socket.on("verification-status-update", (data: {
      status: string;
      rejectionReason?: string;
      infoRequest?: string;
      suspensionReason?: string;
      updatedAt: string;
    }) => {
      const { status, rejectionReason, infoRequest, suspensionReason } = data;
      
      // Initialize previous status on first update if not set
      if (previousStatusRef.current === null) {
        previousStatusRef.current = status;
        return;
      }
      
      // Handle status change to approved
      if (
        previousStatusRef.current !== "approved" && 
        status === "approved" &&
        !hasShownApprovalToastRef.current
      ) {
        toast.success("🎉 Your creator profile has been approved!", {
          description: "You can now participate in projects and contests!",
          duration: 5000,
        });
        
        hasShownApprovalToastRef.current = true;
        sessionStorage.setItem(`approval_toast_${currentUser.uid}`, "true");
      }
      
      // Handle status change to rejected
      if (previousStatusRef.current !== "rejected" && status === "rejected") {
        const reason = rejectionReason || "Please check your profile for details.";
        toast.error("Profile Rejected", {
          description: reason,
          duration: 7000,
        });
      }
      
      // Handle status change to info_requested
      if (previousStatusRef.current !== "info_requested" && status === "info_requested") {
        const request = infoRequest || "Additional information is required.";
        toast.info("Information Requested", {
          description: request,
          duration: 7000,
        });
      }
      
      // Handle status change to suspended
      if (previousStatusRef.current !== "suspended" && status === "suspended") {
        const reason = suspensionReason || "Your profile has been suspended.";
        toast.error("Profile Suspended", {
          description: reason,
          duration: 7000,
        });
      }
      
      // Handle status change from suspended/rejected back to pending (resubmission)
      if (
        (previousStatusRef.current === "suspended" || previousStatusRef.current === "rejected") && 
        status === "pending"
      ) {
        toast.info("Profile Under Review", {
          description: "Your profile has been resubmitted and is now under review.",
          duration: 5000,
        });
      }
      
      // Update previous status
      previousStatusRef.current = status;
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [currentUser?.uid]);

  // Handle page visibility changes to reconnect if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.uid) {
        // Reconnect socket if disconnected when coming back to tab
        if (socketRef.current && !socketRef.current.connected) {
          console.log("Reconnecting socket on visibility change");
          socketRef.current.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.uid]);
  
  // This component doesn't render anything, it just handles the toast logic
  return null;
}