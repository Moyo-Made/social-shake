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
	updateVerificationData: (data: Partial<VerificationData>) => Promise<void>;
	updateProfileData: (data: Partial<CreatorProfileData>) => Promise<void>;
	isVerificationComplete: boolean;
	isProfileComplete: boolean;
	isFormValid: boolean; // Added isFormValid state
	submitVerification: () => Promise<{ success: boolean; message: string }>;
	loading: boolean;
	fieldErrors: FieldErrors;
	validateProfileData: (updateErrorState?: boolean) => { isValid: boolean; missingFields: string[] };
	clearFieldError: (field: string) => void;
	touched: Record<string, boolean>;
	setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
	resetForm: () => Promise<void>;
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
const TOUCHED_FIELDS_KEY = "creatorTouchedFields";

// IndexedDB utility functions
const openDatabase = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error("IndexedDB is not available"));
			return;
		}

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
	try {
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
	} catch (error) {
		console.error("Error getting from DB:", error);
		return null;
	}
};

const putIntoDB = async (
	storeName: string,
	key: string,
	value: Record<string, unknown>
): Promise<void> => {
	try {
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
	} catch (error) {
		console.error("Error putting into DB:", error);
		throw error;
	}
};

const deleteFromDB = async (storeName: string, key: string): Promise<void> => {
	try {
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
	} catch (error) {
		console.error("Error deleting from DB:", error);
	}
};

