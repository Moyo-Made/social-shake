/* eslint-disable @typescript-eslint/no-explicit-any */
interface CreateOrderData {
	userId: string;
	creatorId: string;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	paymentType?: 'direct' | 'escrow';
	applicationFeeAmount?: number;
	metadata?: Record<string, any>;
  }
  
  interface UpdateOrderData {
	orderId: string;
	userId?: string;
	section: 'scripts' | 'requirements' | 'project_brief' | 'basic_info';
	data: any;
  }
  
  interface ScriptData {
	scripts: Array<{
	  title?: string;
	  script?: string;
	  content?: string;
	  notes?: string;
	}>;
  }
  
  interface RequirementsData {
	generalRequirements?: {
	  targetAudience?: string;
	  brandVoice?: string;
	  callToAction?: string;
	  keyMessages?: string;
	  stylePreferences?: string;
	  additionalNotes?: string;
	};
	videoSpecs?: {
	  duration?: string;
	  format?: string;
	  deliveryFormat?: string;
	};
  }
  
  class OrderApiService {
	private baseUrl = '/api/orders'; // Adjust to your API endpoint
  
	// POST - Create Draft Order
	async createDraftOrder(data: CreateOrderData) {
	  const response = await fetch(this.baseUrl, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	  });
  
	  if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create order');
	  }
  
	  return response.json();
	}
  
	// PATCH - Update Order Sections
	async updateOrderSection(data: UpdateOrderData) {
	  const response = await fetch(this.baseUrl, {
		method: 'PATCH',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	  });
  
	  if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update order');
	  }
  
	  return response.json();
	}
  
	// Specific helper methods for different sections
	async updateScripts(orderId: string, userId: string, scriptData: ScriptData) {
	  return this.updateOrderSection({
		orderId,
		userId,
		section: 'scripts',
		data: scriptData,
	  });
	}
  
	async updateRequirements(orderId: string, userId: string, requirementsData: RequirementsData) {
	  return this.updateOrderSection({
		orderId,
		userId,
		section: 'requirements',
		data: requirementsData,
	  });
	}
  
	async updateProjectBrief(orderId: string, userId: string, projectBriefData: any) {
	  return this.updateOrderSection({
		orderId,
		userId,
		section: 'project_brief',
		data: projectBriefData,
	  });
	}
  
	async updateBasicInfo(orderId: string, userId: string, basicInfoData: any) {
	  return this.updateOrderSection({
		orderId,
		userId,
		section: 'basic_info',
		data: basicInfoData,
	  });
	}
  
	// PUT - Finalize Order
	async finalizeOrder(orderId: string, userId?: string) {
	  const response = await fetch(this.baseUrl, {
		method: 'PUT',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ orderId, userId }),
	  });
  
	  if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to finalize order');
	  }
  
	  return response.json();
	}
  
	// GET - Fetch Order
	async getOrder(orderId: string, userId?: string) {
	  const params = new URLSearchParams({ orderId });
	  if (userId) params.append('userId', userId);
  
	  const response = await fetch(`${this.baseUrl}?${params.toString()}`);
	  
	  if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch order');
	  }
  
	  return response.json();
	}
  
	// GET - Fetch Creator Orders
	async getCreatorOrders(creatorId: string) {
	  const params = new URLSearchParams({ creatorId });
	  const response = await fetch(`${this.baseUrl}?${params.toString()}`);
	  
	  if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch creator orders');
	  }
  
	  return response.json();
	}
  }
  
  // Export singleton instance
  export const orderApi = new OrderApiService();
  
  // Also export the class for testing or multiple instances
  export default OrderApiService;