"use client";

import { CreatorProfileData } from "@/types/creators";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { compressVideo, needsCompression } from "@/utils/videoCompression";
import { uploadFileInChunks } from "@/utils/fileUploader";

interface VerificationData {
	portfolioVideos: (File | null)[];
	verificationVideo: File | null;
	verifiableID: File | null;
	isCompressing: boolean;
	compressionProgress: number;
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
	isPortfolioComplete: boolean;
	isProfileComplete: boolean;
	isFormValid: boolean;
	submitVerification: () => Promise<{ success: boolean; message: string }>;
	loading: boolean;
	fieldErrors: FieldErrors;
	validateProfileData: (updateErrorState?: boolean) => {
		isValid: boolean;
		missingFields: string[];
	};
	clearFieldError: (field: string) => void;
	touched: Record<string, boolean>;
	setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
	resetForm: () => Promise<void>;
	isCompressing: boolean;
	compressionProgress: number;
	isUploading: boolean;
	currentUploadingFile: string | null;
	uploadProgress: number;
	totalFilesToUpload: number;
	completedUploads: number;
}

const defaultVerificationData: VerificationData = {
	verificationVideo: null,
	verifiableID: null,
	isCompressing: false,
	compressionProgress: 0,
	portfolioVideos: [],
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
		tiktok: "",
	},
	country: "",
	contentLinks: [""],
	pricing: {
		oneVideo: 0,
		threeVideos: 0,
		fiveVideos: 0,
		bulkVideos: 0,
		aiActorPricing: 0
	},
	id: "",
	verificationId: "",
	userId: "",
	creator: "",
	status: "",
	createdAt: "",
	logoUrl: null,
	firstName: "",
	lastName: "",
	email: "",
	username: "",
	verifiableIDUrl: null,
	verificationVideoUrl: null,
	profilePictureUrl: null,
	aboutMeVideo: null,
	abnNumber: "",
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
		if (typeof indexedDB === "undefined") {
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
	const [isFormValid, setIsFormValid] = useState(false);
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isUploading, setIsUploading] = useState(false);
	const [currentUploadingFile, setCurrentUploadingFile] = useState<
		string | null
	>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [totalFilesToUpload, setTotalFilesToUpload] = useState(0);
	const [completedUploads, setCompletedUploads] = useState(0);

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
						isCompressing: false,
						compressionProgress: 0,
						portfolioVideos: [],
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

					// After restoring aboutMeVideo, add:
					if (
						verificationDataFlags?.portfolioVideosExists &&
						verificationFiles?.portfolioVideosBase64
					) {
						try {
							const portfolioVideos = [];
							for (
								let i = 0;
								i < verificationFiles.portfolioVideosBase64.length;
								i++
							) {
								const base64 = verificationFiles.portfolioVideosBase64[i];
								const metadata = verificationFiles.portfolioVideosMetadata?.[i];

								if (base64 && metadata) {
									portfolioVideos[i] = base64ToFile(
										base64,
										metadata.name || `portfolio-${i}.mp4`,
										metadata.type || "video/mp4"
									);
								} else {
									portfolioVideos[i] = null;
								}
							}
							restoredVerificationData.portfolioVideos = portfolioVideos;
						} catch (error) {
							console.error("Error restoring portfolio videos:", error);
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
							aboutMeVideo: null, // Will set this separately
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

						// Restore aboutMeVideo from IndexedDB if it exists
						if (
							verificationDataFlags?.aboutMeVideoExists &&
							verificationFiles?.aboutMeVideoBase64
						) {
							try {
								restoredProfileData.aboutMeVideo = base64ToFile(
									verificationFiles.aboutMeVideoBase64,
									verificationFiles.aboutMeVideoName || "aboutme.mp4",
									verificationFiles.aboutMeVideoType || "video/mp4"
								);
							} catch (error) {
								console.error("Error restoring about me video:", error);
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

			// Check if we need to compress videos
			let processedVerificationVideo = data.verificationVideo;

			// If there's a new verification video and it needs compression
			if (data.verificationVideo && needsCompression(data.verificationVideo)) {
				try {
					// Update compression status
					setVerificationData((prev) => ({
						...prev,
						isCompressing: true,
						compressionProgress: 0,
					}));

					// Compress the video
					processedVerificationVideo = await compressVideo(
						data.verificationVideo,
						{
							onProgress: (progress) => {
								setVerificationData((prev) => ({
									...prev,
									compressionProgress: progress,
								}));
							},
						}
					);

					console.log(
						`Verification video compressed: ${(data.verificationVideo.size / (1024 * 1024)).toFixed(2)}MB → ${(processedVerificationVideo.size / (1024 * 1024)).toFixed(2)}MB`
					);
				} catch (error) {
					console.error("Error compressing verification video:", error);
					// Continue with the original file but log the error
				} finally {
					// Reset compression status
					setVerificationData((prev) => ({
						...prev,
						isCompressing: false,
						compressionProgress: 1,
					}));
				}
			}

			// Update state first
			const updatedVerificationData = {
				verificationVideo:
					data.verificationVideo !== undefined
						? processedVerificationVideo
						: verificationData.verificationVideo,
				verifiableID:
					data.verifiableID !== undefined
						? data.verifiableID
						: verificationData.verifiableID,
				portfolioVideos:
					data.portfolioVideos !== undefined
						? data.portfolioVideos
						: verificationData.portfolioVideos,
			};

			// Set flags based on updated data
			const existingFlags =
				(await getFromDB(VERIFICATION_STORE, "flags")) || {};
			const storageFlags = {
				...existingFlags,
				verificationVideoExists: !!updatedVerificationData.verificationVideo,
				verifiableIDExists: !!updatedVerificationData.verifiableID,
			};

			// If there's a new verification video, encode it
			if (processedVerificationVideo && data.verificationVideo) {
				const videoBase64 = await fileToBase64(processedVerificationVideo);
				storageData.verificationVideoBase64 = videoBase64;
				storageData.verificationVideoName = processedVerificationVideo.name;
				storageData.verificationVideoType = processedVerificationVideo.type;
			}

			// If there's a new ID, encode it
			if (data.verifiableID) {
				const idBase64 = await fileToBase64(data.verifiableID);
				storageData.verifiableIDBase64 = idBase64;
				storageData.verifiableIDName = data.verifiableID.name;
				storageData.verifiableIDType = data.verifiableID.type;
			}

			if (data.portfolioVideos) {
				// Store portfolio videos in IndexedDB
				const portfolioBase64Array = [];
				const portfolioMetadata = [];

				for (let i = 0; i < data.portfolioVideos.length; i++) {
					const video = data.portfolioVideos[i];
					if (video) {
						const videoBase64 = await fileToBase64(video);
						portfolioBase64Array[i] = videoBase64;
						portfolioMetadata[i] = {
							name: video.name,
							type: video.type,
						};
					} else {
						portfolioBase64Array[i] = null;
						portfolioMetadata[i] = null;
					}
				}

				storageData.portfolioVideosBase64 = portfolioBase64Array;
				storageData.portfolioVideosMetadata = portfolioMetadata;
			}

			// Update the flags to include portfolio videos
			storageFlags.portfolioVideosExists = !!(
				data.portfolioVideos &&
				data.portfolioVideos.some((video) => video !== null)
			);

			// Store in IndexedDB
			await putIntoDB(VERIFICATION_STORE, "flags", storageFlags);
			await putIntoDB(VERIFICATION_STORE, "files", storageData);

			// Update state after successful storage
			setVerificationData((prev) => ({
				...prev,
				verificationVideo:
					updatedVerificationData.verificationVideo ?? prev.verificationVideo,
				verifiableID: updatedVerificationData.verifiableID ?? prev.verifiableID,
				portfolioVideos:
					updatedVerificationData.portfolioVideos ?? prev.portfolioVideos,
				compressionProgress:
					data.compressionProgress ?? prev.compressionProgress,
				isCompressing: prev.isCompressing,
			}));

			// Mark fields as touched
			if (data.verificationVideo !== undefined) {
				setTouched((prev) => ({ ...prev, verificationVideo: true }));
			}
			if (data.verifiableID !== undefined) {
				setTouched((prev) => ({ ...prev, verifiableID: true }));
			}
			if (data.portfolioVideos !== undefined) {
				setTouched((prev) => ({ ...prev, portfolioVideos: true }));
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
			{ key: "aboutMeVideo", label: "About Me Video" },
			{ key: "picture", label: "Profile Picture" },
			{ key: "bio", label: "Bio" },
			{ key: "tiktokUrl", label: "TikTok URL" },
			{ key: "dateOfBirth", label: "Date of Birth" },
			{ key: "gender", label: "Gender" },
			{ key: "country", label: "Country" },
			{ key: "contentTypes", label: "Content Types" },
			{ key: "pricing", label: "Pricing" },
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
			} else if (field.key === "aboutMeVideo") {
				if (!profileData.aboutMeVideo) {
					missingFields.push(field.label);
					errors[field.key] = `${field.label} is required`;
				}
			} else if (
				!profileData[field.key as keyof CreatorProfileData] ||
				(typeof profileData[field.key as keyof CreatorProfileData] ===
					"string" &&
					(
						profileData[field.key as keyof CreatorProfileData] as string
					).trim() === "")
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
			!profileData.tiktokUrl.includes("tiktok.com")
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
				picture:
					data.picture !== undefined ? data.picture : profileData.picture,
				aboutMeVideo:
					data.aboutMeVideo !== undefined
						? data.aboutMeVideo
						: profileData.aboutMeVideo,
			};

			// Prepare data for storage (without the File objects)
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
				pricing: updatedData.pricing,
				abnNumber: updatedData.abnNumber || null,
			};

			// Save to local storage
			localStorage.setItem(
				PROFILE_DATA_KEY,
				JSON.stringify(profileDataToStore)
			);

			// Handle aboutMeVideo storage in IndexedDB
			if (data.aboutMeVideo) {
				try {
					// Get existing files from IndexedDB
					const existingFiles =
						(await getFromDB(VERIFICATION_STORE, "files")) || {};
					const existingFlags =
						(await getFromDB(VERIFICATION_STORE, "flags")) || {};

					// Compress if needed
					let processedAboutMeVideo = data.aboutMeVideo;
					if (
						data.aboutMeVideo instanceof File &&
						needsCompression(data.aboutMeVideo)
					) {
						processedAboutMeVideo = await compressVideo(data.aboutMeVideo, {
							onProgress: (progress) => {
								// Handle compression progress if needed
								console.log(`About me video compression: ${progress * 100}%`);
							},
						});
					}

					// Store in IndexedDB
					let aboutMeVideoBase64: string | null = null;
					if (processedAboutMeVideo instanceof File) {
						aboutMeVideoBase64 = await fileToBase64(processedAboutMeVideo);
					} else {
						throw new Error("processedAboutMeVideo must be a File");
					}
					const updatedFiles = {
						...existingFiles,
						aboutMeVideoBase64: aboutMeVideoBase64,
						aboutMeVideoName: processedAboutMeVideo.name,
						aboutMeVideoType: processedAboutMeVideo.type,
					};

					const updatedFlags = {
						...existingFlags,
						aboutMeVideoExists: true,
					};

					await putIntoDB(VERIFICATION_STORE, "files", updatedFiles);
					await putIntoDB(VERIFICATION_STORE, "flags", updatedFlags);
				} catch (error) {
					console.error("Error storing aboutMeVideo:", error);
					throw error;
				}
			}

			// If there's a new profile picture, save it separately
			if (data.picture) {
				// Save picture data
				const base64 = await fileToBase64(data.picture);
				const pictureData = {
					base64,
					name: data.picture.name,
					type: data.picture.type,
				};
				localStorage.setItem(PROFILE_PICTURE_KEY, JSON.stringify(pictureData));
			}

			// Update touched state for all fields in data
			const newTouched = { ...touched };
			Object.keys(data).forEach((key) => {
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

	const isPortfolioComplete = Boolean(
		verificationData.portfolioVideos &&
			verificationData.portfolioVideos.length >= 3 &&
			verificationData.portfolioVideos.filter((video) => video !== null)
				.length >= 3
	);

	// Submit all data to the API
	const submitVerification = async () => {
		if (!userId) {
			return { success: false, message: "User ID is required" };
		}

		// Force validation before submission
		const profileValidation = validateProfileData(true);

		if (!isVerificationComplete) {
			setFieldErrors((prev) => ({
				...prev,
				verificationVideo: !verificationData.verificationVideo
					? "Verification video is required"
					: "",
				verifiableID: !verificationData.verifiableID
					? "ID verification is required"
					: "",
			}));
			return {
				success: false,
				message: "Please complete all required verification fields",
			};
		}

		if (!isPortfolioComplete) {
			setFieldErrors((prev) => ({
				...prev,
				portfolioVideos: !verificationData.portfolioVideos
					? "Portfolio video is required"
					: "",
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

		setIsUploading(true);
		setLoading(true);

		try {
			// Count total files to upload
			let filesToUpload = 0;
			if (verificationData.verificationVideo) filesToUpload++;
			if (verificationData.verifiableID) filesToUpload++;
			if (profileData.aboutMeVideo) filesToUpload++;
			if (profileData.picture) filesToUpload++;
			// Add portfolio videos count
			if (verificationData.portfolioVideos) {
				filesToUpload += verificationData.portfolioVideos.filter(
					(video) => video !== null
				).length;
			}

			setTotalFilesToUpload(filesToUpload);
			setCompletedUploads(0);

			// Upload files one by one and keep track of the verificationId
			let verificationId = "";

			// Create an updated copy of profileData to track file URLs
			const updatedProfileData = { ...profileData };

			// Upload verification video if exists
			if (verificationData.verificationVideo) {
				setCurrentUploadingFile("verificationVideo");
				setUploadProgress(0);

				// Upload with progress tracking
				const videoResponse = await uploadFileInChunks(
					userId,
					"verificationVideo",
					verificationData.verificationVideo, // passing the File object directly
					verificationId,
					(progress) => setUploadProgress(progress.totalProgress) // use totalProgress from the progress object
				);

				if (!videoResponse.success) {
					throw new Error(
						videoResponse.message || "Failed to upload verification video"
					);
				}

				// Store the URL in the profile data
				updatedProfileData.verificationVideoUrl = videoResponse.fileUrl ?? null;
				verificationId = videoResponse.verificationId ?? "";
				setCompletedUploads((prev) => prev + 1);
			}

			// Upload verifiable ID if exists
			if (verificationData.verifiableID) {
				setCurrentUploadingFile("verifiableID");
				setUploadProgress(0);

				const idResponse = await uploadFileInChunks(
					userId,
					"verifiableID",
					verificationData.verifiableID,
					verificationId,
					(progress) => setUploadProgress(progress.totalProgress)
				);

				if (!idResponse.success) {
					throw new Error(idResponse.message || "Failed to upload ID document");
				}

				// Store the URL in the profile data
				updatedProfileData.verifiableIDUrl = idResponse.fileUrl ?? null;
				verificationId = idResponse.verificationId ?? "";
				setCompletedUploads((prev) => prev + 1);
			}

			// Upload about me video if exists
			if (profileData.aboutMeVideo) {
				setCurrentUploadingFile("aboutMeVideo");
				setUploadProgress(0);

				const aboutMeVideoResponse = await uploadFileInChunks(
					userId,
					"aboutMeVideo",
					profileData.aboutMeVideo && profileData.aboutMeVideo instanceof File
						? profileData.aboutMeVideo
						: (() => {
								throw new Error("aboutMeVideo must be a File");
							})(),
					verificationId,
					(progress) => setUploadProgress(progress.totalProgress)
				);

				if (!aboutMeVideoResponse.success) {
					throw new Error(
						aboutMeVideoResponse.message || "Failed to upload about me video"
					);
				}

				// Store the URL in the profile data
				updatedProfileData.aboutMeVideo = aboutMeVideoResponse.fileUrl ?? null;
				verificationId = aboutMeVideoResponse.verificationId ?? "";
				setCompletedUploads((prev) => prev + 1);
			}

			// Upload profile picture if exists
			if (profileData.picture) {
				setCurrentUploadingFile("profilePicture");
				setUploadProgress(0);

				const profilePictureResponse = await uploadFileInChunks(
					userId,
					"profilePicture",
					profileData.picture,
					verificationId,
					(progress) => setUploadProgress(progress.totalProgress)
				);

				if (!profilePictureResponse.success) {
					throw new Error(
						profilePictureResponse.message || "Failed to upload profile picture"
					);
				}

				// Store the URL in the profile data
				updatedProfileData.profilePictureUrl =
					profilePictureResponse.fileUrl ?? null;
				verificationId = profilePictureResponse.verificationId ?? "";
				setCompletedUploads((prev) => prev + 1);
			}

			// Upload portfolio videos if they exist
			const portfolioVideoUrls = [];
			if (
				verificationData.portfolioVideos &&
				verificationData.portfolioVideos.length > 0
			) {
				for (let i = 0; i < verificationData.portfolioVideos.length; i++) {
					const portfolioVideo = verificationData.portfolioVideos[i];
					if (portfolioVideo) {
						setCurrentUploadingFile(`portfolioVideo-${i + 1}`);
						setUploadProgress(0);

						const portfolioResponse = await uploadFileInChunks(
							userId,
							`portfolioVideo-${i}`, // or however you want to name them
							portfolioVideo,
							verificationId,
							(progress) => setUploadProgress(progress.totalProgress)
						);

						if (!portfolioResponse.success) {
							throw new Error(
								portfolioResponse.message ||
									`Failed to upload portfolio video ${i + 1}`
							);
						}

						portfolioVideoUrls[i] = portfolioResponse.fileUrl ?? null;
						verificationId = portfolioResponse.verificationId ?? "";
						setCompletedUploads((prev) => prev + 1);
					} else {
						portfolioVideoUrls[i] = null;
					}
				}
			}

			// Now submit the complete profile data with all file URLs
			const submitData = {
				...updatedProfileData,
				userId,
				verificationId,
				portfolioVideoUrls,
			};

			// Make the final API call to submit all the data
			const response = await fetch("/api/submit-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(submitData),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to submit verification");
			}

			// Clear form data after successful submission
			await resetForm();

			return {
				success: true,
				message: result.message || "Verification submitted successfully",
			};
		} catch (error) {
			console.error("Error submitting verification:", error);
			return {
				success: false,
				message: error instanceof Error ? error.message : "Submission failed",
			};
		} finally {
			setLoading(false);
			setIsUploading(false);
			setCurrentUploadingFile(null);
			setUploadProgress(0);
			setTotalFilesToUpload(0);
			setCompletedUploads(0);
		}
	};

	const contextValue: CreatorVerificationContextType = {
		verificationData,
		profileData,
		updateVerificationData,
		updateProfileData,
		isVerificationComplete,
		isPortfolioComplete,
		isProfileComplete,
		isFormValid,
		submitVerification,
		loading,
		fieldErrors,
		validateProfileData,
		clearFieldError,
		touched,
		setTouched,
		resetForm,
		isCompressing: verificationData.isCompressing,
		compressionProgress: verificationData.compressionProgress,
		isUploading,
		currentUploadingFile,
		uploadProgress,
		totalFilesToUpload,
		completedUploads,
	};

	return (
		<CreatorVerificationContext.Provider value={contextValue}>
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
