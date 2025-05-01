import { Input } from "@/components/ui/input";
import React, { useState } from "react";

interface SparkCodeModalProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (sparkCode: string) => Promise<void>;
}

const SparkCodeModal: React.FC<SparkCodeModalProps> = ({
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [sparkCode, setSparkCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the spark code
    if (!sparkCode.trim()) {
      setError("Spark code is required");
      return;
    }
    
    try {
      await onSubmit(sparkCode);
      // If successful, close the modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit spark code");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-lg my-8 relative">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-black text-xl font-bold text-center mb-1">
            Submit Spark Code
          </h2>
          <p className="text-gray-500 text-center mb-6">
            Please enter the spark code for your submission.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Spark Code */}
            <div className="mb-4">
              <label htmlFor="sparkCode" className="block text-start text-black text-base font-medium mb-1">
                Spark Code
              </label>
              <Input
                id="sparkCode"
                type="text"
                value={sparkCode}
                onChange={(e) => {
                  setSparkCode(e.target.value);
                  setError(null); // Clear error when input changes
                }}
                placeholder="Enter Spark Code"
                className={`w-full px-3 py-2 border ${
                  error ? "border-red-500" : "border-gray-300"
                } rounded-md`}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 ${
                isSubmitting
                  ? "bg-orange-400"
                  : "bg-orange-500 hover:bg-orange-600"
              } text-white rounded-md transition-colors`}
            >
              {isSubmitting ? "Submitting..." : "Submit Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SparkCodeModal;