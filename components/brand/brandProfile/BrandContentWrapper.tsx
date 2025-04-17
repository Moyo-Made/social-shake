"use client"

import { ReactNode, useState, useEffect } from "react";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle, X, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface BrandContentWrapperProps {
  userId: string;
  children: ReactNode;
  pageType?: "dashboard" | "contests" | "projects";
}

export default function BrandContentWrapper({ 
  userId, 
  children, 
  pageType = "dashboard" 
}: BrandContentWrapperProps) {
  const [brandStatus, setBrandStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApprovedMessage, setShowApprovedMessage] = useState(false);

  useEffect(() => {
    async function checkBrandStatus() {
      if (!userId) return;
      
      try {
        const brandsRef = collection(db, "brandProfiles");
        const q = query(brandsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // No brand profile found
          setBrandStatus("missing");
        } else {
          const brandData = querySnapshot.docs[0].data();
          const status = brandData.status || "pending";
          setBrandStatus(status);
          
          // Check if we should show the approved message
          if (status === "approved") {
            // Check local storage to see if we've already shown this message
            const key = `brand-approval-shown-${userId}`;
            const alreadyShown = localStorage.getItem(key);
            
            if (!alreadyShown) {
              setShowApprovedMessage(true);
              
              // Set timeout to hide after 10 seconds
              setTimeout(() => {
                setShowApprovedMessage(false);
              }, 10000);
              
              // Mark as shown in localStorage so it doesn't appear again
              localStorage.setItem(key, "true");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching brand status:", error);
        setBrandStatus("error");
      } finally {
        setIsLoading(false);
      }
    }

    checkBrandStatus();
  }, [userId]);

  const dismissApprovedMessage = () => {
    setShowApprovedMessage(false);
  };

  if (isLoading) {
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
        return "create contests";
      case "projects":
        return "manage projects";
      default:
        return "access your dashboard features";
    }
  };

  // Show the appropriate message based on brand status
  if (brandStatus !== "approved") {
    return (
      <div className="w-fit">
        {showApprovedMessage && (
          <Alert className="bg-green-50 border-green-200 text-green-800 mb-6 ">
            <div className="flex justify-between w-full">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <div>
                  <AlertTitle className="text-green-800 font-medium">Brand Profile Approved!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Congratulations! Your brand profile has been approved. You can now create contests and projects.
                  </AlertDescription>
                </div>
              </div>
              <button 
                onClick={dismissApprovedMessage} 
                className="text-green-600 hover:text-green-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </Alert>
        )}

        <div className="bg-white border rounded-lg shadow-sm p-8 text-center">
          {brandStatus === "missing" && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <FileQuestion className="h-16 w-16 text-orange-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Brand Profile Required</h2>
              <p className="text-gray-600 mb-6">
                You need to create a brand profile before you can {getPageTypeText()}.
              </p>
              <Link href="/brand/signup">
                <Button className="w-full">Create Brand Profile</Button>
              </Link>
            </div>
          )}

          {brandStatus === "pending" && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <Clock className="h-16 w-16 text-orange-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Profile Under Review</h2>
              <p className="text-gray-600 mb-2">
                Your brand profile is currently being reviewed by our team.
              </p>
              <p className="text-gray-600 mb-4">
                Once approved, you&apos;ll be able to {getPageTypeText()}. We&apos;ll notify you via email when your profile has been approved.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-orange-500 h-2 rounded-full w-1/2"></div>
              </div>
              <p className="text-sm text-gray-500">Review in progress</p>
            </div>
          )}

          {brandStatus === "rejected" && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Profile Needs Updates</h2>
              <p className="text-gray-600 mb-6">
                Your brand profile was not approved. Please review the feedback and update your profile to {getPageTypeText()}.
              </p>
              <Link href="/brand/dashboard/settings">
                <Button variant="destructive" className="w-full">Edit Brand Profile</Button>
              </Link>
            </div>
          )}

          {brandStatus === "error" && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Error Checking Brand Status</h2>
              <p className="text-gray-600 mb-6">
                We couldn&apos;t verify your brand profile status. Please try refreshing the page or contact support.
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

  // If brand is approved, show the content with possible approval message
  return (
    <div className="w-full">
      {showApprovedMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
          <div className="flex justify-between w-full">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <AlertTitle className="text-green-800 font-medium">Brand Profile Approved!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Congratulations! Your brand profile has been approved. You can now create contests and projects.
                </AlertDescription>
              </div>
            </div>
            <button 
              onClick={dismissApprovedMessage} 
              className="text-green-600 hover:text-green-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </Alert>
      )}
      {children}
    </div>
  );
}