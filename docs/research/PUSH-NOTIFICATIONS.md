# Push Notification Best Practices (APNs & FCM)

**Research Date:** March 6, 2026  
**Focus:** APNs, FCM architecture, delivery guarantees, security, and chat-specific patterns  
**For:** Hearth mobile app (React Native)

---

## Executive Summary

Push notifications are **critical infrastructure** for chat apps, not a convenience feature. They act as the fallback transport when WebSocket connections are unavailable. This research covers architectural patterns, platform-specific constraints, security considerations, and implementation strategies for Hearth.

**Key Principle:** Push notifications should be **event signals**, not message containers. Never embed full message content in push payloads.

---

## 1. Architecture Overview

### FCM Architecture Components

1. **Message Composition Layer**
   - Firebase Console GUI (testing only)
   - Firebase Admin SDK (production)
   - FCM HTTP v1 API (direct server integration)

2. **FCM Backend**
   - Accepts message requests
   - Performs topic fanout
   - Generates message IDs and metadata

3. **Platform Transport Layer**
   - **Android:** Android Transport Layer (ATL) via Google Play Services
   - **iOS:** Apple Push Notification service (APNs)
   - **Web:** Web Push Protocol

4. **Client SDK**
   - `@react-native-firebase/messaging` for RN
   - Handles foreground/background/quit states
   - Manages notification display logic

### iOS APNs Architecture

- **Token-based authentication** (.p8 keys) recommended over certificate-based (.p12)
- Tokens valid for 1 hour, must be regenerated periodically
- APNs routes through:
  - Production: `api.push.apple.com:443`
  - Sandbox: `api.sandbox.push.apple.com:443`
- **Certificate Update 2025:** USERTrust RSA Certification Authority (backend trust store update required by January 20, 2025)

---

## 2. Platform-Specific Behavior

### Android (FCM)

| Device State | Notification Message | Notification + Data | Data-Only (normal priority) | Data-Only (high priority) |
|--------------|---------------------|--------------------|-----------------------------|--------------------------|
| **Foreground** | `onMessage` handler | `onMessage` handler | `onMessage` handler | `onMessage` handler |
| **Background** | System notification + `setBackgroundMessageHandler` | System notification + `setBackgroundMessageHandler` | ⚠️ Ignored (deferred) | `setBackgroundMessageHandler` |
| **Quit** | System notification + `setBackgroundMessageHandler` | System notification + `setBackgroundMessageHandler` | ⚠️ Ignored (deferred) | `setBackgroundMessageHandler` |

**Key Constraints:**
- **Battery Optimizations:** Doze mode, App Standby Buckets can delay delivery
- **Background Execution:** Limited to 60 seconds (configurable via `messaging_android_headless_task_timeout`)
- **Notification Channels:** Required for Android 8+ (group by type: messages, calls, system)
- **High Priority:** Use only for time-sensitive events (direct messages, calls); overuse triggers throttling

### iOS (APNs)

| Device State | Notification Alert | Data-Only (silent) | VoIP Push |
|--------------|-------------------|-------------------|-----------|
| **Foreground** | `onMessage` handler (no system alert) | `onMessage` handler | `onMessage` handler |
| **Background** | System notification + `setBackgroundMessageHandler` | ⚠️ Opportunistic delivery | Immediate delivery + call UI |
| **Quit** | System notification + `setBackgroundMessageHandler` | ⚠️ Opportunistic delivery | Immediate delivery + call UI |

**Key Constraints:**
- **Silent Notifications:** Not guaranteed; delivery depends on:
  - Battery state
  - App usage patterns
  - Network conditions
  - `content-available: true` flag required
  - `apns-push-type: background` header required
  - `apns-priority: 5` header required
- **Background App Refresh:** Must be enabled in Settings (check via `getIsHeadless()`)
- **Low Power Mode:** Disables background delivery
- **Payload Size:** 4KB maximum (5KB for VoIP)
- **VoIP Pushes:** Only for actual call events (misuse triggers delivery degradation)

---

## 3. Payload Design for Chat Apps

### ❌ Anti-Pattern: Full Message in Payload

```json
{
  "notification": {
    "title": "Alice",
    "body": "Hey, can you send me that document we discussed?"
  },
  "data": {
    "messageId": "msg_123",
    "dialogId": "dlg_456",
    "fullContent": "Hey, can you send me that document we discussed?",
    "timestamp": "2026-03-06T18:00:00Z"
  }
}
```

