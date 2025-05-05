/* eslint-disable @typescript-eslint/no-explicit-any */
export type DeliveryStatus = 
  | 'pending_shipment'
  | 'shipped' 
  | 'in_region' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'content_creation'
  | 'issue_reported';

export interface StatusHistoryItem {
  status: DeliveryStatus;
  timestamp: any; // FirebaseFirestore.Timestamp on server, timestamp.seconds on client
  description: string;
}

export interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ProductDelivery {
  id?: string;
  creatorId: string;
  brandId: string;
  projectId: string;
  
  // Product details
  productName: string;
  productQuantity: number;
  productType: string;
  
  // Shipping details
  shippingAddress: ShippingAddress;
  
  // Status information
  currentStatus: DeliveryStatus;
  statusHistory: StatusHistoryItem[];
  
  // Tracking details
  trackingNumber?: string;
  carrier?: string;
  
  // Important dates
  createdAt: any;
  shippedDate?: any;
  estimatedDeliveryDate?: {
    from: any;
    to: any;
  };
  actualDeliveryDate?: any;
  contentDueDate?: any;
  
  // Flags
  receiptConfirmed: boolean;
  contentCreationStarted: boolean;
  hasIssue: boolean;
  issueDescription?: string;
  
  // Communication
  notificationsSent?: Array<{
    type: string;
    timestamp: any;
    message: string;
  }>;
}