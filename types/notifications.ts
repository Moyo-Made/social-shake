export interface NotificationData {
	response: "accepted" | "rejected" | null;
	id?: string;
	type:
		| "project_invitation"
		| "application_accepted"
		| "application_rejected"
		| "project_deadline_approaching"
		| "new_application"
		| "order_finalized"
		| "order_ready_for_payment";
	title: string;
	message: string;
	userId: string;
	projectId?: string;
	brandName?: string;
	brandId?: string;
	projectTitle?: string;
	creatorId?: string;
	creatorName?: string;
	responded?: boolean | string;
	createdAt: Date;
	readAt?: Date;

	invitationStatus?: "pending" | "accepted" | "declined";
	invitedAt?: Date;
	respondedAt?: Date;

	// Order-related fields
	orderId?: string;
	relatedId?: string; 
	relatedTo?: "order" | "project";
	status?: "unread" | "read";
}

export interface InvitationResponse {
	notificationId: string;
	projectId: string;
	response: "accepted" | "declined";
}