**Problems:**
- ❌ Violates end-to-end encryption (push payload visible to Google/Apple)
- ❌ Payload size limits (4KB iOS, varies Android)
- ❌ No recovery if push is lost
- ❌ Message history inconsistency across devices

### ✅ Best Practice: Minimal Metadata

```json
{
  "data": {
    "type": "chat.message",
    "dialogId": "dlg_456",
    "messageId": "msg_123",
    "senderId": "user_789",
    "timestamp": "2026-03-06T18:00:00Z",
    "sequenceId": "12345"
  },
  "apns": {
    "payload": {
      "aps": {
        "alert": {
          "title": "New Message",
          "body": "You have a new message"
        },
        "sound": "default",
        "badge": 1
      }
    },
    "headers": {
      "apns-priority": "10",
      "apns-push-type": "alert"
    }
  },
  "android": {
    "priority": "high",
    "notification": {
      "title": "New Message",
      "body": "You have a new message",
      "sound": "default",
      "channelId": "chat_messages"
    }
  }
}
```

**Client Flow:**
1. Receive push notification
2. Extract `dialogId` and `messageId`
3. Fetch message content via authenticated API: `GET /api/messages/{messageId}`
4. Update local storage and UI
5. Display notification if app is backgrounded

---

## 4. React Native Firebase Implementation

### Setup (firebase.json)

```json
{
  "react-native": {
    "messaging_ios_auto_register_for_remote_messages": true,
    "messaging_ios_foreground_presentation_options": ["badge", "sound", "list", "banner"],
    "messaging_android_notification_channel_id": "hearth_chat",
    "messaging_android_notification_color": "@color/hearth_primary",
    "messaging_android_headless_task_timeout": 60000,
    "analytics_auto_collection_enabled": false,
    "messaging_auto_init_enabled": true
  }
}
```

### Foreground Handler

```typescript
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';

function usePushNotifications() {
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      // App is open and in view
      const { dialogId, messageId } = remoteMessage.data;
      
      // Fetch message content securely
      const message = await fetchMessage(messageId);
      
      // Update UI silently if user is viewing this dialog
      if (activeDialogId === dialogId) {
        updateMessagesInPlace(message);
        return; // Don't show notification
      }
      
      // Show local notification for other dialogs
      await displayLocalNotification({
        title: remoteMessage.notification?.title || 'New Message',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
      });
    });

    return unsubscribe;
  }, [activeDialogId]);
}
```

### Background/Quit Handler

```typescript
// index.js (top-level, before AppRegistry)
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
  
  const { dialogId, messageId, sequenceId } = remoteMessage.data;
  
  // Sync message to local storage
  await syncMessageToStorage(messageId, dialogId, sequenceId);
  
  // Update badge count
  await updateBadgeCount();
  
  // Do NOT update UI (no React context available)
  // Do NOT make long-running network calls (60s timeout)
});
```

### iOS Headless Check

```typescript
// index.js
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    // App launched in background by iOS push
    return null;
  }
  return <App />;
}

AppRegistry.registerComponent('hearth', () => HeadlessCheck);
```

**AppDelegate.m:**

```objc
#import "RNFBMessagingModule.h"

// In didFinishLaunchingWithOptions:
self.initialProps = [RNFBMessagingModule addCustomPropsToUserProps:nil 
                                                 withLaunchOptions:launchOptions];
```

---

## 5. Security & Privacy

### Principle: Zero-Knowledge Push

**Signal's Approach:**
- Push notifications contain **no message content**
- Push payload is just a "wake up" signal
- App fetches encrypted message from server over TLS
- Google/Apple cannot read message content

**Hearth Implementation:**
```json
{
  "data": {
    "type": "event",
    "id": "evt_abc123"
  }
}
```

Client receives push → fetches event details via API → decrypts locally.

### Token Management

**Security Best Practices:**
1. **Refresh Tokens:** Monitor `onTokenRefresh` events, update server immediately
2. **Token Rotation:** Tokens expire/change when:
   - App reinstalled
   - User clears app data (Android)
   - APNs token regenerated (iOS, periodically)
