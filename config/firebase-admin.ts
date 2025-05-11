import { initializeApp, cert, getApps } from 'firebase-admin/app';
import serviceAccount from '@/config/social-shake-firebase-adminsdk-a2y0c-7c0a54d036.json';
import { ServiceAccount } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
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