import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { getAuth } from "firebase-admin/auth";

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

// POST endpoint for admin to approve pending payments
export async function POST(request: NextRequest) {
	try {
	  // Get the current user ID and verify they're an admin
	  const adminUserId = await getCurrentUserId(request);
	  const isAdmin = await isUserAdmin(adminUserId);
	  
	  if (!isAdmin) {
		return NextResponse.json(
		  { error: "Unauthorized: Admin access required" },
		  { status: 403 }
		);
	  }
	  
	  // Parse the request body
	  const { paymentId, approved } = await request.json();
	  
	  if (!paymentId) {
		return NextResponse.json(
		  { error: "Payment ID is required" },
		  { status: 400 }
		);
	  }
	  
	  // Get the payment document
	  const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
	  
	  if (!paymentDoc.exists) {
		return NextResponse.json(
		  { error: "Payment not found" },
		  { status: 404 }
		);
	  }
	  
	  const paymentData = paymentDoc.data();
	  
	  if (paymentData?.status !== "pending_approval") {
		return NextResponse.json(
		  { error: `Payment is not in pending approval state. Current status: ${paymentData?.status}` },
		  { status: 400 }
		);
	  }
	  
	  // Use Stripe to either capture or cancel the payment based on approval decision
	 
	  
	  if (approved) {
		// Capture the payment if approved
		// If using payment intents with manual capture:
		// await stripe.paymentIntents.capture(paymentData.paymentIntentId);
		
		// Update payment status to completed
		await adminDb.collection("payments").doc(paymentId).update({
		  status: "completed",
		  approvedAt: new Date().toISOString(),
		  approvedBy: adminUserId
		});
		
		return NextResponse.json({
		  success: true,
		  message: "Payment approved and completed successfully"
		});
	  } else {
		// Cancel the payment if rejected
		// If using payment intents with manual capture:
		// await stripe.paymentIntents.cancel(paymentData.paymentIntentId);
		
		// Update payment status to rejected
		await adminDb.collection("payments").doc(paymentId).update({
		  status: "rejected",
		  rejectedAt: new Date().toISOString(),
		  rejectedBy: adminUserId
		});
		
		return NextResponse.json({
		  success: true,
		  message: "Payment rejected and canceled successfully"
		});
	  }
	} catch (error) {
	  console.error("Error processing payment approval:", error);
	  
	  return NextResponse.json(
		{
		  error: "Failed to process payment approval",
		  details: error instanceof Error ? error.message : String(error),
		},
		{ status: 500 }
	  );
	}
  }