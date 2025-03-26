import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Enhanced Firebase Admin initialization
function initializeFirebaseAdmin() {
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
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('utf-8')
  : undefined;

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`Missing environment variable: ${varName}`);
      throw new Error(`Missing critical Firebase configuration: ${varName}`);
    }
  });

  try {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      // Optional: Add storage bucket if needed
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });

    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Initialize Firebase Admin app
const firebaseAdmin = initializeFirebaseAdmin();

// Initialize services
const adminDb = getFirestore(firebaseAdmin);
const adminStorage = getStorage(firebaseAdmin);

export { 
  firebaseAdmin, 
  adminDb, 
  adminStorage,
  initializeFirebaseAdmin  // Keep this for potential manual initialization
};