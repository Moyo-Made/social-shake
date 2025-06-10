/* eslint-disable @typescript-eslint/no-explicit-any */
export interface OrderData {
	projectBriefData: any;
	scriptFormData: any;
	scriptChoice: string;
	id: string;
	userId: string;
	creatorId: string;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	paymentType?: "direct" | "escrow";
	applicationFeeAmount?: number;
	status:
		| "pending"
		| "accepted"
		| "in_progress"
		| "payment_escrowed"
		| "revision_requested"
		| "delivered"
		| "completed"
		| "rejected" 
		| "active";

	createdAt: string;
	deadline?: string;
	metadata?: Record<string, string | number | boolean | null | undefined>;

	// Brand info (from user lookup)
	brandName?: string;
	brandEmail?: string;

	// Script data - aligned with API interface
	scripts?: {
		scripts: Array<{
			title?: string;
			script?: string;
			content?: string;
			notes?: string;
		}>;
	};

	// Requirements data - aligned with API interface
	requirements?: {
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
	};

	// Project brief data - flexible structure
	project_brief?: {
		projectOverview?: {
			campaignName?: string;
			objective?: string;
			targetAudience?: string;
			keyMessage?: string;
		};
		contentRequirements?: {
			mustInclude?: string[];
			avoid?: string[];
			tone?: string;
			style?: string;
		};
		brandGuidelines?: {
			colors?: string[];
			fonts?: string[];
			logo?: string;
			brandVoice?: string;
		};
		videoSpecs?: {
			format?: string;
			duration?: string;
			resolution?: string;
			deliveryFormat?: string;
		};
		examples?: {
			referenceVideos?: string[];
			competitorExamples?: string[];
			stylePreferences?: string;
		};
		timeline?: {
			deliveryDate?: string;
			milestones?: Array<{
				phase: string;
				date: string;
				description: string;
			}>;
		};
	};

	// Basic info data
	basic_info?: {
		scriptChoice?: "brand-written" | "creator-written";
		[key: string]:
			| string
			| number
			| boolean
			| null
			| undefined
			| Record<string, unknown>;
	};
}
