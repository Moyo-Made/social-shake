import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/config/firebase-admin';

interface NotifyBrandRequest {
  creatorId: string;
  projectId: string;
  status: string;
  message: string;
  brandId?: string; // Optional, can be fetched from project if not provided
}

interface BrandBroadcastData {
  creatorId: string;
  projectId: string;
  status: string;
  message: string;
  timestamp: string;
  type: 'creator_status_update';
  creatorName?: string;
  brandId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Firebase token
    const auth = getAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: NotifyBrandRequest = await request.json();
    const { creatorId, projectId, status, message, brandId } = body;

    // Validate required fields
    if (!creatorId || !projectId || !status || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, projectId, status, message' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Get brand ID from project if not provided
    let targetBrandId = brandId;
    if (!targetBrandId) {
      try {
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          targetBrandId = projectData?.userId;
        }
        
        if (!targetBrandId) {
          return NextResponse.json(
            { error: 'Brand ID not found for this project' },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
        return NextResponse.json(
          { error: 'Failed to fetch project information' },
          { status: 500 }
        );
      }
    }

    // Get creator info for the notification
    let creatorName = 'Creator';
    try {
      const creatorInfo = await auth.getUser(creatorId);
      creatorName = creatorInfo.displayName || creatorInfo.email?.split('@')[0] || 'Creator';
    } catch (error) {
      console.error('Error fetching creator info:', error);
      // Continue with default name
    }

    // Update the creator status in the database
    try {
      const statusDoc = {
        creatorId,
        projectId,
        status,
        trackingNumber: null, // Clear tracking number for delivered status
        updatedAt: Date.now() / 1000,
        updatedBy: decodedToken.uid,
        timestamp: new Date().toISOString(),
      };

      // Use the same collection/document structure as your existing status system
      await adminDb
        .collection('creator-statuses')
        .doc(`${creatorId}-${projectId}`)
        .set(statusDoc, { merge: true });

      console.log('Creator status updated successfully');
    } catch (dbError) {
      console.error('Error updating creator status:', dbError);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Save notification to database
    try {
      const notificationData = {
        brandId: targetBrandId,
        creatorId,
        projectId,
        status,
        message,
        timestamp: new Date().toISOString(),
        type: 'creator_status_update',
        sentBy: decodedToken.uid,
        read: false,
      };

      // Save to brand notifications collection
      await adminDb.collection('brand-notifications').add(notificationData);
      console.log('Brand notification saved to database');
    } catch (dbError) {
      console.error('Error saving brand notification to database:', dbError);
      // Don't fail the request if database save fails
    }

    // Prepare broadcast data for real-time notifications
    const broadcastData: BrandBroadcastData = {
      creatorId,
      projectId,
      status,
      message,
      timestamp: new Date().toISOString(),
      type: 'creator_status_update',
      creatorName,
      brandId: targetBrandId,
    };

    // Broadcast to brand using global broadcast function
    try {
      // Check if the global broadcast function is available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalBrandBroadcast = (global as any).broadcastBrandUpdate;
      
      if (globalBrandBroadcast) {
        console.log('Using global broadcast function for brand update');
        const result = await globalBrandBroadcast(broadcastData);
        console.log('Brand broadcast result:', result);
      } else {
        console.log('Global brand broadcast function not available, notification completed without real-time updates');
      }
    } catch (broadcastError) {
      console.error('Error in brand broadcast:', broadcastError);
      // Don't fail the whole request if broadcast fails
    }

    console.log('Brand notification sent successfully:', {
      brandId: targetBrandId,
      creatorId,
      projectId,
      status,
      sentBy: decodedToken.uid,
    });

    return NextResponse.json({
      success: true,
      data: {
        brandId: targetBrandId,
        creatorId,
        projectId,
        status,
        message,
        timestamp: broadcastData.timestamp,
        creatorName,
      },
    });

  } catch (error) {
    console.error('Error in notify-brand API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send brand notification',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests to check API status
export async function GET() {
  return NextResponse.json({
    message: 'Notify Brand API is running',
    timestamp: new Date().toISOString(),
  });
}