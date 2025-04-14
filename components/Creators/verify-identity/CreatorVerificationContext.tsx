"use client";

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";

interface VerificationData {
	verificationVideo: File | null;
	verifiableID: File | null;
}

interface CreatorProfileData {
	picture: File | null;
	bio: string;
	tiktokUrl: string;
	ethnicity: string;
	dateOfBirth: string;
	gender: string;
	contentTypes: string[];
	socialMedia: {
		instagram: string;
		twitter: string;
		facebook: string;
		youtube: string;
	};
	country: string;
	contentLinks: string[];
}

interface FieldErrors {
	[key: string]: string;
}
  
interface CreatorVerificationContextType {
	verificationData: VerificationData;
	profileData: CreatorProfileData;
	updateVerificationData: (data: Partial<VerificationData>) => void;
	updateProfileData: (data: Partial<CreatorProfileData>) => void;
	isVerificationComplete: boolean;
	isProfileComplete: boolean;
	submitVerification: () => Promise<{ success: boolean; message: string }>;
	loading: boolean;
	fieldErrors: FieldErrors;
	validateProfileData: () => {isValid: boolean; missingFields: string[]};
	clearFieldError: (field: string) => void;
}

const defaultVerificationData: VerificationData = {
	verificationVideo: null,
	verifiableID: null,
};

const defaultProfileData: CreatorProfileData = {
	picture: null,
	bio: "",
	tiktokUrl: "",
	ethnicity: "",
	dateOfBirth: "",
	gender: "",
	contentTypes: [],
	socialMedia: {
		instagram: "",
		twitter: "",
		facebook: "",
		youtube: "",
	},
	country: "",
	contentLinks: [""],
};

const CreatorVerificationContext = createContext<
	CreatorVerificationContextType | undefined
>(undefined);

// IndexedDB configuration for verification
const DB_NAME = "creatorVerificationDB";
const DB_VERSION = 1;
const VERIFICATION_STORE = "verification";

// LocalStorage keys instead of SessionStorage
const PROFILE_DATA_KEY = "creatorProfileData";
const PROFILE_PICTURE_KEY = "creatorProfilePicture";

