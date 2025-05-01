export interface Submission {
	id: string;
	creatorName: string;
	creatorIcon: string;
	videoNumber: string;
	revisionNumber: string;
	status:
		| "submitted"
		| "pending"
		| "revision_requested"
		| "approved"
		| "new"
		| "spark_requested"
		| "spark_received"
		| "spark_verified" // New state for spark code verification
		| "payment_confirmed" // New state for confirmed payment
		| "awaiting_payment"; // New state for awaiting payment
	submittedAt: string;
	thumbnail: string;
	product: "skincare" | "supplement";
	sparkCode?: string;
}

export interface CreatorSubmission {
	tiktokLink: string;
	creatorIcon: string;
	creatorName: string;
	id: string;
	userId: string;
	projectId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	videoNumber: number;
	revisionNumber: number;
	createdAt: string;
	updatedAt: string;
	videoUrl: string;
	note?: string;
	status:
		| "submitted"
		| "pending"
		| "revision_requested"
		| "approved"
		| "new"
		| "spark_requested"
		| "spark_received"
		| "spark_verified" // New state for spark code verification
		| "payment_confirmed" // New state for confirmed payment
		| "awaiting_payment"
		| "tiktokLink_requested"
		| "tiktokLink_received"
		| "tiktokLink_verified";
	sparkCode?: string;
	revisionsUsed?: number;
}

export interface SubmissionReview {
	id: string;
	submissionId: string;
	projectId: string;
	userId: string;
	approved: boolean;
	feedback: string;
	issues: string[];
	createdAt: string;
	createdBy: string;
}

export interface ReviewResponse {
	success: boolean;
	reviewId?: string;
	message?: string;
	error?: string;
	revisionsUsed?: number;
	revisionsRemaining?: number;
	details?: string;
}
