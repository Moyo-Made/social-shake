import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestData: Record<string, any> = {};

    if (contentType.includes("multipart/form-data")) {
      // Handle form data submission
      const formData = await request.formData();

      // Extract all form fields
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          try {
            // Attempt to parse any JSON strings
            requestData[key] = JSON.parse(value);
          } catch {
            requestData[key] = value;
          }
        } else {
          requestData[key] = value;
        }
      });
    } else {
      // Handle JSON submission
      requestData = await request.json();
    }

    const { userId, brandEmail, amount } = requestData;
    
    // Validate required fields
    if (!userId || !amount) {
      return NextResponse.json(
        { error: "User ID and payment amount are required" },
        { status: 400 }
      );
    }

    // Create a payment ID
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Sanitize the form data to remove any File objects or invalid types
    const sanitizedData = sanitizeDataForFirestore(requestData);

    // Store the payment intent in Firestore
    const paymentData = {
      paymentId,
      userId,
      brandEmail: brandEmail || "",
      amount: parseFloat(amount),
      formData: sanitizedData, // Store the sanitized form data
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("payments").doc(paymentId).set(paymentData);

    return NextResponse.json({
      success: true,
      message: "Payment intent created",
      paymentId,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create payment intent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Sanitizes data to ensure it's compatible with Firestore
 * Removes File objects, functions, circular references, etc.
 */
function sanitizeDataForFirestore(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForFirestore(item));
  }

  // Handle objects
  if (typeof data === 'object' && !(data instanceof File)) {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Skip File objects and functions
      if (value instanceof File || typeof value === 'function') {
        continue;
      }
      
      sanitized[key] = sanitizeDataForFirestore(value);
    }
    
    return sanitized;
  }

  // Handle File objects (by converting to a description)
  if (data instanceof File) {
    return {
      type: 'file_reference',
      name: data.name,
      size: data.size,
      fileType: data.type
    };
  }

  // Handle primitives
  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return data;
  }

  // Handle anything else by converting to string
  return String(data);
}