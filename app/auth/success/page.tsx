"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { app } from "@/config/firebase";

// Create a separate component that uses the standard URLSearchParams API
function AuthHandler() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // Get the token from URL only after component mounts (client-side)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get("token");
    setToken(urlToken);
  }, []);

  useEffect(() => {
    async function signInWithToken() {
      if (token) {
        try {
          const auth = getAuth(app);
          if (typeof token === "string") {
            await signInWithCustomToken(auth, token);
          } else {
            throw new Error("Invalid token format");
          }

          // Redirect to dashboard or home page after successful login
          router.replace("/creator/verify-identity");
        } catch (error) {
          console.error("Error signing in with custom token:", error);
          router.replace("/creator/login?error=Authentication failed");
        }
      }
    }

    signInWithToken();
  }, [token, router]);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Logging you in...</h1>
      <p>Please wait while we complete the authentication process.</p>
    </div>
  );
}

export default function AuthSuccess() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthHandler />
    </div>
  );
}