// IndexedDB utility functions
const openDatabase = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = (event) => {
			reject((event.target as IDBOpenDBRequest).error);
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create verification store if it doesn't exist
			if (!db.objectStoreNames.contains(VERIFICATION_STORE)) {
				db.createObjectStore(VERIFICATION_STORE);
			}
		};
	});
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFromDB = async (storeName: string, key: string): Promise<any> => {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, "readonly");
		const store = transaction.objectStore(storeName);
		const request = store.get(key);

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = (event) => {
			reject((event.target as IDBRequest).error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
};

const putIntoDB = async (
	storeName: string,
	key: string,
	value: Record<string, unknown>
): Promise<void> => {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, "readwrite");
		const store = transaction.objectStore(storeName);
		const request = store.put(value, key);

		request.onsuccess = () => {
			resolve();
		};

		request.onerror = (event) => {
			reject((event.target as IDBRequest).error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
};

const deleteFromDB = async (storeName: string, key: string): Promise<void> => {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, "readwrite");
		const store = transaction.objectStore(storeName);
		const request = store.delete(key);

		request.onsuccess = () => {
			resolve();
		};

		request.onerror = (event) => {
			reject((event.target as IDBRequest).error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
};

export const CreatorVerificationProvider = ({
	children,
	userId,
}: {
	children: ReactNode;
	userId?: string;
}) => {
	const [verificationData, setVerificationData] = useState<VerificationData>(
		defaultVerificationData
	);
	const [profileData, setProfileData] =
		useState<CreatorProfileData>(defaultProfileData);
	const [loading, setLoading] = useState(false);
	const [dbInitialized, setDbInitialized] = useState(false); // New state to trigger data reloads
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [isProfileComplete, setIsProfileComplete] = useState(false);

	// Add these utility functions
	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = (error) => reject(error);
		});
	};

	const base64ToFile = (
		base64String: string,
		filename: string,
		type: string
	): File => {
		try {
			const arr = base64String.split(",");
			const mime = arr[0].match(/:(.*?);/)?.[1] || type;
			const bstr = atob(arr[1]);
			let n = bstr.length;
			const u8arr = new Uint8Array(n);
			while (n--) {
				u8arr[n] = bstr.charCodeAt(n);
			}
			return new File([u8arr], filename, { type: mime });
		} catch (error) {
			console.error("Error converting base64 to file:", error);
			throw error;
		}
	};


	// Initialize database
	useEffect(() => {
		const initializeDB = async () => {
			try {
				if (typeof window === "undefined") return;

				await openDatabase();
				setDbInitialized(true);
			} catch (error) {
				console.error("Error initializing IndexedDB:", error);
			}
		};

		initializeDB();
	}, []);

	// Load data from IndexedDB and LocalStorage on initial render or when refresh is triggered
	useEffect(() => {
		// Only run this in the browser and when DB is initialized
		if (typeof window === "undefined" || !dbInitialized) return;

		const loadData = async () => {
			try {
				// Load verification data from IndexedDB
				const verificationDataFlags = await getFromDB(
					VERIFICATION_STORE,
					"flags"
				);
				const verificationFiles = await getFromDB(VERIFICATION_STORE, "files");

				if (verificationDataFlags && verificationFiles) {
					const restoredVerificationData: VerificationData = {
						verificationVideo: null,
						verifiableID: null,
					};

					// Restore verification video if it exists
					if (
						verificationDataFlags.verificationVideoExists &&
						verificationFiles.verificationVideoBase64
					) {
						try {
							restoredVerificationData.verificationVideo = base64ToFile(
								verificationFiles.verificationVideoBase64,
								verificationFiles.verificationVideoName || "verification.mp4",
								verificationFiles.verificationVideoType || "video/mp4"
							);
						} catch (error) {
							console.error("Error restoring verification video:", error);
						}
					}

					// Restore ID if it exists
					if (
						verificationDataFlags.verifiableIDExists &&
						verificationFiles.verifiableIDBase64
					) {
						try {
							restoredVerificationData.verifiableID = base64ToFile(
								verificationFiles.verifiableIDBase64,
								verificationFiles.verifiableIDName || "id.jpg",
								verificationFiles.verifiableIDType || "image/jpeg"
							);
						} catch (error) {
							console.error("Error restoring verifiable ID:", error);
						}
					}

					setVerificationData(restoredVerificationData);
				}

				//Load profile data from LocalStorage
				try {
					const profileDataStr = localStorage.getItem(PROFILE_DATA_KEY);
					const profilePictureStr = localStorage.getItem(PROFILE_PICTURE_KEY);

					if (profileDataStr) {
						const storedProfile = JSON.parse(profileDataStr);

						const restoredProfileData: CreatorProfileData = {
							...defaultProfileData, // Start with default values
							...storedProfile, // Override with stored values
							picture: null, // Will set this separately
						};

						// Restore profile picture if it exists
						if (profilePictureStr) {
							try {
								const pictureData = JSON.parse(profilePictureStr);
								if (pictureData.base64) {
									restoredProfileData.picture = base64ToFile(
										pictureData.base64,
										pictureData.name || "profile.jpg",
										pictureData.type || "image/jpeg"
									);
								}
							} catch (error) {
								console.error("Error restoring profile picture:", error);
							}
						}

						setProfileData(restoredProfileData);
						
						// Check if profile is complete after loading data
						validateProfileComplete(restoredProfileData);
					}
				} catch (error) {
					console.error(
						"Error parsing profile data from local storage:",
						error
					);
				}
			} catch (error) {
				console.error("Error loading data:", error);
			}
		};

		loadData();
	}, [dbInitialized]); // Added dataLoadAttempt dependency

	// Update verification data in state and IndexedDB
	const updateVerificationData = async (data: Partial<VerificationData>) => {
		try {
			// Get existing files from IndexedDB first
			const existingFiles =
				(await getFromDB(VERIFICATION_STORE, "files")) || {};

			// Process any file data to convert to base64 for storage
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const storageData: any = { ...existingFiles }; // Start with existing files
			const storageFlags = {
				verificationVideoExists:
					!!data.verificationVideo || !!verificationData.verificationVideo,
				verifiableIDExists:
					!!data.verifiableID || !!verificationData.verifiableID,
			};

			// If there's a new verification video, encode it
			if (data.verificationVideo) {
				const videoBase64 = await fileToBase64(data.verificationVideo);
				storageData.verificationVideoBase64 = videoBase64;
				storageData.verificationVideoName = data.verificationVideo.name;
				storageData.verificationVideoType = data.verificationVideo.type;
			}

			// If there's a new ID, encode it
			if (data.verifiableID) {
				const idBase64 = await fileToBase64(data.verifiableID);
				storageData.verifiableIDBase64 = idBase64;
				storageData.verifiableIDName = data.verifiableID.name;
				storageData.verifiableIDType = data.verifiableID.type;
			}

			// Store in IndexedDB
			await putIntoDB(VERIFICATION_STORE, "flags", storageFlags);
			await putIntoDB(VERIFICATION_STORE, "files", storageData);

			// Update state with the original file objects - preserve existing if not updated
			setVerificationData((prev) => ({
				verificationVideo:
					data.verificationVideo !== undefined
						? data.verificationVideo
						: prev.verificationVideo,
				verifiableID:
					data.verifiableID !== undefined
						? data.verifiableID
						: prev.verifiableID,
			}));
		} catch (error) {
			console.error("Error updating verification data in IndexedDB:", error);
		}
	};

	// Add this validation function
	const validateProfileData = () => {
		const requiredFields = [
			{ key: 'picture', label: 'Profile Picture' },
			{ key: 'bio', label: 'Bio' },
			{ key: 'tiktokUrl', label: 'TikTok URL' },
			{ key: 'dateOfBirth', label: 'Date of Birth' },
			{ key: 'gender', label: 'Gender' },
			{ key: 'country', label: 'Country' }
		];
		
		const missingFields: string[] = [];
		const errors: FieldErrors = {};
		
		requiredFields.forEach(field => {
			if (field.key === 'picture') {
				if (!profileData.picture) {
					missingFields.push(field.label);
					errors[field.key] = `${field.label} is required`;
				}
			} else if (!profileData[field.key as keyof CreatorProfileData] || 
						(typeof profileData[field.key as keyof CreatorProfileData] === 'string' && 
						(profileData[field.key as keyof CreatorProfileData] as string).trim() === '')) {
				missingFields.push(field.label);
				errors[field.key] = `${field.label} is required`;
			}
		});
		
		// Also check content links - at least one should be filled
		if (profileData.contentLinks.length === 0 || !profileData.contentLinks[0] || profileData.contentLinks[0].trim() === '') {
			missingFields.push('Content Links');
			errors.contentLinks = 'At least one content link is required';
		}
		
		setFieldErrors(errors);
		
		return {
			isValid: missingFields.length === 0,
			missingFields
		};
	};
	  
	// Add this function to clear individual errors
	const clearFieldError = (field: string) => {
		setFieldErrors(prev => {
			const updated = { ...prev };
			delete updated[field];
			return updated;
		});
	};

	// Update profile data in state and LocalStorage
	const updateProfileData = async (data: Partial<CreatorProfileData>) => {
		try {
			// Update the state first
			setProfileData((prev) => {
				const updatedData = {
					...prev,
					...data,
					picture: data.picture !== undefined ? data.picture : prev.picture,
				};
		
				// Store profile data without the picture
				const profileDataToStore = {
					bio: updatedData.bio,
					tiktokUrl: updatedData.tiktokUrl,
					ethnicity: updatedData.ethnicity,
					dateOfBirth: updatedData.dateOfBirth,
					gender: updatedData.gender,
					country: updatedData.country,
					contentTypes: updatedData.contentTypes,
					contentLinks: updatedData.contentLinks,
					socialMedia: updatedData.socialMedia,
				};
		
				// Save to local storage
				localStorage.setItem(
					PROFILE_DATA_KEY,
					JSON.stringify(profileDataToStore)
				);
		
				// If there's a new profile picture, save it separately
				if (data.picture) {
					// Save picture data
					fileToBase64(data.picture).then((base64) => {
						const pictureData = {
							base64,
							name: data.picture?.name,
							type: data.picture?.type,
						};
						localStorage.setItem(
							PROFILE_PICTURE_KEY,
							JSON.stringify(pictureData)
						);
					});
					
					// Clear any error for picture field
					clearFieldError('picture');
				}
				
				// Clear field errors for updated fields
				Object.keys(data).forEach(key => {
					if (key !== 'picture') {
						clearFieldError(key);
					}
				});
				
				// Dynamically recheck completeness after data update
				validateProfileComplete(updatedData);
				
				return updatedData;
			});
		} catch (error) {
			console.error("Error updating profile data in local storage:", error);
		}
	};

	// Define a separate function for checking profile completeness
	const validateProfileComplete = (data: CreatorProfileData) => {
		const isComplete = Boolean(
			data.picture &&
			data.bio &&
			data.bio.trim().length > 0 &&
			data.tiktokUrl &&
			data.tiktokUrl.trim().length > 0 &&
			data.dateOfBirth &&
			data.dateOfBirth.trim().length > 0 &&
			data.gender &&
			data.gender.trim().length > 0 &&
			data.country &&
			data.contentLinks.length > 0 &&
			data.contentLinks[0].trim() !== ""
		);
		
		// Update state properly by calling the setter function
		setIsProfileComplete(isComplete);
		
		return isComplete;
	};

	// Check if verification step is complete
	const isVerificationComplete = Boolean(
		verificationData.verificationVideo && verificationData.verifiableID
	);

	// Submit all data to the API
	const submitVerification = async () => {
		if (!userId) {
			return { success: false, message: "User ID is required" };
		}

		if (!isVerificationComplete || !isProfileComplete) {
			return {
				success: false,
				message: "Please complete all required fields",
			};
		}

		setLoading(true);
		try {
			// Convert files to base64 for API transmission
			const fileToBase64 = async (file: File): Promise<string> => {
				return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.readAsDataURL(file);
					reader.onload = () => {
						const base64String = reader.result as string;
						// Remove the data:mime/type;base64, prefix
						const base64 = base64String.split(",")[1];
						resolve(base64);
					};
					reader.onerror = (error) => reject(error);
				});
			};

			// Prepare files for API upload
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const apiPayload: any = {
				userId,
				profileData: JSON.stringify({
					bio: profileData.bio,
					tiktokUrl: profileData.tiktokUrl,
					ethnicity: profileData.ethnicity,
					dateOfBirth: profileData.dateOfBirth,
					gender: profileData.gender,
					contentTypes: profileData.contentTypes,
					socialMedia: profileData.socialMedia,
					country: profileData.country,
					contentLinks: profileData.contentLinks,
				}),
			};

			// Add verification video if exists
			if (verificationData.verificationVideo) {
				const videoBase64 = await fileToBase64(
					verificationData.verificationVideo
				);
				apiPayload.verificationVideo = {
					name: verificationData.verificationVideo.name,
					type: verificationData.verificationVideo.type,
					size: verificationData.verificationVideo.size,
					data: videoBase64,
				};
			}

			// Add verifiable ID if exists
			if (verificationData.verifiableID) {
				const idBase64 = await fileToBase64(verificationData.verifiableID);
				apiPayload.verifiableID = {
					name: verificationData.verifiableID.name,
					type: verificationData.verifiableID.type,
					size: verificationData.verifiableID.size,
					data: idBase64,
				};
			}

			// Add profile picture if exists
			if (profileData.picture) {
				const pictureBase64 = await fileToBase64(profileData.picture);
				apiPayload.profilePicture = {
					name: profileData.picture.name,
					type: profileData.picture.type,
					size: profileData.picture.size,
					data: pictureBase64,
				};
			}

			const response = await fetch("/api/submit-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(apiPayload),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to submit verification");
			}

			const result = await response.json();
			// Clear IndexedDB stores and local storage after successful submission
			await deleteFromDB(VERIFICATION_STORE, "flags");
			await deleteFromDB(VERIFICATION_STORE, "files");
			localStorage.removeItem(PROFILE_DATA_KEY);
			localStorage.removeItem(PROFILE_PICTURE_KEY);

			return {
				success: true,
				message: result.message || "Verification submitted successfully",
			};
		} catch (error) {
			console.error("Error submitting verification:", error);
			return {
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to submit verification",
			};
		} finally {
			setLoading(false);
		}
	};

	return (
		<CreatorVerificationContext.Provider
      value={{
        verificationData,
        profileData,
        updateVerificationData,
        updateProfileData,
        isVerificationComplete,
        isProfileComplete,
        submitVerification,
        loading,
        fieldErrors,
        validateProfileData,
        clearFieldError,
      }}
    >
      {children}
    </CreatorVerificationContext.Provider>
	);
};

export const useCreatorVerification = () => {
	const context = useContext(CreatorVerificationContext);
	if (context === undefined) {
		throw new Error(
			"useCreatorVerification must be used within a CreatorVerificationProvider"
		);
	}
	return context;
};