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
function initializeFirebaseAdmin() {
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
    // Some environments require replacing "\\n" with actual newlines
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

// Initialize Firebase Admin app
let firebaseAdmin: App | undefined;
try {
  firebaseAdmin = initializeFirebaseAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  // Depending on your application, you might want to handle this differently
}

const adminDb = firebaseAdmin ? getFirestore(firebaseAdmin) : null;
const adminAuth = firebaseAdmin ? getAuth(firebaseAdmin) : null;
const adminStorage = firebaseAdmin ? getStorage(firebaseAdmin) : null;
const getFirebaseAdminApp = () => firebaseAdmin;

export {
  firebaseAdmin,
  adminDb,
  adminAuth,
  adminStorage,
  getFirebaseAdminApp,
  initializeFirebaseAdmin // Keep this for potential manual initialization
};