import { Loader, Play } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface VideoComponentProps {
  videoId: string;
  currentPlayingVideo: string | null;
  setCurrentPlayingVideo: (videoId: string | null) => void;
  creator: { aboutMeVideoUrl: string };
  onClick?: () => void;
}

const VideoComponent = ({ creator, onClick}: VideoComponentProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setShowControls] = useState(true);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { 
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '50px' // Start loading 50px before it comes into view
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load video only when visible
  useEffect(() => {
    if (isVisible && creator.aboutMeVideoUrl && videoRef.current && !isVideoLoaded) {
      const video = videoRef.current;
      setIsLoading(true);

      const handleLoadedData = () => {
        setIsVideoLoaded(true);
        setIsLoading(false);
      };

      const handleCanPlay = () => {
        setIsVideoLoaded(true);
        setIsLoading(false);
      };

      const handleError = () => {
        setHasError(true);
        setIsLoading(false);
      };

      // Use the fastest loading events
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      // Optimize video element
      video.preload = 'metadata'; // Only load metadata initially
      video.muted = true;
      video.playsInline = true;
      
      // Set source and start loading
      video.src = creator.aboutMeVideoUrl;
      video.load();

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [isVisible, creator.aboutMeVideoUrl, isVideoLoaded]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (videoRef.current && isVideoLoaded) {
      const video = videoRef.current;
      if (video.paused) {
        // Switch to full preload when actually playing
        video.preload = 'auto';
        video.play();
      } else {
        video.pause();
      }
    }
    
    onClick?.();
  };

  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => setShowControls(false);

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer rounded-lg overflow-hidden mt-4 bg-gray-100"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: "310px", height: "250px" }}
    >
      {/* Loading state */}
      {(!isVisible || isLoading) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg">
          <div className="bg-white bg-opacity-80 rounded-full p-2">
            <Loader className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center rounded-lg">
          <div className="text-orange-400">
            <Play className="w-12 h-12" />
          </div>
        </div>
      )}

      {/* Video element - only render when visible */}
      {isVisible && (
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backgroundColor: "transparent",
            opacity: isVideoLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          className="rounded-lg"
          onClick={handleVideoClick}
          controls={false}
          preload="metadata"
          muted
          playsInline
          poster="" // Empty poster to avoid default poster loading
        >
          <p>Your browser doesn&apos;t support HTML video.</p>
        </video>
      )}

      {/* Play Button Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-300 hover:bg-black hover:bg-opacity-10 rounded-lg z-30"
        onClick={handleVideoClick}
      >
        <button
          className="bg-orange-500 bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handleVideoClick}
          aria-label="Play video"
        >
          <Play className="w-5 h-5 fill-white ml-1 text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoComponent;