"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Basic from "./Basic";
import Requirements from "./Requirements";
import PrizeTimeline from "./PrizeTimeline";
import Review from "./Review";
import { MdOutlinePayment } from "react-icons/md";
import { ContestFormProvider, useContestForm } from "./ContestFormContext";
import { CheckCircle2, AlertCircle } from "lucide-react";
import GMVPrizeTimeline from "./GMVPrizeTimeline";
import GMVReview from "./GMVReview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";

// Define stripePromise
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
);

const ContestFormContent = () => {
  const [step, setStep] = useState(1);
  const { user } = useAuth();

  const { 
    formData, 
    saveDraft, 
    saveCurrentState,
    isLoading,
    validateStep,
    validateAllSteps
  } = useContestForm();
  
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [draftSuccess, setDraftSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    prizeTimeline,
    basic: { contestType = "Leaderboard" },
  } = formData;

  // Define validation rules for each step
  useEffect(() => {
    // Step 1: Basic validation
    validateStep("basic", () => {
      const { contestName, industry, description } = formData.basic;
      
      if (!contestName || contestName.trim() === "") {
        setValidationError("Contest name is required");
        return false;
      }
      
      if (!industry || industry.trim() === "") {
        setValidationError("Industry is required");
        return false;
      }
      
      if (!description || description.trim() === "") {
        setValidationError("Contest description is required");
        return false;
      }
      
      return true;
    });

    // Step 2: Requirements validation
    validateStep("requirements", () => {
      const { whoCanJoin, duration, videoType, script } = formData.requirements;
      
      if (!whoCanJoin || whoCanJoin.trim() === "") {
        setValidationError("Please specify who can join the contest");
        return false;
      }
      
      if (!duration || duration.trim() === "") {
        setValidationError("Video duration is required");
        return false;
      }
      
      if (!videoType || videoType.trim() === "") {
        setValidationError("Video type is required");
        return false;
      }
      
      if (videoType === "client-script" && (!script || script.trim() === "")) {
        setValidationError("Script is required for client-script video type");
        return false;
      }
      
      return true;
    });

    // Step 3: Prize & Timeline validation
    validateStep("prizeTimeline", () => {
      const { totalBudget, winnerCount, positions, startDate, endDate } = formData.prizeTimeline;
      
      if (!totalBudget || totalBudget <= 0) {
        setValidationError("Total budget must be greater than 0");
        return false;
      }
      
      if (!winnerCount || winnerCount <= 0) {
        setValidationError("Winner count must be at least 1");
        return false;
      }
      
      if (!positions || positions.length === 0) {
        setValidationError("Prize positions must be defined");
        return false;
      }
      
      if (!startDate) {
        setValidationError("Start date is required");
        return false;
      }
      
      if (!endDate) {
        setValidationError("End date is required");
        return false;
      }
      
      // Check if end date is after start date
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        setValidationError("End date must be after start date");
        return false;
      }
      
      return true;
    });

    // Step 4: Review (no specific validation needed as it's just a review)
    validateStep("review", () => true);
    
  }, [formData, validateStep]);

  // Save current state when navigating between steps
  const handleStepChange = (newStep: number) => {
    // Reset validation error
    setValidationError(null);
    
    // If moving forward, validate the current step
    if (newStep > step) {
      let validationResult = false;
      
      // Validate based on current step
      switch (step) {
        case 1:
          validationResult = validateStepOne();
          break;
        case 2:
          validationResult = validateStepTwo();
          break;
        case 3:
          validationResult = validateStepThree();
          break;
        default:
          validationResult = true;
          break;
      }
      
      // Don't proceed if validation fails
      if (!validationResult) return;
    }
    
    // Save the current state
    saveCurrentState();
    
    // Then change the step
    setStep(newStep);
  };

  // Validate Step 1: Basic
  const validateStepOne = () => {
    const { contestName, industry, description } = formData.basic;
    
    if (!contestName || contestName.trim() === "") {
      setValidationError("Contest name is required");
      return false;
    }
    
    if (!industry || industry.trim() === "") {
      setValidationError("Industry is required");
      return false;
    }
    
    if (!description || description.trim() === "") {
      setValidationError("Contest description is required");
      return false;
    }
    
    return true;
  };

  // Validate Step 2: Requirements
  const validateStepTwo = () => {
    const { whoCanJoin, duration, videoType, script } = formData.requirements;
    
    if (!whoCanJoin || whoCanJoin.trim() === "") {
      setValidationError("Please specify who can join the contest");
      return false;
    }
    
    if (!duration || duration.trim() === "") {
      setValidationError("Video duration is required");
      return false;
    }
    
    if (!videoType || videoType.trim() === "") {
      setValidationError("Video type is required");
      return false;
    }
    
    if (videoType === "client-script" && (!script || script.trim() === "")) {
      setValidationError("Script is required for client-script video type");
      return false;
    }
    
    return true;
  };

  // Validate Step 3: Prize & Timeline
  const validateStepThree = () => {
    const { totalBudget, winnerCount, positions, startDate, endDate } = formData.prizeTimeline;
    
    if (!totalBudget || totalBudget <= 0) {
      setValidationError("Total budget must be greater than 0");
      return false;
    }
    
    if (!winnerCount || winnerCount <= 0) {
      setValidationError("Winner count must be at least 1");
      return false;
    }
    
    if (!positions || positions.length === 0) {
      setValidationError("Prize positions must be defined");
      return false;
    }
    
    if (!startDate) {
      setValidationError("Start date is required");
      return false;
    }
    
    if (!endDate) {
      setValidationError("End date is required");
      return false;
    }
    
    // Check if end date is after start date
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setValidationError("End date must be after start date");
      return false;
    }
    
    return true;
  };

  // On component mount, try to restore previously saved step from sessionStorage
  useEffect(() => {
    const savedStep = sessionStorage.getItem("contestFormStep");
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
  }, []);

  // Save current step to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("contestFormStep", step.toString());
  }, [step]);

  // Automatically hide the success message after 5 seconds
  useEffect(() => {
    if (draftSuccess) {
      const timer = setTimeout(() => {
        setDraftSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [draftSuccess]);

  const handleSubmit = async () => {
    try {
      setSubmissionError(null);
      setValidationError(null);

      if (!user?.email) {
        setSubmissionError("You must be logged in to submit a contest");
        return;
      }

      // Validate all steps before submission
      if (!validateAllSteps()) {
        setValidationError("Please complete all required fields before submitting");
        return;
      }

      // Save current state before submission
      saveCurrentState();
      
      // Rest of the payment flow remains the same
      const paymentFormData = new FormData();
      
      // Add all form data properties
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'basic' || key === 'requirements' || key === 'prizeTimeline' || key === 'incentives') {
          paymentFormData.append(key, JSON.stringify(value));
        } else {
          paymentFormData.append(key, String(value));
        }
      });
      
      // Add user data
      paymentFormData.append("userId", user.uid);
      paymentFormData.append("brandEmail", user.email);
      paymentFormData.append("amount", prizeTimeline.totalBudget.toString());
      
      // Create a payment intent record in Firebase
      const paymentResponse = await axios.post("/api/create-payment-intent", paymentFormData);
      
      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.error || "Failed to initiate payment");
      }
      
      const { paymentId } = paymentResponse.data;
      
      // Step 2: Initialize Stripe checkout with the payment ID
      const stripe = await stripePromise;
      
      if (!stripe) {
        setSubmissionError("Stripe is not initialized. Please try again later.");
        return;
      }
      
      // Create a checkout session
      const response = await axios.post("/api/create-checkout-session", {
        amount: prizeTimeline.totalBudget,
        paymentId: paymentId,
        contestTitle: formData.basic.contestName || "Contest",
        userEmail: user.email,
        userId: user.uid
      });

      const { sessionId } = response.data;

      // Redirect to Stripe checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error("Error redirecting to checkout:", error);
        setSubmissionError("Payment initiation failed. Please try again.");
      }

      // On success, clear saved step
      sessionStorage.removeItem("contestFormStep");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "An error occurred during submission"
      );
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSubmissionError(null);
      setDraftSuccess(false);

      if (!user?.email) {
        setSubmissionError("You must be logged in to save a draft");
        return;
      }

      // Save current state
      saveCurrentState();

      // Save draft to Firestore using the updated saveDraft method
      const result = await saveDraft();

      if (!result.success) {
        throw new Error(result.error || "Failed to save draft");
      }

      // Show success message
      setDraftSuccess(true);
    } catch (error) {
      console.error("Draft save error:", error);
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "An error occurred while saving draft"
      );
    }
  };

  // Dynamic component rendering based on contest type and step
  const renderStepComponent = () => {
    if (contestType === "Leaderboard") {
      switch (step) {
        case 1:
          return <Basic />;
        case 2:
          return <Requirements />;
        case 3:
          return <PrizeTimeline />;
        case 4:
          return <Review />;
        default:
          return <Basic />;
      }
    } else {
      switch (step) {
        case 1:
          return <Basic />;
        case 2:
          return <Requirements />;
        case 3:
          return <GMVPrizeTimeline />;
        case 4:
          return <GMVReview />;
        default:
          return <Basic />;
      }
    }
  };

  return (
    <div className="max-w-[48rem] mx-auto">
      {/* Navigation Tabs */}
      <nav className="grid grid-cols-4 gap-5 pb-5 pt-5">
        {["Basics", "Requirements", "Incentives & Timeline", "Review"].map(
          (tab, index) => (
            <div key={index} className="whitespace-nowrap relative">
              <button
                className={`pb-2 ${
                  index + 1 <= step ? "text-orange-500" : "text-gray-500"
                }`}
                onClick={() => handleStepChange(index + 1)}
                disabled={isLoading}
              >
                <div className="flex items-start gap-1">
                  <Image
                    src={
                      index + 1 <= step
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
              {index + 1 <= step ? (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FD5C02] rounded-full" />
              ) : (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-300 rounded-full" />
              )}
            </div>
          )
        )}
      </nav>

      {/* Draft Status Indicator */}
      {formData?.status === "draft" && (
        <Alert
          variant="default"
          className="mb-4 bg-gray-100 border border-gray-300"
        >
          <div className="flex items-center gap-2">
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium">
              DRAFT
            </span>
            <AlertDescription>
              You&apos;re working on a draft contest. Submit when ready to
              publish.
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

      {/* Validation Error Message */}
      {validationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Draft Success Message */}
      {draftSuccess && (
        <Alert
          variant="default"
          className="mb-4 bg-green-50 border border-green-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              Draft saved successfully! View in{" "}
              <a href="/dashboard" className="underline font-medium">
                dashboard
              </a>
              .
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Step Content */}
      <div className="">
        <div className="">{renderStepComponent()}</div>
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
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  <MdOutlinePayment size={30} /> Pay $
                  {prizeTimeline.totalBudget.toLocaleString()}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ContestForm() {
  const { user } = useAuth();

  return (
    <ContestFormProvider userId={user?.uid}>
      <ContestFormContent />
    </ContestFormProvider>
  );
}