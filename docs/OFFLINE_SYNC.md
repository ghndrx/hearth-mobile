# Offline Message Sync

**Feature:** Offline message queue with automatic retry and sync  
**Status:** ✅ Implemented  
**Date:** March 7, 2026

---

## Overview

The Hearth mobile app includes a comprehensive offline message queue that ensures messages are delivered even when network connectivity is unreliable. Messages are queued locally, persisted to storage, and automatically synced when connectivity is restored.

## Architecture

### Components

1. **Offline Queue Store** (`lib/stores/offlineQueue.ts`)
   - Zustand store with AsyncStorage persistence
   - Manages queued messages with status tracking
   - Handles retry logic with exponential backoff
   - Supports attachment upload progress tracking

2. **Offline Sync Service** (`lib/services/offlineSync.ts`)
   - Background processor for message queue
   - Network connectivity monitoring
   - Automatic retry on connection restore
   - Sequential message processing (maintains order)

3. **UI Components**
   - **NetworkStatusBar** (`components/NetworkStatusBar.tsx`): Shows connection status and queue stats
   - **MessageStatus** (`components/MessageStatus.tsx`): Displays delivery status on message bubbles
   - **MessageStatusIcon** (`components/MessageStatus.tsx`): Compact status icon

### Data Flow

```
User sends message
       ↓
Add to offline queue (local storage)
       ↓
Offline sync service picks up message
       ↓
Upload attachments (if any)
       ↓
Send message to server
       ↓
Update status (sent/failed)
       ↓
If failed: Schedule retry with backoff
```

## Message Status Lifecycle

1. **pending**: Message queued, waiting to send
2. **sending**: Currently being uploaded/sent
3. **sent**: Successfully delivered to server
4. **failed**: Send attempt failed, will retry (if retries remaining)

## Retry Strategy

- **Exponential backoff** with jitter
- **Default config**:
  - Max retries: 5
  - Initial delay: 1 second
  - Max delay: 60 seconds
  - Backoff multiplier: 2x

**Example retry delays:**
- Retry 1: ~1s
- Retry 2: ~2s
- Retry 3: ~4s
- Retry 4: ~8s
- Retry 5: ~16s

Jitter (±25%) prevents thundering herd problem when many messages retry simultaneously.

## Failure Reasons

Messages track specific failure reasons for better UX:

- `network_error`: No connectivity or fetch failed
- `timeout`: Request timed out
- `server_error`: 5xx server errors
- `rate_limited`: 429 Too Many Requests
- `unauthorized`: 401/403 authentication issues
- `validation_error`: 400 Bad Request
- `unknown`: Unclassified error

## Network Monitoring

The sync service uses `@react-native-community/netinfo` to:
- Detect connectivity changes
- Trigger immediate sync when connection restored
- Skip processing when offline
- Handle metered connections (cellular data)

## Persistence

Messages are persisted to AsyncStorage:
- **Survives app restarts**
- **Only unsent messages** are persisted (sent messages are removed)
- **Attachments** include local URIs for upload retry
- **Queue state** survives app kill and restart

## Integration

### 1. App Initialization

The offline sync service is started in the root layout (`app/_layout.tsx`):

```typescript
useEffect(() => {
  // Start offline sync service
  offlineSyncService.start();

  return () => {
    offlineSyncService.stop();
  };
}, []);
```

### 2. Sending Messages

When sending a message, add it to the queue:

```typescript
import { useOfflineQueueStore } from '../lib/stores/offlineQueue';

function sendMessage(content: string, channelId: string) {
  const store = useOfflineQueueStore.getState();
  
  store.enqueue({
    content,
    channelId,
    serverId: currentServerId,
    authorId: currentUserId,
    attachments: attachments.length > 0 ? attachments : undefined,
    replyTo: replyContext,
  });
}
```

The sync service will automatically pick up and process the message.

### 3. Displaying Status

Use the `MessageStatus` component to show delivery status:

