// src/context/AuthContext.tsx
"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { auth } from "@/config/firebase";
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	signInWithPopup,
	GoogleAuthProvider,
	FacebookAuthProvider,
	User,
} from "firebase/auth";
import { useRouter } from "next/navigation";

type AuthContextType = {
	user: User | null;
	loading: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<void>;
	signup: (email: string, password: string) => Promise<void>;
	loginWithGoogle: () => Promise<void>;
	loginWithFacebook: () => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setUser(user);
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	const clearError = () => {
		setError(null);
	};

	const login = async (email: string, password: string) => {
		setLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email, password);
			router.push("/dashboard"); // Redirect to dashboard after login
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to login");
		} finally {
			setLoading(false);
		}
	};

	const signup = async (email: string, password: string) => {
		setLoading(true);
		try {
			await createUserWithEmailAndPassword(auth, email, password);
			router.push("/account-successfully-created"); // Redirect to create profile
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to create account");
		} finally {
			setLoading(false);
		}
	};

	const loginWithGoogle = async () => {
		setLoading(true);
		const provider = new GoogleAuthProvider();
		try {
			await signInWithPopup(auth, provider);
			router.push("/dashboard");
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to login with Google");
		} finally {
			setLoading(false);
		}
	};

	const loginWithFacebook = async () => {
		setLoading(true);
		const provider = new FacebookAuthProvider();
		try {
			await signInWithPopup(auth, provider);
			router.push("/dashboard");
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to login with Facebook");
		} finally {
			setLoading(false);
		}
	};

	const logout = async () => {
		setLoading(true);
		try {
			await signOut(auth);
			router.push("/login");
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to logout");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				error,
				login,
				signup,
				loginWithGoogle,
				loginWithFacebook,
				logout,
				clearError,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
