import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/config/firebase-admin';

interface NotificationRequest {
  creatorId: string;
  projectId: string;
  status: string;
  trackingNumber: string;
  message: string;
}

interface BroadcastData {
  creatorId: string;
  projectId: string;
  status: string;
  trackingNumber: string;
  message: string;
  timestamp: string;
  type: 'delivery_status_update';
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
    const body: NotificationRequest = await request.json();
    const { creatorId, projectId, status, trackingNumber, message } = body;

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

    // Optional: Save notification to database (you can implement this based on your schema)
    try {
      const notificationData = {
        creatorId,
        projectId,
        status,
        trackingNumber,
        message,
        timestamp: new Date().toISOString(),
        type: 'delivery_status_update',
        sentBy: decodedToken.uid,
      };

      // Save to notifications collection (optional)
      await adminDb.collection('notifications').add(notificationData);
      console.log('Notification saved to database');
    } catch (dbError) {
      console.error('Error saving notification to database:', dbError);
      // Don't fail the request if database save fails
    }

    // Prepare broadcast data
    const broadcastData: BroadcastData = {
      creatorId,
      projectId,
      status,
      trackingNumber,
      message,
      timestamp: new Date().toISOString(),
      type: 'delivery_status_update',
    };

    // SIMPLIFIED: Use the global broadcast function directly (following your pattern)
    try {
      // Check if the global broadcast function is available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalBroadcast = (global as any).broadcastDeliveryUpdate;
      
      if (globalBroadcast) {
        console.log('Using global broadcast function for delivery update');
        const result = await globalBroadcast(broadcastData);
        console.log('Broadcast result:', result);
      } else {
        console.log('Global broadcast function not available, notification completed without real-time updates');
      }
    } catch (broadcastError) {
      console.error('Error in direct broadcast:', broadcastError);
      // Don't fail the whole request if broadcast fails
    }

    console.log('Delivery notification sent successfully:', {
      creatorId,
      projectId,
      status,
      trackingNumber,
      sentBy: decodedToken.uid,
    });

    return NextResponse.json({
      success: true,
      data: {
        creatorId,
        projectId,
        status,
        trackingNumber,
        message,
        timestamp: broadcastData.timestamp,
      },
    });

  } catch (error) {
    console.error('Error in notify-creator API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests to check API status
export async function GET() {
  return NextResponse.json({
    message: 'Notify Creator API is running',
    timestamp: new Date().toISOString(),
  });
}