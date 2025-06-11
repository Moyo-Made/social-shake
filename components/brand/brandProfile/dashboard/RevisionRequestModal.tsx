import React, { useState } from "react";
import { X, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RevisionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (revisionNotes: string) => void;
  deliverable: {
   file_name: string;
    video_id: number;
  };
  order: {
    id: string;
    creator?: {
      name: string;
    } | null;
  };
  isSubmitting?: boolean;
}

const RevisionRequestModal: React.FC<RevisionRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  deliverable,
  order,
  isSubmitting = false,
}) => {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!revisionNotes.trim()) {
      setError("Please provide revision notes");
      return;
    }

    if (revisionNotes.trim().length < 10) {
      setError("Please provide more detailed revision notes (at least 10 characters)");
      return;
    }

    setError("");
    onSubmit(revisionNotes.trim());
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRevisionNotes("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <MessageSquare size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Request Revision
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Order #{order.id} • Video {deliverable.video_id}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Video Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span className="font-medium">Video:</span>
              <span>{deliverable.file_name}</span>
            </div>
            {order.creator && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Creator:</span>
                <span>{order.creator.name}</span>
              </div>
            )}
          </div>

          {/* Revision Notes Input */}
          <div className="mb-6">
            <label htmlFor="revision-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Revision Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="revision-notes"
              value={revisionNotes}
              onChange={(e) => {
                setRevisionNotes(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              placeholder="Please provide detailed feedback on what needs to be changed or improved in this video..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              rows={6}
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-gray-500">
                {revisionNotes.length}/1000 characters
              </div>
              {error && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle size={12} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next:</p>
                <ul className="space-y-1 text-xs">
                  <li>• The creator will be notified about the revision request</li>
                  <li>• They&apos;ll see your feedback and work on the changes</li>
                  <li>• You&apos;ll receive a new version once they resubmit</li>
                  <li>• Payment will be held until you approve the final version</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !revisionNotes.trim()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Requesting...
                </>
              ) : (
                <>
                  <MessageSquare size={16} />
                  Request Revision
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevisionRequestModal;