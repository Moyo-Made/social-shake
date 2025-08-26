/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Creators {
	language: string;
	portfolioVideoUrls: string[] | undefined;
	id: string;
	name: string;
	username: string;
	bio: string;
	email: string;
	avatar: string;
	totalGMV: number;
	avgGMVPerVideo: number;
	avgImpressions?: string;
	pricing: {
		oneVideo: number;
		threeVideos: number;
		fiveVideos: number;
		bulkVideos: number;
		bulkVideosNote?: string;
		aiActorPricing?: number;
	};
	profilePictureUrl: string;
	contentTypes: string[];
	country: string;
	socialMedia?: {
		instagram: string;
		twitter: string;
		facebook: string;
		youtube: string;
	};

	tiktokUrl: string;
	status: string;
	dateOfBirth: string;
	gender: string;
	ethnicity: string;
	contentLinks: string[];
	verificationVideoUrl?: string;
	verifiableIDUrl?: string;
	aboutMeVideoUrl?: string;
	abnNumber?: string;
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
		updatedAt:
			| {
					_seconds: number;
					_nanoseconds: number;
			  }
			| string;
		[key: string]: any; // To allow for any additional fields in creatorProfileData
	};
}
