import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
const apps = getApps();
let firebaseAdmin;

if (apps.length === 0) {
  // Use environment variables for Firebase Admin initialization
  firebaseAdmin = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    } as ServiceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  firebaseAdmin = apps[0];
}

// Initialize services
const adminDb = getFirestore();
const adminStorage = getStorage();

export { firebaseAdmin, adminDb, adminStorage };