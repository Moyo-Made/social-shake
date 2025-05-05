"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	sendPasswordResetEmail,
	signInWithPopup,
	GoogleAuthProvider,
	FacebookAuthProvider,
	getAdditionalUserInfo,
	User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User, UserRole } from "@/types/user";

interface AuthContextType {
	currentUser: User | null;
	isAdmin: boolean;
	isLoading: boolean;
	error: string | null;
	hasProfile: boolean;
	login: (email: string, password: string) => Promise<void>;
	signup: (email: string, password: string) => Promise<{ user: FirebaseUser }>;
	loginWithGoogle: () => Promise<{ isExistingAccount: boolean }>;
	loginWithFacebook: () => Promise<void>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	clearError: () => void;
	getIdToken?: () => Promise<string>; 
}

const AuthContext = createContext<AuthContextType>({
	currentUser: null,
	isAdmin: false,
	isLoading: true,
	error: null,
	hasProfile: false,
	login: async () => {},
	signup: async () => ({ user: {} as FirebaseUser }),
	loginWithGoogle: async () => ({ isExistingAccount: false }),
	loginWithFacebook: async () => {},
	logout: async () => {},
	resetPassword: async () => {},
	clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [isAdmin, setIsAdmin] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [hasProfile, setHasProfile] = useState<boolean>(false);

	// Helper function to update user document in Firestore
	const updateUserDocument = async (
		uid: string,
		email: string,
		isNewUser: boolean = false
	): Promise<void> => {
		const userRef = doc(db, "users", uid);

		if (isNewUser) {
			// For new users, create a new document
			await setDoc(userRef, {
				email,
				role: UserRole.USER, // Default role
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} else {
			// For existing users, check if the document exists
			const userDoc = await getDoc(userRef);
			if (!userDoc.exists()) {
				// Create document if it doesn't exist
				await setDoc(userRef, {
					email,
					role: UserRole.USER,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		}
	};

	// Helper function to fetch and set user data
	const fetchUserData = async (firebaseUser: FirebaseUser): Promise<void> => {
		try {
			// Make sure we have a valid email before checking brandProfiles
			if (firebaseUser.email) {
			  // Check if user has a brand profile
			  try {
				const brandProfileDoc = await getDoc(doc(db, "brandProfiles", firebaseUser.email));
				setHasProfile(brandProfileDoc.exists());
			  } catch (profileError) {
				console.warn("Could not check brand profile:", profileError);
				// Continue with the rest of the function even if this fails
				setHasProfile(false);
			  }
			} else {
			  setHasProfile(false);
			}

			// Force refresh to get latest claims
			await firebaseUser.getIdToken(true);
			const tokenResult = await firebaseUser.getIdTokenResult();

			// Check admin claim
			const isUserAdmin = tokenResult.claims.admin === true;
			setIsAdmin(isUserAdmin);

			// Get additional user data from Firestore
			const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

			if (userDoc.exists()) {
				const userData = userDoc.data() as Omit<User, "uid">;
				setCurrentUser({
					uid: firebaseUser.uid,
					...userData,
				});
			} else {
				// If user document doesn't exist, create it
				await updateUserDocument(firebaseUser.uid, firebaseUser.email || "");

				// Fetch again to ensure we have data
				const newUserDoc = await getDoc(doc(db, "users", firebaseUser.uid));
				if (newUserDoc.exists()) {
					const userData = newUserDoc.data() as Omit<User, "uid">;
					setCurrentUser({
						uid: firebaseUser.uid,
						...userData,
					});
				} else {
					setCurrentUser(null);
				}
			}
		} catch (error) {
			console.error("Error fetching user data:", error);
			setCurrentUser(null);
			setIsAdmin(false);
			setError("Error fetching user data");
			throw error; // Re-throw to handle in caller
		}
	};

	useEffect(() => {
		setIsLoading(true);
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					await fetchUserData(firebaseUser);
				} catch (error) {
					console.error("Error in auth state change:", error);
					// Errors are already set in fetchUserData
				}
			} else {
				setCurrentUser(null);
				setIsAdmin(false);
				setHasProfile(false);
			}
			setIsLoading(false);
		});

		return unsubscribe;
	}, []);

	const clearError = (): void => {
		setError(null);
	};

	const login = async (email: string, password: string): Promise<void> => {
		setIsLoading(true);
		setError(null);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			
			// Wait for user data to be fetched explicitly before returning
			await fetchUserData(userCredential.user);
			
		} catch (err) {
			console.error("Login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login");
			} else {
				setError("Failed to login");
			}
			throw err; // Re-throw to handle in the component
		} finally {
			setIsLoading(false);
		}
	};

	const signup = async (email: string, password: string): Promise<{ user: FirebaseUser }> => {
		setIsLoading(true);
		setError(null);
		try {
			// Create the user
			const result = await createUserWithEmailAndPassword(auth, email, password);
			
			// Create user document in Firestore
			await updateUserDocument(result.user.uid, email, true);
			
			// Explicitly fetch user data to ensure it's loaded
			await fetchUserData(result.user);
			
			// Return the user information
			return { user: result.user };
		} catch (err) {
			console.error("Signup error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to create account");
			} else {
				setError("Failed to create account");
			}
			throw err; // Re-throw to handle in the component
		} finally {
			setIsLoading(false);
		}
	};

	const loginWithGoogle = async (): Promise<{ isExistingAccount: boolean }> => {
		setIsLoading(true);
		setError(null);
		const provider = new GoogleAuthProvider();
		let isNewUser = false;
		
		try {
			const result = await signInWithPopup(auth, provider);
			const additionalInfo = getAdditionalUserInfo(result);
			isNewUser = additionalInfo?.isNewUser ?? false;
			
			// Make sure to await this operation
			if (result.user.email) {
				await updateUserDocument(result.user.uid, result.user.email, isNewUser);
			}
			
			// Also await fetchUserData to ensure user data is loaded
			await fetchUserData(result.user);
			
			return { isExistingAccount: !isNewUser };
		} catch (err) {
			console.error("Google login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login with Google");
			} else {
				setError("Failed to login with Google");
			}
			throw err;  // Make sure to throw the error to handle it in the component
		} finally {
			setIsLoading(false);
		}
	};

	const loginWithFacebook = async (): Promise<void> => {
		setIsLoading(true);
		setError(null);
		try {
			const provider = new FacebookAuthProvider();
			const result = await signInWithPopup(auth, provider);
			const additionalInfo = getAdditionalUserInfo(result);
			const isNewUser = additionalInfo?.isNewUser ?? false;

			// Update user document in Firestore
			if (result.user.email) {
				await updateUserDocument(result.user.uid, result.user.email, isNewUser);
			}
			
			// Wait for user data to be fetched explicitly
			await fetchUserData(result.user);
		} catch (err) {
			console.error("Facebook login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login with Facebook");
			} else {
				setError("Failed to login with Facebook");
			}
			throw err; // Re-throw to handle in the component
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async (): Promise<void> => {
		setIsLoading(true);
		setError(null);
		try {
			await signOut(auth);
			// Clear user state immediately after logout
			setCurrentUser(null);
			setIsAdmin(false);
			setHasProfile(false);
		} catch (err) {
			console.error("Logout error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to logout");
			} else {
				setError("Failed to logout");
			}
			throw err; // Re-throw to handle in the component
		} finally {
			setIsLoading(false);
		}
	};

	const resetPassword = async (email: string): Promise<void> => {
		setIsLoading(true);
		setError(null);
		try {
			await sendPasswordResetEmail(auth, email);
		} catch (err) {
			console.error("Password reset error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to send password reset email");
			} else {
				setError("Failed to send password reset email");
			}
			throw err; // Re-throw to handle in the component
		} finally {
			setIsLoading(false);
		}
	};

	const value = {
		currentUser,
		isAdmin,
		isLoading,
		error,
		hasProfile,
		login,
		signup,
		loginWithGoogle,
		loginWithFacebook,
		logout,
		resetPassword,
		clearError,
		getIdToken: async () => {
			if (auth.currentUser) {
			  return await auth.currentUser.getIdToken(true);
			}
			return '';
		  }
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};