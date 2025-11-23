import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UserNotification, CreateNotificationInput, NotificationStats } from '../types/notification';

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  stats?: NotificationStats;
  isCenterOpen?: boolean;
  addNotification: (notification: Omit<UserNotification, 'id' | 'created_at' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  sendNotification?: (input: CreateNotificationInput) => Promise<any>;
  deleteNotification?: (id: string) => Promise<void>;
  openCenter?: () => void;
  closeCenter?: () => void;
  toggleCenter?: () => void;
  dismiss?: (id: string) => void;
  click?: (id: string) => void;
  refresh?: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<UserNotification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: UserNotification = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
    );
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
