export const generateVideoThumbnail = async (
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
		// Set canvas dimensions to match video
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		
		// Seek to the specified time
		video.currentTime = Math.min(timeInSeconds, video.duration);
	  });
  
	  video.addEventListener('seeked', () => {
		try {
		  // Draw video frame to canvas
		  context.drawImage(video, 0, 0, canvas.width, canvas.height);
		  
		  // Convert canvas to blob
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
  
	  // Create object URL and load video
	  const videoUrl = URL.createObjectURL(videoFile);
	  video.src = videoUrl;
	  video.load();
	});
  };