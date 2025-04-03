export interface Submission {
	id: string;
	creatorName: string;
	creatorIcon: string;
	videoNumber: string;
	revisionNumber: string;
	status:
		| "submitted"
		| "approved"
		| "new"
		| "spark_requested"
		| "spark_received"
		| "spark_verified"   // New state for spark code verification
		| "payment_confirmed" // New state for confirmed payment
		| "awaiting_payment"; // New state for awaiting payment
	submittedAt: string;
	thumbnail: string;
	product: "skincare" | "supplement";
	sparkCode?: string;
}