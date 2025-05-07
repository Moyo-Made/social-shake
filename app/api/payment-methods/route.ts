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

// Helper function to check if user is an admin
async function isUserAdmin(userId: string) {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// GET endpoint for fetching payment methods
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');
    
    // Get the current user ID (the authenticated user)
    const currentUserId = await getCurrentUserId(request);
    
    // If a specific userId is requested and it's not the current user,
    // verify the current user has permission to access other users' data
    let userIdToFetch = currentUserId;
    
    if (targetUserId && targetUserId !== currentUserId) {
      // Check if current user is an admin/has permission
      const hasAdminAccess = await isUserAdmin(currentUserId);
      
      if (!hasAdminAccess) {
        return NextResponse.json(
          { error: "Unauthorized to access other users' payment methods" },
          { status: 403 }
        );
      }
      
      // If admin, allow fetching the requested user's payment methods
      userIdToFetch = targetUserId;
    }
    
    console.log(`Fetching payment methods for userId: ${userIdToFetch}`);
    
    // Fetch all payment methods for the target user
    const methodsSnapshot = await adminDb
      .collection("payment_methods")
      .where("userId", "==", userIdToFetch)
      .get();

    const methods = [];
    for (const doc of methodsSnapshot.docs) {
      methods.push({
        id: doc.id,
        ...convertTimestampsToISO(doc.data() || null)
      });
    }
    
    console.log(`Found ${methods.length} payment methods`);

    return NextResponse.json(methods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch payment methods",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for creating a new payment method
export async function POST(request: NextRequest) {
  try {
    // Get the current user ID
    const userId = await getCurrentUserId(request);
    
    // Parse the request body
    const paymentData = await request.json();
    
    // Validate required fields based on payment type
    const requiredFields = ['type'];
    
    // Add type-specific required fields
    if (paymentData.type === 'bank') {
      requiredFields.push('bankName', 'accountHolderName');
    } else if (paymentData.type === 'paypal') {
      requiredFields.push('paypalEmail');
    } else if (paymentData.type === 'card') {
      requiredFields.push('cardType', 'accountHolderName');
    } else {
      return NextResponse.json(
        { error: "Invalid payment method type" },
        { status: 400 }
      );
    }
    
    // Check required fields
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Process and secure sensitive data
    const securePaymentData = { ...paymentData };
    
    // Handle bank account information
    if (paymentData.type === 'bank') {
      // Store only last 4 digits of account number
      if (paymentData.accountNumber) {
        if (typeof paymentData.accountNumber === 'string') {
          securePaymentData.accountEnding = paymentData.accountNumber.slice(-4);
        } else {
          throw new Error("Invalid account number format");
        }
        delete securePaymentData.accountNumber;
      }
      
      // Store only last 4 digits of routing number
      if (paymentData.routingNumber) {
        securePaymentData.routingNumberEnding = paymentData.routingNumber.slice(-4);
        delete securePaymentData.routingNumber;
      }
    }
    
    // Handle card information
    if (paymentData.type === 'card') {
      // Store only last 4 digits of card number
      if (paymentData.cardNumber) {
        securePaymentData.cardEnding = paymentData.cardNumber.slice(-4);
        delete securePaymentData.cardNumber;
      }
      
      // Don't store CVV at all
      if (securePaymentData.cvv) {
        delete securePaymentData.cvv;
      }
    }
    
    // Check if this should be default payment method
    const isDefault = !!paymentData.isDefault;
    
    // If this method is being set as default, update all other methods to not be default
    if (isDefault) {
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
    } else {
      // If this is the first payment method, make it default
      const existingMethods = await adminDb
        .collection("payment_methods")
        .where("userId", "==", userId)
        .limit(1)
        .get();
        
      if (existingMethods.empty) {
        securePaymentData.isDefault = true;
      }
    }
    
    // Create the new payment method document
    const newPaymentMethod = {
      ...securePaymentData,
      userId,
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await adminDb.collection("payment_methods").add(newPaymentMethod);
    
    // Fetch the created document to return
    const createdDoc = await docRef.get();
    const responseData = {
      id: createdDoc.id,
      ...convertTimestampsToISO(createdDoc.data() || null)
    };
    
    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating payment method:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to create payment method",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}