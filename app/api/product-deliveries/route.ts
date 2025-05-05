import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();
const deliveries_collection = 'productdeliveries';
const applications_collection = 'project_applications';
const projects_collection = 'projects';
const creators_collection = 'creators';

// Helper function to verify the auth token
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  
  const token = authHeader.split('Bearer ')[1];
  return await auth.verifyIdToken(token);
}

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null) {
  if (!data) return data;
  
  const result: Record<string, unknown> = { ...data };
  
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[key] = convertTimestampsToISO(value as Record<string, unknown>);
    }
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user's token
    const decodedToken = await verifyAuthToken(request);
    const userId = decodedToken.uid;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role') || 'brand'; // 'brand' or 'creator'
    const projectId = searchParams.get('projectId');
    
    // If projectId is not provided and role is brand, return deliveries for all projects owned by this brand
    if (userRole === 'brand' && !projectId) {
      return await getBrandDeliveries(userId);
    }
    
    // If projectId is not provided and role is creator, return deliveries for this creator
    if (userRole === 'creator' && !projectId) {
      return await getCreatorDeliveries(userId);
    }
    
    // If projectId is provided and role is brand, return approved applicants with shipping addresses
    if (userRole === 'brand' && projectId) {
      // Verify brand owns this project
      const projectDoc = await db.collection(projects_collection).doc(projectId).get();
      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      const projectData = projectDoc.data();
      if (projectData?.createdBy !== userId) {
        return NextResponse.json({ error: 'Unauthorized to access this project' }, { status: 403 });
      }
      
      // Get approved applications for this project
      const applicationsSnapshot = await db
        .collection(applications_collection)
        .where('projectId', '==', projectId)
        .where('status', '==', 'approved')
        .get();
      
      if (applicationsSnapshot.empty) {
        return NextResponse.json({ approvedApplicants: [], deliveries: [] });
      }
      
      // Get all user IDs from approved applications
      const userIds = applicationsSnapshot.docs.map(doc => doc.data().userId);
      const uniqueUserIds = [...new Set(userIds)];
      
      // Get creator data for each user
      const creatorData = await getCreatorDataForUsers(uniqueUserIds);
      
      // Get existing deliveries for this project
      const deliveriesSnapshot = await db
        .collection(deliveries_collection)
        .where('projectId', '==', projectId)
        .get();
      
      const deliveries: { id: string; creatorId?: string; projectId?: string; [key: string]: unknown }[] = [];
      const existingDeliveryByCreator = new Map();
      
      deliveriesSnapshot.forEach(doc => {
        const delivery = { id: doc.id, ...convertTimestampsToISO(doc.data()) } as { id: string; creatorId?: string };
        deliveries.push({ ...delivery });
        
        // Map creator ID to delivery
        if ('creatorId' in delivery && delivery.creatorId) {
          existingDeliveryByCreator.set(delivery.creatorId, delivery);
        }
      });
      
      // Combine application data with creator data and delivery status
      const approvedApplicants = applicationsSnapshot.docs.map(doc => {
        const application = {
          id: doc.id,
          ...convertTimestampsToISO(doc.data())
        };
        
        const userId = (application as { id: string; userId: string }).userId;
        const creator = creatorData.get(userId) || { userId };
        const delivery = existingDeliveryByCreator.get(userId);
        
        return {
          application,
          creator,
          hasDelivery: !!delivery,
          deliveryId: delivery ? delivery.id : null,
          deliveryStatus: delivery ? delivery.currentStatus : null
        };
      });
      
      return NextResponse.json({
        approvedApplicants,
        deliveries
      });
    }
    
    // If projectId is provided and role is creator, return deliveries for this creator in this project
    if (userRole === 'creator' && projectId) {
      const deliveriesSnapshot = await db
        .collection(deliveries_collection)
        .where('projectId', '==', projectId)
        .where('creatorId', '==', userId)
        .get();
      
      const deliveries: { id: string; creatorId?: string; projectId?: string; }[] = [];
      deliveriesSnapshot.forEach(doc => {
        deliveries.push({
          id: doc.id,
          ...convertTimestampsToISO(doc.data())
        });
      });
      
      return NextResponse.json({ deliveries });
    }
    
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error handling product deliveries:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get deliveries for a brand
async function getBrandDeliveries(brandId: string) {
  const deliveriesSnapshot = await db
    .collection(deliveries_collection)
    .where('brandId', '==', brandId)
    .get();
  
  const deliveries: { id: string; creatorId?: string; projectId?: string; }[] = [];
  const creatorIds = new Set<string>();
  
  deliveriesSnapshot.forEach(doc => {
    const delivery = { id: doc.id, ...convertTimestampsToISO(doc.data()) };
    const projectIdValue = (delivery as { projectId?: string }).projectId || null; // Ensure projectId is defined
    deliveries.push({ ...delivery, projectId: projectIdValue || undefined });
    
    if ('creatorId' in delivery && delivery.creatorId) {
      creatorIds.add(delivery.creatorId as string);
    }
  });
  
  // Get creator data for each delivery
  const creatorData = await getCreatorDataForUsers([...creatorIds]);
  
  // Attach creator data to deliveries
  const deliveriesWithCreatorData = deliveries.map(delivery => {
    const creatorId = delivery.creatorId as string;
    const creator = creatorData.get(creatorId) || null;
    
    return {
      ...delivery,
      creatorData: creator
    };
  });
  
  return NextResponse.json({ deliveries: deliveriesWithCreatorData });
}