3. **Validate Tokens:** Remove invalid tokens from database (400/404 errors from FCM/APNs)
4. **Secure Storage:** Store tokens server-side with device metadata (OS, app version)

```typescript
messaging().onTokenRefresh(async (token) => {
  await updateServerToken(token, {
    platform: Platform.OS,
    appVersion: getAppVersion(),
    deviceId: await getDeviceId(),
  });
});
```

### Privacy Metadata Leakage

Even without message content, push notifications leak:
- **Timing:** When messages are sent
- **Frequency:** Communication patterns between users
- **Identifiers:** Dialog IDs, user IDs (if not encrypted)

**Mitigation:**
- Use opaque identifiers (`evt_123` instead of `user_alice_to_user_bob`)
- Consider batch notifications ("3 new messages" vs. individual pushes)
- Allow users to disable push entirely (use polling fallback)

---

## 6. Scalability & Reliability

### FCM Rate Limits & Quotas

- **HTTP v1 API:** 600,000 quota tokens per minute per project
- **Rate Limiting:** 429 errors with `retry-after` header
- **Throttling:** High RPS without smoothing triggers server-side throttling

### Scaling Best Practices

1. **Avoid Traffic Spikes**
   - Don't send all messages in first 60 seconds of hour
   - Avoid `:00`, `:15`, `:30`, `:45` minute marks
   - Ramp up gradually (0 → max RPS over 60s minimum)

2. **Retry Strategy**
   - **400/401/403/404:** Abort, do not retry
   - **429:** Retry after `retry-after` header (default 60s)
   - **500:** Exponential backoff with jitter
   - **Timeout:** 10 seconds minimum before retry
   - **Max Interval:** Drop requests older than 60 minutes

3. **Server-Side Throttling**
   - Implement queue-based delivery
   - Batch non-urgent notifications
   - Separate transactional (messages) from promotional (marketing)

4. **Gradual Rollout for Traffic Changes**
   ```
   Week 0: 1% (ramp 0 → 5K RPS over 1 hour)
   Week 1: 5% (ramp 5K → 25K RPS over 2 hours)
   Week 2: 10% (ramp 25K → 50K RPS over 2 hours)
   Week 3: 25% (ramp 50K → 125K RPS over 3 hours)
   Week 4: 50% (ramp 125K → 250K RPS over 6 hours)
   Week 5: 75% (ramp 250K → 375K RPS over 6 hours)
   Week 6: 100% (ramp 375K → 500K RPS over 6 hours)
   ```

### Monitoring

Track these metrics:
- **Delivery Rate:** Sent vs. delivered
- **Error Rate:** 400/500 errors per minute
- **Latency:** P50, P95, P99 delivery times
- **Token Refresh Rate:** Abnormal spikes indicate issues
- **Platform Feedback:** APNs/FCM rejection reasons

---

## 7. Context-Aware Suppression

### Suppress Notifications for Active Dialogs

**Problem:** User is viewing "Alice" chat → receives push notification for Alice's message → annoying duplicate

**Solution:** Track active dialog on backend

**Client Flow:**
1. User opens dialog → send `dialog.opened` event to server
2. Server marks `user_123` as "active in dialog_456"
3. New message arrives for dialog_456
4. Server checks: is user_123 active in dialog_456?
   - **Yes:** Skip push notification (WebSocket delivers message)
   - **No:** Send push notification

**Implementation:**
```typescript
// Client
socket.emit('dialog.opened', { dialogId: 'dlg_456' });

// On dialog close
socket.emit('dialog.closed', { dialogId: 'dlg_456' });

// Server (Redis cache)
redis.setex(`active:user_123:dlg_456`, 300, '1'); // 5 min TTL

// Before sending push
const isActive = await redis.exists(`active:${userId}:${dialogId}`);
if (isActive) {
  return; // Skip push
}
```

### Notification Grouping

**Android:** Use `tag` to replace old notifications
```json
{
  "android": {
    "notification": {
      "tag": "dlg_456",
      "title": "Alice (3 new messages)",
      "body": "Latest message preview..."
    }
  }
}
```

**iOS:** Use `thread-id` for grouped notifications
```json
{
  "apns": {
    "payload": {
      "aps": {
        "thread-id": "dlg_456",
        "alert": { ... }
      }
    }
  }
}
```

