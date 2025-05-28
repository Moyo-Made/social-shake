export async function createNotification(notificationData: {
	type: string;
	title: string;
	message: string;
	userId?: string;
	projectId?: string;
	brandName?: string;
	brandId?: string;
	projectTitle?: string;
  }) {
	try {
	  const response = await fetch('/api/notifications', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(notificationData),
	  });
  
	  if (!response.ok) {
		throw new Error('Failed to create notification');
	  }
  
	  return await response.json();
	} catch (error) {
	  console.error('Error creating notification:', error);
	  throw error;
	}
  }
  
  export async function createProjectInvitationNotification(
	projectId: string,
	projectTitle: string,
	brandName: string,
	brandId: string,
	creatorId: string
  ) {
	return createNotification({
	  type: 'project_invitation',
	  title: 'New Project Invitation',
	  message: `${brandName} has invited you to work on their project: ${projectTitle}`,
	  userId: creatorId,
	  projectId,
	  brandName,
	  brandId,
	  projectTitle,
	});
  }
  
  export async function createApplicationStatusNotification(
	projectId: string,
	projectTitle: string,
	brandName: string,
	creatorId: string,
	status: 'accepted' | 'rejected'
  ) {
	const statusText = status === 'accepted' ? 'accepted' : 'rejected';
	const message = status === 'accepted' 
	  ? `Congratulations! ${brandName} has accepted your application for ${projectTitle}`
	  : `${brandName} has declined your application for ${projectTitle}`;
  
	return createNotification({
	  type: `application_${statusText}`,
	  title: `Application ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
	  message,
	  userId: creatorId,
	  projectId,
	  brandName,
	  projectTitle,
	});
  }