import { useState, useEffect, useCallback } from 'react';
import { NotificationData } from '@/types/notifications';
import { useAuth } from '@/context/AuthContext';

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
  const {currentUser} = useAuth();

  

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


  const markAsRead = useCallback(async (id: string) => {
    try {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      const response = await fetch(`/api/notifications/${id}/read?userId=${currentUser.uid}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      const response = await fetch(`/api/notifications/mark-all-read?userId=${currentUser.uid}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

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

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { 
          ...n, 
          read: true, 
          responded: true, 
          readAt: new Date() 
        } : n)
      );

      console.log(`${response} invitation for project ${projectId}`);
    } catch (error) {
      console.error(`Error ${response}ing invitation:`, error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Set up polling for real-time updates (every 30 seconds)
    // const interval = setInterval(fetchNotifications, 30000);

    // return () => clearInterval(interval);
  }, [fetchNotifications]);

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