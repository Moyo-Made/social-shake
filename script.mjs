// script.mjs - Run this once to configure CORS for your bucket
// Using .mjs extension for ESM modules
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin directly in this script
function initializeFirebaseAdmin() {
  try {
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

    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Initialize admin and get storage
const firebaseAdmin = initializeFirebaseAdmin();
const adminStorage = getStorage(firebaseAdmin);

async function configureCors() {
  try {
    const bucket = adminStorage.bucket();
    
    // Configure CORS for the bucket
    await bucket.setCorsConfiguration([
      {
        origin: ["http://localhost:3000", "https://social-shake.vercel.app/"],
        method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        maxAgeSeconds: 3600,
        responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent"]
      }
    ]);
    
    console.log("CORS configuration has been updated successfully!");
    
    // Verify the configuration
    const [corsConfig] = await bucket.getCorsConfiguration();
    console.log("Current CORS configuration:", corsConfig);
  } catch (error) {
    console.error("Error updating CORS configuration:", error);
  }
}

configureCors();