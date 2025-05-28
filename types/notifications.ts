export interface NotificationData {
	id?: string;
	type:
		| "project_invitation"
		| "application_accepted"
		| "application_rejected"
		| "project_deadline_approaching"
		| "new_application";
	title: string;
	message: string;
	userId: string;
	projectId?: string;
	brandName?: string;
	brandId?: string;
	projectTitle?: string;
	creatorId?: string;
	creatorName?: string;
	read: boolean;
	responded?: boolean;
	createdAt: Date;
	readAt?: Date;

	invitationStatus?: "pending" | "accepted" | "declined";
	invitedAt?: Date;
	respondedAt?: Date;
}

export interface InvitationResponse {
	notificationId: string;
	projectId: string;
	response: "accepted" | "declined";
}
