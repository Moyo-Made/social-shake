import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    
    // If no userId is provided, return error
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // If no ID but we have userId, try to find by userId alone
    if (!id) {
      console.log(`Searching for verification by userId: ${userId}`);
      
      const verificationSnapshot = await adminDb.collection("creator_verifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc") // Optional: get the most recent one
        .limit(1)
        .get();
      
      if (verificationSnapshot.empty) {
        console.log(`No verification found for userId: ${userId}`);
        return NextResponse.json(
          { error: "Verification not found" },
          { status: 404 }
        );
      }
      
      const doc = verificationSnapshot.docs[0];
      console.log(`Found verification by userId: ${doc.id}`);
      
      const data = doc.data();
      
      // Broadcast real-time update when verification is accessed
      try {
        const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
        
        await fetch(`${socketServerUrl}/api/broadcast-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            event: 'verification-data-fetched',
            data: {
              verificationId: doc.id,
              status: data.status,
              userId: userId,
              accessedAt: new Date().toISOString()
            }
          })
        });
      } catch (broadcastError) {
        console.error('Error broadcasting verification access:', broadcastError);
      }
      
      // Make sure we extract all URL fields explicitly to include in response
      return NextResponse.json({
        id: doc.id,
        ...data,
        profilePictureUrl: data.profilePictureUrl || null,
        verificationVideoUrl: data.verificationVideoUrl || null,
        verifiableIDUrl: data.verifiableIDUrl || null
      });
    }
    
    // Original implementation for when id is provided
    console.log(`Fetching verification with ID: ${id}`);
    const verificationRef = adminDb.collection("creator_verifications").doc(id);
    const docSnap = await verificationRef.get();
    
    if (!docSnap.exists) {
      console.log(`Verification with ID ${id} not found`);
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }
    
    const verificationData = docSnap.data();
    
    // Security check: Make sure the user can only access their own verification data
    if (verificationData?.userId !== userId) {
      console.log(`Unauthorized access attempt: ${userId} tried to access verification belonging to ${verificationData?.userId}`);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    // Broadcast real-time update when verification is accessed by ID
    try {
      const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
      
      await fetch(`${socketServerUrl}/api/broadcast-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          event: 'verification-status-update',
          data: {
            verificationId: id,
            status: verificationData.status,
            userId: userId,
            accessedAt: new Date().toISOString()
          }
        })
      });
    } catch (broadcastError) {
      console.error('Error broadcasting verification access:', broadcastError);
    }
    
    // Make sure we extract all URL fields explicitly to include in response
    return NextResponse.json({
      id: docSnap.id,
      ...verificationData,
    });
  } catch (error) {
    console.error("Error fetching verification:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch verification",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    
    if (!id || !userId) {
      return NextResponse.json(
        { error: "Both ID and User ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, rejectionReason, infoRequest, suspensionReason } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Update the verification document
    const verificationRef = adminDb.collection("creator_verifications").doc(id);
    const docSnap = await verificationRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    const currentData = docSnap.data();
    
    // Security check
    if (currentData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    // Add optional fields based on status
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    if (status === 'info_requested' && infoRequest) {
      updateData.infoRequest = infoRequest;
    }
    if (status === 'suspended' && suspensionReason) {
      updateData.suspensionReason = suspensionReason;
    }

    // Update the document
    await verificationRef.update(updateData);

    // Broadcast the status change (this is what was missing!)
    try {
      const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
      
      await fetch(`${socketServerUrl}/api/broadcast-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          event: 'verification-status-update', // This matches what Socket context expects!
          data: {
            status,
            rejectionReason: rejectionReason || null,
            infoRequest: infoRequest || null,
            suspensionReason: suspensionReason || null,
            updatedAt: updateData.updatedAt
          }
        })
      });
    } catch (broadcastError) {
      console.error('Error broadcasting verification status update:', broadcastError);
    }

    return NextResponse.json({
      message: "Verification status updated successfully",
      id,
      ...updateData
    });

  } catch (error) {
    console.error("Error updating verification status:", error);
    return NextResponse.json(
      {
        error: "Failed to update verification status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";