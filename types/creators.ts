import { StaticImport } from "next/dist/shared/lib/get-img-props";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Creator {
	abnNumber: number;
	tiktokLink: string;
	fullName: string;
	profileImage: string | StaticImport;
	metrics: any;
	position: any;
	id: string;
	verificationId: string;
	userId: string;
	creator: string;
	status: string;
	photoURL?: string | null;
	createdAt: string;
	logoUrl: string | null;
	bio: string | null;
	socialMedia: {
		instagram?: string;
		twitter?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		[key: string]: string | undefined;
	};
	firstName: string | null;
	lastName: string | null;
	displayName?: string;
	email: string | null;
	username: string | null;
	contentTypes: string[] | null;
	contentLinks: string[] | null;
	country: string | null;
	gender: string | null;
	ethnicity: string | null;
	dateOfBirth: string ;
	verifiableIDUrl: string | null;
	verificationVideoUrl: string | null;
	pricing: {
		oneVideo: number;
		threeVideos: number;
		fiveVideos: number;
		bulkVideos: number;
		bulkVideosNote?: string;
	};
	
	// TikTok data from the tiktokData object
	tiktokData?: {
		tiktokHandle?: string | null;
		tiktokFollowers?: number | null;
		tiktokEngagementRate?: number | null;
		tiktokContentCategory?: string | null;
		tiktokAverageViews?: number | null;
	};
	
	// TikTok metrics object
	tiktokMetrics?: {
		followers: { 
			count: number; 
			insights: any | null 
		};
		videos: { 
			count: number; 
			recentVideos: any[] 
		};
		engagement?: {
			rate?: number;
			averageLikes?: number;
			averageComments?: number;
			averageShares?: number;
			averageViews?: number;
		};
		views?: number;
		likes?: number;
		comments?: number;
		shares?: number;
	};
	
	// Analytics fields
	totalGMV?: number;
	avgGMVPerVideo?: number;
	avgImpressions?: number;
	
	// Additional fields from the response
	profileLinks?: any | null;
	brandCollaborations?: any | null;
	demographics?: any | null;
	specialties?: any | null;
	languages?: any | null;
	preferredContactMethod?: string | null;
	availability?: any | null;
	portfolioItems?: any[] | null;
	businessInformation?: any | null;
	achievements?: any | null;
	
	// Full creator profile data
	creatorProfileData?: {
		createdAt: string;
		firstName: string;
		lastName: string;
		displayUsername: string;
		userType: string;
		userId: string;
		email: string;
		username: string;
		tiktokConnected?: boolean;
		tiktokFollowerCount?: number;
		tiktokUsername?: string;
		tiktokDisplayName?: string;
		tiktokId?: string;
		tiktokProfileLink?: string;
		tiktokEngagementRate?: number;
		tiktokAvatarUrl?: string;
		tiktokMetrics?: {
			followers: {
				count: number;
				insights: any | null;
			};
			videos: {
				count: number;
				recentVideos: any[];
			};
			engagement: {
				rate: number;
				averageLikes: number;
				averageComments: number;
				averageShares: number;
				averageViews: number;
			};
			views: number;
			likes: number;
			comments: number;
			shares: number;
		};
		updatedAt: {
			_seconds: number;
			_nanoseconds: number;
		} | string;
		[key: string]: any; // To allow for any additional fields in creatorProfileData
	};
}

export interface CreatorProfileData {
	language: string;
	picture: File | null;
	bio: string;
	tiktokUrl: string;
	ethnicity: string;
	dateOfBirth: string;
	gender: string;
	contentTypes?:  string | string[] | undefined;
	socialMedia: {
		instagram: string;
		twitter: string;
		facebook: string;
		youtube: string;
		tiktok: string;
	};
	country: string;
	contentLinks: string[];
	pricing: {
		oneVideo: number;
		threeVideos: number;
		fiveVideos: number;
		bulkVideos: number;
		bulkVideosNote?: string;
		aiActorPricing?: number
	};
	id: string;
	verificationId: string;
	userId: string;
	creator: string;
	status: string;
	createdAt: string;
	logoUrl: string | null;
	firstName: string;
	lastName: string;
	profilePictureUrl: string | null;
	email: string;
	username: string;
	verifiableIDUrl: string | null;
	verificationVideoUrl: string | null;
	tiktokConnected?: boolean;
	tiktokId?: string;
	abnNumber?: string | null;
	aboutMeVideo?: File |  string | null;
}
