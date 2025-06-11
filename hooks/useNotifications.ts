/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const { socket, isConnected } = useSocket();

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

      // Sort notifications by createdAt (latest first) and format dates
      const sortedNotifications = data.notifications
        .map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : undefined,
        }))
        .sort((a: NotificationData, b: NotificationData) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setNotifications(sortedNotifications);
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

    socket.emit('subscribe-notifications', currentUser.uid);

    const handleNewNotification = (notification: any) => {
      const formattedNotification = {
        ...notification,
        createdAt: new Date(notification.createdAt),
        readAt: notification.readAt ? new Date(notification.readAt) : undefined,
      };
      
      // Add new notification to the top and keep sorted
      setNotifications(prev => {
        const updated = [formattedNotification, ...prev];
        return updated.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    };

    const handleNotificationUpdate = (updatedNotification: any) => {
      const formattedNotification = {
        ...updatedNotification,
        createdAt: new Date(updatedNotification.createdAt),
        readAt: updatedNotification.readAt ? new Date(updatedNotification.readAt) : undefined,
      };

      setNotifications(prev => 
        prev.map(n => n.id === updatedNotification.id ? formattedNotification : n)
      );
    };

    const handleBulkNotificationUpdate = (updates: any[]) => {
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

    socket.on('new-notification', handleNewNotification);
    socket.on('notification-updated', handleNotificationUpdate);
    socket.on('notifications-bulk-updated', handleBulkNotificationUpdate);

    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('notification-updated', handleNotificationUpdate);
      socket.off('notifications-bulk-updated', handleBulkNotificationUpdate);
      socket.emit('unsubscribe-notifications', currentUser.uid);
    };
  }, [socket, isConnected, currentUser]);

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

      // Make API call first to ensure consistency
      const response = await fetch(`/api/notifications/${id}/read?userId=${currentUser.uid}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // FIXED: Update only the specific notification, not all notifications
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, status: 'read', readAt: new Date() } : n)
      );

      // Emit socket event to update other clients
      if (socket && isConnected) {
        socket.emit('notification-read', { notificationId: id, userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error; // Re-throw to let caller handle the error
    }
  }, [currentUser, socket, isConnected]);

  const markAllAsRead = useCallback(async () => {
    try {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
  
      const response = await fetch(`/api/notifications/mark-all-read?userId=${currentUser.uid}`, {
        method: 'POST',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark all notifications as read');
      }
  
      // Update local state - mark ALL notifications as read
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read', readAt: new Date() }))
      );
  
      if (socket && isConnected) {
        socket.emit('notifications-all-read', { userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, [currentUser, socket, isConnected]);

  const handleInvitationResponse = useCallback(async (
    notificationId: string, 
    projectId: string, 
    response: 'accepted' | 'declined'
  ) => {
    try {
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
        throw new Error('Failed to process invitation response');
      }

      // Update local state after successful API call
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { 
          ...n, 
          status: 'read', // Use status instead of read
          responded: true,
          response: response === 'accepted' ? 'accepted' : 'rejected', // Ensure compatibility with NotificationData type
          readAt: new Date() 
        } : n)
      );

      // Emit socket event to update other clients
      if (socket && isConnected) {
        socket.emit('invitation-responded', { 
          notificationId, 
          projectId, 
          response,
          userId: currentUser?.uid 
        });
      }

    } catch (error) {
      console.error(`Error ${response}ing invitation:`, error);
      throw error;
    }
  }, [socket, isConnected, currentUser]);

  const unreadCount = notifications.filter(n => n.status === "unread").length;

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