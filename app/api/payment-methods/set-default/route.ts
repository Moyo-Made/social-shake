import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Helper function to get the current user ID from the request
async function getCurrentUserId(request: NextRequest) {
  const auth = getAuth();
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization token');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    throw new Error('Unauthorized access');
  }
}

// Helper function to check ownership of a payment method
async function verifyOwnership(paymentMethodId: string, userId: string) {
  const doc = await adminDb.collection("payment_methods").doc(paymentMethodId).get();
  
  if (!doc.exists) {
    throw new Error('Payment method not found');
  }
  
  const paymentData = doc.data();
  if (paymentData?.userId !== userId) {
    throw new Error('Unauthorized: You do not own this payment method');
  }
  
  return doc;
}

// PATCH endpoint for setting a payment method as default
export async function PATCH(request: NextRequest) {
  try {
    // Get the current user ID
    const userId = await getCurrentUserId(request);
    
    // Parse the request body
    const { paymentMethodId } = await request.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }
    
    // Verify that the user owns this payment method
    await verifyOwnership(paymentMethodId, userId);
    
    // Use a batch to update all payment methods
    const batch = adminDb.batch();
    
    // Set all payment methods for this user to not be default
    const allMethodsQuery = await adminDb
      .collection("payment_methods")
      .where("userId", "==", userId)
      .get();
    
    allMethodsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { 
        isDefault: doc.id === paymentMethodId,
        lastUpdated: FieldValue.serverTimestamp()
      });
    });
    
    // Commit all the updates
    await batch.commit();
    
    return NextResponse.json({
      success: true,
      message: "Default payment method updated successfully"
    });
  } catch (error) {
    console.error("Error setting default payment method:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    if (error instanceof Error && error.message === 'Payment method not found') {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }
    
    if (error instanceof Error && error.message.includes('Unauthorized: You do not own')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to set default payment method",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}