import { adminDb } from "@/config/firebase-admin";

interface PaymentRecord {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: string;
  userId: string;
  amount: number;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripePaymentStatus?: string;
  submissionId?: string;
  projectId?: string;
  itemId?: string;
  itemData?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to update payment status (called by webhooks)
export async function updatePaymentStatus(
  paymentId: string,
  status: 'completed' | 'failed',
  itemData?: {
    itemId?: string;
    itemData?: Record<string, unknown>;
    error?: string;
  }
) {
  try {
    const updateData: Partial<PaymentRecord> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (itemData) {
      updateData.itemId = itemData.itemId;
      updateData.itemData = itemData.itemData;
      updateData.error = itemData.error;
    }

    await adminDb.collection("payments").doc(paymentId).update(updateData);
    
    return { success: true };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error };
  }
}

// Helper function to update payment status by session ID
export async function updatePaymentStatusBySession(
  sessionId: string,
  status: 'completed' | 'failed',
  itemData?: {
    itemId?: string;
    itemData?: Record<string, unknown>;
    error?: string;
  }
) {
  try {
    const paymentQuery = await adminDb.collection("payments")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      return { success: false, error: "Payment not found" };
    }

    const paymentDoc = paymentQuery.docs[0];
    return await updatePaymentStatus(paymentDoc.id, status, itemData);
  } catch (error) {
    console.error("Error updating payment status by session:", error);
    return { success: false, error };
  }
}