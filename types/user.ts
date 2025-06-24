export interface User {
	getIdToken(): unknown;
  providerData: string[];
	photoURL: string;
	logoUrl: string;
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

  export enum CreatorStatus{
	PENDING = 'pending',
	APPROVED = 'approved',
	SUSPENDED = 'suspended',
	REJECTED = 'rejected',
	INFO_REQUESTED = 'info_requested'
  }

  
  export interface BrandProfile {
	profilePictureUrl: string;
	id: string;
	userId: string;
	email: string;
	brandName?: string;
	logoUrl?: string;
	status?: string;
}