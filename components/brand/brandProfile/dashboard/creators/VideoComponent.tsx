import { Play } from "lucide-react";
import { useRef, useState } from "react";

interface VideoComponentProps {
	videoId: string;
	currentPlayingVideo: string | null;
	setCurrentPlayingVideo: (videoId: string | null) => void;
	creator: { aboutMeVideoUrl: string };
	onClick?: () => void; // Optional onClick prop for additional functionality
}

const VideoComponent = ({ creator, onClick }: VideoComponentProps) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [, setShowControls] = useState(true);
	const [, setIsLoading] = useState(true);
	const [, setHasError] = useState(false);

	const handleVideoClick = (e: {
		preventDefault: () => void;
		stopPropagation: () => void;
	}) => {
		e.preventDefault();
		e.stopPropagation();

		// Only call the onClick prop to open modal - don't play video here
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
				controls={false}
				preload="metadata"
				muted
				onError={() => {
					setIsLoading(false);
					setHasError(true);
				}}
			>
				<p>Your browser doesn&apos;t support HTML video.</p>
			</video>

			{/* Custom Play Button Overlay - Always visible as thumbnail */}
			<div
				className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 transition-opacity duration-300 hover:bg-opacity-30"
				onClick={handleVideoClick}
			>
				<button
					className="bg-orange-500 bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						// Only open modal, don't play video
						if (onClick) {
							onClick();
						}
					}}
				>
					<Play className="w-5 h-5 fill-white ml-1 text-white" />
				</button>
			</div>
		</div>
	);
};

export default VideoComponent;
