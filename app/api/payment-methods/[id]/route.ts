import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null) {
  if (!data) return data;
  
  const result: Record<string, unknown> = { ...data };
  
  // Convert timestamp fields to ISO strings
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[key] = convertTimestampsToISO(value as Record<string, unknown>);
    }
  }
  
  return result;
}

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

// PUT endpoint for updating an existing payment method
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: NextRequest, { params }: any) {
  try {
    const paymentMethodId = params.id;
    
    // Get the current user ID
    const userId = await getCurrentUserId(request);
    
    // Parse the request body
    const updateData: { accountNumber?: string; routingNumber?: string; isDefault?: boolean; cardNumber?: string; cvv?: string; [key: string]: unknown } = await request.json();
    
    // Verify that the user owns this payment method
    const methodDoc = await verifyOwnership(paymentMethodId, userId);
    const currentMethodData = methodDoc.data();
    
    // Process and secure sensitive data
    const secureUpdateData = { ...updateData };
    
    // Handle bank account information
    if (currentMethodData?.type === 'bank') {
      // Store only last 4 digits of account number
      if (updateData.accountNumber) {
        secureUpdateData.accountEnding = updateData.accountNumber.slice(-4);
        delete secureUpdateData.accountNumber;
      }
      
      // Store only last 4 digits of routing number
      if (updateData.routingNumber) {
        secureUpdateData.routingNumberEnding = updateData.routingNumber.slice(-4);
        delete secureUpdateData.routingNumber;
      }
    }
    
    // Handle card information
    if (currentMethodData?.type === 'card') {
      // Store only last 4 digits of card number
      if (updateData.cardNumber) {
        secureUpdateData.cardEnding = updateData.cardNumber.slice(-4);
        delete secureUpdateData.cardNumber;
      }
      
      // Don't store CVV at all
      if (secureUpdateData.cvv) {
        delete secureUpdateData.cvv;
      }
    }
    
    // Handle default payment method
    if (updateData.isDefault === true && !currentMethodData?.isDefault) {
      // If setting this as default, update all other methods to not be default
      const batch = adminDb.batch();
      
      const otherMethods = await adminDb
        .collection("payment_methods")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .get();
      
      otherMethods.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      
      await batch.commit();
    }
    
    // Update the document
    const updatedData = {
      ...secureUpdateData,
      lastUpdated: FieldValue.serverTimestamp()
    };
    
    await adminDb.collection("payment_methods").doc(paymentMethodId).update(updatedData);
    
    // Fetch the updated document to return
    const updatedDoc = await adminDb.collection("payment_methods").doc(paymentMethodId).get();
    const responseData = {
      id: updatedDoc.id,
      ...convertTimestampsToISO(updatedDoc.data() || null)
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error updating payment method:", error);
    
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
        error: "Failed to update payment method",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for removing a payment method
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const paymentMethodId = params.id;
    
    // Get the current user ID
    const userId = await getCurrentUserId(request);
    
    // Verify that the user owns this payment method
    const methodDoc = await verifyOwnership(paymentMethodId, userId);
    const methodData = methodDoc.data();
    
    // Delete the payment method
    await adminDb.collection("payment_methods").doc(paymentMethodId).delete();
    
    // If this was the default payment method, set another one as default
    if (methodData?.isDefault) {
      const remainingMethods = await adminDb
        .collection("payment_methods")
        .where("userId", "==", userId)
        .limit(1)
        .get();
      
      if (!remainingMethods.empty) {
        await adminDb
          .collection("payment_methods")
          .doc(remainingMethods.docs[0].id)
          .update({ isDefault: true });
      }
    }
    
    return NextResponse.json(
      { message: "Payment method deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting payment method:", error);
    
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
        error: "Failed to delete payment method",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}