// Helper function to get deliveries for a creator
async function getCreatorDeliveries(creatorId: string) {
  const deliveriesSnapshot = await db
    .collection(deliveries_collection)
    .where('creatorId', '==', creatorId)
    .get();
  
  const deliveries: {
	  projectId: string; id: string; creatorId?: string; 
}[] = [];
  const brandIds = new Set();
  const projectIds = new Set();
  
  deliveriesSnapshot.forEach(doc => {
    const delivery = { id: doc.id, ...convertTimestampsToISO(doc.data()) };
    deliveries.push({
		...delivery,
		projectId: ''
	});
    
    if ((delivery as { brandId?: string }).brandId) {
      brandIds.add((delivery as unknown as { brandId: string }).brandId);
    }
    if ((delivery as { projectId?: string }).projectId) {
      projectIds.add((delivery as unknown as { projectId: string }).projectId);
    }
  });
  
  // Get project data
  const projectData = new Map();
  for (const id of projectIds) {
    const doc = await db.collection(projects_collection).doc(id as string).get();
    if (doc.exists) {
      const docData = doc.data();
      if (docData) {
        projectData.set(id, { id: doc.id, ...convertTimestampsToISO(docData) });
      }
    }
  }
  
  // Attach project data to deliveries
  const deliveriesWithData = deliveries.map(delivery => {
    const projectId = delivery.projectId as string;
    const project = projectData.get(projectId) || null;
    
    return {
      ...delivery,
      projectData: project
    };
  });
  
  return NextResponse.json({ deliveries: deliveriesWithData });
}

// Helper function to get creator data for a list of user IDs
async function getCreatorDataForUsers(userIds: string[]) {
  const creatorData = new Map();
  
  if (userIds.length === 0) {
    return creatorData;
  }
  
  // Firestore has a limit of 10 items for 'in' queries
  // Split into chunks if necessary
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    
    const creatorsSnapshot = await db
      .collection(creators_collection)
      .where('userId', 'in', chunk)
      .get();
    
    creatorsSnapshot.forEach(doc => {
      const creator = { id: doc.id, userId: doc.data().userId, ...convertTimestampsToISO(doc.data()) };
      if (creator.userId) {
        creatorData.set(creator.userId, creator);
      }
    });
  }
  
  return creatorData;
}

