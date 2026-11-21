import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Notification } from '../types';
import { notificationsApi } from '../api/notifications';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 20000); // Polling every 20s
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = async (id: string) => {
    await notificationsApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