// File utility functions
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
	const [dbInitialized, setDbInitialized] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [isProfileComplete, setIsProfileComplete] = useState(false);
	const [isFormValid, setIsFormValid] = useState(false); // Added isFormValid state
	const [touched, setTouched] = useState<Record<string, boolean>>({});

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

	// Save touched state to localStorage whenever it changes
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(TOUCHED_FIELDS_KEY, JSON.stringify(touched));
		} catch (error) {
			console.error("Error saving touched state to localStorage:", error);
		}
	}, [touched]);

	// Load data from IndexedDB and LocalStorage on initial render
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

				// Load profile data from LocalStorage
				try {
					const profileDataStr = localStorage.getItem(PROFILE_DATA_KEY);
					const profilePictureStr = localStorage.getItem(PROFILE_PICTURE_KEY);
					const touchedFieldsStr = localStorage.getItem(TOUCHED_FIELDS_KEY);

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

						// Restore touched fields if they exist
						if (touchedFieldsStr) {
							try {
								const restoredTouched = JSON.parse(touchedFieldsStr);
								setTouched(restoredTouched);
							} catch (error) {
								console.error("Error restoring touched fields:", error);
							}
						}

						// Validate profile data after loading
						validateProfileData(false);
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
	}, [dbInitialized]);

	// Update verification data in state and IndexedDB
	const updateVerificationData = async (data: Partial<VerificationData>) => {
		try {
			// Get existing files from IndexedDB first
			const existingFiles =
				(await getFromDB(VERIFICATION_STORE, "files")) || {};

			// Process any file data to convert to base64 for storage
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const storageData: any = { ...existingFiles }; // Start with existing files
			
			// Update state first
			const updatedVerificationData = {
				verificationVideo:
					data.verificationVideo !== undefined
						? data.verificationVideo
						: verificationData.verificationVideo,
				verifiableID:
					data.verifiableID !== undefined
						? data.verifiableID
						: verificationData.verifiableID,
			};
			
			// Set flags based on updated data
			const storageFlags = {
				verificationVideoExists: !!updatedVerificationData.verificationVideo,
				verifiableIDExists: !!updatedVerificationData.verifiableID,
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

			// Update state after successful storage
			setVerificationData(updatedVerificationData);
			
			// Mark fields as touched
			if (data.verificationVideo !== undefined) {
				setTouched(prev => ({...prev, verificationVideo: true}));
			}
			if (data.verifiableID !== undefined) {
				setTouched(prev => ({...prev, verifiableID: true}));
			}
			
			return;
		} catch (error) {
			console.error("Error updating verification data in IndexedDB:", error);
			throw error;
		}
	};

	// Enhanced validation function that updates isFormValid state
	const validateProfileData = (updateErrorState = true) => {
		const requiredFields = [
			{ key: "picture", label: "Profile Picture" },
			{ key: "bio", label: "Bio" },
			{ key: "tiktokUrl", label: "TikTok URL" },
			{ key: "dateOfBirth", label: "Date of Birth" },
			{ key: "gender", label: "Gender" },
			{ key: "country", label: "Country" },
		];

		const missingFields: string[] = [];
		const errors: FieldErrors = {};

		// Check required fields
		requiredFields.forEach((field) => {
			if (field.key === "picture") {
				if (!profileData.picture) {
					missingFields.push(field.label);
					errors[field.key] = `${field.label} is required`;
				}
			} else if (
				!profileData[field.key as keyof CreatorProfileData] ||
				(typeof profileData[field.key as keyof CreatorProfileData] === "string" &&
				(profileData[field.key as keyof CreatorProfileData] as string).trim() === "")
			) {
				missingFields.push(field.label);
				errors[field.key] = `${field.label} is required`;
			}
		});

		// Check content links - at least one should be filled
		if (
			profileData.contentLinks.length === 0 ||
			!profileData.contentLinks[0] ||
			profileData.contentLinks[0].trim() === ""
		) {
			missingFields.push("Content Links");
			errors.contentLinks = "At least one content link is required";
		}

		// URL format validation
		if (
			profileData.tiktokUrl && 
			profileData.tiktokUrl.trim() !== "" && 
			!profileData.tiktokUrl.includes('tiktok.com')
		) {
			missingFields.push("TikTok URL");
			errors.tiktokUrl = "Please enter a valid TikTok URL";
		}

		// Only update the errors state if requested
		if (updateErrorState) {
			setFieldErrors(errors);
		}

		const isValid = missingFields.length === 0;
		
		// Always update form validity state
		setIsFormValid(isValid);
		setIsProfileComplete(isValid);

		return {
			isValid,
			missingFields,
		};
	};

	// Validate profile data whenever it changes
	useEffect(() => {
		if (Object.keys(profileData).length > 0) {
			validateProfileData(false);
		}
	}, [profileData]);

	// Clear individual errors
	const clearFieldError = (field: string) => {
		setFieldErrors((prev) => {
			const updated = { ...prev };
			delete updated[field];
			return updated;
		});
	};

	// Update profile data in state and LocalStorage
	const updateProfileData = async (data: Partial<CreatorProfileData>) => {
		try {
			// Create updated data by merging current state with new data
			const updatedData = {
				...profileData,
				...data,
				picture: data.picture !== undefined ? data.picture : profileData.picture,
			};

			// Prepare data for storage (without the File object)
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
				const base64 = await fileToBase64(data.picture);
				const pictureData = {
					base64,
					name: data.picture.name,
					type: data.picture.type,
				};
				localStorage.setItem(
					PROFILE_PICTURE_KEY,
					JSON.stringify(pictureData)
				);
			}

			// Update touched state for all fields in data
			const newTouched = { ...touched };
			Object.keys(data).forEach(key => {
				newTouched[key] = true;
			});
			setTouched(newTouched);
			localStorage.setItem(TOUCHED_FIELDS_KEY, JSON.stringify(newTouched));

			// Clear field errors for updated fields
			Object.keys(data).forEach((key) => {
				clearFieldError(key);
			});

			// Update state after storage is complete
			setProfileData(updatedData);
			
			// The validateProfileData will be called automatically 
			// via the useEffect when profileData changes
			
			return;
		} catch (error) {
			console.error("Error updating profile data in local storage:", error);
			throw error;
		}
	};

	// Reset form data
	const resetForm = async () => {
		try {
			// Clear IndexedDB
			await deleteFromDB(VERIFICATION_STORE, "flags");
			await deleteFromDB(VERIFICATION_STORE, "files");
			
			// Clear localStorage
			localStorage.removeItem(PROFILE_DATA_KEY);
			localStorage.removeItem(PROFILE_PICTURE_KEY);
			localStorage.removeItem(TOUCHED_FIELDS_KEY);
			
			// Reset state
			setVerificationData(defaultVerificationData);
			setProfileData(defaultProfileData);
			setFieldErrors({});
			setTouched({});
			setIsProfileComplete(false);
			setIsFormValid(false);
		} catch (error) {
			console.error("Error resetting form:", error);
		}
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

		// Force validation before submission
		const profileValidation = validateProfileData(true);
		
		if (!isVerificationComplete) {
			setFieldErrors(prev => ({
				...prev,
				verificationVideo: !verificationData.verificationVideo ? "Verification video is required" : "",
				verifiableID: !verificationData.verifiableID ? "ID verification is required" : ""
			}));
			return {
				success: false,
				message: "Please complete all required verification fields",
			};
		}

		if (!profileValidation.isValid) {
			return {
				success: false,
				message: `Please complete all required profile fields: ${profileValidation.missingFields.join(", ")}`,
			};
		}

		setLoading(true);
		try {
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
					data: videoBase64.split(",")[1], // Remove the data:mime/type;base64, prefix
				};
			}

			// Add verifiable ID if exists
			if (verificationData.verifiableID) {
				const idBase64 = await fileToBase64(verificationData.verifiableID);
				apiPayload.verifiableID = {
					name: verificationData.verifiableID.name,
					type: verificationData.verifiableID.type,
					size: verificationData.verifiableID.size,
					data: idBase64.split(",")[1], // Remove the data:mime/type;base64, prefix
				};
			}

			// Add profile picture if exists
			if (profileData.picture) {
				const pictureBase64 = await fileToBase64(profileData.picture);
				apiPayload.profilePicture = {
					name: profileData.picture.name,
					type: profileData.picture.type,
					size: profileData.picture.size,
					data: pictureBase64.split(",")[1], // Remove the data:mime/type;base64, prefix
				};
			}

			// Log the payload size to identify any issues with large uploads
			console.log("API Payload size:", JSON.stringify(apiPayload).length, "bytes");

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
			
			// Clear data after successful submission
			await resetForm();

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
				isFormValid,
				submitVerification,
				loading,
				fieldErrors,
				validateProfileData,
				clearFieldError,
				touched,
				setTouched,
				resetForm
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