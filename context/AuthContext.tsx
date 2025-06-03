"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
	
	// Add refs to track initialization and prevent unnecessary refetches
	const isInitialized = useRef(false);
	const userDataCache = useRef<Map<string, User>>(new Map());
	const profileCache = useRef<Map<string, boolean>>(new Map());

	// Helper function to update user document in Firestore
	const updateUserDocument = async (
		uid: string,
		email: string,
		isNewUser: boolean = false
	): Promise<void> => {
		const userRef = doc(db, "users", uid);

		if (isNewUser) {
			await setDoc(userRef, {
				email,
				role: UserRole.USER,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} else {
			const userDoc = await getDoc(userRef);
			if (!userDoc.exists()) {
				await setDoc(userRef, {
					email,
					role: UserRole.USER,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		}
	};

	// Helper function to fetch and set user data with caching
	const fetchUserData = async (firebaseUser: FirebaseUser, forceRefresh: boolean = false): Promise<void> => {
		try {
			if (!firebaseUser) {
				setCurrentUser(null);
				setIsAdmin(false);
				setHasProfile(false);
				return;
			}

			const uid = firebaseUser.uid;
			const email = firebaseUser.email || "";

			// Check cache first unless force refresh is requested
			if (!forceRefresh && userDataCache.current.has(uid)) {
				const cachedUser = userDataCache.current.get(uid)!;
				setCurrentUser(cachedUser);
				
				// Set cached profile status
				if (profileCache.current.has(email)) {
					setHasProfile(profileCache.current.get(email)!);
				}
				
				// Still need to check admin status as it might change
				try {
					const tokenResult = await firebaseUser.getIdTokenResult();
					const isUserAdmin = tokenResult.claims.admin === true;
					setIsAdmin(isUserAdmin);
				} catch (adminError) {
					console.error("Error checking admin status:", adminError);
					setIsAdmin(false);
				}
				
				return;
			}

			// Force refresh token to get latest claims
			try {
				await firebaseUser.getIdToken(true);
			} catch (tokenError) {
				console.error("Error refreshing token:", tokenError);
			}

			// Check brand profile with caching
			if (email && (!profileCache.current.has(email) || forceRefresh)) {
				try {
					const brandProfileDoc = await getDoc(doc(db, "brandProfiles", email));
					const hasUserProfile = brandProfileDoc.exists();
					profileCache.current.set(email, hasUserProfile);
					setHasProfile(hasUserProfile);
				} catch (profileError) {
					console.warn("Could not check brand profile:", profileError);
					setHasProfile(false);
				}
			} else if (email && profileCache.current.has(email)) {
				setHasProfile(profileCache.current.get(email)!);
			}

			// Get admin status
			try {
				const tokenResult = await firebaseUser.getIdTokenResult();
				const isUserAdmin = tokenResult.claims.admin === true;
				setIsAdmin(isUserAdmin);
			} catch (adminError) {
				console.error("Error checking admin status:", adminError);
				setIsAdmin(false);
			}

			// Get user document from Firestore
			try {
				const userRef = doc(db, "users", uid);
				const userDoc = await getDoc(userRef);

				if (userDoc.exists()) {
					const userData = userDoc.data() as Omit<User, "uid">;
					const user: User = {
						uid,
						...userData,
					};
					
					// Cache the user data
					userDataCache.current.set(uid, user);
					setCurrentUser(user);
				} else {
					// Document doesn't exist - create it
					try {
						await setDoc(userRef, {
							email,
							role: UserRole.USER,
							createdAt: new Date(),
							updatedAt: new Date(),
						});

						const newUserDoc = await getDoc(userRef);
						if (newUserDoc.exists()) {
							const userData = newUserDoc.data() as Omit<User, "uid">;
							const user: User = {
								uid,
								...userData,
							};
							userDataCache.current.set(uid, user);
							setCurrentUser(user);
						} else {
							console.error("Failed to fetch user after creation");
							setCurrentUser(null);
						}
					} catch (createError) {
						console.error("Error creating user document:", createError);
						const user: User = {
							uid,
							email,
							role: UserRole.USER,
						} as User;
						userDataCache.current.set(uid, user);
						setCurrentUser(user);
					}
				}
			} catch (userDocError) {
				console.error("Error fetching user document:", userDocError);
				const user: User = {
					uid,
					email,
					role: UserRole.USER,
				} as User;
				userDataCache.current.set(uid, user);
				setCurrentUser(user);
			}
		} catch (error) {
			console.error("Error in fetchUserData:", error);
			setCurrentUser(null);
			setIsAdmin(false);
			setHasProfile(false);
			setError("Error fetching user data");
		}
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			// Only set loading to true on the initial load
			if (!isInitialized.current) {
				setIsLoading(true);
			}

			if (firebaseUser) {
				try {
					// Use cache for subsequent loads unless it's the first initialization
					await fetchUserData(firebaseUser, !isInitialized.current);
				} catch (error) {
					console.error("Error in auth state change:", error);
				}
			} else {
				setCurrentUser(null);
				setIsAdmin(false);
				setHasProfile(false);
				// Clear caches on logout
				userDataCache.current.clear();
				profileCache.current.clear();
			}
			
			setIsLoading(false);
			isInitialized.current = true;
		});

		return unsubscribe;
	}, []);

	const clearError = (): void => {
		setError(null);
	};

	// Clear cache when user data might have changed
	const clearUserCache = (uid?: string) => {
		if (uid) {
			userDataCache.current.delete(uid);
		} else {
			userDataCache.current.clear();
		}
	};

	const login = async (email: string, password: string): Promise<void> => {
		setError(null);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			// Clear any existing cache for this user to ensure fresh data
			clearUserCache(userCredential.user.uid);
			await fetchUserData(userCredential.user, true);
		} catch (err) {
			console.error("Login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login");
			} else {
				setError("Failed to login");
			}
			throw err;
		}
	};

	const signup = async (
		email: string,
		password: string
	): Promise<{ user: FirebaseUser }> => {
		setError(null);
		try {
			const result = await createUserWithEmailAndPassword(auth, email, password);
			await updateUserDocument(result.user.uid, email, true);
			await fetchUserData(result.user, true);
			return { user: result.user };
		} catch (err) {
			console.error("Signup error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to create account");
			} else {
				setError("Failed to create account");
			}
			throw err;
		}
	};

	const loginWithGoogle = async (): Promise<{ isExistingAccount: boolean }> => {
		setError(null);
		const provider = new GoogleAuthProvider();
		let isNewUser = false;

		try {
			const result = await signInWithPopup(auth, provider);
			const additionalInfo = getAdditionalUserInfo(result);
			isNewUser = additionalInfo?.isNewUser ?? false;

			if (result.user.email) {
				await updateUserDocument(result.user.uid, result.user.email, isNewUser);
			}

			// Clear cache for fresh data on login
			clearUserCache(result.user.uid);
			await fetchUserData(result.user, true);

			return { isExistingAccount: !isNewUser };
		} catch (err) {
			console.error("Google login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login with Google");
			} else {
				setError("Failed to login with Google");
			}
			throw err;
		}
	};

	const loginWithFacebook = async (): Promise<void> => {
		setError(null);
		try {
			const provider = new FacebookAuthProvider();
			const result = await signInWithPopup(auth, provider);
			const additionalInfo = getAdditionalUserInfo(result);
			const isNewUser = additionalInfo?.isNewUser ?? false;

			if (result.user.email) {
				await updateUserDocument(result.user.uid, result.user.email, isNewUser);
			}

			clearUserCache(result.user.uid);
			await fetchUserData(result.user, true);
		} catch (err) {
			console.error("Facebook login error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to login with Facebook");
			} else {
				setError("Failed to login with Facebook");
			}
			throw err;
		}
	};

	const logout = async (): Promise<void> => {
		setError(null);
		try {
			await signOut(auth);
			setCurrentUser(null);
			setIsAdmin(false);
			setHasProfile(false);
			// Clear all caches on logout
			userDataCache.current.clear();
			profileCache.current.clear();
		} catch (err) {
			console.error("Logout error:", err);
			if (err instanceof Error) {
				setError(err.message || "Failed to logout");
			} else {
				setError("Failed to logout");
			}
			throw err;
		}
	};

	const resetPassword = async (email: string): Promise<void> => {
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
			return "";
		},
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};