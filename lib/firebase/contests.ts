import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Updates the status of a contest in Firestore
 * @param {string} contestId - The ID of the contest to update
 * @param {string} status - The new status ('draft', 'pending_payment', 'published', etc.)
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateContestStatus(contestId: string, status: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const contestRef = doc(db, 'contests', contestId);
    await updateDoc(contestRef, { 
      status,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating contest status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
  }
}