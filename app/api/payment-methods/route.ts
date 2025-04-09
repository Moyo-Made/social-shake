import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

const auth = getAuth();
import { NextApiRequest, NextApiResponse } from "next";
import { DecodedIdToken } from "firebase-admin/auth";
import { Firestore } from "firebase-admin/firestore";

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

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
): Promise<void> {
	// Check auth header
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		// Verify the user's token
		const token = authHeader.split("Bearer ")[1];
		const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
		const userId = decodedToken.uid;

		// GET - Fetch all payment methods for the user
		if (req.method === "GET") {
			const snapshot = await db
				.collection("paymentMethods")
				.where("userId", "==", userId)
				.get();

			const methods: PaymentMethod[] = [];
			snapshot.forEach((doc) => {
				methods.push({ id: doc.id, ...doc.data() } as unknown as PaymentMethod);
			});

			return res.status(200).json(methods);
		}

		// POST - Create a new payment method
		if (req.method === "POST") {
			const { type, isDefault, ...rest } = req.body as PaymentMethodRequestBody;

			if (!type || !["bank", "paypal", "card"].includes(type)) {
				return res.status(400).json({ error: "Invalid payment type" });
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
					const { bankName, accountNumber, accountHolderName, routingNumber } =
						rest;
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
						cardType: detectCardType(cardNumber) || "Card", // Add a helper function to detect card type
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

			return res.status(201).json({
				id: docRef.id,
				message: "Payment method added successfully",
			});
		}

		return res.status(405).json({ error: "Method not allowed" });
	} catch (error) {
		console.error("Error:", error);
		return res.status(500).json({ error: "Internal server error" });
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