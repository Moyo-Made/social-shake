import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";
import { Firestore } from "firebase-admin/firestore";

const db = getFirestore();
const auth = getAuth();

interface PaymentMethod {
	type: string;
	isDefault: boolean;
	lastUpdated: Date;
	userId: string;
	bankName?: string;
	accountHolderName?: string;
	routingNumber?: string;
	accountEnding?: string;
	paypalEmail?: string;
	cardType?: string;
	cardEnding?: string;
	expiryDate?: string;
}

interface PaymentMethodRequestBody {
	type: string;
	isDefault?: boolean;
	bankName?: string;
	accountNumber?: string;
	accountHolderName?: string;
	routingNumber?: string;
	paypalEmail?: string;
	cardNumber?: string;
	expiryDate?: string;
	cardholderName?: string;
}

// Helper function to handle authorization
async function authorizeRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

// Helper function to detect card type from number
function detectCardType(cardNumber: string | undefined) {
  if (!cardNumber) return null;
  
  // Simple detection based on first digits
  if (/^4/.test(cardNumber)) return "Visa";
  if (/^5[1-5]/.test(cardNumber)) return "Mastercard";
  if (/^3[47]/.test(cardNumber)) return "American Express";
  if (/^6(?:011|5)/.test(cardNumber)) return "Discover";
  
  return "Card";
}

// GET handler
export async function GET(request: NextRequest) {
  const userId = await authorizeRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await db
      .collection("paymentMethods")
      .where("userId", "==", userId)
      .get();

    const methods: PaymentMethod[] = [];
    snapshot.forEach((doc) => {
      methods.push({ id: doc.id, ...doc.data() } as unknown as PaymentMethod);
    });

    return NextResponse.json(methods);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler
export async function POST(request: NextRequest) {
  const userId = await authorizeRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as PaymentMethodRequestBody;
    const { type, isDefault, ...rest } = body;

    if (!type || !["bank", "paypal", "card"].includes(type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    // Create payment method data based on type
    let paymentMethodData: PaymentMethod = {
      type,
      isDefault: isDefault || false,
      lastUpdated: new Date(),
      userId,
    };

    // Process data based on type
    switch (type) {
      case "bank":
        const { bankName, accountNumber, accountHolderName, routingNumber } = rest;
        paymentMethodData = {
          ...paymentMethodData,
          bankName,
          accountHolderName,
          // Only store the last 4 digits
          routingNumber: routingNumber
            ? `****${routingNumber.slice(-4)}`
            : "",
          accountEnding: accountNumber
            ? `****${accountNumber.slice(-4)}`
            : "",
        };
        break;

      case "paypal":
        const { paypalEmail } = rest;
        paymentMethodData = {
          ...paymentMethodData,
          paypalEmail,
        };
        break;

      case "card":
        const { cardNumber, expiryDate, cardholderName } = rest;
        paymentMethodData = {
          ...paymentMethodData,
          cardType: detectCardType(cardNumber) || "Card",
          cardEnding: cardNumber ? `${cardNumber.slice(-4)}` : "",
          expiryDate,
          accountHolderName: cardholderName,
        };
        break;
    }

    // If setting as default, update other methods
    if (isDefault) {
      const defaultMethods = await db
        .collection("paymentMethods")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .get();

      const batch = (db as Firestore).batch();
      defaultMethods.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });

      await batch.commit();
    }

    // Add new payment method
    const docRef = await db.collection("paymentMethods").add(paymentMethodData);

    return NextResponse.json({
      id: docRef.id,
      message: "Payment method added successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}