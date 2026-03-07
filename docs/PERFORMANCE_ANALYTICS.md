# Performance Monitoring & Analytics

Comprehensive performance monitoring and analytics infrastructure for Hearth Mobile.

## Overview

This system provides:
- **Analytics Service**: Event tracking, user properties, and behavioral analytics
- **Performance Monitoring**: FPS, memory, render times, and lifecycle metrics
- **Error Boundary**: Crash reporting and error recovery
- **Platform Optimizations**: iOS/Android specific performance improvements

## Analytics Service

### Features
- Event tracking with automatic platform metadata
- User property management
- Session tracking
- Performance metrics logging
- Privacy-first design with user consent

### Usage

```typescript
import { analytics } from '@/lib/services/analytics';

// Log events
analytics.logEvent('button_clicked', {
  button_id: 'send_message',
  screen: 'chat',
});

// Log screen views
analytics.logScreen('ChatScreen', {
  server_id: serverId,
  channel_id: channelId,
});

// Log errors
analytics.logError(error, {
  context: 'message_send',
  retry_count: 3,
});

// Set user properties
analytics.setUserProperties({
  tier: 'premium',
  server_count: 5,
});

// Common helpers
analytics.logMessageSent('channel', { has_attachment: true });
analytics.logVoiceCall('joined', 120);
analytics.logServerJoined(serverId, 'invite_link');
analytics.logFeatureUsed('gif_picker');
```

### Privacy & Consent

```typescript
// Disable analytics (user preference)
await analytics.setEnabled(false);

// Check if enabled
if (analytics.isEnabled()) {
  analytics.logEvent('feature_used', { feature: 'dark_mode' });
}
```

### Event Queue & Flushing

Events are queued and flushed every 30 seconds to minimize battery impact. Critical events (errors, crashes, payments) are flushed immediately.

## Performance Monitoring

### Component Performance

Track component mount, render, and lifetime metrics:

```typescript
import { useComponentPerformance } from '@/lib/hooks';

function MyComponent() {
  useComponentPerformance('MyComponent', {
    server_id: serverId,
  });
  
  return <View>...</View>;
}
```

### Async Operations

Measure async operation duration:

```typescript
import { usePerformanceTimer } from '@/lib/hooks';

function MyComponent() {
  const { start, end, measure } = usePerformanceTimer();
  
  const loadData = async () => {
    start('load_messages');
    await fetchMessages();
    end('load_messages');
  };
  
  // Or use measure helper
  const loadDataWithMeasure = async () => {
    await measure('load_messages', async () => {
      return await fetchMessages();
    }, { channel_id: channelId });
  };
  
  return <View>...</View>;
}
```

### Navigation Performance

Track time-to-interactive for screens:

```typescript
import { useNavigationPerformance } from '@/lib/hooks';

export default function ChatScreen() {
  useNavigationPerformance('ChatScreen');
  
  return <View>...</View>;
}
```

### App State Tracking

Monitor background/foreground transitions:

```typescript
import { useAppStatePerformance } from '@/lib/hooks';

function App() {
  useAppStatePerformance(); // Auto-tracks app state
  
  return <View>...</View>;
}
```

### Scroll Performance

Monitor list scrolling performance:

```typescript
import { useScrollPerformance } from '@/lib/hooks';

function MessageList() {
  const scrollHandlers = useScrollPerformance('message_list');
  
  return (
    <FlatList
      {...scrollHandlers}
      data={messages}
      renderItem={renderMessage}
    />
  );
}
```

### Image Load Performance

Track image loading times:

```typescript
import { useImageLoadPerformance } from '@/lib/hooks';

function Avatar({ url }) {
  const imageHandlers = useImageLoadPerformance('user_avatar');
  
  return (
    <Image
      source={{ uri: url }}
      {...imageHandlers}
    />
  );
}
```

### Network Request Tracking

```typescript
import { measureNetworkRequest } from '@/lib/hooks';

async function fetchMessages() {
  return await measureNetworkRequest(
    'fetch_messages',
    () => api.get('/messages'),
    { channel_id: channelId }
  );
}
```

## Error Boundary

### Features
- Catches React component errors
- Provides fallback UI
- Logs to analytics and crash reporting
- Recovery options (retry, go home, reload)

### Usage

Automatically wraps the entire app in `app/_layout.tsx`. For specific sections:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyFeature() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.log('Feature error:', error);
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Custom Fallback UI

```typescript
<ErrorBoundary
  fallback={(error, errorInfo, reset) => (
    <View>
      <Text>Oops! Something went wrong.</Text>
      <Button onPress={reset} title="Try Again" />
    </View>
  )}
>
  <MyComponent />
</ErrorBoundary>
```

### Programmatic Error Handling

```typescript
import { useErrorHandler } from '@/components/ErrorBoundary';

function MyComponent() {
  const handleError = useErrorHandler();
  
  const doSomething = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error); // Triggers error boundary
    }
  };
}
```

## Platform Optimizations

### Image Optimization