---

## 8. Data-Only Messages (Silent Sync)

### Use Case: Background Sync Without User Notification

**Example:** User reads message on desktop → mobile app syncs read receipt silently

**Android (High Priority Required):**
```javascript
admin.messaging().send({
  data: {
    type: 'sync.read_receipt',
    messageId: 'msg_123',
    dialogId: 'dlg_456',
  },
  android: {
    priority: 'high', // Required for background wake
  },
  token: deviceToken,
});
```

**iOS (APNs Headers Required):**
```javascript
admin.messaging().send({
  data: {
    type: 'sync.read_receipt',
    messageId: 'msg_123',
    dialogId: 'dlg_456',
  },
  apns: {
    payload: {
      aps: {
        contentAvailable: true, // Silent notification
      },
    },
    headers: {
      'apns-push-type': 'background',
      'apns-priority': '5', // Low priority
      'apns-topic': 'com.hearth.app', // Bundle ID
    },
  },
  token: deviceToken,
});
```

**Caveats:**
- iOS silent notifications are **opportunistic**, not guaranteed
- Use for non-critical sync only (read receipts, typing indicators)
- Do NOT use for message delivery (user may never see it)

---

## 9. Topics for Broadcast Messaging

### Use Case: Server Maintenance Notification

**Subscribe Client to Topic:**
```typescript
import messaging from '@react-native-firebase/messaging';

await messaging().subscribeToTopic('system_announcements');
```

**Send to Topic:**
```javascript
admin.messaging().send({
  notification: {
    title: 'Scheduled Maintenance',
    body: 'Hearth will be unavailable March 10, 2-4 AM UTC',
  },
  topic: 'system_announcements',
});
```

**Limits:**
- 2,000 topics per app instance max
- 5 topics per send request max
- Rate-limited (use exponential backoff)

**Hearth Use Cases:**
- `system_announcements`: Server maintenance, outages
- `feature_updates`: New feature launches
- `security_alerts`: Critical security notifications

**Do NOT use topics for:**
- ❌ User-specific messages (use direct token sends)
- ❌ Sensitive data (topics are not private)

---

## 10. VoIP Push Notifications (iOS Calls)

### PushKit for Incoming Calls

**Use Case:** Hearth voice/video calls

**Why PushKit:**
- Immediate delivery (even when app is quit)
- App wakes in background with 30 seconds to display call UI
- Higher reliability than standard APNs

**Requirements:**
1. VoIP certificate from Apple Developer Portal
2. `voip` background mode in Xcode
3. PushKit framework integration

**React Native Library:**
```bash
npm install react-native-voip-push-notification
```

**Setup:**
```typescript
import VoipPushNotification from 'react-native-voip-push-notification';

VoipPushNotification.requestPermissions();

VoipPushNotification.registerVoipToken(); // Get VoIP token

VoipPushNotification.addEventListener('register', (token) => {
  // Send VoIP token to server
  await updateVoipToken(token);
});

VoipPushNotification.addEventListener('notification', (notification) => {
  // Display call UI immediately
  displayIncomingCallScreen(notification.data);
});
```

**Server Send (via APNs directly, not FCM):**
```python
import jwt
import requests

# Generate JWT token
headers = {
    'alg': 'ES256',
    'kid': 'YOUR_KEY_ID',
}
payload = {
    'iss': 'YOUR_TEAM_ID',
    'iat': int(time.time()),
}
token = jwt.encode(payload, private_key, algorithm='ES256', headers=headers)

# Send VoIP push
url = f'https://api.push.apple.com/3/device/{voip_token}'
headers = {
    'authorization': f'bearer {token}',
    'apns-topic': 'com.hearth.app.voip', # Bundle ID + .voip
    'apns-push-type': 'voip',
    'apns-priority': '10',
}
payload = {
    'callId': 'call_123',
    'callerName': 'Alice',
    'callType': 'video',
}
requests.post(url, json=payload, headers=headers)
```

**Apple Rules:**
- **MUST** display call UI for every VoIP push
- Misuse (sending non-call events) triggers delivery degradation
- App may be terminated by iOS if call UI not displayed

---

## 11. Notification Permissions

### iOS Permission Flow

