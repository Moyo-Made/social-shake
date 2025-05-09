export type FileUploadProgress = {
	totalProgress: number;
	currentChunk: number;
	totalChunks: number;
  };
  
  export type FileUploadResult = {
	success: boolean;
	message: string;
	verificationId?: string;
	fileUrl?: string;
  };
  
  /**
   * Uploads a file in chunks to avoid 413 Request Entity Too Large errors
   */
  export async function uploadFileInChunks(
	userId: string,
	fileType: string,
	file: File,
	existingVerificationId: string = "",
	onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileUploadResult> {
	// Configuration
	const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
	let fileId: string | null = null;
	
	try {
	  // Process each chunk
	  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
		const start = chunkIndex * CHUNK_SIZE;
		const end = Math.min(start + CHUNK_SIZE, file.size);
		const chunk = file.slice(start, end);
		
		// Convert chunk to base64
		const base64Chunk = await readFileAsBase64(chunk);
		
		// Report progress
		if (onProgress) {
		  onProgress({
			totalProgress: (chunkIndex / totalChunks) * 100,
			currentChunk: chunkIndex + 1,
			totalChunks
		  });
		}
		
		// Send the chunk
		const response: Response = await fetch("/api/upload-chunk", {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
		  },
		  body: JSON.stringify({
			userId,
			fileType,
			chunkData: base64Chunk,
			fileName: file.name,
			fileContentType: file.type,
			chunkIndex,
			totalChunks,
			fileId,
			verificationId: existingVerificationId,
		  }),
		});
		
		if (!response.ok) {
		  const errorText = await response.text();
		  throw new Error(`Failed to upload chunk ${chunkIndex + 1}: ${errorText}`);
		}
		
		const result = await response.json();
		
		// Save the fileId from the first chunk response
		if (chunkIndex === 0) {
		  fileId = result.fileId;
		}
		
		// If this is the last chunk, return the final result
		if (chunkIndex === totalChunks - 1) {
		  if (onProgress) {
			onProgress({
			  totalProgress: 100,
			  currentChunk: totalChunks,
			  totalChunks
			});
		  }
		  
		  return {
			success: true,
			message: result.message || `${fileType} uploaded successfully`,
			verificationId: result.verificationId,
			fileUrl: result.fileUrl,
		  };
		}
	  }
	  
	  // This should not happen, but typescript needs it
	  throw new Error("Unexpected error: File upload did not complete");
	} catch (error) {
	  console.error(`Error uploading ${fileType}:`, error);
	  return {
		success: false,
		message: error instanceof Error ? error.message : `Failed to upload ${fileType}`,
	  };
	}
  }
  
  /**
   * Reads a file or blob as a base64 string
   */
  function readFileAsBase64(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
	  const reader = new FileReader();
	  reader.onload = () => {
		// Extract the base64 data part
		const result = reader.result as string;
		// If it's already a data URL, extract the base64 part
		const base64 = result.includes('base64,') 
		  ? result.split('base64,')[1] 
		  : result;
		resolve(base64);
	  };
	  reader.onerror = () => reject(new Error("Failed to read file"));
	  reader.readAsDataURL(file);
	});
  }
  
  /**
   * Checks the status of a file being processed
   */
  export async function checkFileProcessingStatus(fileId: string): Promise<{
	status: string;
	fileUrl?: string;
  }> {
	const response = await fetch(`/api/upload-chunk?fileId=${fileId}`);
	if (!response.ok) {
	  throw new Error("Failed to check file status");
	}
	return await response.json();
  }