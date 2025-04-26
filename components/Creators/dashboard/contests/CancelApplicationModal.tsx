import { useState } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { AlertCircle, X } from "lucide-react";
import { getAuth } from "firebase/auth";

interface CancelApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contestId: string;
  onCancelSuccess: () => void;
}

export default function CancelApplicationModal({
  isOpen,
  onClose,
  contestId,
  onCancelSuccess,
}: CancelApplicationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();

  const handleCancelApplication = async () => {
    if (!contestId) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get the current user's ID token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to cancel an application");
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch("/api/contests/cancel-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel application");
      }

      // Successfully canceled application
      onCancelSuccess();
      onClose();
    } catch (err) {
      console.error("Error canceling application:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white px-6 py-5 rounded-lg font-satoshi">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="mb-1 font-semibold text-lg">Cancel Application?</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-500 font-normal">
		      Are you sure you want to cancel your application for this contest? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={16} />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-5">
          <DialogClose asChild>
            <button
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-normal text-gray-500 bg-white hover:bg-gray-50 mt-3 sm:mt-0"
              disabled={isSubmitting}
            >
              Keep Application
            </button>
          </DialogClose>
          <button
            onClick={handleCancelApplication}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Canceling...
              </>
            ) : (
				<div className="flex items-center">
					Yes, Cancel Application <span className="ml-2"><X size={16} /></span>
				</div>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}