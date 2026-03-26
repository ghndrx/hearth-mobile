/**
 * Notification Pipeline Service (PN-002)
 *
 * Connects WebSocket messaging with push notifications to create
 * a complete notification delivery pipeline. Handles message routing,
 * notification formatting, and delivery decisions.
 */

import { AppState } from 'react-native';
import { websocketService, WebSocketMessageType, type WebSocketMessage } from './websocket';
import {
  scheduleLocalNotification,
  getNotificationSettings,
  setBadgeCount,
  type NotificationPayload,
  type NotificationType,
  NOTIFICATION_CHANNELS
} from './notifications';

export interface IncomingMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  channel: {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'dm';
    serverId?: string;
  };
  server?: {
    id: string;
    name: string;
    icon?: string;
  };
  mentions?: string[];
  threadId?: string;
  timestamp: number;
  type: 'message' | 'dm' | 'mention' | 'reply';
}

export interface FriendRequest {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: number;
}

export interface ServerInvite {
  id: string;
  server: {
    id: string;
    name: string;
    icon?: string;
  };
  inviter: {
    id: string;
    username: string;
  };
  timestamp: number;
}

export interface VoiceCallNotification {
  id: string;
  channel: {
    id: string;
    name: string;
    serverId?: string;
  };
  caller: {
    id: string;
    username: string;
    avatar?: string;
  };
  type: 'voice' | 'video';
  timestamp: number;
}

class NotificationPipelineService {
  private badgeCount = 0;
  private isAppActive = true;
  private unsubscribeHandlers: (() => void)[] = [];

  constructor() {
    this.setupAppStateListener();
    this.setupWebSocketListeners();
  }

  /**
   * Initialize the notification pipeline
   */
  async initialize(): Promise<void> {
    console.log('[NotificationPipeline] Initializing...');

    // Get current badge count
    try {
      const Notifications = require('expo-notifications');
      this.badgeCount = await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.warn('[NotificationPipeline] Failed to get initial badge count:', error);
    }

    console.log('[NotificationPipeline] Initialized with badge count:', this.badgeCount);
  }

  /**
   * Shutdown the pipeline and clean up listeners
   */
  shutdown(): void {
    console.log('[NotificationPipeline] Shutting down...');
    this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    this.unsubscribeHandlers = [];
  }

  /**
   * Process an incoming message and determine if notification should be shown
   */
  private async processMessage(message: IncomingMessage): Promise<void> {
    const settings = await getNotificationSettings();

    // Don't notify if notifications are disabled
    if (!settings.enabled) {
      return;
    }

    // Check specific notification type settings
    const shouldNotify = this.shouldShowNotification(message, settings);
    if (!shouldNotify) {
      return;
    }

    // Don't show notification if app is active (user can see the message)
    if (this.isAppActive) {
      console.log('[NotificationPipeline] Skipping notification - app is active');
      return;
    }

    await this.showMessageNotification(message);
  }

  /**
   * Determine if a notification should be shown based on settings
   */
  private shouldShowNotification(message: IncomingMessage, settings: any): boolean {
    switch (message.type) {
      case 'dm':
        return settings.dms;
      case 'mention':
        return settings.mentions;
      case 'message':
        return settings.messages;
      case 'reply':
        return settings.mentions; // Replies are treated as mentions
      default:
        return false;
    }
  }

  /**
   * Show notification for incoming message
   */
  private async showMessageNotification(message: IncomingMessage): Promise<void> {
    const title = this.formatNotificationTitle(message);
    const body = this.formatNotificationBody(message);
    const payload = this.createNotificationPayload(message);

    try {
      await scheduleLocalNotification(title, body, payload);
      await this.incrementBadgeCount();

      console.log('[NotificationPipeline] Notification sent:', { title, body });
    } catch (error) {
      console.error('[NotificationPipeline] Failed to show notification:', error);
    }
  }

  /**
   * Format notification title based on message type
   */
  private formatNotificationTitle(message: IncomingMessage): string {
    switch (message.type) {
      case 'dm':
        return message.author.username;
      case 'mention':
        return `${message.author.username} mentioned you`;
      case 'reply':
        return `${message.author.username} replied to you`;
      case 'message':
        if (message.server) {
          return `#${message.channel.name} • ${message.server.name}`;
        }
        return `#${message.channel.name}`;
      default:
        return 'New message';
    }
  }

