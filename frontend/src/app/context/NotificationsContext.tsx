import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from './AuthContext';

export type NotificationType = 'application' | 'approval' | 'decline' | 'offer' | 'final-decline';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  offerId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getUserNotifications: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const liveNotifications = await apiService.getUserNotifications(user.id);
      setNotifications(liveNotifications);
    } catch (err) {
      console.error('Failed to sync notifications with backend:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  //mark  notification as read
  const markAsRead = async (id: string) => {
    setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      await apiService.markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read on backend:', err);
      refreshNotifications(); // revert to server truth if request failed
    }
  };

  //mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
    );

    try {
      await apiService.markAllNotificationsAsRead(user.id);
    } catch (err) {
      console.error('Failed to mark all notifications as read on backend:', err);
      refreshNotifications(); //revert to server truth if request failed
    }
  };

  const getUserNotifications = (userId: string) => {
    return notifications.filter(notif => notif.userId === userId);
  };

  const getUnreadCount = (userId: string) => {
    return notifications.filter(notif => notif.userId === userId && !notif.isRead).length;
  };

  return (
      <NotificationsContext.Provider
          value={{
            notifications,
            markAsRead,
            markAllAsRead,
            getUserNotifications,
            getUnreadCount,
            refreshNotifications,
          }}
      >
        {children}
      </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}