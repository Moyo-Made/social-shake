import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();
const deliveries_collection = 'productDeliveries';

// Helper function to verify the auth token
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  
  const token = authHeader.split('Bearer ')[1];
  return await auth.verifyIdToken(token);
}

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  const deliveryId = params.id;
  
  if (!deliveryId) {
    return NextResponse.json({ error: 'Delivery ID is required' }, { status: 400 });
  }
  
  try {
    // Verify the user's token
    const decodedToken = await verifyAuthToken(request);
    const userId = decodedToken.uid;
    
    // Get user role from query params
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role') || 'brand'; // 'brand' or 'creator'
    
    // Get the delivery document
    const deliveryRef = db.collection(deliveries_collection).doc(deliveryId);
    const deliverySnap = await deliveryRef.get();
    
    if (!deliverySnap.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = deliverySnap.data();
    
    // Check authorization
    if (
      (userRole === 'brand' && deliveryData?.brandId !== userId) ||
      (userRole === 'creator' && deliveryData?.creatorId !== userId)
    ) {
      return NextResponse.json({ error: 'Not authorized to access this delivery' }, { status: 403 });
    }
    
    // Return the delivery data
    return NextResponse.json({ id: deliverySnap.id, ...deliveryData });
  } catch (error) {
    console.error('Error handling delivery:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  const deliveryId = params.id;
  
  if (!deliveryId) {
    return NextResponse.json({ error: 'Delivery ID is required' }, { status: 400 });
  }
  
  try {
    // Verify the user's token
    const decodedToken = await verifyAuthToken(request);
    const userId = decodedToken.uid;
    
    // Get user role from query params
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role') || 'brand'; // 'brand' or 'creator'
    
    // Get the delivery document
    const deliveryRef = db.collection(deliveries_collection).doc(deliveryId);
    const deliverySnap = await deliveryRef.get();
    
    if (!deliverySnap.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = deliverySnap.data();
    
    // Check authorization
    if (
      (userRole === 'brand' && deliveryData?.brandId !== userId) ||
      (userRole === 'creator' && deliveryData?.creatorId !== userId)
    ) {
      return NextResponse.json({ error: 'Not authorized to access this delivery' }, { status: 403 });
    }
    
    // Parse the request body
    const updateData = await request.json();
    
    // Different update logic based on user role
    if (userRole === 'brand') {
      // Brand updates
      const allowedUpdates = ['currentStatus', 'trackingNumber', 'carrier'];
      const filteredUpdates = Object.keys(updateData)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj: Record<string, string | number | boolean | object>, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as Record<string, string | number | boolean | object>);
        
      // Add status history if status is being updated
      if (updateData.currentStatus && updateData.currentStatus !== deliveryData?.currentStatus) {
        await deliveryRef.update({
          statusHistory: FieldValue.arrayUnion({
            status: updateData.currentStatus,
            timestamp: FieldValue.serverTimestamp(),
            description: updateData.description || `Status updated to ${updateData.currentStatus}`
          })
        });
        
        // Add specific date updates based on status
        if (updateData.currentStatus === 'shipped') {
          filteredUpdates['shippedDate'] = FieldValue.serverTimestamp();
          
          // Add estimated delivery dates (example logic)
          const now = new Date();
          const fromDate = new Date(now);
          fromDate.setDate(now.getDate() + 4);
          
          const toDate = new Date(now);
          toDate.setDate(now.getDate() + 7);
          
          filteredUpdates['estimatedDeliveryDate'] = {
            from: fromDate,
            to: toDate
          };
          
          // Add content due date
          const contentDueDate = new Date(toDate);
          contentDueDate.setDate(toDate.getDate() + 14);
          filteredUpdates['contentDueDate'] = contentDueDate;
        }
      }
      
      await deliveryRef.update(filteredUpdates);
    } 
    else if (userRole === 'creator') {
      // Creator can only update specific fields
      const allowedUpdates = ['receiptConfirmed', 'contentCreationStarted', 'hasIssue', 'issueDescription'];
      const filteredUpdates = Object.keys(updateData)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj: Record<string, unknown>, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as Record<string, unknown>);
        
      // Special handling for receipt confirmation
      if (updateData.receiptConfirmed === true) {
        filteredUpdates['currentStatus'] = 'delivered';
        filteredUpdates['actualDeliveryDate'] = FieldValue.serverTimestamp();
        
        await deliveryRef.update({
          statusHistory: FieldValue.arrayUnion({
            status: 'delivered',
            timestamp: FieldValue.serverTimestamp(),
            description: "Package delivered and receipt confirmed"
          })
        });
      }
      
      // Special handling for content creation started
      if (updateData.contentCreationStarted === true) {
        filteredUpdates['currentStatus'] = 'content_creation';
        
        await deliveryRef.update({
          statusHistory: FieldValue.arrayUnion({
            status: 'content_creation',
            timestamp: FieldValue.serverTimestamp(),
            description: "Content creation period has begun"
          })
        });
      }
      
      // Special handling for issue reporting
      if (updateData.hasIssue === true && updateData.issueDescription) {
        filteredUpdates['currentStatus'] = 'issue_reported';
        
        await deliveryRef.update({
          statusHistory: FieldValue.arrayUnion({
            status: 'issue_reported',
            timestamp: FieldValue.serverTimestamp(),
            description: `Issue reported: ${updateData.issueDescription}`
          })
        });
      }
      
      await deliveryRef.update(filteredUpdates);
    }
    
    // Get the updated delivery
    const updatedDeliverySnap = await deliveryRef.get();
    return NextResponse.json({ id: updatedDeliverySnap.id, ...updatedDeliverySnap.data() });
  } catch (error) {
    console.error('Error handling delivery update:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}