```typescript
import messaging from '@react-native-firebase/messaging';

async function requestNotificationPermission() {
  const authStatus = await messaging().requestPermission();
  
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Notification permission granted:', authStatus);
    return true;
  }
  
  return false;
}
```

**iOS Permission States:**
- `AUTHORIZED`: Full permissions
- `PROVISIONAL`: Quiet notifications (iOS 12+)
- `DENIED`: User denied
- `NOT_DETERMINED`: Not asked yet

**Provisional Authorization:**
- Notifications delivered silently to Notification Center
- No sound, no banner, no badge
- User can upgrade to full authorization later
- Good for non-intrusive onboarding

### Android Permission (API 33+)

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestAndroidNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // No permission needed on older Android
}
```

---

## 12. Testing & Debugging

### Tools

**Firebase Console:**
- Cloud Messaging → New Notification
- Send to single token or topic
- Preview on device
- View delivery logs (limited)

**FCM HTTP v1 API (curl):**
```bash
curl -X POST https://fcm.googleapis.com/v1/projects/hearth-prod/messages:send \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_TOKEN",
      "data": {
        "type": "test",
        "timestamp": "2026-03-06T18:00:00Z"
      }
    }
  }'
```

**APNs Testing (curl):**
```bash
curl -X POST https://api.sandbox.push.apple.com/3/device/DEVICE_TOKEN \
  -H "authorization: bearer YOUR_JWT_TOKEN" \
  -H "apns-topic: com.hearth.app" \
  -H "apns-push-type: alert" \
  -H "apns-priority: 10" \
  -d '{"aps":{"alert":"Test notification"}}'
```

### Debugging Common Issues

**iOS: Notifications Not Arriving**
1. Check Background App Refresh in Settings
2. Verify device not in Low Power Mode
3. Confirm APNs token is valid (call `getAPNSToken()`)
4. Check payload size < 4KB
5. Verify `apns-topic` matches bundle ID

**Android: Background Handler Not Firing**
1. Check app not in battery optimization
2. Verify high priority set for data-only messages
3. Confirm `setBackgroundMessageHandler` called before `AppRegistry.registerComponent`
4. Check 60-second timeout not exceeded

**Token Issues:**
1. Monitor `onTokenRefresh` events
2. Log token changes to server with timestamp
3. Implement retry logic for token updates
4. Remove invalid tokens on 404/410 responses

---

## 13. Implementation Checklist for Hearth

### Phase 1: Foundation
- [ ] Install `@react-native-firebase/messaging`
- [ ] Configure `firebase.json` with Hearth settings
- [ ] Set up FCM project in Firebase Console
- [ ] Generate APNs certificates (.p8 preferred)
- [ ] Implement token registration flow
- [ ] Implement `onTokenRefresh` handler

### Phase 2: Message Handling
- [ ] Implement foreground `onMessage` handler
- [ ] Implement background `setBackgroundMessageHandler`
- [ ] Add iOS headless check in `AppDelegate.m`
- [ ] Create notification channels (Android)
- [ ] Implement context-aware suppression (active dialog)
- [ ] Add notification grouping by dialog

### Phase 3: Server Integration
- [ ] Store device tokens in database (user_id, token, platform, created_at)
- [ ] Implement token cleanup (remove invalid tokens)
- [ ] Create push queue system (Redis + workers)
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limiting and batching
- [ ] Track delivery metrics (sent, delivered, failed)

### Phase 4: Security & Privacy
- [ ] Use minimal metadata in push payloads
- [ ] Implement server-side message fetching (not payload delivery)
- [ ] Encrypt sensitive identifiers in payloads
- [ ] Validate user permissions before sending push
- [ ] Implement token rotation monitoring
- [ ] Add privacy controls in user settings

### Phase 5: Advanced Features
- [ ] Implement silent sync for read receipts
- [ ] Add VoIP push for voice/video calls (iOS)
- [ ] Create topics for system announcements
- [ ] Implement notification actions (reply, mark read)
- [ ] Add rich notifications (images, buttons)
- [ ] Implement notification sound customization

### Phase 6: Testing & Monitoring
- [ ] Set up Firebase Analytics for push events
- [ ] Create delivery monitoring dashboard
- [ ] Implement error alerting (Sentry, Datadog)
- [ ] Test on low-end devices
- [ ] Test battery optimization scenarios
- [ ] Load test push delivery at scale

---

## 14. Open Source Examples

### Signal iOS
- **Repo:** https://github.com/signalapp/Signal-iOS
- **Push Handler:** `NotificationService/NotificationService.swift`
- **Key Insight:** Push contains zero message content, only encrypted envelope ID
- **Flow:** Push arrives → fetch envelope → decrypt locally → display notification

### Element (Matrix) Android
- **Repo:** https://github.com/element-hq/element-android
- **Push Handler:** `vector/src/main/java/im/vector/app/push/`
- **Key Insight:** Uses UnifiedPush for decentralized push delivery
- **Fallback:** FCM when UnifiedPush unavailable

### Rocket.Chat React Native
- **Repo:** https://github.com/RocketChat/Rocket.Chat.ReactNative
- **Push Handler:** `app/notifications/push/`
- **Key Insight:** Handles both FCM and APNs with unified interface
- **Feature:** Notification grouping by channel

---

## 15. Recommended Architecture for Hearth

### Client-Side (React Native)

```
┌─────────────────────────────────────────┐
│         React Native App                │
├─────────────────────────────────────────┤
│ Foreground Handler (onMessage)          │
│  └─ Fetch message → Update UI           │
├─────────────────────────────────────────┤
│ Background Handler (setBackgroundMsg)   │
│  └─ Sync to storage → Update badge      │
├─────────────────────────────────────────┤
│ Token Manager (onTokenRefresh)          │
│  └─ Update server with new token        │
└─────────────────────────────────────────┘
         ▲                    │
         │                    ▼
     Push Notification   WebSocket (primary)
         (fallback)
         │
         ▼
┌─────────────────────────────────────────┐
│       FCM / APNs (Platform Layer)       │
└─────────────────────────────────────────┘
```

### Server-Side (Node.js + Redis)

```
┌─────────────────────────────────────────┐
│         Message Router                  │
│  ├─ Check user online? → WebSocket      │
│  └─ User offline? → Push Queue          │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Push Queue (Redis)              │
│  ├─ Batch by priority                   │
│  ├─ Rate limit per user                 │
│  └─ Retry failed sends                  │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Push Workers                    │
│  ├─ Check active dialog suppression     │
│  ├─ Fetch device tokens from DB         │
│  ├─ Send to FCM/APNs                    │
│  └─ Log delivery status                 │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  os_version TEXT,
  device_model TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);

CREATE TABLE push_deliveries (
  id UUID PRIMARY KEY,
  device_token_id UUID REFERENCES device_tokens(id),
  message_id UUID REFERENCES messages(id),
  dialog_id UUID REFERENCES dialogs(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_code TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0
);
```

---

## 16. References & Resources

### Official Documentation
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/)
- [FCM Architecture Overview](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [Scaling FCM Best Practices](https://firebase.google.com/docs/cloud-messaging/scale-fcm)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Sending APNs Requests](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)

### Libraries
- `@react-native-firebase/messaging` (official FCM SDK)
- `react-native-voip-push-notification` (iOS VoIP)
- `@notifee/react-native` (advanced local notifications)

### Blog Posts
- [ConnectyCube: Push Notifications in Chat Apps](https://connectycube.com/2025/12/18/push-notifications-in-chat-apps-best-practices-for-android-ios/)
- [Courier: 2025 APNs Certificate Update](https://www.courier.com/blog/get-your-ios-app-ready-for-the-2025-apple-push-notification-service-server)
- [Firebase: FCM at World Cup Scale](https://firebase.blog/posts/2023/05/cloud-messaging-world-cup-scale/)

### Open Source
- [Signal iOS](https://github.com/signalapp/Signal-iOS)
- [Signal Android](https://github.com/signalapp/Signal-Android)
- [Element Android](https://github.com/element-hq/element-android)
- [Rocket.Chat React Native](https://github.com/RocketChat/Rocket.Chat.ReactNative)

---

## 17. Next Steps

1. **Prototype minimal push integration** (Phase 1-2)
2. **Load test delivery reliability** with simulated traffic
3. **Implement encryption** for push payload identifiers
4. **Research Expo EAS Build** for push certificate management
5. **Design notification preferences UI** (per-dialog muting, sounds)

---

**Document Status:** Complete  
**Next Research Topic:** React Native Performance Optimization (rotation #4)
