import { useState, useEffect } from "react";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface BrandStatusNotificationProps {
  userId: string;
}

export default function BrandStatusNotification({ userId }: BrandStatusNotificationProps) {
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

  if (isLoading) return null;

  return (
    <div className="mb-6">
      {showApprovedMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
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

      {brandStatus === "missing" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brand Profile Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>You need to create a brand profile before creating contests or projects.</p>
            <div>
              <Link href="/brand/profile/create">
                <Button variant="outline" size="sm">Create Brand Profile</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {brandStatus === "pending" && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Brand Profile Pending Approval</AlertTitle>
          <AlertDescription>
            Your brand profile is currently under review. Once approved, you&apos;ll be able to create contests and projects.
            We&apos;ll notify you via email when your profile has been approved.
          </AlertDescription>
        </Alert>
      )}

      {brandStatus === "rejected" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brand Profile Needs Updates</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Your brand profile was not approved. Please review the feedback and update your profile.</p>
            <div>
              <Link href="/brand/dashboard/settings">
                <Button variant="outline" size="sm">Edit Brand Profile</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {brandStatus === "error" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Checking Brand Status</AlertTitle>
          <AlertDescription>
            We couldn&apos;t verify your brand profile status. Please try refreshing the page or contact support.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}