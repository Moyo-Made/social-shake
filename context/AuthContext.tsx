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
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  User,
  getAdditionalUserInfo
} from "firebase/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ isExistingAccount: boolean }>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to login");
      } else {
        setError("Failed to login");
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Create the user
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to create account");
      } else {
        setError("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };


  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    let isNewUser = false;
    
    try {
      const result = await signInWithPopup(auth, provider);
      // Get additional info including isNewUser flag
      const additionalInfo = getAdditionalUserInfo(result);
      isNewUser = additionalInfo?.isNewUser ?? false;
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to login with Google");
      } else {
        setError("Failed to login with Google");
      }
    } finally {
      setLoading(false);
    }
    
    return { isExistingAccount: !isNewUser };
  };

  const loginWithFacebook = async () => {
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to login with Facebook");
      } else {
        setError("Failed to login with Facebook");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to logout");
      } else {
        setError("Failed to logout");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to send password reset email");
      } else {
        setError("Failed to send password reset email");
      }
      throw err; 
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
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};