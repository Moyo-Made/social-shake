// // functions/src/notifications.ts
// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';

// // Initialize Firebase admin if not already initialized
// if (!admin.apps.length) {
//   admin.initializeApp();
// }

// const db = admin.firestore();

// // Function to check if user has enabled notifications of a specific type
// async function isNotificationEnabled(userId: string, notificationType: string): Promise<boolean> {
//   try {
//     const userDoc = await db.collection('users').doc(userId).get();
//     if (!userDoc.exists) return true; // Default to true if user doc doesn't exist
    
//     const userData = userDoc.data();
//     if (!userData?.notificationSettings) return true; // Default to true if settings don't exist
    
//     return userData.notificationSettings[notificationType] !== false;
//   } catch (error) {
//     console.error('Error checking notification settings:', error);
//     return true; // Default to true on error
//   }
// }

// // Function to create a notification
// export const createNotification = functions.https.onCall(async (data, context) => {
//   if (!context.auth) {
//     throw new functions.https.HttpsError(
//       'unauthenticated',
//       'User must be authenticated to create notifications'
//     );
//   }

//   const { userId, title, message, type, relatedId, link } = data;

//   // Check if the user has appropriate permissions
//   // For now, we allow any authenticated user to create notifications
//   // You might want to add more permission checks based on your app's security model
  
//   try {
//     // Check if user has enabled this notification type
//     const isEnabled = await isNotificationEnabled(userId, type);
//     if (!isEnabled) {
//       return { success: false, message: 'User has disabled this notification type' };
//     }
    
//     // Create the notification
//     const notification = {
//       userId,
//       title,
//       message,
//       type,
//       relatedId,
//       link,
//       read: false,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };
    
//     const notificationRef = await db.collection('notifications').add(notification);
    
//     // Optionally send email/push notification here based on user preferences
//     // You would need to implement this based on your notification delivery method
    
//     return { success: true, notificationId: notificationRef.id };
//   } catch (error) {
//     console.error('Error creating notification:', error);
//     throw new functions.https.HttpsError('internal', 'Error creating notification');
//   }
// });

// // Trigger when a new creator application is submitted
// export const onCreatorApplicationCreated = functions.firestore
//   .document('applications/{applicationId}')
//   .onCreate(async (snapshot, context) => {
//     const application = snapshot.data();
//     const projectId = application.projectId;
    
//     // Get project details to find the project owner
//     const projectDoc = await db.collection('projects').doc(projectId).get();
//     if (!projectDoc.exists) return;
    
//     const project = projectDoc.data();
//     const ownerId = project?.ownerId;
    
//     if (!ownerId) return;
    
//     // Check if user has enabled this notification type
//     const isEnabled = await isNotificationEnabled(ownerId, 'creator_applications');
//     if (!isEnabled) return;
    
//     // Create notification for project owner
//     const notification = {
//       userId: ownerId,
//       title: 'New Creator Application',
//       message: `${application.creatorName} has applied to your project "${project.title}"`,
//       type: 'creator_applications',
//       relatedId: context.params.applicationId,
//       link: `/projects/${projectId}/applications`,
//       read: false,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };
    
//     await db.collection('notifications').add(notification);
    
//     // Here you would also send an email notification if user has email notifications enabled
//   });

// // Similar triggers for other notification types would be implemented here