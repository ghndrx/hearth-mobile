/**
 * WebSocket Service for Real-time Messaging
 * Handles real-time communication with the Hearth backend
 */

import { useAuthStore } from '../stores/auth';

type MessageHandler = (data: WebSocketMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: number;
  id?: string;
}

export enum WebSocketMessageType {
  // Connection events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PING = 'ping',
  PONG = 'pong',
  
  // Chat messages
  MESSAGE_NEW = 'message:new',
  MESSAGE_EDIT = 'message:edit',
  MESSAGE_DELETE = 'message:delete',
  MESSAGE_REACTION = 'message:reaction',
  
  // Typing indicators
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  
  // Presence
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_ONLINE = 'presence:online',
  PRESENCE_OFFLINE = 'presence:offline',
  
  // Channel events
  CHANNEL_UPDATE = 'channel:update',
  CHANNEL_DELETE = 'channel:delete',
  CHANNEL_MEMBER_JOIN = 'channel:member:join',
  CHANNEL_MEMBER_LEAVE = 'channel:member:leave',
  
  // Server events
  SERVER_UPDATE = 'server:update',
  SERVER_DELETE = 'server:delete',
  SERVER_MEMBER_JOIN = 'server:member:join',
  SERVER_MEMBER_LEAVE = 'server:member:leave',
  
  // Voice events
  VOICE_JOIN = 'voice:join',
  VOICE_LEAVE = 'voice:leave',
  VOICE_MUTE = 'voice:mute',
  VOICE_UNMUTE = 'voice:unmute',
  
  // Notifications
  NOTIFICATION = 'notification',
  
  // Friend requests
  FRIEND_REQUEST = 'friend:request',
  FRIEND_ACCEPT = 'friend:accept',
  FRIEND_REMOVE = 'friend:remove',
  
  // DM events
  DM_NEW = 'dm:new',
  DM_UPDATE = 'dm:update',
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private messageHandlers: Map<WebSocketMessageType, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isIntentionalClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 3000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const token = useAuthStore.getState().token;
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      this.isIntentionalClose = false;
      const url = `${this.config.url}?token=${token}`;
      
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log('[WebSocket] Disconnected', event.code, event.reason);
          this.stopHeartbeat();
          this.disconnectionHandlers.forEach(handler => handler());
          
          if (!this.isIntentionalClose) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  send(type: WebSocketMessageType, payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return;
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    this.socket.send(JSON.stringify(message));
  }

  subscribe(type: WebSocketMessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle ping/pong for heartbeat
    if (message.type === WebSocketMessageType.PING) {
      this.send(WebSocketMessageType.PONG, null);
      return;
    }

    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.reconnectAttempts ?? 5)) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay ?? 3000;
    
    console.log(`[WebSocket] Attempting reconnect ${this.reconnectAttempts}/${this.config.reconnectAttempts} in ${delay}ms`);
    
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnect failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(WebSocketMessageType.PING, null);
      }
    }, this.config.heartbeatInterval ?? 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default WebSocket URL - should be configured via environment
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.hearth.chat/ws';

// Singleton instance
export const websocketService = new WebSocketService({ url: WS_URL });

// Convenience hooks and helpers
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}

export default websocketService;
