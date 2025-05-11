import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

// Load environment variables explicitly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Enhanced Firebase Admin initialization function
function initializeFirebaseAdmin(): App {
  // Prevent re-initialization
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check for missing environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // Validation
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not defined');
  }
  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is not defined');
  }
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not defined');
  }

  try {
    // Process private key if needed (sometimes required due to newline characters)
    const processedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: processedPrivateKey
      }),
      storageBucket
    });

    console.log('Firebase Admin initialized successfully');
    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Initialize Firebase Admin app - use IIFE to ensure immediate initialization
const firebaseAdmin = (() => {
  try {
    return initializeFirebaseAdmin();
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    // Re-throw to prevent using uninitialized Firebase services
    throw error;
  }
})();

// Initialize services directly without conditional checks
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
  initializeFirebaseAdmin // Keep this for potential manual initialization
};