  /**
   * Format notification body (message content preview)
   */
  private formatNotificationBody(message: IncomingMessage): string {
    const maxLength = 100;
    const content = message.content.trim();

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create notification payload with routing information
   */
  private createNotificationPayload(message: IncomingMessage): NotificationPayload {
    return {
      type: message.type as NotificationType,
      serverId: message.server?.id,
      channelId: message.channel.id,
      messageId: message.id,
      threadId: message.threadId,
      userId: message.author.id,
      title: this.formatNotificationTitle(message),
      body: this.formatNotificationBody(message),
      imageUrl: message.author.avatar,
    };
  }

  /**
   * Handle friend request notifications
   */
  private async processFriendRequest(request: FriendRequest): Promise<void> {
    const settings = await getNotificationSettings();

    if (!settings.enabled || !settings.friendRequests || this.isAppActive) {
      return;
    }

    const payload: NotificationPayload = {
      type: 'friend_request',
      userId: request.user.id,
      title: 'Friend Request',
      body: `${request.user.username} sent you a friend request`,
      imageUrl: request.user.avatar,
    };

    try {
      await scheduleLocalNotification(payload.title, payload.body, payload);
      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[NotificationPipeline] Failed to show friend request notification:', error);
    }
  }

  /**
   * Handle server invite notifications
   */
  private async processServerInvite(invite: ServerInvite): Promise<void> {
    const settings = await getNotificationSettings();

    if (!settings.enabled || !settings.serverActivity || this.isAppActive) {
      return;
    }

    const payload: NotificationPayload = {
      type: 'server_invite',
      serverId: invite.server.id,
      userId: invite.inviter.id,
      title: 'Server Invite',
      body: `${invite.inviter.username} invited you to join ${invite.server.name}`,
      imageUrl: invite.server.icon,
    };

    try {
      await scheduleLocalNotification(payload.title, payload.body, payload);
      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[NotificationPipeline] Failed to show server invite notification:', error);
    }
  }

  /**
   * Handle voice call notifications
   */
  private async processVoiceCall(call: VoiceCallNotification): Promise<void> {
    const settings = await getNotificationSettings();

    if (!settings.enabled || !settings.calls) {
      return;
    }

    const payload: NotificationPayload = {
      type: 'call',
      channelId: call.channel.id,
      serverId: call.channel.serverId,
      userId: call.caller.id,
      title: `${call.type === 'video' ? 'Video' : 'Voice'} Call`,
      body: `${call.caller.username} is calling`,
      imageUrl: call.caller.avatar,
    };

    try {
      await scheduleLocalNotification(payload.title, payload.body, payload);
      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[NotificationPipeline] Failed to show call notification:', error);
    }
  }

  /**
   * Increment badge count
   */
  private async incrementBadgeCount(): Promise<void> {
    this.badgeCount++;
    await setBadgeCount(this.badgeCount);
  }

  /**
   * Set up app state listener to track foreground/background
   */
  private setupAppStateListener(): void {
    const handleAppStateChange = (nextAppState: string) => {
      this.isAppActive = nextAppState === 'active';
      console.log('[NotificationPipeline] App state changed:', nextAppState);
    };

    AppState.addEventListener('change', handleAppStateChange);
    this.isAppActive = AppState.currentState === 'active';
  }

  /**
   * Set up WebSocket listeners for different message types
   */
  private setupWebSocketListeners(): void {
    // Message events
    const messageHandler = (wsMessage: WebSocketMessage) => {
      const message = wsMessage.payload as IncomingMessage;
      this.processMessage(message);
    };

    // Friend request events
    const friendRequestHandler = (wsMessage: WebSocketMessage) => {
      const request = wsMessage.payload as FriendRequest;
      this.processFriendRequest(request);
    };

    // Server invite events (if we receive them via WebSocket)
    const serverInviteHandler = (wsMessage: WebSocketMessage) => {
      const invite = wsMessage.payload as ServerInvite;
      this.processServerInvite(invite);
    };

    // Voice call events
    const voiceCallHandler = (wsMessage: WebSocketMessage) => {
      const call = wsMessage.payload as VoiceCallNotification;
      this.processVoiceCall(call);
    };

    // Subscribe to WebSocket events
    this.unsubscribeHandlers.push(
      websocketService.subscribe(WebSocketMessageType.MESSAGE_NEW, messageHandler),
      websocketService.subscribe(WebSocketMessageType.DM_NEW, messageHandler),
      websocketService.subscribe(WebSocketMessageType.FRIEND_REQUEST, friendRequestHandler),
      websocketService.subscribe(WebSocketMessageType.VOICE_JOIN, voiceCallHandler),
      websocketService.subscribe(WebSocketMessageType.NOTIFICATION, (wsMessage) => {
        // Handle generic notification events
        console.log('[NotificationPipeline] Generic notification:', wsMessage.payload);
      })
    );

    console.log('[NotificationPipeline] WebSocket listeners registered');
  }
}

// Singleton instance
export const notificationPipeline = new NotificationPipelineService();

export default notificationPipeline;