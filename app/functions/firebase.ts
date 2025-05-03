/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// Define types for better type safety
interface DeliveryStatus {
  currentStatus: string;
  statusHistory: any[];
  shippedDate?: admin.firestore.Timestamp;
  actualDeliveryDate?: admin.firestore.Timestamp;
  receiptConfirmed?: boolean;
  contentCreationStarted?: boolean;
  contentCreationStartDate?: admin.firestore.Timestamp;
  contentDueDate?: admin.firestore.Timestamp;
  productName?: string;
  productQuantity?: number;
  productType?: string;
  shippingAddress?: any;
  estimatedDeliveryDate?: admin.firestore.Timestamp | {
    from: admin.firestore.Timestamp;
    to: admin.firestore.Timestamp;
  };
}

interface StatusEntry {
  status: string;
  timestamp: admin.firestore.FieldValue;
  description: string;
  location?: string;
}

// Get delivery status for a project
export const getDeliveryStatus = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  // Ensure user is authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { projectId } = request.data;
  if (!projectId) {
    throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
  }

  try {
    // Get the project document to check permissions
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Check if user is authorized to view this project
    // User must be either the creator or from the brand
    if (projectData?.creatorId !== request.auth?.uid && 
            projectData?.brandId !== request.auth?.uid && 
            !request.auth?.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to view this project');
    }
    
    // Get delivery tracking data
    const deliveryDoc = await db.collection('projects').doc(projectId)
      .collection('delivery').doc('tracking').get();
    
    if (!deliveryDoc.exists) {
      return { exists: false, message: 'No delivery information found' };
    }
    
    return {
      exists: true,
      data: deliveryDoc.data()
    };
  } catch (error) {
    console.error('Error getting delivery status:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving delivery status');
  }
});

// Update delivery status (typically called by admin or system)
export const updateDeliveryStatus = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  // Ensure user is authenticated and has admin privileges
  if (!request.auth || !request.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Requires admin privileges');
  }

  const { projectId, status, description, location } = request.data;
  
  if (!projectId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Project ID and status are required');
  }

  try {
    const deliveryRef = db.collection('projects').doc(projectId)
      .collection('delivery').doc('tracking');
    
    const deliveryDoc = await deliveryRef.get();
    
    if (!deliveryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Delivery tracking not found');
    }
    
    const currentData = deliveryDoc.data() as DeliveryStatus | undefined;
    
    // Create new status entry
    const statusEntry: StatusEntry = {
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: description || getDefaultDescription(status, currentData?.productName ?? ''),
      ...(location && { location })
    };
    
    // Set appropriate date fields based on status
    const updates: {
      currentStatus: string;
      statusHistory: FirebaseFirestore.FieldValue;
      shippedDate?: FirebaseFirestore.FieldValue;
      actualDeliveryDate?: FirebaseFirestore.FieldValue;
    } = {
      currentStatus: status,
      statusHistory: admin.firestore.FieldValue.arrayUnion(statusEntry)
    };
    
    if (status === 'shipped' && currentData && !currentData.shippedDate) {
      updates.shippedDate = admin.firestore.FieldValue.serverTimestamp();
    } else if (status === 'delivered' && currentData && !currentData.actualDeliveryDate) {
      updates.actualDeliveryDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    // Update the document
    await deliveryRef.update(updates);
    
    return { success: true, message: 'Delivery status updated' };
  } catch (error) {
    console.error('Error updating delivery status:', error);
    throw new functions.https.HttpsError('internal', 'Error updating delivery status');
  }
});

// Confirm product receipt (called by creator)
export const confirmProductReceipt = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  // Ensure user is authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { projectId } = request.data;
  
  if (!projectId) {
    throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
  }

  try {
    // Get the project to verify user is the creator
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Only the creator can confirm receipt
    if (projectData?.creatorId !== request.auth?.uid && !request.auth?.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the creator can confirm receipt');
    }
    
    const deliveryRef = db.collection('projects').doc(projectId)
      .collection('delivery').doc('tracking');
    
    const deliveryDoc = await deliveryRef.get();
    
    if (!deliveryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Delivery tracking not found');
    }
    
    // Calculate content creation start date (typically receipt date)
    const contentCreationStartDate = admin.firestore.Timestamp.now();
    
    // Update the document to mark receipt as confirmed and update status
    await deliveryRef.update({
      receiptConfirmed: true,
      currentStatus: 'delivered',
      actualDeliveryDate: admin.firestore.FieldValue.serverTimestamp(),
      contentCreationStartDate,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'delivered',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: 'Package delivered and receipt confirmed'
      })
    });
    
    return { 
      success: true, 
      message: 'Receipt confirmed',
      contentCreationStartDate
    };
  } catch (error) {
    console.error('Error confirming receipt:', error);
    throw new functions.https.HttpsError('internal', 'Error confirming receipt');
  }
});

