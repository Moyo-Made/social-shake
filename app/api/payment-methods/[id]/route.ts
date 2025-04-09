import { db } from "@/config/firebase";
import { getAuth } from "firebase-admin/auth";
import { Request, Response } from "express";
import { DecodedIdToken } from "firebase-admin/auth";
import { DocumentData, DocumentReference, QuerySnapshot } from "firebase-admin/firestore";

interface UpdateData {
	lastUpdated: Date;
	isDefault?: boolean;
	bankName?: string;
	accountHolderName?: string;
	routingNumber?: string;
	accountEnding?: string;
	paypalEmail?: string;
	cardType?: string;
	cardEnding?: string;
	expiryDate?: string;
}

interface PaymentMethodData extends DocumentData {
	userId: string;
	isDefault: boolean;
	bankName?: string;
	accountHolderName?: string;
	routingNumber?: string;
	accountEnding?: string;
	paypalEmail?: string;
	cardType?: string;
	cardEnding?: string;
	expiryDate?: string;
}

export default async function handler(req: Request, res: Response) {
	const { id } = req.query as { id: string };
	
	// Check auth header
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	
	try {
		// Verify the user's token
		const token = authHeader.split(' ')[1];
		const decodedToken: DecodedIdToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// Get the document reference
		const docRef: DocumentReference<PaymentMethodData> = db.firestore().collection('paymentMethods').doc(id);
		const doc = await docRef.get();
		
		// Check if the payment method exists and belongs to the user
		if (!doc.exists) {
			return res.status(404).json({ error: "Payment method not found" });
		}
		
		const paymentMethodData = doc.data() as PaymentMethodData;
		if (paymentMethodData.userId !== userId) {
			return res.status(403).json({ error: "Forbidden" });
		}
		
		// UPDATE payment method
		if (req.method === 'PUT' || req.method === 'PATCH') {
			const { type, isDefault } = req.body as { type: string; isDefault?: boolean };
			
			// Create update data based on type
			const updateData: UpdateData = {
				lastUpdated: new Date(),
			};
			
			if (isDefault !== undefined) {
				updateData.isDefault = isDefault;
				
				// If setting as default, update other methods
				if (isDefault && !paymentMethodData.isDefault) {
					const defaultMethods: QuerySnapshot<PaymentMethodData> = await db.collection('paymentMethods')
						.where('userId', '==', userId)
						.where('isDefault', '==', true)
						.get();
					
					const batch = db.batch();
					defaultMethods.forEach(doc => {
						batch.update(doc.ref, { isDefault: false });
					});
					
					await batch.commit();
				}
			}
			
			// Process data based on type
			if (type === "bank") {
				const { bankName, accountNumber, accountHolderName, routingNumber } = req.body as {
					bankName?: string;
					accountNumber?: string;
					accountHolderName?: string;
					routingNumber?: string;
				};
				
				if (bankName) updateData.bankName = bankName;
				if (accountHolderName) updateData.accountHolderName = accountHolderName;
				
				// Only update sensitive info if provided
				if (routingNumber) updateData.routingNumber = `****${routingNumber.slice(-4)}`;
				if (accountNumber) updateData.accountEnding = `****${accountNumber.slice(-4)}`;
			}
			else if (type === "paypal") {
				const { paypalEmail } = req.body as { paypalEmail?: string };
				if (paypalEmail) updateData.paypalEmail = paypalEmail;
			}
			else if (type === "card") {
				const { cardNumber, expiryDate, cardholderName } = req.body as {
					cardNumber?: string;
					expiryDate?: string;
					cardholderName?: string;
				};
				
				if (cardholderName) updateData.accountHolderName = cardholderName;
				if (expiryDate) updateData.expiryDate = expiryDate;
				
				// Only update card number if provided
				if (cardNumber) {
					updateData.cardType = detectCardType(cardNumber) || "Card";
					updateData.cardEnding = `${cardNumber.slice(-4)}`;
				}
			}
			
			// Update the payment method
			await docRef.update(updateData);
			
			return res.status(200).json({ 
				message: "Payment method updated successfully" 
			});
		}
		
		// DELETE payment method
		if (req.method === 'DELETE') {
			const methodData = paymentMethodData;
			
			// Delete the payment method
			await docRef.delete();
			
			// If deleted method was default and there are other methods, set a new default
			if (methodData.isDefault) {
				const otherMethods: QuerySnapshot<PaymentMethodData> = await db.collection('paymentMethods')
					.where('userId', '==', userId)
					.limit(1)
					.get();
				
				if (!otherMethods.empty) {
					await otherMethods.docs[0].ref.update({ isDefault: true });
				}
			}
			
			return res.status(200).json({ 
				message: "Payment method deleted successfully" 
			});
		}
		
		return res.status(405).json({ error: "Method not allowed" });
	} catch (error) {
		console.error("Error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}