// POST endpoint remains the same as in your original code
export async function POST(request: NextRequest) {
  try {
    // Verify the user's token
    const decodedToken = await verifyAuthToken(request);
    const userId = decodedToken.uid;
    
    // Parse the request body
    const body = await request.json();
    const { creatorId, projectId, productName, productQuantity, productType, trackingNumber, carrier } = body;
    
    if (!creatorId || !projectId) {
      return NextResponse.json({ error: 'Creator ID and Project ID are required' }, { status: 400 });
    }
    
    // Get shipping address from project application
    let shippingAddress = body.shippingAddress;
    
    if (!shippingAddress) {
      // Fetch shipping address from project application
      const applicationsSnapshot = await db
        .collection(applications_collection)
        .where('projectId', '==', projectId)
        .where('userId', '==', creatorId)
        .where('status', '==', 'approved')
        .limit(1)
        .get();
      
      if (!applicationsSnapshot.empty) {
        const applicationData = applicationsSnapshot.docs[0].data();
        shippingAddress = applicationData.shippingAddress;
      }
      
      if (!shippingAddress) {
        return NextResponse.json({ error: 'Shipping address not found' }, { status: 400 });
      }
    }
    
    const newDelivery = {
      creatorId,
      brandId: userId, // The brand creating this delivery
      projectId,
      productName: productName || 'Unnamed Product',
      productQuantity: productQuantity || 1,
      productType: productType || 'Other',
      shippingAddress,
      currentStatus: 'pending_shipment',
      statusHistory: [{
        status: 'pending_shipment',
        timestamp: FieldValue.serverTimestamp(),
        description: "The Brand is preparing your product package"
      }],
      createdAt: FieldValue.serverTimestamp(),
      receiptConfirmed: false,
      contentCreationStarted: false,
      hasIssue: false,
      trackingNumber: undefined, // Initialize trackingNumber
      carrier: undefined // Initialize carrier
    };
    
    // Add tracking info if provided
    if (trackingNumber) {
      newDelivery.trackingNumber = trackingNumber;
      newDelivery.carrier = carrier || 'Default Carrier';
      newDelivery.currentStatus = 'shipped';
      newDelivery.statusHistory.push({
        status: 'shipped',
        timestamp: FieldValue.serverTimestamp(),
        description: `Product shipped with ${carrier || 'Default Carrier'}, tracking: ${trackingNumber}`
      });
    }
    
    const docRef = await db.collection(deliveries_collection).add(newDelivery);
    
    // Create a notification for the creator
    await db.collection('notifications').add({
      userId: creatorId,
      message: `A new product (${newDelivery.productName}) is being prepared for shipping to you.`,
      status: 'unread',
      createdAt: FieldValue.serverTimestamp(),
      relatedTo: 'product_delivery',
      deliveryId: docRef.id,
      projectId: projectId
    });
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...convertTimestampsToISO(newDelivery)
    }, { status: 201 });
  } catch (error) {
    console.error('Error handling product deliveries:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT endpoint remains the same as in your original code
export async function PUT(request: NextRequest) {
  try {
    // Verify the user's token
    const decodedToken = await verifyAuthToken(request);
    const userId = decodedToken.uid;
    
    // Get delivery ID from path
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    const userRole = searchParams.get('role') || 'brand';
    
    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery ID is required' }, { status: 400 });
    }
    
    // Get the delivery document
    const deliveryRef = db.collection(deliveries_collection).doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();
    
    if (!deliveryDoc.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }
    
    const deliveryData = deliveryDoc.data();
    
    // Check if user has permission (either brand or creator depending on role)
    if ((userRole === 'brand' && deliveryData?.brandId !== userId) || 
        (userRole === 'creator' && deliveryData?.creatorId !== userId)) {
      return NextResponse.json({ error: 'Unauthorized to update this delivery' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    const historyEntry: { timestamp: FirebaseFirestore.FieldValue; status?: string; description?: string } = {
      timestamp: FieldValue.serverTimestamp()
    };
    
    // Handle status update
    if (body.currentStatus && body.currentStatus !== deliveryData?.currentStatus) {
      updates.currentStatus = body.currentStatus;
      historyEntry.status = body.currentStatus;
      historyEntry.description = body.description || `Status updated to ${body.currentStatus}`;
      
      // Add entry to status history
      updates.statusHistory = FieldValue.arrayUnion(historyEntry);
    }
    
    // Handle tracking info update
    if (body.trackingNumber) {
      updates.trackingNumber = body.trackingNumber;
      updates.carrier = body.carrier || 'Default Carrier';
      
      // If no status update was specified but tracking is added, update to shipped
      if (!body.currentStatus && deliveryData?.currentStatus === 'pending_shipment') {
        updates.currentStatus = 'shipped';
        
        // Add entry to status history if we're changing status
        if (!historyEntry.status) {
          historyEntry.status = 'shipped';
          historyEntry.description = `Product shipped with ${updates.carrier}, tracking: ${updates.trackingNumber}`;
          updates.statusHistory = FieldValue.arrayUnion(historyEntry);
        }
      }
    }
    
    // Handle issue reporting
    if (body.hasIssue !== undefined) {
      updates.hasIssue = body.hasIssue;
      
      if (body.hasIssue && body.issueDescription) {
        updates.issueDescription = body.issueDescription;
      }
    }
    
    // Handle receipt confirmation or content creation status
    if (body.receiptConfirmed !== undefined) {
      updates.receiptConfirmed = body.receiptConfirmed;
    }
    
    if (body.contentCreationStarted !== undefined) {
      updates.contentCreationStarted = body.contentCreationStarted;
    }
    
    // Update the document
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = FieldValue.serverTimestamp();
      await deliveryRef.update(updates);
      
      // Create notification for status changes
      if (updates.currentStatus) {
        const recipientId = userRole === 'brand' ? deliveryData?.creatorId : deliveryData?.brandId;
        const productName = deliveryData?.productName || 'Product';
        
        let message;
        switch (updates.currentStatus) {
          case 'shipped':
            message = `Your ${productName} has been shipped!`;
            break;
          case 'delivered':
            message = `Your ${productName} has been marked as delivered.`;
            break;
          case 'issue_reported':
            message = `An issue has been reported with the ${productName} delivery.`;
            break;
          default:
            message = `The status of your ${productName} delivery has been updated to ${updates.currentStatus}.`;
        }
        
        await db.collection('notifications').add({
          userId: recipientId,
          message,
          status: 'unread',
          createdAt: FieldValue.serverTimestamp(),
          relatedTo: 'product_delivery',
          deliveryId,
          projectId: deliveryData?.projectId
        });
      }
      
      // Get updated document
      const updatedDoc = await deliveryRef.get();
      const updatedData = updatedDoc.data() || null;
      return NextResponse.json(convertTimestampsToISO(updatedData));
    } else {
      return NextResponse.json({ message: 'No updates provided' });
    }
  } catch (error) {
    console.error('Error updating product delivery:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}