// Begin content creation period
export const beginContentCreation = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  // Ensure user is authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { projectId } = request.data;
  
  if (!projectId) {
    throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
  }

  try {
    // Get the project to verify user is the creator
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Only the creator can begin content creation
    if (projectData?.creatorId !== request.auth.uid && !request.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the creator can begin content creation');
    }
    
    const deliveryRef = db.collection('projects').doc(projectId)
      .collection('delivery').doc('tracking');
    
    const deliveryDoc = await deliveryRef.get();
    
    if (!deliveryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Delivery tracking not found');
    }
    
    const deliveryData = deliveryDoc.data() as DeliveryStatus;
    
    // Check if receipt has been confirmed
    if (!deliveryData.receiptConfirmed) {
      throw new functions.https.HttpsError('failed-precondition', 'Receipt must be confirmed before beginning content creation');
    }
    
    // Update the document
    await deliveryRef.update({
      contentCreationStarted: true,
      currentStatus: 'content_creation',
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'content_creation',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: 'Content creation period has begun'
      })
    });
    
    // Update the main project status as well
    await db.collection('projects').doc(projectId).update({
      status: 'content_creation'
    });
    
    return { 
      success: true, 
      message: 'Content creation period has begun',
      contentDueDate: deliveryData.contentDueDate
    };
  } catch (error) {
    console.error('Error beginning content creation:', error);
    throw new functions.https.HttpsError('internal', 'Error beginning content creation');
  }
});

// Helper function to generate default descriptions based on status
function getDefaultDescription(status: string, productName: string): string {
  switch (status) {
    case 'preparation':
      return 'The Brand is preparing your product package';
    case 'shipped':
      return `The Product "${productName}" has been shipped`;
    case 'in_region':
      return `The Product "${productName}" has arrived in your region`;
    case 'out_for_delivery':
      return 'Your package is on a delivery vehicle and will be delivered soon';
    case 'delivered':
      return 'Package will be marked as delivered once you confirm receipt';
    case 'content_creation':
      return 'You begin once your Package is Delivered';
    default:
      return 'Status updated';
  }
}

// Create new delivery tracking for a project (typically called when project is approved)
export const createDeliveryTracking = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  // Ensure user is authenticated and has admin privileges
  if (!request.auth || !request.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Requires admin privileges');
  }

  const { 
    projectId, 
    productName, 
    productQuantity, 
    productType,
    shippingAddress,
    estimatedDeliveryDate,
    contentDueDate
  } = request.data;
  
  if (!request.auth || !request.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Requires admin privileges');
  }

  if (!projectId || !productName || !shippingAddress) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'Project ID, product name, and shipping address are required'
    );
  }

  try {
    // Check if project exists
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project not found');
    }
    
    // Convert string dates to Firestore timestamps if provided
    let estDelivery: admin.firestore.Timestamp | { from: admin.firestore.Timestamp; to: admin.firestore.Timestamp } | undefined;
    if (typeof estimatedDeliveryDate === 'object' && estimatedDeliveryDate !== null) {
      if (estimatedDeliveryDate.from && estimatedDeliveryDate.to) {
        estDelivery = {
          from: admin.firestore.Timestamp.fromDate(new Date(estimatedDeliveryDate.from)),
          to: admin.firestore.Timestamp.fromDate(new Date(estimatedDeliveryDate.to))
        };
      }
    } else if (estimatedDeliveryDate) {
      estDelivery = admin.firestore.Timestamp.fromDate(new Date(estimatedDeliveryDate));
    }
    
    const contentDue = contentDueDate ? 
      admin.firestore.Timestamp.fromDate(new Date(contentDueDate)) : null;
    
    // Create the initial tracking document
    const initialTracking: DeliveryStatus = {
      productName,
      productQuantity: productQuantity || 1,
      productType: productType || 'Product Sample',
      shippingAddress,
      currentStatus: 'preparation',
      statusHistory: [
        {
          status: 'preparation',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: 'The Brand is preparing your product package'
        }
      ],
      estimatedDeliveryDate: estDelivery,
      contentDueDate: contentDue || undefined,
      receiptConfirmed: false,
      contentCreationStarted: false
    };
    
    // Save the tracking document
    await db.collection('projects').doc(projectId)
      .collection('delivery').doc('tracking').set(initialTracking);
    
    return { success: true, message: 'Delivery tracking created' };
  } catch (error) {
    console.error('Error creating delivery tracking:', error);
    throw new functions.https.HttpsError('internal', 'Error creating delivery tracking');
  }
});