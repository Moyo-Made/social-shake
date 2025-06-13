import React from "react";
import { Briefcase, Check, X, DollarSign, Calendar, FileText, CheckCircle, XCircle } from "lucide-react";
import { NotificationData } from "@/types/notifications";

interface ProjectDetails {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  deliverables: string[];
  timeline: {
    startDate: string;
    endDate: string;
    duration: string;
  };
  budget: {
    amount: number;
    currency: string;
    paymentType: string;
  };
  brand: {
    name: string;
    logo?: string;
  };
  categories: string[];
  targetAudience?: string;
}

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectDetails: ProjectDetails | null;
  isLoading: boolean;
  onAccept: () => void;
  onReject: () => void;
  processingAccept: boolean;
  processingReject: boolean;
  showActions?: boolean; // Optional prop to show/hide action buttons
  acceptButtonText?: string;
  rejectButtonText?: string;
  notification: NotificationData | null;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  projectDetails,
  isLoading,
  onAccept,
  onReject,
  processingAccept,
  processingReject,
  showActions = true,
  acceptButtonText = "Accept & Join Project",
  rejectButtonText = "Decline",
  notification,
}) => {
  const formatText = (text: string) => {
    return text
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const projectInvitationState = notification?.responded ? notification?.response : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto max-w-3xl mx-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Loading project details...</p>
            </div>
          ) : projectDetails ? (
            <>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Briefcase className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {projectDetails.title}
                    </h2>
                    <p className="text-sm text-gray-600">
                      by {projectDetails.brand.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {/* Project Overview */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Project Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {projectDetails.description}
                  </p>
                </div>

                {/* Key Details Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Timeline */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      Timeline
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      Duration: {projectDetails.timeline.duration}
                    </p>
                  </div>

                  {/* Budget */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      Compensation
                    </h4>
                    <p className="text-lg font-bold text-green-600">
                      {projectDetails.budget.currency}{projectDetails.budget.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {projectDetails.budget.paymentType}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                {projectDetails.requirements.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Requirements</h4>
                    <ul className="space-y-2">
                      {projectDetails.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-700 capitalize">{formatText(req)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Deliverables */}
                {projectDetails.deliverables.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Deliverables</h4>
                    <ul className="space-y-2">
                      {projectDetails.deliverables.map((deliverable, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-700">{deliverable}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Categories */}
                {projectDetails.categories.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {projectDetails.categories.map((category, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                {projectInvitationState === 'accepted' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Project Accepted</span>
                  </div>
                ) : projectInvitationState === 'rejected' ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Project Rejected</span>
                  </div>
                ) : showActions ? (
                  <>
                    <div className="text-sm text-gray-600">
                      Ready to join this project?
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onReject}
                        disabled={processingReject}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {processingReject ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        {rejectButtonText}
                      </button>
                      <button
                        onClick={onAccept}
                        disabled={processingAccept}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {processingAccept ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {acceptButtonText}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600">
                    Project details
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-red-500">
              Failed to load project details. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;