```typescript
import { MessageStatus } from '../components/MessageStatus';

<MessageStatus
  status={message.status}
  failureReason={message.failureReason}
  errorMessage={message.errorMessage}
  onRetry={() => store.retryMessage(message.localId)}
/>
```

### 4. Network Status Bar

The `NetworkStatusBar` component automatically displays:
- "Offline" when no connection
- "Syncing messages..." during sync
- "X messages pending" when queued
- "X messages failed" with retry button

No configuration needed - it's included in the root layout.

## API Integration

The sync service expects an API function with this signature:

```typescript
async function sendMessage(params: {
  channelId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
}): Promise<{ id: string }>;
```

Update `lib/services/api.ts` to implement this function.

## Attachment Handling

Attachments are uploaded before sending the message:

1. Each attachment gets a unique local ID
2. Upload progress is tracked (0-100%)
3. On successful upload, `uploaded` field contains server response
4. Message includes `attachmentIds` from uploaded attachments
5. Failed uploads prevent message send (will retry)

## Performance Considerations

- **Queue processing interval**: 5 seconds (configurable)
- **Sequential processing**: One message at a time (maintains order)
- **Background processing**: Doesn't block UI
- **Persistence overhead**: Minimal (only unsent messages)

## Error Handling

- **Network errors**: Automatic retry with backoff
- **Server errors**: Retry if transient (5xx), fail if permanent (4xx)
- **Rate limiting**: Exponential backoff respects server limits
- **Attachment upload errors**: Prevent message send, will retry
- **Auth errors**: Stop retrying, require user action

## User Actions

Users can:
- **Retry failed message**: Tap the failed status indicator
- **Retry all failed**: Tap the "X messages failed" bar
- **View queue status**: Network status bar shows pending/failed count
- **Pause/resume sync**: API available via `useOfflineSync` hook

## Hooks

### useOfflineSync

```typescript
const {
  syncStatus,     // { isSyncing, lastSyncAt, progress, error }
  queueStats,     // { total, pending, sending, failed }
  isPaused,       // boolean
  pause,          // () => void
  resume,         // () => void
  retryMessage,   // (localId: string) => void
  retryAllFailed, // () => void
  clearSent,      // () => void
} = useOfflineSync();
```

## Testing Offline Behavior

### Simulate Network Loss

```typescript
// Pause WiFi/cellular on device/simulator
// OR use Network Link Conditioner (iOS)
// OR use Chrome DevTools network throttling
```

### Manual Queue Inspection

```typescript
import { useOfflineQueueStore } from '../lib/stores/offlineQueue';

const queue = useOfflineQueueStore.getState().queue;
console.log('Queue:', queue);
```

### Force Retry

```typescript
const store = useOfflineQueueStore.getState();
store.retryAllFailed();
```

## Future Enhancements

- [ ] Conflict resolution for messages edited while offline
- [ ] Optimistic UI updates (show message immediately)
- [ ] Read receipt syncing
- [ ] Typing indicator buffering
- [ ] Background fetch for message polling
- [ ] Push notification wake-up for pending messages
- [ ] Message priority queuing (DMs before channel messages)
- [ ] Bulk message operations (delete all pending)
- [ ] Analytics (retry rates, failure reasons)
- [ ] Configurable retry strategy per message type

## Dependencies

```json
{
  "@react-native-community/netinfo": "^11.x",
  "@react-native-async-storage/async-storage": "^2.x",
  "zustand": "^5.x",
  "nanoid": "^5.x"
}
```

## Related Files

- `lib/stores/offlineQueue.ts` - Queue store implementation
- `lib/types/offline.ts` - TypeScript types
- `lib/services/offlineSync.ts` - Sync service
- `components/NetworkStatusBar.tsx` - Network status UI
- `components/MessageStatus.tsx` - Message delivery status UI
- `app/_layout.tsx` - Service initialization

---

**Status**: ✅ Ready for integration with channel views
