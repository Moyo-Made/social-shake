import { useState, useEffect, useCallback } from 'react';
import { NotificationData } from '@/types/notifications';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleInvitationResponse: (notificationId: string, projectId: string, response: 'accepted' | 'declined') => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { socket, isConnected } = useSocket(); // Use the socket context

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      
      const response = await fetch(`/api/notifications?userId=${currentUser.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNotifications(data.notifications.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : undefined,
      })));
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Set up real-time socket listeners
  useEffect(() => {
    if (!socket || !isConnected || !currentUser) return;

    console.log('Setting up notification socket listeners');

    // Subscribe to user notifications
    socket.emit('subscribe-notifications', currentUser.uid);

    // Listen for new notifications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNewNotification = (notification: any) => {
      console.log('Received new notification:', notification);
      const formattedNotification = {
        ...notification,
        createdAt: new Date(notification.createdAt),
        readAt: notification.readAt ? new Date(notification.readAt) : undefined,
      };
      
      setNotifications(prev => [formattedNotification, ...prev]);
    };

    // Listen for notification updates (e.g., when marked as read)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNotificationUpdate = (updatedNotification: any) => {
      console.log('Received notification update:', updatedNotification);
      const formattedNotification = {
        ...updatedNotification,
        createdAt: new Date(updatedNotification.createdAt),
        readAt: updatedNotification.readAt ? new Date(updatedNotification.readAt) : undefined,
      };

      setNotifications(prev => 
        prev.map(n => n.id === updatedNotification.id ? formattedNotification : n)
      );
    };

    // Listen for bulk notification updates (e.g., mark all as read)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBulkNotificationUpdate = (updates: any[]) => {
      console.log('Received bulk notification updates:', updates);
      
      setNotifications(prev => {
        const updatedNotifications = [...prev];
        updates.forEach(update => {
          const index = updatedNotifications.findIndex(n => n.id === update.id);
          if (index !== -1) {
            updatedNotifications[index] = {
              ...updatedNotifications[index],
              ...update,
              createdAt: new Date(update.createdAt || updatedNotifications[index].createdAt),
              readAt: update.readAt ? new Date(update.readAt) : undefined,
            };
          }
        });
        return updatedNotifications;
      });
    };

    // Add socket event listeners
    socket.on('new-notification', handleNewNotification);
    socket.on('notification-updated', handleNotificationUpdate);
    socket.on('notifications-bulk-updated', handleBulkNotificationUpdate);

    // Cleanup listeners on unmount
    return () => {
      console.log('Cleaning up notification socket listeners');
      socket.off('new-notification', handleNewNotification);
      socket.off('notification-updated', handleNotificationUpdate);
      socket.off('notifications-bulk-updated', handleBulkNotificationUpdate);
      socket.emit('unsubscribe-notifications', currentUser.uid);
    };
  }, [socket, isConnected, currentUser]);

  // Initial fetch when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [fetchNotifications, currentUser]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }

      // Optimistically update local state first
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date() } : n)
      );

      const response = await fetch(`/api/notifications/${id}/read?userId=${currentUser.uid}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: false, readAt: undefined } : n)
        );
        throw new Error('Failed to mark notification as read');
      }

      // Emit socket event to update other clients in real-time
      if (socket && isConnected) {
        socket.emit('notification-read', { notificationId: id, userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [currentUser, socket, isConnected]);

  const markAllAsRead = useCallback(async () => {
    try {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }

      // Optimistically update local state
      const previousNotifications = notifications;
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );

      const response = await fetch(`/api/notifications/mark-all-read?userId=${currentUser.uid}`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(previousNotifications);
        throw new Error('Failed to mark all notifications as read');
      }

      // Emit socket event to update other clients
      if (socket && isConnected) {
        socket.emit('notifications-all-read', { userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentUser, notifications, socket, isConnected]);

  const handleInvitationResponse = useCallback(async (
    notificationId: string, 
    projectId: string, 
    response: 'accepted' | 'declined'
  ) => {
    try {
      // Optimistically update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { 
          ...n, 
          read: true, 
          responded: true, 
          readAt: new Date() 
        } : n)
      );

      const apiResponse = await fetch('/api/notifications/invitation-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          projectId,
          response,
        }),
      });

      if (!apiResponse.ok) {
        // Revert optimistic update on failure
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { 
            ...n, 
            read: false, 
            responded: false, 
            readAt: undefined 
          } : n)
        );
        throw new Error('Failed to process invitation response');
      }

      // Emit socket event to update other clients
      if (socket && isConnected) {
        socket.emit('invitation-responded', { 
          notificationId, 
          projectId, 
          response,
          userId: currentUser?.uid 
        });
      }

      console.log(`${response} invitation for project ${projectId}`);
    } catch (error) {
      console.error(`Error ${response}ing invitation:`, error);
      throw error;
    }
  }, [socket, isConnected, currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    handleInvitationResponse,
    refetch: fetchNotifications,
  };
}