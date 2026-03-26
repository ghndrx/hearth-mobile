/**
 * WebSocket Extension for Device Discovery Events
 * CDH-001: Real-time device discovery and registration
 */

import { websocketService, WebSocketMessageType, type WebSocketMessage } from './websocket';
import type {
  DeviceDiscoveryEvent,
  UserDevice,
  DevicePresenceUpdate,
  CallHandoffManager,
} from '../types/callHandoff';

type DeviceDiscoveryEventHandler = (event: DeviceDiscoveryEvent) => void;

class DeviceDiscoveryWebSocketService {
  private static instance: DeviceDiscoveryWebSocketService;
  private eventHandlers: Set<DeviceDiscoveryEventHandler> = new Set();
  private unsubscribeFunctions: (() => void)[] = [];
  private isInitialized = false;

  static getInstance(): DeviceDiscoveryWebSocketService {
    if (!DeviceDiscoveryWebSocketService.instance) {
      DeviceDiscoveryWebSocketService.instance = new DeviceDiscoveryWebSocketService();
    }
    return DeviceDiscoveryWebSocketService.instance;
  }

  /**
   * Initialize device discovery WebSocket listeners
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to device discovery events
    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.DEVICE_DISCOVERED,
        this.handleDeviceDiscovered.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.DEVICE_UPDATED,
        this.handleDeviceUpdated.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.DEVICE_PRESENCE_CHANGED,
        this.handleDevicePresenceChanged.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.DEVICE_DISCONNECTED,
        this.handleDeviceDisconnected.bind(this)
      )
    );

    // Subscribe to call handoff events
    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.CALL_HANDOFF_INITIATED,
        this.handleCallHandoffInitiated.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.CALL_HANDOFF_PROGRESS,
        this.handleCallHandoffProgress.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.CALL_HANDOFF_COMPLETED,
        this.handleCallHandoffCompleted.bind(this)
      )
    );

    this.unsubscribeFunctions.push(
      websocketService.subscribe(
        WebSocketMessageType.CALL_HANDOFF_FAILED,
        this.handleCallHandoffFailed.bind(this)
      )
    );

    this.isInitialized = true;
    console.log('[DeviceDiscoveryWebSocket] Initialized device discovery WebSocket listeners');
  }

  /**
   * Cleanup WebSocket subscriptions
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.eventHandlers.clear();
    this.isInitialized = false;
    console.log('[DeviceDiscoveryWebSocket] Cleaned up device discovery WebSocket listeners');
  }

  /**
   * Subscribe to device discovery events
   */
  subscribe(handler: DeviceDiscoveryEventHandler): () => void {
    this.eventHandlers.add(handler);

    // Auto-initialize if not already done
    if (!this.isInitialized) {
      this.initialize();
    }

    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Emit device discovery event to all subscribers
   */
  private emitEvent(event: DeviceDiscoveryEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[DeviceDiscoveryWebSocket] Error in event handler:', error);
      }
    });
  }

  /**
   * Handle device discovered event
   */
  private handleDeviceDiscovered(message: WebSocketMessage): void {
    try {
      const device = message.payload as UserDevice;
      this.emitEvent({
        type: 'device_discovered',
        device,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle device discovered:', error);
    }
  }

  /**
   * Handle device updated event
   */
  private handleDeviceUpdated(message: WebSocketMessage): void {
    try {
      const device = message.payload as UserDevice;
      this.emitEvent({
        type: 'device_updated',
        device,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle device updated:', error);
    }
  }

  /**
   * Handle device presence changed event
   */
  private handleDevicePresenceChanged(message: WebSocketMessage): void {
    try {
      const update = message.payload as DevicePresenceUpdate;
      this.emitEvent({
        type: 'device_presence_changed',
        update,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle device presence changed:', error);
    }
  }

  /**
   * Handle device disconnected event
   */
  private handleDeviceDisconnected(message: WebSocketMessage): void {
    try {
      const payload = message.payload as { deviceId: string };
      this.emitEvent({
        type: 'device_disconnected',
        deviceId: payload.deviceId,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle device disconnected:', error);
    }
  }

  /**
   * Handle call handoff initiated event
   */
  private handleCallHandoffInitiated(message: WebSocketMessage): void {
    try {
      const handoff = message.payload as CallHandoffManager;
      this.emitEvent({
        type: 'call_handoff_initiated',
        handoff,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle call handoff initiated:', error);
    }
  }

  /**
   * Handle call handoff progress event
   */
  private handleCallHandoffProgress(message: WebSocketMessage): void {
    try {
      const handoff = message.payload as CallHandoffManager;
      this.emitEvent({
        type: 'call_handoff_progress',
        handoff,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle call handoff progress:', error);
    }
  }

  /**
   * Handle call handoff completed event
   */
  private handleCallHandoffCompleted(message: WebSocketMessage): void {
    try {
      const handoff = message.payload as CallHandoffManager;
      this.emitEvent({
        type: 'call_handoff_completed',
        handoff,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle call handoff completed:', error);
    }
  }

  /**
   * Handle call handoff failed event
   */
  private handleCallHandoffFailed(message: WebSocketMessage): void {
    try {
      const handoff = message.payload as CallHandoffManager;
      this.emitEvent({
        type: 'call_handoff_failed',
        handoff,
      });
    } catch (error) {
      console.error('[DeviceDiscoveryWebSocket] Failed to handle call handoff failed:', error);
    }
  }

  /**
   * Send device discovery related messages
   */
  sendDeviceUpdate(deviceUpdate: Partial<UserDevice>): void {
    if (!websocketService.isConnected()) {
      console.warn('[DeviceDiscoveryWebSocket] Cannot send device update: WebSocket not connected');
      return;
    }

    websocketService.send(WebSocketMessageType.DEVICE_UPDATED, deviceUpdate);
  }

  /**
   * Send presence update
   */
  sendPresenceUpdate(presenceUpdate: DevicePresenceUpdate): void {
    if (!websocketService.isConnected()) {
      console.warn('[DeviceDiscoveryWebSocket] Cannot send presence update: WebSocket not connected');
      return;
    }

    websocketService.send(WebSocketMessageType.DEVICE_PRESENCE_CHANGED, presenceUpdate);
  }

  /**
   * Request device discovery refresh
   */
  requestDeviceDiscovery(): void {
    if (!websocketService.isConnected()) {
      console.warn('[DeviceDiscoveryWebSocket] Cannot request device discovery: WebSocket not connected');
      return;
    }

    websocketService.send(WebSocketMessageType.DEVICE_DISCOVERED, {
      action: 'refresh_discovery',
      timestamp: Date.now(),
    });
  }

  /**
   * Check if WebSocket is connected and device discovery is initialized
   */
  isReady(): boolean {
    return this.isInitialized && websocketService.isConnected();
  }
}

// Export singleton instance
export const deviceDiscoveryWebSocketService = DeviceDiscoveryWebSocketService.getInstance();

// Export class for creating custom instances if needed
export type { DeviceDiscoveryWebSocketService };