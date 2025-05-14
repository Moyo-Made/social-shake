export interface TikTokProfile {
	// Firebase user ID (primary key)
	userId: string;
	
	// TikTok account information
	tiktokId: string;
	displayName: string | null;
	avatarUrl: string | null;
	username: string | null;
	profileLink: string | null;
	
	// Authentication tokens and scope
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	scope: string;
	expiresIn: number;
	
	// Timestamps
	connectedAt: FirebaseFirestore.Timestamp;
	lastRefreshedAt?: FirebaseFirestore.Timestamp;
	lastUsedAt?: FirebaseFirestore.Timestamp;
	
	// Optional metrics
	followerCount?: number;
	followingCount?: number;
	totalLikes?: number;
	
	// Status flags
	isActive?: boolean;
	isSuspended?: boolean;
  }