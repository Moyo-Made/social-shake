// app/utils/sessionStore.ts
import { adminDb } from "@/config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION_NAME = "authSessions";
const EXPIRY_MINUTES = 10;

export const setStateSession = async (state: string, userId?: string): Promise<void> => {
  console.log(`STORING STATE: ${state}${userId ? ` for user: ${userId}` : ''}`);
  
  // Create a session with expiration timestamp
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + EXPIRY_MINUTES);
  
  await adminDb.collection(COLLECTION_NAME).doc(state).set({
    created: Timestamp.now(),
    expires: Timestamp.fromDate(expiryTime),
    userId: userId || null // Store userId if provided
  });
  
  console.log(`Session stored for state: ${state}`);
};

export const verifyStateSession = async (state: string): Promise<boolean> => {
  console.log(`VERIFYING STATE: ${state}`);
  
  try {
    const sessionDoc = await adminDb.collection(COLLECTION_NAME).doc(state).get();
    
    if (!sessionDoc.exists) {
      console.log(`No session found for state: ${state}`);
      return false;
    }
    
    const sessionData = sessionDoc.data();
    const expiryTimestamp = sessionData?.expires?.toDate();
    
    if (!expiryTimestamp || expiryTimestamp < new Date()) {
      console.log(`Session expired for state: ${state}`);
      await clearStateSession(state); // Clean up expired session
      return false;
    }
    
    console.log(`Valid session found for state: ${state}`);
    return true;
  } catch (error) {
    console.error(`Error verifying session for state ${state}:`, error);
    return false;
  }
};

export const getUserIdFromState = async (state: string): Promise<string | null> => {
  console.log(`RETRIEVING USER ID FOR STATE: ${state}`);
  
  try {
    const sessionDoc = await adminDb.collection(COLLECTION_NAME).doc(state).get();
    
    if (!sessionDoc.exists) {
      console.log(`No session found for state: ${state}`);
      return null;
    }
    
    const sessionData = sessionDoc.data();
    const userId = sessionData?.userId;
    
    if (!userId) {
      console.log(`No userId found in session for state: ${state}`);
      return null;
    }
    
    console.log(`Retrieved userId: ${userId} for state: ${state}`);
    return userId;
  } catch (error) {
    console.error(`Error retrieving userId for state ${state}:`, error);
    return null;
  }
};

export const clearStateSession = async (state: string): Promise<void> => {
  try {
    await adminDb.collection(COLLECTION_NAME).doc(state).delete();
    console.log(`Session cleared for state: ${state}`);
  } catch (error) {
    console.error(`Error clearing session for state ${state}:`, error);
  }
};