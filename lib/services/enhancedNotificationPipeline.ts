/**
 * Enhanced Notification Pipeline - PN-005 Integration
 *
 * Extends the existing notification pipeline from PN-004 to use rich notifications
 * with inline action buttons. Maintains backward compatibility while adding
 * rich notification capabilities for supported notification types.
 *
 * Features:
 * - Seamless integration with smart batching from PN-004
 * - Rich notifications with action buttons
 * - Fallback to basic notifications when needed
 * - Action handler initialization
 */

import { AppState } from 'react-native';
import { websocketService, WebSocketMessageType, type WebSocketMessage } from './websocket';
import {
  getNotificationSettings,
  setBadgeCount,
  type NotificationPayload,
  type NotificationType,
} from './notifications';
import {
  richNotifications,
  type RichNotificationPayload,
} from './richNotifications';
import { notificationActionHandlers } from './notificationActionHandlers';
import { notificationBatching } from './notificationBatching';
import type {
  IncomingMessage,
  FriendRequest,
  ServerInvite,
  VoiceCallNotification,
} from './notificationPipeline';

export interface EnhancedNotificationConfig {
  // Whether to use rich notifications (with actions)
  useRichNotifications: boolean;
  // Whether to use smart batching from PN-004
  useSmartBatching: boolean;
  // Fallback to basic notifications if rich notifications fail
  fallbackToBasic: boolean;
  // Debug mode for additional logging
  debugMode: boolean;
}

export const DEFAULT_ENHANCED_CONFIG: EnhancedNotificationConfig = {
  useRichNotifications: true,
  useSmartBatching: true,
  fallbackToBasic: true,
  debugMode: false,
};

/**
 * Enhanced notification pipeline with rich notification support
 */
class EnhancedNotificationPipelineService {
  private config: EnhancedNotificationConfig;
  private badgeCount = 0;
  private isAppActive = true;
  private unsubscribeHandlers: (() => void)[] = [];
  private initialized = false;

