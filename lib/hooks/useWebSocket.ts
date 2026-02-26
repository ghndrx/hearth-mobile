/**
 * useWebSocket Hook
 * React hook for WebSocket connection management
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import websocketService, {
  WebSocketMessage,
  WebSocketMessageType,
} from '../services/websocket';
import { useAuthStore } from '../stores/auth';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnAppFocus?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (type: WebSocketMessageType, payload: unknown) => void;
  subscribe: (type: WebSocketMessageType, handler: (data: WebSocketMessage) => void) => () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, reconnectOnAppFocus = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appState = useRef(AppState.currentState);

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      setError(new Error('Not authenticated'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await websocketService.connect();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const send = useCallback((type: WebSocketMessageType, payload: unknown) => {
    websocketService.send(type, payload);
  }, []);

  const subscribe = useCallback(
    (type: WebSocketMessageType, handler: (data: WebSocketMessage) => void) => {
      return websocketService.subscribe(type, handler);
    },
    []
  );

  // Handle connection state changes
  useEffect(() => {
    const unsubConnect = websocketService.onConnect(() => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    const unsubDisconnect = websocketService.onDisconnect(() => {
      setIsConnected(false);
    });

    const unsubError = websocketService.onError((event) => {
      setError(new Error('WebSocket error'));
      console.error('[useWebSocket] Error:', event);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
    };
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected && !isConnecting) {
      connect();
    }

    if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [autoConnect, isAuthenticated, isConnected, isConnecting, connect, disconnect]);

  // Reconnect on app focus
  useEffect(() => {
    if (!reconnectOnAppFocus) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated &&
        !isConnected &&
        !isConnecting
      ) {
        connect();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [reconnectOnAppFocus, isAuthenticated, isConnected, isConnecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount as WebSocket should persist across screens
      // disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
    subscribe,
  };
}

/**
 * Hook to subscribe to specific WebSocket message types
 */
export function useWebSocketMessage<T = unknown>(
  type: WebSocketMessageType,
  handler: (payload: T) => void
) {
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(type, (message) => {
      handler(message.payload as T);
    });

    return unsubscribe;
  }, [type, handler]);
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(channelId: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; username: string }>>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const startTyping = useCallback(() => {
    websocketService.send(WebSocketMessageType.TYPING_START, { channelId });
  }, [channelId]);

  const stopTyping = useCallback(() => {
    websocketService.send(WebSocketMessageType.TYPING_STOP, { channelId });
  }, [channelId]);

  useEffect(() => {
    const unsubStart = websocketService.subscribe(
      WebSocketMessageType.TYPING_START,
      (message) => {
        const { userId, username, channelId: msgChannelId } = message.payload as {
          userId: string;
          username: string;
          channelId: string;
        };

        if (msgChannelId !== channelId) return;

        // Clear existing timeout for this user
        const existingTimeout = timeoutRefs.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Add user to typing list
        setTypingUsers((prev) => {
          if (prev.find((u) => u.id === userId)) return prev;
          return [...prev, { id: userId, username }];
        });

        // Set timeout to remove user after 5 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
          timeoutRefs.current.delete(userId);
        }, 5000);

        timeoutRefs.current.set(userId, timeout);
      }
    );

    const unsubStop = websocketService.subscribe(
      WebSocketMessageType.TYPING_STOP,
      (message) => {
        const { userId, channelId: msgChannelId } = message.payload as {
          userId: string;
          channelId: string;
        };

        if (msgChannelId !== channelId) return;

        // Clear timeout and remove user
        const existingTimeout = timeoutRefs.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          timeoutRefs.current.delete(userId);
        }

        setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    );

    return () => {
      unsubStart();
      unsubStop();
      // Clear all timeouts
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, [channelId]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

/**
 * Hook for presence updates
 */
export function usePresence(userId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const isOnline = useCallback(
    (id: string) => onlineUsers.has(id),
    [onlineUsers]
  );

  useEffect(() => {
    const unsubOnline = websocketService.subscribe(
      WebSocketMessageType.PRESENCE_ONLINE,
      (message) => {
        const { userId: onlineUserId } = message.payload as { userId: string };
        setOnlineUsers((prev) => new Set([...prev, onlineUserId]));
      }
    );

    const unsubOffline = websocketService.subscribe(
      WebSocketMessageType.PRESENCE_OFFLINE,
      (message) => {
        const { userId: offlineUserId } = message.payload as { userId: string };
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(offlineUserId);
          return next;
        });
      }
    );

    const unsubUpdate = websocketService.subscribe(
      WebSocketMessageType.PRESENCE_UPDATE,
      (message) => {
        const { users } = message.payload as { users: string[] };
        setOnlineUsers(new Set(users));
      }
    );

    return () => {
      unsubOnline();
      unsubOffline();
      unsubUpdate();
    };
  }, []);

  return {
    onlineUsers,
    isOnline,
    isUserOnline: userId ? onlineUsers.has(userId) : false,
  };
}

export default useWebSocket;
