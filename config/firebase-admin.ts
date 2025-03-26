import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Enhanced Firebase Admin initialization
export function initializeFirebaseAdmin() {
  // Prevent re-initialization
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Validate critical environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`Missing environment variable: ${varName}`);
      throw new Error(`Missing critical Firebase configuration: ${varName}`);
    }
  });

  try {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined
      }),
      // Optional: Add storage bucket if needed
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Safe Firestore access
export function getAdminFirestore() {
  try {
    return getFirestore(initializeFirebaseAdmin());
  } catch (error) {
    console.error('Failed to get Firestore instance:', error);
    throw error;
  }
}