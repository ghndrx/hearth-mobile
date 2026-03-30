/**
 * Notification Router (PN-002)
 *
 * Handles deep linking from notification taps.
 * Maps notification payloads to app routes via expo-router.
 */

import { router } from 'expo-router';
import type { ParsedNotification } from './NotificationDeliveryService';

/**
 * Route to the appropriate screen based on notification payload.
 * Called when a user taps on a notification.
 */
export function routeNotification(notification: ParsedNotification): void {
  const { payload } = notification;

  switch (payload.type) {
    case 'message':
    case 'reply':
      routeToChannel(payload.channelId, payload.serverId, payload.threadId);
      break;

    case 'mention':
      routeToChannel(payload.channelId, payload.serverId, payload.threadId);
      break;

    case 'dm':
      routeToDM(payload.channelId);
      break;

    case 'friend_request':
      router.push('/(tabs)/friends');
      break;

    case 'server_invite':
      router.push('/(tabs)/invites');
      break;

    case 'call':
      routeToCall(payload.channelId);
      break;

    case 'system':
    default:
      router.push('/(tabs)');
      break;
  }
}

function routeToChannel(
  channelId?: string,
  serverId?: string,
  threadId?: string
): void {
  if (threadId && channelId) {
    router.push({
      pathname: '/chat/thread',
      params: { id: threadId, channelId },
    });
  } else if (channelId) {
    router.push({
      pathname: '/chat/[id]',
      params: { id: channelId, serverId: serverId || '' },
    });
  } else {
    router.push('/(tabs)');
  }
}

function routeToDM(channelId?: string): void {
  if (channelId) {
    router.push({
      pathname: '/chat/[id]',
      params: { id: channelId, isDm: 'true' },
    });
  } else {
    router.push('/(tabs)');
  }
}

function routeToCall(channelId?: string): void {
  if (channelId) {
    router.push({
      pathname: '/voice/[id]',
      params: { id: channelId },
    });
  } else {
    router.push('/(tabs)');
  }
}
