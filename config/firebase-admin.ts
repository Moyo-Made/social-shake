import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { ServiceAccount } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];

  // Create service account from environment variables
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
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