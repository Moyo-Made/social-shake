// utils/uploadUtils.ts

/**
 * Upload a file with progress monitoring
 * @param file The file to upload
 * @param userId The user ID
 * @param uploadType The type of upload ('verificationVideo', 'verifiableID', or 'profilePicture')
 * @param onProgress Callback function for upload progress updates
 * @returns Promise that resolves to the uploaded file's public URL
 */
export const uploadFileWithProgress = async (
	file: File,
	userId: string,
	uploadType: string,
	onProgress?: (progress: number) => void
  ): Promise<string> => {
	return new Promise((resolve, reject) => {
	  // Create a FormData object to send the file
	  const formData = new FormData();
	  formData.append("file", file);
	  formData.append("userId", userId);
	  formData.append("uploadType", uploadType);
  
	  // Create an XMLHttpRequest to track upload progress
	  const xhr = new XMLHttpRequest();
	  
	  // Track upload progress
	  xhr.upload.addEventListener("progress", (event) => {
		if (event.lengthComputable && onProgress) {
		  const percentComplete = (event.loaded / event.total) * 100;
		  onProgress(percentComplete);
		}
	  });
  
	  // Handle completion
	  xhr.addEventListener("load", () => {
		if (xhr.status >= 200 && xhr.status < 300) {
		  try {
			const response = JSON.parse(xhr.responseText);
			resolve(response.publicUrl);
		  } catch {
			reject(new Error("Invalid response format"));
		  }
		} else {
		  try {
			const errorData = JSON.parse(xhr.responseText);
			reject(new Error(errorData.error || "Failed to upload file"));
		  } catch {
			reject(new Error(`Upload failed with status: ${xhr.status}`));
		  }
		}
	  });
  
	  // Handle errors
	  xhr.addEventListener("error", () => {
		reject(new Error("Network error occurred during upload"));
	  });
  
	  xhr.addEventListener("abort", () => {
		reject(new Error("Upload was aborted"));
	  });
  
	  // Open and send the request
	  xhr.open("POST", "/api/upload-file");
	  xhr.send(formData);
	});
  };