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
  resetPassword: (email: string) => Promise<void>;
  sendOTPEmail: (email: string, otp: string) => Promise<boolean>; // Add this line
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
      router.push("/dashboard");
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
      
      // Generate and send OTP for verification
      const otp = generateOTP();
      await sendOTPEmail(email, otp);
      
      // Redirect to verification page instead of success page
      router.push(`/account-successfully-created`);
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
    try {
      await signInWithPopup(auth, provider);
      router.push("/account-successfully-created");
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
  };

  const loginWithFacebook = async () => {
    setLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/account-successfully-created");
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
      router.push("/login");
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

  const sendOTPEmail = async (email: string, otp: string) => {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          message: "Your verification code is valid for 10 minutes."
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send verification email');
      }
      
      console.log('Email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      if (error instanceof Error) {
        setError(error.message || "Failed to send verification email");
      } else {
        setError("Failed to send verification email");
      }
      return false;
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
        sendOTPEmail, 
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};