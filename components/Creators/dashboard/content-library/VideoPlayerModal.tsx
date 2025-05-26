"use client";

import { useState, useRef } from "react";
import { X, Play } from "lucide-react";

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

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onViewTracked?: (videoId: string) => void;
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  video,
  onViewTracked,
}: VideoPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen || !video) return null;

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      
      // Track view on first play
      if (!hasStartedPlaying && onViewTracked) {
        onViewTracked(video.id);
        setHasStartedPlaying(true);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setHasStartedPlaying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl md:w-80 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-base font-medium text-gray-900 truncate pr-4">
            {video.title}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full max-h-[50vh] object-contain"
            poster={video.thumbnailUrl}
            onEnded={handleVideoEnded}
            controls
          >
            <source src={video.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Custom play button overlay (optional) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all transform hover:scale-105"
              >
                <Play className="w-8 h-8 text-gray-800 ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4 space-y-3">
          {video.description && (
            <p className="text-gray-600 text-sm">{video.description}</p>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-green-600">${video.price}</span>
            <span className="text-gray-500 capitalize">{video.licenseType} License</span>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{video.views.toLocaleString()} views</span>
            <span>{video.purchases} purchases</span>
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}