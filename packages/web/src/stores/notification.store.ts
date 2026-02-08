import { create } from 'zustand';
import { apiService } from '../services/api.service';

export type NotificationCategory = 'DEPLOYMENT' | 'BUILD' | 'DOMAIN' | 'SERVICE' | 'WORKSPACE';

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  emailDeploySuccess: boolean;
  emailDeployFailed: boolean;
  emailBuildFailed: boolean;
  emailDomainVerified: boolean;
  emailInvitations: boolean;
  emailRoleChanges: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;

  // Actions
  loadNotifications: (options?: { unreadOnly?: boolean }) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: null,

  loadNotifications: async (options = {}) => {
    try {
      set({ isLoading: true });
      const { notifications } = await apiService.getNotifications(options);
      set({ notifications, isLoading: false });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({ isLoading: false });
    }
  },

  loadUnreadCount: async () => {
    try {
      const { count } = await apiService.getUnreadNotificationCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await apiService.deleteNotification(notificationId);
      const notification = get().notifications.find((n) => n.id === notificationId);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: notification && !notification.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  loadPreferences: async () => {
    try {
      const preferences = await apiService.getNotificationPreferences();
      set({ preferences });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  },

  updatePreferences: async (updates: Partial<NotificationPreferences>) => {
    try {
      const preferences = await apiService.updateNotificationPreferences(updates);
      set({ preferences });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  },
}));
