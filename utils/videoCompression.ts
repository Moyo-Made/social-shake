import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Maximum allowed size for videos in bytes (30MB)
export const MAX_VIDEO_SIZE = 30 * 1024 * 1024; 

// Initialize FFmpeg (load it once)
let ffmpeg: FFmpeg | null = null;

/**
 * Loads FFmpeg if it hasn't been loaded yet
 */
export const loadFFmpeg = async (
  onProgress?: (progress: number) => void
): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Add progress callback if provided
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress);
    });
  }
  
  // Load FFmpeg core and codecs from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
};

/**
 * Compresses video to reduce file size
 * 
 * @param videoFile The video file to compress
 * @param options Compression options
 * @returns A Promise resolving to the compressed video file
 */
export const compressVideo = async (
  videoFile: File,
  options: {
    maxSizeMB?: number; // Target maximum size in MB
    quality?: number; // 0-100
    onProgress?: (progress: number) => void;
  } = {}
): Promise<File> => {
  const {
    maxSizeMB = 25, // Target 25MB max (below the 30MB limit)
    quality = 70,   // Default quality level
    onProgress
  } = options;
  
  // If file is already small enough, return it as is
  if (videoFile.size <= maxSizeMB * 1024 * 1024) {
    return videoFile;
  }
  
  try {
    // Load FFmpeg
    const ffmpeg = await loadFFmpeg(onProgress);
    
    // Prepare file
    const inputFileName = `input-${Date.now()}.${videoFile.name.split('.').pop()}`;
    const outputFileName = `compressed-${Date.now()}.mp4`;
    
    // Write the file data to FFmpeg's virtual file system
    ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    
    // Calculate bitrate based on target size
    // Video duration in seconds
    const videoDuration = await getVideoDuration(videoFile);
    
    // Target bits per second (80% of max to leave room for container overhead)
    const targetBitrate = Math.floor((maxSizeMB * 8 * 1024 * 1024 * 0.8) / videoDuration);
    
    // Run compression command
    await ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',       // Use H.264 codec
      '-crf', `${30 - (quality * 0.2)}`,  // Quality factor (lower is better)
      '-preset', 'fast',       // Encoding speed preset
      '-b:v', `${targetBitrate}`, // Target bitrate
      '-maxrate', `${targetBitrate * 1.5}`, // Max bitrate
      '-bufsize', `${targetBitrate * 3}`,   // Buffer size
      '-c:a', 'aac',           // Audio codec
      '-b:a', '128k',          // Audio bitrate
      '-movflags', '+faststart', // Optimize for web streaming
      outputFileName
    ]);
    
    // Read the result back
    const data = await ffmpeg.readFile(outputFileName);
    
    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    // Create a new file with the compressed data
    const compressedFile = new File(
      [data], 
      `compressed-${videoFile.name}`,
      { type: 'video/mp4' }
    );
    
    console.log(`Video compressed: ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing video:', error);
    throw new Error(`Video compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Gets the duration of a video file in seconds
 */
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Checks if a file needs compression based on size
 */
export const needsCompression = (file: File | null): boolean => {
  if (!file) return false;
  return file.size > MAX_VIDEO_SIZE;
};