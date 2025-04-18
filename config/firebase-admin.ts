import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

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
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined
      }),
      // Optional: Add storage bucket if needed
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Initialize Firebase Admin app
const firebaseAdmin = initializeFirebaseAdmin();

const adminDb = getFirestore(firebaseAdmin);
const adminAuth = getAuth(firebaseAdmin);
const adminStorage = getStorage(firebaseAdmin);
const getFirebaseAdminApp = () => firebaseAdmin;

export { 
  firebaseAdmin, 
  adminDb,
  adminAuth,
  adminStorage,
  getFirebaseAdminApp,
  initializeFirebaseAdmin  // Keep this for potential manual initialization
};