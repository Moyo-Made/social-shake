"use client";

import { CheckCircle } from "lucide-react";

interface ApplicationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const ApplicationSuccessModal: React.FC<ApplicationSuccessModalProps> = ({
  isOpen,
  onClose,
  message = "Your submission has been received successfully!"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle size={48} className="text-green-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ApplicationSuccessModal;