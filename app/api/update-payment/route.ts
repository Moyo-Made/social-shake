import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { paymentId, status, contestId } = await request.json();
    
    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
        { status: 400 }
      );
    }
    
    // Update payment record
    await adminDb.collection("payments").doc(paymentId).update({
      status,
      contestId: contestId || null,
      updatedAt: new Date().toISOString(),
      ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {})
    });
    
    return NextResponse.json({
      success: true,
      message: "Payment record updated",
    });
  } catch (error) {
    console.error("Error updating payment record:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update payment record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}