"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function ToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
      // This creates a cleaner URL without the toast parameters
      const currentUrl = window.location.pathname;
      window.history.replaceState({}, "", currentUrl);
    }
  }, [searchParams, router]);
  
  // This component doesn't render anything, it just handles the toast logic
  return null;
}