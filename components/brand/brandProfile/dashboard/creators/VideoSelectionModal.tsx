import React, { useState, useEffect } from 'react';
import { X, Play, Clock, Eye, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  purchased: boolean;
}

interface VideoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: Video[];
  packageType: string;
  packagePrice: number;
  videoCount: number;
  onConfirmSelection: (selectedVideoIds: string[]) => void;
  isProcessing?: boolean;
}

const VideoSelectionModal: React.FC<VideoSelectionModalProps> = ({
  isOpen,
  onClose,
  videos,
  packageType,
  packagePrice,
  videoCount,
  onConfirmSelection,
  isProcessing = false,
}) => {
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Reset selections when modal opens/closes or package changes
  useEffect(() => {
    if (isOpen) {
      setSelectedVideos(new Set());
    }
  }, [isOpen, packageType]);

  // Filter available videos (active and not purchased)
  const availableVideos = videos.filter(
    video => video.status === 'active' && !video.purchased
  );

  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else if (newSet.size < videoCount) {
        newSet.add(videoId);
      } else {
        toast(`You can only select ${videoCount} video${videoCount > 1 ? 's' : ''} for this package`);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    if (selectedVideos.size !== videoCount) {
      toast(`Please select exactly ${videoCount} video${videoCount > 1 ? 's' : ''}`);
      return;
    }
    onConfirmSelection(Array.from(selectedVideos));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const getPackageTitle = () => {
    switch (packageType) {
      case 'one':
        return 'Select 1 Video';
      case 'three':
        return 'Select 3 Videos';
      case 'five':
        return 'Select 5 Videos';
      case 'bulk':
        return `Select All Videos (${videoCount})`;
      default:
        return `Select ${videoCount} Videos`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getPackageTitle()}
              </h2>
              <p className="text-gray-600 mt-1">
                Choose {videoCount} video{videoCount > 1 ? 's' : ''} from {availableVideos.length} available
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Package Info */}
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-orange-800">
                  {packageType.charAt(0).toUpperCase() + packageType.slice(1)} Package
                </span>
                <p className="text-sm text-orange-700 mt-1">
                  Selected: {selectedVideos.size} of {videoCount} videos
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">
                  ${packagePrice}
                </div>
                <div className="text-sm text-orange-700">
                  Total price
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {availableVideos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <Play className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-semibold">No videos available</p>
                <p className="text-sm mt-1">All videos have been purchased or are unavailable</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableVideos.map((video) => (
                <div
                  key={video.id}
                  className={`border rounded-lg overflow-hidden transition-all cursor-pointer ${
                    selectedVideos.has(video.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleVideoToggle(video.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        selectedVideos.has(video.id)
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-white border-gray-300'
                      }`}>
                        {selectedVideos.has(video.id) && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewVideo(video);
                      }}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded"
                    >
                      <Play size={16} />
                    </button>

                    {/* License Badge */}
                    <div className="absolute bottom-2 right-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        video.licenseType === 'exclusive'
                          ? 'bg-purple-100 text-purple-800'
                          : video.licenseType === 'extended'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {video.licenseType}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {video.title}
                    </h3>
                    
                    {video.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {video.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart size={12} />
                          {video.purchases}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(video.uploadedAt)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400">
                      {formatFileSize(video.fileSize)}
                    </div>

                    {video.tags && video.tags.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {video.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {video.tags.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                              +{video.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedVideos.size} of {videoCount} videos selected
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                disabled={isProcessing}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedVideos.size !== videoCount || isProcessing}
                className="px-6 py-2 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Proceed to Payment - $${packagePrice}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{previewVideo.title}</h3>
                  <p className="text-gray-600">{previewVideo.description}</p>
                </div>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <video
                  controls
                  className="w-full h-full rounded-lg"
                  poster={previewVideo.thumbnailUrl}
                >
                  <source src={previewVideo.videoUrl} type="video/mp4" />
                </video>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {previewVideo.views} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart size={14} />
                    {previewVideo.purchases} purchases
                  </span>
                  <span>{formatFileSize(previewVideo.fileSize)}</span>
                </div>
                <Button
                  onClick={() => setPreviewVideo(null)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSelectionModal;