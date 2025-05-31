import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

interface VideoComponentProps {
	videoId: string;
	currentPlayingVideo: string | null;
	setCurrentPlayingVideo: (videoId: string | null) => void;
	creator: { aboutMeVideoUrl: string };
	onClick?: () => void; // Optional onClick prop for additional functionality
}

const VideoComponent = ({
	videoId,
	currentPlayingVideo,
	setCurrentPlayingVideo,
	creator,
	onClick,
}: VideoComponentProps) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [showControls, setShowControls] = useState(true);

	// Check if this specific video is playing
	const isPlaying = currentPlayingVideo === videoId;

	const togglePlay = async () => {
		if (videoRef.current) {
			try {
				if (isPlaying) {
					// Pause this video
					videoRef.current.pause();
					setCurrentPlayingVideo(null);
				} else {
					// Pause all other videos first
					const allVideos = document.querySelectorAll("video");
					allVideos.forEach((video) => {
						if (video !== videoRef.current) {
							video.pause();
						}
					});

					// Play this video
					await videoRef.current.play();
					setCurrentPlayingVideo(videoId);
				}
			} catch (error) {
				console.error("Video play failed:", error);
			}
		}
	};

	const handlePlay = () => {
		setCurrentPlayingVideo(videoId);
		setShowControls(false);
	};

	const handlePause = () => {
		setCurrentPlayingVideo(null);
		setShowControls(true);
	};

	const handleVideoClick = (e: {
		preventDefault: () => void;
		stopPropagation: () => void;
	}) => {
		e.preventDefault();
		e.stopPropagation();
		togglePlay();

		// Call the onClick prop if provided (for opening modal)
		if (onClick) {
			onClick();
		}
	};

	const handleMouseEnter = () => {
		if (isPlaying) {
			setShowControls(true);
		}
	};

	const handleMouseLeave = () => {
		if (isPlaying) {
			setShowControls(false);
		}
	};

	// Show controls when video is paused or on hover
	const shouldShowControls = !isPlaying || showControls;

	return (
		<div
			className="relative cursor-pointer rounded-lg overflow-hidden mt-4"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<video
				ref={videoRef}
				src={creator.aboutMeVideoUrl}
				style={{
					width: "350px",
					height: "250px",
					objectFit: "cover",
				}}
				className="rounded-lg"
				onClick={handleVideoClick}
				onPlay={handlePlay}
				onPause={handlePause}
				controls={false}
				muted // Add this to allow autoplay policies
			>
				<p>Your browser doesn&apos;t support HTML video.</p>
			</video>

			{/* Custom Play/Pause Button Overlay */}
			{shouldShowControls && (
				<div
					className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 transition-opacity duration-300"
					onClick={handleVideoClick}
				>
					<button
						className="bg-orange-500 bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							togglePlay();
						}}
					>
						{isPlaying ? (
							<Pause className="w-5 h-5 fill-white text-white" />
						) : (
							<Play className="w-5 h-5 fill-white ml-1 text-white" />
						)}
					</button>
				</div>
			)}
		</div>
	);
};

export default VideoComponent;
