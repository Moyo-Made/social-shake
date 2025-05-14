"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '@/config/firebase';

export default function AuthSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    async function signInWithToken() {
      if (token) {
        try {
          const auth = getAuth(app);
          if (typeof token === 'string') {
            await signInWithCustomToken(auth, token);
          } else {
            throw new Error('Invalid token format');
          }
          
          // Redirect to dashboard or home page after successful login
          router.replace('/creator/verify-identity');
        } catch (error) {
          console.error('Error signing in with custom token:', error);
          router.replace('/creator/login?error=Authentication failed');
        }
      }
    }
    
    signInWithToken();
  }, [token, router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging you in...</h1>
        <p>Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
}