import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase"; // Your Firebase client config
import { v4 as uuidv4 } from "uuid";

/**
 * Upload file directly to Firebase Storage using Firebase SDK
 * 
 * @param {File} file - The file to upload
 * @param {string} userId - User ID
 * @param {string} fileType - Type of file (verificationVideo, verifiableID, profilePicture)
 * @param {string} verificationId - Optional verification ID
 * @returns {Promise<object>} - Upload results with file URL and metadata
 */
export async function uploadFileToFirebase(file: File, userId: string, fileType: "verificationVideo" | "verifiableID" | "profilePicture" | string, verificationId: string = ""): Promise<object> {
  try {
    // Map file type to folder
    const folderMap = {
      "verificationVideo": "verification_videos",
      "verifiableID": "ids",
      "profilePicture": "profile_pictures"
    };
    
    const folder = folderMap[fileType as keyof typeof folderMap] || fileType;
    const currentVerificationId = verificationId || uuidv4();
    
    // Create a reference to Firebase Storage
    const storage = getStorage();
    const uploadPath = `${userId}/${folder}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, uploadPath);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded a file!', snapshot);
    
    // Get download URL
    const fileUrl = await getDownloadURL(storageRef);
    
    // Update verification document in Firestore if needed
    if (fileType === "verificationVideo" || fileType === "verifiableID") {
      const verificationRef = doc(db, "creator_verifications", currentVerificationId);
      
      try {
        // Check if we need to create or update the verification document
        if (!verificationId) {
          // Create new verification document
          await setDoc(verificationRef, {
            createdAt: new Date(),
            status: "incomplete",
            userId,
            [fileType === "verificationVideo" ? "videoUrl" : "idUrl"]: fileUrl,
            [fileType === "verificationVideo" ? "videoPath" : "idPath"]: uploadPath,
          });
        } else {
          // Update existing document
          await updateDoc(verificationRef, {
            [fileType === "verificationVideo" ? "videoUrl" : "idUrl"]: fileUrl,
            [fileType === "verificationVideo" ? "videoPath" : "idPath"]: uploadPath,
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error updating verification document:", error);
        // Continue anyway - we at least got the file uploaded
      }
    }
    
    return {
      success: true,
      fileUrl,
      uploadPath,
      verificationId: currentVerificationId
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}