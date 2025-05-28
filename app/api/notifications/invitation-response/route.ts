import { adminDb } from "@/config/firebase-admin";
import { NotificationData } from "@/types/notifications";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
			const userId = request.nextUrl.searchParams.get("userId");
	
			if (!userId) {
				return NextResponse.json(
					{ error: "User ID is required" },
					{ status: 400 }
				);
			}
	
	  const body = await request.json();
	  const { notificationId, projectId, response, creatorName } = body;
  
	  if (!['accepted', 'declined'].includes(response)) {
		return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
	  }
  
	  // Start a transaction to update multiple documents
	  await adminDb.runTransaction(async (transaction) => {
		// Update the notification
		const notificationRef = adminDb.collection('notifications').doc(notificationId);
		const notificationDoc = await transaction.get(notificationRef);
		
		if (!notificationDoc.exists || notificationDoc.data()?.userId !== userId) {
		  throw new Error('Notification not found');
		}
  
		transaction.update(notificationRef, {
		  read: true,
		  responded: true,
		  readAt: new Date(),
		});
  
		// Update project invitation status
		const projectRef = adminDb.collection('projects').doc(projectId);
		const projectDoc = await transaction.get(projectRef);
		
		if (!projectDoc.exists) {
		  throw new Error('Project not found');
		}
  
		const projectData = projectDoc.data();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const invitationUpdate: any = {
		  [`invitations.${userId}.status`]: response,
		  [`invitations.${userId}.respondedAt`]: new Date(),
		};
  
		if (response === 'accepted') {
		  invitationUpdate[`invitations.${userId}.acceptedAt`] = new Date();
		  // Add creator to project participants if not already there
		  const participants = projectData?.participants || [];
		  if (!participants.includes(userId)) {
			invitationUpdate.participants = [...participants, userId];
		  }
		}
  
		transaction.update(projectRef, invitationUpdate);

		if (!creatorName) {
			return NextResponse.json(
			  { error: "Creator name is required" },
			  { status: 400 }
			);
		  }
  
		// Create notification for the brand/project owner
		const responseNotification: Omit<NotificationData, 'id'> = {
			type: response === 'accepted' ? 'application_accepted' : 'application_rejected',
			title: `Invitation ${response.charAt(0).toUpperCase() + response.slice(1)}`,
			message: `${creatorName} has ${response} your project invitation`,
			userId: projectData?.ownerId || projectData?.brandId,
			projectId: projectId,
			creatorId: userId,
			creatorName: creatorName,
			projectTitle: projectData?.title,
			read: false,
			createdAt: new Date(),
		  };
  
		const responseNotificationRef = adminDb.collection('notifications').doc();
		transaction.set(responseNotificationRef, responseNotification);
	  });
  
	  return NextResponse.json({ success: true });
	} catch (error) {
	  console.error('Error handling invitation response:', error);
	  return NextResponse.json(
		{ error: 'Failed to process invitation response' },
		{ status: 500 }
	  );
	}
  }