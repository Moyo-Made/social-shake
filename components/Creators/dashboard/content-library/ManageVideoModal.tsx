"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  price: number;
  licenseType: string;
  tags: string[];
  views: number;
  purchases: number;
  status: "active" | "draft" | "archived";
  uploadedAt: string;
  createdBy: string;
  fileName: string;
  fileSize: number;
}

interface VideoManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onUpdate: (videoId: string, updates: Partial<Video>) => void;
  onDelete: (videoId: string) => void;
}

export default function VideoManageModal({
  isOpen,
  onClose,
  video,
  onUpdate,
  onDelete,
}: VideoManageModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    licenseType: "standard",
    tags: "",
    status: "active" as "active" | "draft" | "archived",
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title,
        description: video.description,
        price: video.price,
        licenseType: video.licenseType,
        tags: video.tags.join(", "),
        status: video.status,
      });
    }
  }, [video]);

  if (!isOpen || !video) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price,
        licenseType: formData.licenseType,
        tags: formData.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        status: formData.status,
      };

      await onUpdate(video.id, updates);
      onClose();
    } catch (error) {
      console.error("Error updating video:", error);
      alert("Failed to update video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(video.id);
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Failed to delete video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Video
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Price and License */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Type *
              </label>
              <Select
                value={formData.licenseType}
                onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="standard">Standard License</SelectItem>
                  <SelectItem value="extended">Extended License</SelectItem>
                  <SelectItem value="exclusive">Exclusive License</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "draft" | "archived") => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="nature, landscape, mountains"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Video Stats (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Video Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Views:</span>
                <span className="ml-2 font-medium">{video.views.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Purchases:</span>
                <span className="ml-2 font-medium">{video.purchases}</span>
              </div>
              <div>
                <span className="text-gray-500">File Size:</span>
                <span className="ml-2 font-medium">
                  {(video.fileSize / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div>
                <span className="text-gray-500">Uploaded:</span>
                <span className="ml-2 font-medium">
                  {new Date(video.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Video
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Video?
              </h3>
              <p className="text-gray-600 mb-4">
                This action cannot be undone. The video file and all associated data will be permanently deleted.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}