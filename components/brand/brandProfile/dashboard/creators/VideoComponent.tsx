import { Loader, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

// Your thumbnail generation function
const generateVideoThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 1
): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = Math.min(timeInSeconds, video.duration);
    });

    video.addEventListener('seeked', () => {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        }, 'image/jpeg', 0.8);
      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener('error', () => {
      reject(new Error('Video loading failed'));
    });

    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.load();
  });
};

// Helper function to fetch video as File from URL
const fetchVideoAsFile = async (url: string): Promise<File> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
};

interface VideoComponentProps {
  videoId: string;
  currentPlayingVideo: string | null;
  setCurrentPlayingVideo: (videoId: string | null) => void;
  creator: { aboutMeVideoUrl: string };
  onClick?: () => void;
}

const VideoComponent = ({ creator, onClick }: VideoComponentProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [, setHasError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);

  // Generate thumbnail on component mount
  useEffect(() => {
    const generateThumbnail = async () => {
      try {
        setIsThumbnailLoading(true);
        const videoFile = await fetchVideoAsFile(creator.aboutMeVideoUrl);
        const { dataUrl } = await generateVideoThumbnail(videoFile, 2); // Get thumbnail at 2 seconds
        setThumbnailUrl(dataUrl);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        // Fallback: start loading the actual video if thumbnail fails
        if (videoRef.current) {
          videoRef.current.load();
        }
      } finally {
        setIsThumbnailLoading(false);
      }
    };

    if (creator.aboutMeVideoUrl) {
      generateThumbnail();
    }
  }, [creator.aboutMeVideoUrl]);

  // Start loading video in background once thumbnail is ready
  useEffect(() => {
    if (thumbnailUrl && videoRef.current) {
      // Small delay to ensure thumbnail is displayed first
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [thumbnailUrl]);

  const handleVideoClick = (e: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    setShowControls(false);
  };

  // Show loading state while thumbnail is being generated
  const isLoading = isThumbnailLoading;
  const showThumbnail = thumbnailUrl && !isVideoLoading;

  return (
    <div
      className="relative  cursor-pointer rounded-lg overflow-hidden mt-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: "260px", height: "250px" }}
    >
      {/* Loading overlay - shown while generating thumbnail */}
      {isLoading && (
        <div
          id="loading-overlay-about"
          className="absolute inset-0 bg-gray-200 flex items-center justify-center rounded-lg z-20"
        >
          <div className="bg-white bg-opacity-90 rounded-full p-3">
            <Loader className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Thumbnail Image - shown while video loads in background */}
      {showThumbnail && (
        <Image
          src={thumbnailUrl}
          alt="Video thumbnail"
		  width={200}
		  height={250}
          className="absolute inset-0 w-full h-full object-cover rounded-lg z-10"
          onClick={handleVideoClick}
        />
      )}

      {/* Actual Video - hidden until loaded, then fades in */}
      <video
        ref={videoRef}
        src={creator.aboutMeVideoUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "transparent",
          opacity: isVideoLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
        className="rounded-lg"
        onClick={handleVideoClick}
        controls={false}
        preload="none" // Changed from "none" to start loading metadata
        muted
        onLoadedData={() => setIsVideoLoading(false)}
        onError={() => {
          setIsVideoLoading(false);
          setHasError(true);
        }}
      >
        <p>Your browser doesn&apos;t support HTML video.</p>
      </video>

      {/* Loading pulse animation - only when initially loading */}
      {isLoading && (
        <div className="absolute inset-0 rounded-lg animate-pulse bg-gradient-to-r from-gray-100 to-gray-200 z-15" />
      )}

      {/* Custom Play Button Overlay - shown when content is ready */}
      {!isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300 hover:bg-black hover:bg-opacity-10 rounded-lg z-30"
          onClick={handleVideoClick}
        >
          <button
            className="bg-orange-500 bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onClick) {
                onClick();
              }
            }}
          >
            <Play className="w-5 h-5 fill-white ml-1 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoComponent;