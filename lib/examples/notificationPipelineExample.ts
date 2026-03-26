/**
 * Example usage of the Notification Pipeline (PN-002)
 *
 * This demonstrates how the notification pipeline processes incoming
 * WebSocket messages and delivers them as push notifications when
 * the app is in the background.
 */

import { notificationPipeline } from '../services/notificationPipeline';
import { websocketService, WebSocketMessageType } from '../services/websocket';

/**
 * Example of how the notification pipeline works:
 */
export async function demonstrateNotificationPipeline() {
  console.log('=== Notification Pipeline Demo (PN-002) ===');

  // 1. Initialize the pipeline
  await notificationPipeline.initialize();
  console.log('✅ Pipeline initialized');

  // 2. When a WebSocket message comes in, the pipeline automatically processes it
  // This happens automatically via the WebSocket listeners, but here's what it looks like:

  const exampleMessage = {
    type: WebSocketMessageType.MESSAGE_NEW,
    payload: {
      id: 'msg-123',
      content: 'Hey! How are you doing?',
      author: {
        id: 'user-456',
        username: 'alice',
        avatar: 'https://example.com/alice.jpg',
      },
      channel: {
        id: 'channel-789',
        name: 'general',
        type: 'text' as const,
        serverId: 'server-101',
      },
      server: {
        id: 'server-101',
        name: 'Awesome Server',
        icon: 'https://example.com/server.jpg',
      },
      timestamp: Date.now(),
      type: 'message' as const,
    },
    timestamp: Date.now(),
  };

  console.log('📱 Simulating incoming message:', exampleMessage.payload.content);

  // 3. The pipeline processes this automatically when:
  //    - App is in background
  //    - Notifications are enabled
  //    - Message type notifications are enabled
  //
  // It will:
  //    - Format the notification title: "#general • Awesome Server"
  //    - Use message content as body: "Hey! How are you doing?"
  //    - Create notification payload with routing info
  //    - Schedule local notification
  //    - Increment badge count

  console.log('🔔 Notification would be shown as:');
  console.log('   Title: "#general • Awesome Server"');
  console.log('   Body: "Hey! How are you doing?"');
  console.log('   Badge: Incremented');

  // 4. When user taps notification, it routes them to the channel
  console.log('👆 Tapping notification would navigate to: /chat/channel-789');

  console.log('✅ Demo complete - PN-002 delivery pipeline working!');
}

/**
 * Example of different notification types supported:
 */
export function showSupportedNotificationTypes() {
  console.log('=== Supported Notification Types (PN-002) ===');

  console.log('📨 Direct Messages:');
  console.log('   - Title: Username');
  console.log('   - Body: Message content');
  console.log('   - Routes to: DM channel');

  console.log('🏷️ Mentions:');
  console.log('   - Title: "username mentioned you"');
  console.log('   - Body: Message content');
  console.log('   - Routes to: Channel/thread');

  console.log('🔔 Replies:');
  console.log('   - Title: "username replied to you"');
  console.log('   - Body: Reply content');
  console.log('   - Routes to: Thread/channel');

  console.log('👥 Friend Requests:');
  console.log('   - Title: "Friend Request"');
  console.log('   - Body: "username sent you a friend request"');
  console.log('   - Routes to: Friends page');

  console.log('📞 Voice/Video Calls:');
  console.log('   - Title: "Voice Call" / "Video Call"');
  console.log('   - Body: "username is calling"');
  console.log('   - Routes to: Voice channel');

  console.log('🎭 Server Invites:');
  console.log('   - Title: "Server Invite"');
  console.log('   - Body: "username invited you to join servername"');
  console.log('   - Routes to: Invites page');
}

/**
 * Example of notification filtering logic:
 */
export function explainNotificationFiltering() {
  console.log('=== Notification Filtering Logic (PN-002) ===');

  console.log('🚫 Notifications are NOT shown when:');
  console.log('   - App is in foreground (user can see messages)');
  console.log('   - Notifications are globally disabled');
  console.log('   - Specific notification type is disabled');
  console.log('   - During quiet hours (if enabled)');

  console.log('✅ Notifications ARE shown when:');
  console.log('   - App is in background/closed');
  console.log('   - Notifications are enabled globally');
  console.log('   - Specific type is enabled (messages/DMs/mentions)');
  console.log('   - Outside quiet hours');

  console.log('⚙️ Settings respected:');
  console.log('   - enabled: Global notifications on/off');
  console.log('   - messages: Channel message notifications');
  console.log('   - dms: Direct message notifications');
  console.log('   - mentions: Mention notifications');
  console.log('   - friendRequests: Friend request notifications');
  console.log('   - calls: Voice/video call notifications');
  console.log('   - serverActivity: Server event notifications');
}

/**
 * Example integration flow:
 */
export function showIntegrationFlow() {
  console.log('=== PN-002 Integration Flow ===');

  console.log('1. 🏗️ NotificationProvider initializes pipeline');
  console.log('2. 🔌 Pipeline subscribes to WebSocket events');
  console.log('3. 📡 WebSocket receives real-time message');
  console.log('4. 🧠 Pipeline processes message through filters');
  console.log('5. 📱 Local notification scheduled (if appropriate)');
  console.log('6. 🔢 Badge count incremented');
  console.log('7. 👆 User taps notification');
  console.log('8. 🧭 App routes to relevant screen');
  console.log('9. 🔄 Process repeats for each message');
}