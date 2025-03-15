import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from "./social-shake-firebase-adminsdk-a2y0c-7c0a54d036.json";

// Initialize Firebase Admin
const apps = getApps();
let firebaseAdmin;

if (apps.length === 0) {
  // Check if using environment variables or JSON file
  if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use environment variables in production
    firebaseAdmin = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      } as ServiceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Use JSON file in development
    firebaseAdmin = initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
} else {
  firebaseAdmin = apps[0];
}

// Initialize services
const adminDb = getFirestore();
const adminStorage = getStorage();

export { firebaseAdmin, adminDb, adminStorage };