/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Sanitizes an object to make it compatible with Firestore
 * Removes undefined values, functions, and other unsupported data types
 * @param data The object to sanitize
 * @returns A clean object safe to send to Firestore
 */
export function sanitizeForFirestore(data: any): any {
	// If null or undefined, return null (Firestore supports null but not undefined)
	if (data === undefined || data === null) {
	  return null;
	}
  
	// Handle primitive types
	if (typeof data !== 'object') {
	  // Convert unsupported primitives to strings or nulls
	  if (typeof data === 'function' || typeof data === 'symbol') {
		return null;
	  }
	  if (typeof data === 'number' && (isNaN(data) || !isFinite(data))) {
		return null;
	  }
	  return data;
	}
  
	// Handle Date objects
	if (data instanceof Date) {
	  return data;
	}
  
	// Handle arrays
	if (Array.isArray(data)) {
	  return data.map(item => sanitizeForFirestore(item));
	}
  
	// Handle objects
	const sanitizedObject: Record<string, any> = {};
	
	for (const [key, value] of Object.entries(data)) {
	  // Skip undefined values and functions
	  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
		continue;
	  }
	  
	  // Recursively sanitize nested objects and arrays
	  sanitizedObject[key] = sanitizeForFirestore(value);
	}
	
	return sanitizedObject;
  }
  
  /**
   * Sanitizes project data specifically for Firestore
   * @param projectData The project data to sanitize
   * @returns Sanitized project data safe for Firestore
   */
  export function sanitizeProjectData(projectData: any): any {
	const sanitized = sanitizeForFirestore(projectData);
	
	// Additional project-specific sanitization can be added here
	// For example, ensuring required fields exist
	if (sanitized.projectDetails && !sanitized.projectDetails.projectName) {
	  sanitized.projectDetails.projectName = "Untitled Project";
	}
	
	return sanitized;
  }
  
  /**
   * Safely processes thumbnail URL in project details
   * Ensures the URL is properly formatted and safe for Firestore
   * @param details The project details object
   * @returns Sanitized project details
   */
  export function sanitizeProjectThumbnail(details: any): any {
	if (!details) return {};
	
	const sanitized = { ...details };
	
	// Check if thumbnail is present and sanitize it
	if (sanitized.projectThumbnail) {
	  // If it's already a URL, keep it
	  if (typeof sanitized.projectThumbnail === 'string' && 
		  (sanitized.projectThumbnail.startsWith('http') || 
		   sanitized.projectThumbnail.startsWith('data:'))) {
		// Valid URL or data URI - no change needed
	  } else {
		// Invalid thumbnail format - set to null
		sanitized.projectThumbnail = null;
	  }
	}
	
	return sanitized;
  }