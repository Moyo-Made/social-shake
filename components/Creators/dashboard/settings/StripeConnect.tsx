"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React from "react";

interface StripeConnectProps {
  userId?: string;
  redirectPath?: string;
  testMode?: boolean;
  onStatusChange?: (status: { connected: boolean; accountId?: string }) => void;
}

interface StripeStatus {
  connected: boolean;
  stripeAccountId?: string;
  testMode?: boolean;
  onboardingComplete?: boolean;
}

const StripeConnect: React.FC<StripeConnectProps> = ({ 
  userId, 
  redirectPath = "/creator/dashboard",
  testMode = true, // Set to true by default for development
  onStatusChange
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(testMode);

  const effectiveUserId = userId || currentUser?.uid;

  // Query for Stripe status
  const {
    data: stripeStatus,
    isLoading: statusLoading,
    error: statusError
  } = useQuery<StripeStatus>({
    queryKey: ['stripe-status', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) {
        throw new Error('No user ID available');
      }
      
      const response = await axios.get(`/api/creator/stripe-status?userId=${effectiveUserId}`);
      return {
        connected: response.data.connected || false,
        stripeAccountId: response.data.stripeAccountId,
        testMode: response.data.testMode || testMode,
        onboardingComplete: response.data.onboardingComplete || false
      };
    },
    enabled: !!effectiveUserId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation for creating Stripe account
  const createStripeMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) {
        throw new Error("You must be logged in to connect your Stripe account");
      }

      const response = await axios.post("/api/creator/create-stripe-account", {
        userId: effectiveUserId,
        email: currentUser?.email,
        redirectUrl: `${window.location.origin}${redirectPath}`,
        testMode: isTestMode
      });

      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe
      window.location.href = data.url;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      console.error("Error connecting Stripe:", err);
      setError(err?.response?.data?.message || "Failed to connect with Stripe. Please try again.");
    }
  });

  // Mutation for accessing Stripe dashboard
  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/creator/stripe-dashboard-link", {
        userId: effectiveUserId,
        stripeAccountId: stripeStatus?.stripeAccountId,
        testMode: isTestMode
      });

      return response.data;
    },
    onSuccess: (data) => {
      // Open the Stripe dashboard URL in a new tab
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => {
      console.error("Error accessing Stripe dashboard:", err);
      setError("Failed to access Stripe dashboard. Please try again.");
    }
  });

  // Effect to notify parent component of status changes
  React.useEffect(() => {
    if (stripeStatus && onStatusChange) {
      onStatusChange({
        connected: stripeStatus.connected,
        accountId: stripeStatus.stripeAccountId
      });
    }
  }, [stripeStatus, onStatusChange]);

  // Update test mode when stripe status is loaded
  React.useEffect(() => {
    if (stripeStatus?.testMode !== undefined) {
      setIsTestMode(stripeStatus.testMode);
    }
  }, [stripeStatus?.testMode]);

  const handleConnectStripe = () => {
    setError(null);
    createStripeMutation.mutate();
  };

  const handleDashboardAccess = () => {
    setError(null);
    dashboardMutation.mutate();
  };

  const handleRetryStatus = () => {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['stripe-status', effectiveUserId] });
  };

  // Show loading state while checking status
  if (statusLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="flex items-center justify-start p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-sm text-gray-600">Checking Stripe status...</span>
        </div>
      </div>
    );
  }

  // Show error state if status check failed
  if (statusError && !stripeStatus) {
    return (
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to check Stripe status. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={handleRetryStatus} variant="outline" className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  const stripeConnected = stripeStatus?.connected || false;
  const onboardingComplete = stripeStatus?.onboardingComplete || false;

  return (
    <div className="w-full max-w-md">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isTestMode && (
        <Alert className="mb-4 bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700">
              Running in Stripe Test Mode - No real payments will be processed
            </AlertDescription>
          </div>
        </Alert>
      )}

      {stripeConnected ? (
        <div className="space-y-4">
          <Alert className={`mb-4 ${onboardingComplete ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-2">
              {onboardingComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <AlertDescription className={onboardingComplete ? 'text-green-700' : 'text-yellow-700'}>
                {onboardingComplete 
                  ? `Your Stripe account is connected and ready to receive payments!${isTestMode ? ' (Test Mode)' : ''}`
                  : `Your Stripe account is connected but onboarding is not complete. Please finish the setup process.${isTestMode ? ' (Test Mode)' : ''}`
                }
              </AlertDescription>
            </div>
          </Alert>
          
          <Button
            onClick={handleDashboardAccess}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={dashboardMutation.isPending}
          >
            {dashboardMutation.isPending ? "Loading..." : "View Stripe Dashboard"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Connect your Stripe account to receive payouts when you win contests.
            {isTestMode && " (Currently in Test Mode)"}
          </p>
          
          <Button
            onClick={handleConnectStripe}
            className="w-full bg-[#635BFF] hover:bg-[#4F46E5] text-white flex items-center justify-center gap-2"
            disabled={createStripeMutation.isPending}
          >
            {createStripeMutation.isPending ? (
              "Connecting..."
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M33.3333 6.6665H6.66667C4.8 6.6665 3.33333 8.1665 3.33333 9.99984V29.9998C3.33333 31.8332 4.8 33.3332 6.66667 33.3332H33.3333C35.2 33.3332 36.6667 31.8332 36.6667 29.9998V9.99984C36.6667 8.1665 35.2 6.6665 33.3333 6.6665ZM20 24.9998C16.31 24.9998 13.3333 22.0232 13.3333 18.3332C13.3333 14.6432 16.31 11.6665 20 11.6665C23.69 11.6665 26.6667 14.6432 26.6667 18.3332C26.6667 22.0232 23.69 24.9998 20 24.9998Z" fill="white"/>
                </svg>
                Connect with Stripe {isTestMode ? "(Test)" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default StripeConnect;