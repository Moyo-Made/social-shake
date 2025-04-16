// types/user.ts
export interface User {
  userId(userId: unknown): unknown;
	uid: string;
	email: string;
	displayName?: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
  }
  
  export enum UserRole {
	ADMIN = 'admin',
	BRAND = 'brand',
	CREATOR = 'creator',
  USER = "USER"
  }
  
  export enum BrandStatus {
	PENDING = 'pending',
	APPROVED = 'approved',
	SUSPENDED = 'suspended',
	REJECTED = 'rejected',
	INFO_REQUESTED = 'info_requested'
  }

  
  export interface Brand extends User {
	companyName: string;
	industry: string;
	logoUrl?: string;
	status: BrandStatus;
	rejectionReason?: string;
	requestedInfo?: string;
	// Any other brand-specific fields
  }