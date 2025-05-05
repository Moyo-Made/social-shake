import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "firebase-admin";

// Helper function to get the current user ID from the request
async function getCurrentUserId(request: NextRequest): Promise<string> {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization token');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    throw new Error('Unauthorized access');
  }
}

// PUT endpoint for setting an address as default
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const addressId = params.id;
    const userId = await getCurrentUserId(request);
    
    // Get the address document
    const addressRef = adminDb
      .collection("shipping_addresses")
      .doc(addressId);
    
    const addressDoc = await addressRef.get();
    
    if (!addressDoc.exists) {
      return NextResponse.json(
        { error: "Shipping address not found" },
        { status: 404 }
      );
    }
    
    // Check if the address belongs to the current user
    const addressData = addressDoc.data();
    if (addressData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    // If it's already the default, return early
    if (addressData?.isDefault === true) {
      return NextResponse.json({
        success: true,
        message: "Address is already set as default"
      });
    }
    
    // Set up a batch write
    const batch = adminDb.batch();
    
    // First, find all default addresses for this user and unset them
    const defaultAddresses = await adminDb
      .collection("shipping_addresses")
      .where("userId", "==", userId)
      .where("isDefault", "==", true)
      .get();
    
    defaultAddresses.docs.forEach(doc => {
      batch.update(doc.ref, { 
        isDefault: false,
        updatedAt: FieldValue.serverTimestamp() 
      });
    });
    
    // Now set the current address as default
    batch.update(addressRef, { 
      isDefault: true,
      updatedAt: FieldValue.serverTimestamp() 
    });
    
    // Commit the batch
    await batch.commit();
    
    return NextResponse.json({
      success: true,
      message: "Address set as default successfully"
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    
    if (error instanceof Error && error.message === 'Unauthorized access') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to set default address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}