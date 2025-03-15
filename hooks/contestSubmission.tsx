"use client";

import { ContestFormData } from "@/types/contestFormData";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext"

// This hook handles the submission of contest form data to Firestore
export const useContestSubmission = () => {
  const { user } = useAuth(); // Get the current authenticated user
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert File to base64 for storage
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Process form data and prepare it for submission
  const prepareFormData = async (
    formData: ContestFormData, 
    isDraft: boolean = false
  ): Promise<ContestFormData & { brandEmail?: string; userId?: string; isDraft?: boolean }> => {
    // Create a deep copy of the form data
    const processedData = JSON.parse(JSON.stringify(formData));
    
    // Handle thumbnail if it exists
    if (formData.basic.thumbnail) {
      try {
        const base64Thumbnail = await fileToBase64(formData.basic.thumbnail);
        processedData.basic.thumbnail = base64Thumbnail;
      } catch (error) {
        console.error("Error converting thumbnail to base64:", error);
        processedData.basic.thumbnail = null;
      }
    }
    
    // Add brand email from authenticated user
    processedData.brandEmail = user?.email;
    
    // Add user ID for drafts
    if (isDraft && user?.uid) {
      processedData.userId = user.uid;
      processedData.isDraft = true;
    }
    
    return processedData;
  };

  // Submit the contest to Firestore
  const submitContest = useCallback(
    async (formData: ContestFormData): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!user?.email) {
          throw new Error("User not authenticated");
        }

        const processedData = await prepareFormData(formData);
        
        const response = await fetch("/api/contests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to submit contest");
        }

        // Clear the draft from localStorage on successful submission
        localStorage.removeItem("contestFormDraft");
        
        setIsLoading(false);
        return { success: true, data: result.data };
      } catch (error) {
        console.error("Error submitting contest:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        setIsLoading(false);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "An unknown error occurred" 
        };
      }
    },
    [user]
  );

  // Save draft to server
  const saveDraftToServer = useCallback(
    async (formData: ContestFormData): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!user?.email || !user?.uid) {
          throw new Error("User not authenticated");
        }

        const processedData = await prepareFormData(formData, true);
        
        const response = await fetch("/api/contests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save draft");
        }
        
        setIsLoading(false);
        return { success: true, data: result.data };
      } catch (error) {
        console.error("Error saving draft:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        setIsLoading(false);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "An unknown error occurred" 
        };
      }
    },
    [user]
  );

  // Get saved draft from server
  const getSavedDraft = useCallback(async () => {
    try {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(`/api/contests?userId=${user.uid}&draft=true`);
      const draft = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch draft");
      }

      return { success: true, data: draft.data, exists: draft.exists };
    } catch (error) {
      console.error("Error fetching draft:", error);
      return { 
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      };
    }
  }, [user]);

  // Get contests for the current brand
  const getBrandContests = useCallback(async () => {
    try {
      if (!user?.email) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(`/api/contests?brandEmail=${user.email}`);
      const contests = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch contests");
      }

      return { success: true, data: contests };
    } catch (error) {
      console.error("Error fetching contests:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      };
    }
  }, [user]);

  // Get a specific contest by ID
  const getContestById = useCallback(async (contestId: string) => {
    try {
      const response = await fetch(`/api/contests?contestId=${contestId}`);
      const contest = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch contest");
      }

      return { success: true, data: contest };
    } catch (error) {
      console.error("Error fetching contest:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      };
    }
  }, []);

  return {
    submitContest,
    saveDraftToServer,
    getSavedDraft,
    getBrandContests,
    getContestById,
    isLoading,
    error
  };
};