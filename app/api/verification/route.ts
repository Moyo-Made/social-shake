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
      const profileData = data.profileData || {};
      
      // Debug logging
      console.log('Document data structure found:', {
        hasProfileData: !!data.profileData,
        topLevelStatus: data.status,
        topLevelUserId: data.userId,
        profileDataKeys: Object.keys(profileData)
      });
      
      // Prepare response with proper field extraction
      const responseData = {
        id: doc.id,
        // Core verification fields (always at root level)
        status: data.status || 'pending',
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        rejectionReason: data.rejectionReason || null,
        infoRequest: data.infoRequest || null,
        suspensionReason: data.suspensionReason || null,
        
        // Profile fields - check both root and nested locations
        bio: data.bio || profileData.bio || null,
        tiktokUrl: data.tiktokUrl || profileData.tiktokUrl || null,
        ethnicity: data.ethnicity || profileData.ethnicity || null,
        dateOfBirth: data.dateOfBirth || profileData.dateOfBirth || null,
        gender: data.gender || profileData.gender || null,
        country: data.country || profileData.country || null,
        contentTypes: data.contentTypes || profileData.contentTypes || [],
        contentLinks: data.contentLinks || profileData.contentLinks || [],
        socialMedia: data.socialMedia || profileData.socialMedia || {
          instagram: "",
          twitter: "",
          facebook: "",
          youtube: "",
          tiktok: ""
        },
        pricing: data.pricing || profileData.pricing || {},
        abnNumber: data.abnNumber || profileData.abnNumber || null,
        languages: data.languages || profileData.languages || [],
        
        // File URLs - check both root and nested locations
        profilePictureUrl: data.profilePictureUrl || profileData.profilePictureUrl || null,
        verificationVideoUrl: data.verificationVideoUrl || profileData.verificationVideoUrl || null,
        verifiableIDUrl: data.verifiableIDUrl || profileData.verifiableIDUrl || null,
        aboutMeVideoUrl: data.aboutMeVideoUrl || profileData.aboutMeVideoUrl || profileData.aboutMeVideo || null,
        portfolioVideoUrls: data.portfolioVideoUrls || profileData.portfolioVideoUrls || [],
        
        // Keep the original profileData for backwards compatibility
        profileData: profileData
      };
      
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
              status: responseData.status,
              userId: userId,
              accessedAt: new Date().toISOString()
            }
          })
        });
      } catch (broadcastError) {
        console.error('Error broadcasting verification access:', broadcastError);
      }
      
      // Create response with proper headers for Safari
      const response = NextResponse.json(responseData);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
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
    
    const profileData = verificationData.profileData || {};
    
    // Debug logging
    console.log('Document data structure found by ID:', {
      hasProfileData: !!verificationData.profileData,
      topLevelStatus: verificationData.status,
      topLevelUserId: verificationData.userId,
      profileDataKeys: Object.keys(profileData)
    });
    
    // Prepare response with proper field extraction
    const responseData = {
      id: docSnap.id,
      // Core verification fields (always at root level)
      status: verificationData.status || 'pending',
      userId: verificationData.userId,
      createdAt: verificationData.createdAt,
      updatedAt: verificationData.updatedAt,
      rejectionReason: verificationData.rejectionReason || null,
      infoRequest: verificationData.infoRequest || null,
      suspensionReason: verificationData.suspensionReason || null,
      
      // Profile fields - check both root and nested locations
      bio: verificationData.bio || profileData.bio || null,
      tiktokUrl: verificationData.tiktokUrl || profileData.tiktokUrl || null,
      ethnicity: verificationData.ethnicity || profileData.ethnicity || null,
      dateOfBirth: verificationData.dateOfBirth || profileData.dateOfBirth || null,
      gender: verificationData.gender || profileData.gender || null,
      country: verificationData.country || profileData.country || null,
      contentTypes: verificationData.contentTypes || profileData.contentTypes || [],
      contentLinks: verificationData.contentLinks || profileData.contentLinks || [],
      socialMedia: verificationData.socialMedia || profileData.socialMedia || {
        instagram: "",
        twitter: "",
        facebook: "",
        youtube: "",
        tiktok: ""
      },
      pricing: verificationData.pricing || profileData.pricing || {},
      abnNumber: verificationData.abnNumber || profileData.abnNumber || null,
      languages: verificationData.languages || profileData.languages || [],
      
      // File URLs - check both root and nested locations
      profilePictureUrl: verificationData.profilePictureUrl || profileData.profilePictureUrl || null,
      verificationVideoUrl: verificationData.verificationVideoUrl || profileData.verificationVideoUrl || null,
      verifiableIDUrl: verificationData.verifiableIDUrl || profileData.verifiableIDUrl || null,
      aboutMeVideoUrl: verificationData.aboutMeVideoUrl || profileData.aboutMeVideoUrl || profileData.aboutMeVideo || null,
      portfolioVideoUrls: verificationData.portfolioVideoUrls || profileData.portfolioVideoUrls || [],
      
      // Keep the original profileData for backwards compatibility
      profileData: profileData
    };
    
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
            status: responseData.status,
            userId: userId,
            accessedAt: new Date().toISOString()
          }
        })
      });
    } catch (broadcastError) {
      console.error('Error broadcasting verification access:', broadcastError);
    }
    
    // Create response with proper headers for Safari
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
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

    // Also update the creator profile verification status
    try {
      await adminDb.collection("creatorProfiles").doc(userId).update({
        verificationStatus: status,
        updatedAt: new Date().toISOString()
      });
    } catch (profileUpdateError) {
      console.error('Error updating creator profile status:', profileUpdateError);
      // Don't fail the whole request if profile update fails
    }

    // Broadcast the status change
    try {
      const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
      
      await fetch(`${socketServerUrl}/api/broadcast-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          event: 'verification-status-update',
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

    const response = NextResponse.json({
      message: "Verification status updated successfully",
      id,
      ...updateData
    });
    
    // Add headers for Safari compatibility
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

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