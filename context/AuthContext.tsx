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
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User, UserRole } from "@/types/user";

interface AuthContextType {
	currentUser: User | null;
	isAdmin: boolean;
	isLoading: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	signup: (email: string, password: string) => Promise<{ user: any }>;
	loginWithGoogle: () => Promise<{ isExistingAccount: boolean }>;
	loginWithFacebook: () => Promise<void>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
	currentUser: null,
	isAdmin: false,
	isLoading: true,
	error: null,
	login: async () => {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	signup: async () => ({ user: {} as any }),
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

	// Helper function to update user document in Firestore
	const updateUserDocument = async (
		uid: string,
		email: string,
		isNewUser: boolean = false
	) => {
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fetchUserData = async (firebaseUser: any) => {
		try {
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
		}
	};

	useEffect(() => {
		setIsLoading(true);
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				await fetchUserData(firebaseUser);
			} else {
				setCurrentUser(null);
				setIsAdmin(false);
			}
			setIsLoading(false);
		});

		return unsubscribe;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const clearError = () => {
		setError(null);
	};

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		setError(null);
		try {
		  const userCredential = await signInWithEmailAndPassword(auth, email, password);
		  
		  // Wait for user data to be fetched explicitly
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

	  const signup = async (email: string, password: string) => {
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

	const loginWithGoogle = async () => {
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
		  throw err;  // Make sure to throw the error to handle it in the signup function
		} finally {
		  setIsLoading(false);
		}
	  };

	const loginWithFacebook = async () => {
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
		} catch (err) {
			console.error("Facebook login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login with Facebook");
			} else {
				setError("Failed to login with Facebook");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		setIsLoading(true);
		setError(null);
		try {
			await signOut(auth);
		} catch (err) {
			console.error("Logout error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to logout");
			} else {
				setError("Failed to logout");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const resetPassword = async (email: string) => {
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
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const value = {
		currentUser,
		isAdmin,
		isLoading,
		error,
		login,
		signup,
		loginWithGoogle,
		loginWithFacebook,
		logout,
		resetPassword,
		clearError,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
