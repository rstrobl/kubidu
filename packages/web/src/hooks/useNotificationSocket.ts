import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore, Notification } from '../stores/notification.store';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useNotificationSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated } = useAuthStore();
  const { addNotification, setUnreadCount } = useNotificationStore();
  const navigate = useNavigate();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      addNotification(notification);

      // Show toast notification (stays until manually closed)
      toast(notification.title, {
        description: notification.message,
        action: notification.actionUrl
          ? {
              label: 'View',
              onClick: () => navigate(notification.actionUrl!),
            }
          : undefined,
        duration: Infinity,
      });
    },
    [addNotification, navigate]
  );

  const handleUnreadCount = useCallback(
    (data: { count: number }) => {
      setUnreadCount(data.count);
    },
    [setUnreadCount]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Connect to the notifications namespace
    const socket = io(`${API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Notifications] Connected to WebSocket');
      socket.emit('notification:subscribe');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Notifications] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Notifications] Connection error:', error.message);
    });

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread-count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread-count', handleUnreadCount);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, handleNewNotification, handleUnreadCount]);

  return socketRef.current;
}
