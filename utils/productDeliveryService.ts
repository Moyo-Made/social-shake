import { db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { ProductDelivery, DeliveryStatus } from '@/types/productDelivery';

// Collection reference
const deliveries_collection = 'productDeliveries';

// Create a new product delivery
export async function createProductDelivery(deliveryData: Omit<ProductDelivery, 'id' | 'createdAt' | 'statusHistory' | 'currentStatus'>) {
  try {
    const deliveriesRef = collection(db, deliveries_collection);
    
    const initialStatus = 'pending_shipment' as DeliveryStatus;
    
    const newDelivery = {
      ...deliveryData,
      createdAt: serverTimestamp(),
      currentStatus: initialStatus,
      statusHistory: [{
        status: initialStatus,
        timestamp: serverTimestamp(),
        description: "The Brand is preparing your product package"
      }],
      receiptConfirmed: false,
      contentCreationStarted: false,
      hasIssue: false,
      notificationsSent: []
    };
    
    const docRef = await addDoc(deliveriesRef, newDelivery);
    return { id: docRef.id, ...newDelivery };
  } catch (error) {
    console.error("Error creating product delivery:", error);
    throw error;
  }
}

// Get deliveries for a brand
export async function getBrandDeliveries(brandId: string) {
  try {
    const deliveriesRef = collection(db, deliveries_collection);
    const q = query(deliveriesRef, where("brandId", "==", brandId));
    
    const querySnapshot = await getDocs(q);
    const deliveries: ProductDelivery[] = [];
    
    querySnapshot.forEach((doc) => {
      deliveries.push({ id: doc.id, ...doc.data() } as ProductDelivery);
    });
    
    return deliveries;
  } catch (error) {
    console.error("Error getting brand deliveries:", error);
    throw error;
  }
}

// Get deliveries for a creator
export async function getCreatorDeliveries(creatorId: string) {
  try {
    const deliveriesRef = collection(db, deliveries_collection);
    const q = query(deliveriesRef, where("creatorId", "==", creatorId));
    
    const querySnapshot = await getDocs(q);
    const deliveries: ProductDelivery[] = [];
    
    querySnapshot.forEach((doc) => {
      deliveries.push({ id: doc.id, ...doc.data() } as ProductDelivery);
    });
    
    return deliveries;
  } catch (error) {
    console.error("Error getting creator deliveries:", error);
    throw error;
  }
}

// Get a specific delivery
export async function getDelivery(deliveryId: string) {
  try {
    const deliveryRef = doc(db, deliveries_collection, deliveryId);
    const deliverySnap = await getDoc(deliveryRef);
    
    if (!deliverySnap.exists()) {
      throw new Error("Delivery not found");
    }
    
    return { id: deliverySnap.id, ...deliverySnap.data() } as ProductDelivery;
  } catch (error) {
    console.error("Error getting delivery:", error);
    throw error;
  }
}

// Update delivery status (for brand use)
export async function updateDeliveryStatus(
  deliveryId: string, 
  newStatus: DeliveryStatus, 
  description: string, 
  trackingInfo?: { trackingNumber: string, carrier?: string }
) {
  try {
    const deliveryRef = doc(db, deliveries_collection, deliveryId);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      currentStatus: newStatus,
    };
    
    // Add the status history item
    await updateDoc(deliveryRef, {
      statusHistory: arrayUnion({
        status: newStatus,
        timestamp: serverTimestamp(),
        description
      })
    });
    
    // Add tracking info if provided
    if (trackingInfo) {
      updateData.trackingNumber = trackingInfo.trackingNumber;
      if (trackingInfo.carrier) updateData.carrier = trackingInfo.carrier;
    }
    
    // Update specific date fields based on status
    if (newStatus === 'shipped') {
      updateData.shippedDate = serverTimestamp();
      
      // Calculate estimated delivery (example: 4-7 days from shipped date)
      const now = new Date();
      updateData.estimatedDeliveryDate = {
        from: new Date(now.setDate(now.getDate() + 4)),
        to: new Date(now.setDate(now.getDate() + 3)) // +3 more days (total 7)
      };
      
      // Set content due date (14 days after estimated delivery)
      const contentDueDate = new Date(updateData.estimatedDeliveryDate.to);
      updateData.contentDueDate = new Date(contentDueDate.setDate(contentDueDate.getDate() + 14));
    }
    
    if (newStatus === 'delivered') {
      updateData.actualDeliveryDate = serverTimestamp();
    }
    
    // Update the document with all changes
    await updateDoc(deliveryRef, updateData);
    
    return await getDelivery(deliveryId);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    throw error;
  }
}

// Confirm receipt (for creator use)
export async function confirmProductReceipt(deliveryId: string) {
  try {
    const deliveryRef = doc(db, deliveries_collection, deliveryId);
    
    await updateDoc(deliveryRef, {
      receiptConfirmed: true,
      currentStatus: 'delivered' as DeliveryStatus,
      actualDeliveryDate: serverTimestamp()
    });
    
    // Add to status history
    await updateDoc(deliveryRef, {
      statusHistory: arrayUnion({
        status: 'delivered',
        timestamp: serverTimestamp(),
        description: "Package delivered and receipt confirmed"
      })
    });
    
    return await getDelivery(deliveryId);
  } catch (error) {
    console.error("Error confirming receipt:", error);
    throw error;
  }
}

// Begin content creation (for creator use)
export async function beginContentCreation(deliveryId: string) {
  try {
    const deliveryRef = doc(db, deliveries_collection, deliveryId);
    
    await updateDoc(deliveryRef, {
      contentCreationStarted: true,
      currentStatus: 'content_creation' as DeliveryStatus
    });
    
    // Add to status history
    await updateDoc(deliveryRef, {
      statusHistory: arrayUnion({
        status: 'content_creation',
        timestamp: serverTimestamp(),
        description: "Content creation period has begun"
      })
    });
    
    return await getDelivery(deliveryId);
  } catch (error) {
    console.error("Error beginning content creation:", error);
    throw error;
  }
}

// Report issue (for both brand and creator)
export async function reportDeliveryIssue(deliveryId: string, issueDescription: string) {
  try {
    const deliveryRef = doc(db, deliveries_collection, deliveryId);
    
    await updateDoc(deliveryRef, {
      hasIssue: true,
      issueDescription,
      currentStatus: 'issue_reported' as DeliveryStatus
    });
    
    // Add to status history
    await updateDoc(deliveryRef, {
      statusHistory: arrayUnion({
        status: 'issue_reported',
        timestamp: serverTimestamp(),
        description: `Issue reported: ${issueDescription}`
      })
    });
    
    return await getDelivery(deliveryId);
  } catch (error) {
    console.error("Error reporting issue:", error);
    throw error;
  }
}