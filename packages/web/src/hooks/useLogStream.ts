import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LogStreamState {
  logs: string;
  isConnected: boolean;
  error: string | null;
}

export function useLogStream(deploymentId: string | null, token: string | null) {
  const [state, setState] = useState<LogStreamState>({
    logs: '',
    isConnected: false,
    error: null,
  });
  
  const socketRef = useRef<Socket | null>(null);
  const logsRef = useRef<string>('');

  const appendLogs = useCallback((newLogs: string) => {
    // Only append if there's new content
    if (newLogs && newLogs !== logsRef.current) {
      logsRef.current = newLogs;
      setState(prev => ({ ...prev, logs: newLogs }));
    }
  }, []);

  useEffect(() => {
    if (!deploymentId || !token) {
      return;
    }

    // Create socket connection
    const socket = io(`${API_URL}/deployments`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[LogStream] Connected to deployment socket');
      setState(prev => ({ ...prev, isConnected: true, error: null }));

      // Subscribe to logs
      socket.emit('subscribe:logs', { deploymentId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[LogStream] Disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('[LogStream] Connection error:', error);
      setState(prev => ({ ...prev, error: error.message, isConnected: false }));
    });

    socket.on('logs:data', (data: { deploymentId: string; logs: string }) => {
      if (data.deploymentId === deploymentId) {
        appendLogs(data.logs);
      }
    });

    socket.on('logs:append', (data: { deploymentId: string; chunk: string }) => {
      if (data.deploymentId === deploymentId) {
        logsRef.current += data.chunk;
        setState(prev => ({ ...prev, logs: logsRef.current }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:logs');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      logsRef.current = '';
    };
  }, [deploymentId, token, appendLogs]);

  const clearLogs = useCallback(() => {
    logsRef.current = '';
    setState(prev => ({ ...prev, logs: '' }));
  }, []);

  return {
    ...state,
    clearLogs,
  };
}
