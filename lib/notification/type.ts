// lib/notification/types.ts
export interface Notification {
	id: string;
	userId: string;
	title: string;
	message: string;
	type: NotificationType;
	relatedId?: string; // ID of related item (project, submission, etc.)
	read: boolean;
	createdAt: Date;
	link?: string; // Optional link to navigate to when clicking notification
  }
  
  export enum NotificationType {
	CREATOR_APPLICATION = 'creator_applications',
	SUBMISSION_APPROVAL = 'submission_approvals',
	PAYMENT_RECEIPT = 'payment_receipts',
	MILESTONE_UPDATE = 'milestone_updates',
	DEADLINE_REMINDER = 'deadline_reminders',
  }
  