import { useState } from "react";

interface UseSparkCodeSubmissionProps {
  submissionId: string;
}

export function useSparkCodeSubmission({ submissionId }: UseSparkCodeSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
    setError(null);
    setSuccess(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (sparkCode: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/project-submissions/spark-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sparkCode,
          submissionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit spark code");
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isModalOpen,
    error,
    success,
    openModal,
    closeModal,
    handleSubmit,
  };
}