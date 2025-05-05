import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return data;
  
  const result = { ...data };
  
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
async function getCurrentUserId(request: NextRequest): Promise<string> {
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
async function isUserAdmin(userId: string): Promise<boolean> {
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

// GET endpoint for fetching shipping addresses
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
          { error: "Unauthorized to access other users' shipping addresses" },
          { status: 403 }
        );
      }
      
      // If admin, allow fetching the requested user's addresses
      userIdToFetch = targetUserId;
    }
    
    console.log(`Fetching addresses for userId: ${userIdToFetch}`);
    
    // Fetch all shipping addresses for the target user
    const addressesSnapshot = await adminDb
      .collection("shipping_addresses")
      .where("userId", "==", userIdToFetch)
      .orderBy("createdAt", "desc")
      .get();

    const addresses = [];
    for (const doc of addressesSnapshot.docs) {
      addresses.push({
        id: doc.id,
        ...convertTimestampsToISO(doc.data() || null)
      });
    }
    
    console.log(`Found ${addresses.length} shipping addresses`);

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Error fetching shipping addresses:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch shipping addresses",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for creating a new shipping address
export async function POST(request: NextRequest) {
  try {
    // Get the current user ID
    const userId = await getCurrentUserId(request);
    
    // Parse the request body
    const addressData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'addressLine1', 'city', 'state', 'country', 'zipCode', 'phoneNumber'];
    for (const field of requiredFields) {
      if (!addressData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Check if this is the user's first address
    const existingAddresses = await adminDb
      .collection("shipping_addresses")
      .where("userId", "==", userId)
      .limit(1)
      .get();
    
    // If it's the first address, make it the default
    const isDefault = existingAddresses.empty ? true : !!addressData.isDefault;
    
    // If this address is being set as default, update all other addresses to not be default
    if (isDefault && !existingAddresses.empty) {
      const batch = adminDb.batch();
      
      const otherAddresses = await adminDb
        .collection("shipping_addresses")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .get();
      
      otherAddresses.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      
      await batch.commit();
    }
    
    // Create the new address document
    const newAddress = {
      ...addressData,
      userId,
      isDefault,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    const docRef = await adminDb.collection("shipping_addresses").add(newAddress);
    
    // Fetch the created document to return
    const createdDoc = await docRef.get();
    const responseData = {
      id: createdDoc.id,
      ...convertTimestampsToISO(createdDoc.data() || null)
    };
    
    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating shipping address:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to create shipping address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}