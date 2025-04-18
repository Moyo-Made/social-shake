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
      
      // Extract basic payment fields only
      requestData.userId = formData.get("userId")?.toString();
      requestData.brandEmail = formData.get("brandEmail")?.toString();
      requestData.amount = formData.get("amount")?.toString();
      
      // Extract minimum required contest info
      try {
        const basicJson = formData.get("basic")?.toString();
        if (basicJson) {
          const basic = JSON.parse(basicJson);
          requestData.contestName = basic.contestName;
          requestData.contestType = basic.contestType;
        }
      } catch (e) {
        console.error("Error parsing basic contest info:", e);
      }
    } else {
      // Handle JSON submission
      const jsonData = await request.json();
      requestData = {
        userId: jsonData.userId,
        brandEmail: jsonData.brandEmail,
        amount: jsonData.amount,
        contestName: jsonData.basic?.contestName,
        contestType: jsonData.basic?.contestType
      };
    }
    
    const { userId, amount } = requestData;
    
    // Validate required fields
    if (!userId || !amount) {
      return NextResponse.json(
        { error: "User ID and payment amount are required" },
        { status: 400 }
      );
    }
    
    // Create a payment ID
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store only essential payment intent data in Firestore
    const paymentData = {
      paymentId,
      userId,
      brandEmail: requestData.brandEmail || "",
      amount: parseFloat(amount),
      contestName: requestData.contestName || "Contest",
      contestType: requestData.contestType || "Leaderboard",
      status: "pending",
      createdAt: new Date().toISOString()
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