  constructor(config: Partial<EnhancedNotificationConfig> = {}) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    this.setupAppStateListener();
    this.setupWebSocketListeners();
  }

  /**
   * Initialize the enhanced notification pipeline
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[EnhancedNotificationPipeline] Initializing...');

    // Initialize rich notifications if enabled
    if (this.config.useRichNotifications) {
      try {
        await richNotifications.initialize();
        await notificationActionHandlers.initialize();
        console.log('[EnhancedNotificationPipeline] Rich notifications initialized');
      } catch (error) {
        console.error('[EnhancedNotificationPipeline] Failed to initialize rich notifications:', error);
        if (!this.config.fallbackToBasic) {
          throw error;
        }
        console.warn('[EnhancedNotificationPipeline] Falling back to basic notifications');
        this.config.useRichNotifications = false;
      }
    }

    // Get current badge count
    try {
      const Notifications = require('expo-notifications');
      this.badgeCount = await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.warn('[EnhancedNotificationPipeline] Failed to get initial badge count:', error);
    }

    this.initialized = true;
    console.log(`[EnhancedNotificationPipeline] Initialized with rich notifications: ${this.config.useRichNotifications}`);
  }

  /**
   * Shutdown the pipeline and clean up listeners
   */
  shutdown(): void {
    console.log('[EnhancedNotificationPipeline] Shutting down...');

    this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    this.unsubscribeHandlers = [];

    if (this.config.useRichNotifications) {
      richNotifications.shutdown();
      notificationActionHandlers.shutdown();
    }

    this.initialized = false;
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
      this.debugLog('Skipping notification - app is active');
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
    try {
      if (this.config.useSmartBatching) {
        // Use smart batching with rich notifications
        await this.showBatchedRichNotification(message);
      } else {
        // Show immediate rich notification
        await this.showImmediateRichNotification(message);
      }

      await this.incrementBadgeCount();
      this.debugLog(`Notification sent for message: ${message.id}`);

    } catch (error) {
      console.error('[EnhancedNotificationPipeline] Failed to show notification:', error);

      // Fallback to basic notification if enabled
      if (this.config.fallbackToBasic) {
        await this.showBasicNotificationFallback(message);
      }
    }
  }

  /**
   * Show notification using smart batching system
   */
  private async showBatchedRichNotification(message: IncomingMessage): Promise<void> {
    const payload = this.createNotificationPayload(message);

    if (this.config.useRichNotifications) {
      // Create rich payload with actions
      const richPayload: RichNotificationPayload = {
        ...payload,
        actions: richNotifications['getDefaultActionsForType'](message.type as NotificationType),
        categoryId: richNotifications['getCategoryForType'](message.type as NotificationType),
      };

      // Add to batching system with rich payload
      await notificationBatching.addNotification(message, richPayload);
    } else {
      // Add to batching system with basic payload
      await notificationBatching.addNotification(message, payload);
    }
  }

  /**
   * Show immediate rich notification (bypasses batching)
   */
  private async showImmediateRichNotification(message: IncomingMessage): Promise<void> {
    const title = this.formatNotificationTitle(message);
    const body = this.formatNotificationBody(message);

    if (this.config.useRichNotifications && richNotifications.isInitialized()) {
      // Use rich notifications service
      await richNotifications.scheduleMessageNotification(message);
    } else {
      // Use basic notification
      const payload = this.createNotificationPayload(message);
      const { scheduleLocalNotification } = require('./notifications');
      await scheduleLocalNotification(title, body, payload);
    }
  }

  /**
   * Fallback to basic notification when rich notifications fail
   */
  private async showBasicNotificationFallback(message: IncomingMessage): Promise<void> {
    try {
      const title = this.formatNotificationTitle(message);
      const body = this.formatNotificationBody(message);
      const payload = this.createNotificationPayload(message);

      const { scheduleLocalNotification } = require('./notifications');
      await scheduleLocalNotification(title, body, payload);

      console.log('[EnhancedNotificationPipeline] Fallback notification sent successfully');
    } catch (fallbackError) {
      console.error('[EnhancedNotificationPipeline] Fallback notification also failed:', fallbackError);
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

    try {
      const title = 'Friend Request';
      const body = `${request.user.username} sent you a friend request`;

      if (this.config.useRichNotifications && richNotifications.isInitialized()) {
        const payload: RichNotificationPayload = {
          type: 'friend_request',
          userId: request.user.id,
          title,
          body,
          imageUrl: request.user.avatar,
          actions: richNotifications['getDefaultActionsForType']('friend_request'),
          categoryId: richNotifications['getCategoryForType']('friend_request'),
        };

        await richNotifications.scheduleRichNotification(title, body, payload);
      } else {
        const payload: NotificationPayload = {
          type: 'friend_request',
          userId: request.user.id,
          title,
          body,
          imageUrl: request.user.avatar,
        };

        const { scheduleLocalNotification } = require('./notifications');
        await scheduleLocalNotification(title, body, payload);
      }

      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[EnhancedNotificationPipeline] Failed to show friend request notification:', error);
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

    try {
      const title = 'Server Invite';
      const body = `${invite.inviter.username} invited you to join ${invite.server.name}`;

      if (this.config.useRichNotifications && richNotifications.isInitialized()) {
        const payload: RichNotificationPayload = {
          type: 'server_invite',
          serverId: invite.server.id,
          userId: invite.inviter.id,
          title,
          body,
          imageUrl: invite.server.icon,
          actions: richNotifications['getDefaultActionsForType']('server_invite'),
          categoryId: richNotifications['getCategoryForType']('server_invite'),
        };

        await richNotifications.scheduleRichNotification(title, body, payload);
      } else {
        const payload: NotificationPayload = {
          type: 'server_invite',
          serverId: invite.server.id,
          userId: invite.inviter.id,
          title,
          body,
          imageUrl: invite.server.icon,
        };

        const { scheduleLocalNotification } = require('./notifications');
        await scheduleLocalNotification(title, body, payload);
      }

      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[EnhancedNotificationPipeline] Failed to show server invite notification:', error);
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

    try {
      const title = `${call.type === 'video' ? 'Video' : 'Voice'} Call`;
      const body = `${call.caller.username} is calling`;

      if (this.config.useRichNotifications && richNotifications.isInitialized()) {
        const payload: RichNotificationPayload = {
          type: 'call',
          channelId: call.channel.id,
          serverId: call.channel.serverId,
          userId: call.caller.id,
          title,
          body,
          imageUrl: call.caller.avatar,
          actions: richNotifications['getDefaultActionsForType']('call'),
          categoryId: richNotifications['getCategoryForType']('call'),
        };

        await richNotifications.scheduleRichNotification(title, body, payload);
      } else {
        const payload: NotificationPayload = {
          type: 'call',
          channelId: call.channel.id,
          serverId: call.channel.serverId,
          userId: call.caller.id,
          title,
          body,
          imageUrl: call.caller.avatar,
        };

        const { scheduleLocalNotification } = require('./notifications');
        await scheduleLocalNotification(title, body, payload);
      }

      await this.incrementBadgeCount();
    } catch (error) {
      console.error('[EnhancedNotificationPipeline] Failed to show call notification:', error);
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
      this.debugLog(`App state changed: ${nextAppState}`);
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

    // Server invite events
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
        this.debugLog('Generic notification event received');
      })
    );

    this.debugLog('WebSocket listeners registered');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EnhancedNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[EnhancedNotificationPipeline] Configuration updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedNotificationConfig {
    return { ...this.config };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    initialized: boolean;
    richNotificationsEnabled: boolean;
    smartBatchingEnabled: boolean;
    badgeCount: number;
    isAppActive: boolean;
  } {
    return {
      initialized: this.initialized,
      richNotificationsEnabled: this.config.useRichNotifications && richNotifications.isInitialized(),
      smartBatchingEnabled: this.config.useSmartBatching,
      badgeCount: this.badgeCount,
      isAppActive: this.isAppActive,
    };
  }

  /**
   * Debug logging helper
   */
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`[EnhancedNotificationPipeline] ${message}`);
    }
  }
}

// Singleton instance
export const enhancedNotificationPipeline = new EnhancedNotificationPipelineService();

export default enhancedNotificationPipeline;