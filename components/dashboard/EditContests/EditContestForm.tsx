"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useContestForm } from "@/components/dashboard/newContest/ContestFormContext";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import PrizeTimeline from "../newContest/PrizeTimeline";
import Requirements from "../newContest/Requirements";
import Basic from "../newContest/Basic";
import Review from "../newContest/Review";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function EditContestForm({ contestId }: { contestId: string }) {
  const router = useRouter();
  const { 
    formData, 
    saveDraft, 
    isLoading, 
  } = useContestForm();
  const [step, setStep] = useState(1);
  const [draftSuccess, setDraftSuccess] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Verify ownership when component loads
  useEffect(() => {
    const verifyOwnership = async () => {
      try {
        setIsVerifying(true);
        
        // Check if user is authenticated
        const user = auth.currentUser;
        if (!user) {
          setSubmissionError("You must be logged in to edit a contest");
          setHasPermission(false);
          setIsVerifying(false);
          return;
        }

        // Get contest document from Firestore
        const contestRef = doc(db, "contests", contestId);
        const contestDoc = await getDoc(contestRef);

        if (!contestDoc.exists()) {
          setSubmissionError("Contest not found");
          setHasPermission(false);
          setIsVerifying(false);
          return;
        }

        const contestData = contestDoc.data();
        
        // Check if current user is the creator of the contest
        if (contestData.userId !== user.uid) {
          setSubmissionError("You don't have permission to edit this contest");
          setHasPermission(false);
          setIsVerifying(false);
          return;
        }

        // User has permission
        setHasPermission(true);
        setIsVerifying(false);
        
      } catch (error) {
        console.error("Error verifying contest ownership:", error);
        setSubmissionError("Failed to verify contest ownership");
        setHasPermission(false);
        setIsVerifying(false);
      }
    };

    verifyOwnership();
  }, [contestId]);

  // Save current state when navigating between steps
  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  // Save draft with updated contest ID
  const handleSaveDraft = async () => {
    try {
      // Verify permission before proceeding
      if (!hasPermission) {
        setSubmissionError("You don't have permission to edit this contest");
        return;
      }

      setSubmissionError(null);
      setDraftSuccess(false);
      
      // Pass the contestId to the saveDraft function
      const result = await saveDraft();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to save draft");
      }
      
      // Show success message
      setDraftSuccess(true);
      
      // Automatically hide the success message after 5 seconds
      setTimeout(() => setDraftSuccess(false), 5000);
      
    } catch (error) {
      console.error("Draft save error:", error);
      setSubmissionError(
        error instanceof Error 
          ? error.message 
          : "An error occurred while saving draft"
      );
    }
  };

  const handleSubmit = async () => {
    try {
      // Verify permission before proceeding
      if (!hasPermission) {
        setSubmissionError("You don't have permission to edit this contest");
        return;
      }

      setSubmissionError(null);
      
      // Validate necessary fields
      if (!formData.basic.contestName) {
        setSubmissionError("Please provide a contest name");
        setStep(1); // Go to basic tab
        return;
      }
      
      const formDataForSubmission = new FormData();
      
      // Add the contestId to the form data
      formDataForSubmission.append("contestId", contestId);
      
      // Add current user ID to form data
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to update a contest");
      }
      formDataForSubmission.append("userId", user.uid);
      
      // Add the complex objects from your state, properly stringified
      formDataForSubmission.append("basic", JSON.stringify(formData.basic));
      formDataForSubmission.append("requirements", JSON.stringify(formData.requirements));
      formDataForSubmission.append("prizeTimeline", JSON.stringify(formData.prizeTimeline));
      formDataForSubmission.append("contestType", JSON.stringify(formData.contestType));
      formDataForSubmission.append("incentives", JSON.stringify(formData.incentives));
      
      // Add the thumbnail file if it exists
      if (formData.basic.thumbnail instanceof File) {
        formDataForSubmission.append("thumbnail", formData.basic.thumbnail);
      }
      
      // Submit using PUT method since we're updating
      const response = await fetch(`/api/contests`, {
        method: "PUT",
        body: formDataForSubmission
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update contest");
      }
      
      // Show success message
      toast.success("Contest updated successfully");
      
      // Redirect to dashboard
      router.push("/dashboard/contests");
      
    } catch (err) {
      console.error("Submission error:", err);
      setSubmissionError(err instanceof Error ? err.message : "Failed to update contest");
    }
  };

  // Dynamic component rendering based on step
  const renderStepComponent = () => {
    switch (step) {
      case 1: return <Basic />;
      case 2: return <Requirements />;
      case 3: return <PrizeTimeline />;
      case 4: return <Review />;
      default: return <Basic />;
    }
  };

  // Show loading state while verifying permissions
  if (isVerifying) {
    return (
      <div className="max-w-[44rem] mx-auto p-8 flex justify-center items-center">
        <p className="text-gray-500">Verifying contest ownership...</p>
      </div>
    );
  }

  // Show error message if no permission
  if (!hasPermission && !isVerifying) {
    return (
      <div className="max-w-[44rem] mx-auto p-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submissionError || "You don't have permission to edit this contest"}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push("/dashboard/contests")}
          className="mt-4 bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white text-base"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[44rem] mx-auto">
      {/* Navigation Tabs - Styled to match ContestForm */}
      <nav className="flex pb-6">
        {["Basics", "Requirements", "Incentives & Timeline", "Review"].map(
          (tab, index) => (
            <div key={index} className="flex-1 whitespace-nowrap relative">
              <button
                className={`w-full p-3 text-center ${
                  step === index + 1 ? "text-orange-500" : "text-gray-500"
                }`}
                onClick={() => handleStepChange(index + 1)}
                disabled={isLoading}
              >
                <div className="flex items-center justify-center gap-1">
                  <Image
                    src={
                      step === index + 1
                        ? "/icons/orange-check.svg"
                        : "/icons/gray-check.svg"
                    }
                    alt="Check"
                    width={25}
                    height={25}
                  />
                  <span className="text-base">{tab}</span>
                </div>
              </button>
              {step === index + 1 && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FD5C02] rounded-full"></div>
              )}
            </div>
          )
        )}
      </nav>

      {/* Draft Status Indicator */}
      {formData?.status === "draft" && (
        <Alert variant="default" className="mb-4 bg-gray-100 border border-gray-300">
          <div className="flex items-center gap-2">
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium">
              DRAFT
            </span>
            <AlertDescription>
              You&apos;re working on a draft contest. Submit when ready to publish.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Error Message */}
      {submissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      {/* Draft Success Message */}
      {draftSuccess && (
        <Alert variant="default" className="mb-4 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              Draft saved successfully! View in <a href="/dashboard" className="underline font-medium">dashboard</a>.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Step Content */}
      <div className="mb-6">
        {renderStepComponent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {/* Save Draft Button */}
        <div className="relative">
          <Button
            onClick={handleSaveDraft}
            className="mt-4 bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white text-base"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Draft"}
          </Button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              onClick={() => handleStepChange(step - 1)}
              className="mt-4 bg-[#FC52E4] hover:bg-[#e061cf] px-4 py-2 text-white text-base"
              disabled={isLoading}
            >
              ← Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              onClick={() => handleStepChange(step + 1)}
              className="mt-4 bg-[#FD5C02] hover:bg-orange-600 text-white text-base py-2 font-normal"
              disabled={isLoading}
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="mt-4 bg-[#000] hover:bg-[#141414] text-white text-base py-2 font-normal"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Contest"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}