import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { Notification} from '@/lib/notification/type';
import { markNotificationAsRead, deleteNotification } from '@/lib/notification/notificationService';

export function useNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Notification[];
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.read).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    await markNotificationAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const promises = notifications
      .filter(n => !n.read)
      .map(n => markNotificationAsRead(n.id));
    await Promise.all(promises);
  };

  const removeNotification = async (notificationId: string) => {
    if (!currentUser) return;
    await deleteNotification(notificationId);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}