```typescript
import { ImageOptimization } from '@/lib/utils/platformOptimizations';

// Calculate optimal dimensions
const { width, height } = ImageOptimization.getOptimalImageSize(
  originalWidth,
  originalHeight,
  maxWidth,
  maxHeight
);

// Compress image
const compressedUri = await ImageOptimization.compressImage(uri, 0.8);

// Clear cache
await ImageOptimization.clearCache();

// Check cache size
const cacheSize = await ImageOptimization.getCacheSize();
```

### Memory Optimization

```typescript
import { MemoryOptimization } from '@/lib/utils/platformOptimizations';

// Check device capabilities
if (MemoryOptimization.isLowMemoryDevice()) {
  // Use lower quality images, smaller page sizes
}

// Get recommended settings
const pageSize = MemoryOptimization.getRecommendedPageSize(); // 20 or 50
const quality = MemoryOptimization.getRecommendedImageQuality(); // 0.7 or 0.85

// Cleanup temp files
await MemoryOptimization.cleanupTempFiles();
```

### Network Optimization

```typescript
import { NetworkOptimization } from '@/lib/utils/platformOptimizations';

// Debounce search input
const debouncedSearch = NetworkOptimization.debounce(search, 300);

// Throttle scroll events
const throttledScroll = NetworkOptimization.throttle(handleScroll, 100);

// Batch multiple requests
const results = await NetworkOptimization.batchRequests(
  [fetchUser1, fetchUser2, fetchUser3],
  5 // batch size
);
```

### Rendering Optimization

```typescript
import { RenderOptimization } from '@/lib/utils/platformOptimizations';

// Get optimal FlatList config
const listConfig = RenderOptimization.getVirtualizedListConfig();

<FlatList
  {...listConfig}
  data={items}
  renderItem={renderItem}
/>

// Get animation config
const animConfig = RenderOptimization.getAnimationConfig();
```

### Platform-Specific Config

```typescript
import { PlatformConfig } from '@/lib/utils/platformOptimizations';

// Text input optimizations
<TextInput
  {...PlatformConfig.getTextInputConfig()}
  value={text}
/>

// Keyboard avoiding
<KeyboardAvoidingView
  {...PlatformConfig.getKeyboardAvoidingConfig()}
>
  {children}
</KeyboardAvoidingView>

// ScrollView bouncing
<ScrollView
  {...PlatformConfig.getScrollViewConfig()}
>
  {children}
</ScrollView>

// Check haptics availability
if (PlatformConfig.hasHapticFeedback()) {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

### Storage Optimization

```typescript
import { StorageOptimization } from '@/lib/utils/platformOptimizations';

// Check storage info
const info = await StorageOptimization.getStorageInfo();
console.log(`Free: ${info.freeSize / 1024 / 1024}MB`);

// Check if low
if (await StorageOptimization.isStorageLow()) {
  // Warn user, cleanup cache
  await StorageOptimization.cleanupOldCache();
}
```

### Battery Optimization

```typescript
import { BatteryOptimization } from '@/lib/utils/platformOptimizations';

// Adjust polling based on battery
const interval = BatteryOptimization.getRecommendedPollingInterval(isLowBattery);

// Reduce background activity
if (BatteryOptimization.shouldReduceBackgroundActivity(isLowBattery)) {
  // Disable auto-refresh, reduce sync frequency
}
```

## Integration with Backend

Replace TODO placeholders in `lib/services/analytics.ts`:

```typescript
private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
  await fetch('https://api.hearth.app/analytics/events', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ events }),
  });
}
```

## Best Practices

1. **Don't over-track**: Only log meaningful events
2. **Respect privacy**: Always check user consent
3. **Use semantic names**: Event names should be descriptive
4. **Include context**: Add relevant metadata to events
5. **Measure what matters**: Focus on user-impacting metrics
6. **Clean up**: Remove timers and listeners on unmount
7. **Batch requests**: Don't send events individually
8. **Handle errors**: Don't let analytics crash the app

## Production Checklist

- [ ] Integrate real analytics backend (Google Analytics, Segment, custom)
- [ ] Set up crash reporting (Sentry, Bugsnag, Firebase Crashlytics)
- [ ] Configure user consent flow
- [ ] Set up analytics dashboards
- [ ] Configure alerting for critical metrics
- [ ] Test performance on low-end devices
- [ ] Verify error boundary recovery flows
- [ ] Audit tracked events for PII
- [ ] Document analytics schema
- [ ] Set up retention policies for analytics data

## Metrics to Monitor

### Performance
- App startup time
- Screen time-to-interactive
- Network request latency
- Image load times
- FPS during scrolling
- Memory usage
- App size

### User Behavior
- Daily/monthly active users
- Session duration
- Retention rates
- Feature adoption
- Message send rate
- Voice call duration
- Server join rate

### Errors
- Crash rate
- Error rate by screen
- Network failure rate
- Common error types
- Recovery success rate

### Platform-Specific
- iOS vs Android metrics
- Device model distribution
- OS version distribution
- Battery impact
- Network usage
