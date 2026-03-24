# PRD: Live Screen Sharing & Streaming

**Document ID**: PRD-003
**Priority**: P1
**Target Release**: Q4 2026
**Owner**: Mobile Team

## Executive Summary

Implement live screen sharing and streaming capabilities to match Discord's "Go Live" feature, enabling users to share their mobile screens, stream gameplay, and host interactive watch parties directly from their mobile devices.

## Problem Statement

Hearth Mobile lacks live streaming capabilities that have become essential for modern Discord communities:
- No screen sharing for mobile devices
- Missing gameplay streaming for mobile games
- No watch party functionality for shared viewing
- Lack of live interaction during streams (chat, reactions)
- Missing stream discovery and browsing
- No streaming quality controls for mobile bandwidth

**Current State**: Only static voice channels with LiveKit
**Desired State**: Full live streaming ecosystem with screen sharing, gameplay streaming, and interactive features

## Success Metrics

- **Streaming Adoption**: 25% of active users try streaming within 30 days
- **Stream Quality**: 95% streams maintain stable quality (720p@30fps)
- **Engagement**: Average 4+ concurrent viewers per stream
- **Performance**: <2s stream start time, <500ms latency

## User Stories

### Core Streaming
- As a user, I want to share my mobile screen so I can show apps or content to friends
- As a user, I want to stream mobile gameplay so my community can watch me play
- As a user, I want to host watch parties so we can watch content together
- As a user, I want to discover live streams so I can find interesting content

### Interactive Features
- As a viewer, I want to chat during streams so I can engage with the streamer
- As a viewer, I want to react with emojis so I can quickly respond to stream content
- As a streamer, I want to see viewer count and chat so I can engage my audience
- As a streamer, I want to moderate my stream so I can maintain a good environment

### Quality & Performance
- As a user, I want adaptive quality so streams work well on my connection
- As a user, I want to control stream resolution to manage battery and data usage
- As a user, I want low latency so interactions feel responsive
- As a user, I want reliable streaming that doesn't crash or freeze

## Technical Requirements

### Screen Sharing Technology
- **Screen capture API** for iOS (ReplayKit) and Android (MediaProjection)
- **Real-time video encoding** (H.264/H.265)
- **WebRTC integration** for low-latency streaming
- **Audio capture** from system and microphone mixing

### Streaming Infrastructure
```typescript
// StreamingService.ts
export class StreamingService {
  async startScreenShare(options: StreamOptions): Promise<Stream>;
  async stopStream(): Promise<void>;
  async joinStream(streamId: string): Promise<StreamConnection>;
  async leaveStream(): Promise<void>;
  async updateStreamQuality(quality: VideoQuality): Promise<void>;
}

// Screen capture integration
const streamOptions: StreamOptions = {
  resolution: '720p',
  frameRate: 30,
  bitrate: '2.5Mbps',
  includeAudio: true,
  allowSystemAudio: false // iOS limitation
};
```

### Stream Types
1. **Screen Sharing**: Full device screen with app switching
2. **App Streaming**: Single app focus (iOS 15+ screen recording)
3. **Camera Streaming**: Front/back camera with overlays
4. **Game Streaming**: Optimized for mobile gaming performance
5. **Watch Party**: Synchronized video playback with chat

### Quality Adaptive Streaming
- **Multiple bitrates**: 480p@15fps, 720p@30fps, 1080p@30fps
- **Automatic quality adjustment** based on network conditions
- **Manual quality selection** for user preference
- **Bandwidth monitoring** with real-time adjustments

## Implementation Details

### Phase 1: Core Screen Capture (Week 1-4)
```typescript
// iOS ReplayKit integration
import { RPScreenRecorder } from 'react-native-replay-kit';

const recorder = new RPScreenRecorder();
await recorder.startCapture({
  microphoneEnabled: true,
  cameraEnabled: false,
  resolution: 'HD'
});

// Android MediaProjection
import { MediaProjectionService } from 'react-native-media-projection';

const projection = await MediaProjectionService.requestPermission();
await projection.startCapture(screenCaptureConfig);
```

### Phase 2: Streaming Pipeline (Week 5-7)
- **WebRTC peer connections** for real-time streaming
- **Media server integration** (SFU - Selective Forwarding Unit)
- **Stream relay** for multiple viewers
- **Quality adaptation** algorithms

### Phase 3: Interactive Features (Week 8-10)
- **Real-time chat overlay** during streams
- **Emoji reactions** with floating animations
- **Viewer list** with join/leave notifications
- **Stream moderation** tools

### Phase 4: Discovery & Optimization (Week 11-12)
- **Stream browser** with categories and search
- **Performance optimization** for battery life
- **Network optimization** for various connection types
- **Analytics dashboard** for streamers

## Platform Considerations

### iOS Limitations
- **ReplayKit restrictions**: No system audio capture in most apps
- **App Store guidelines**: Screen recording permissions required
- **Background limitations**: Streaming may pause when backgrounded
- **Battery optimization**: iOS may throttle during extended streaming

### Android Advantages
- **Full system audio**: Capture game sounds and music
- **MediaProjection API**: More flexible screen capture
- **Background streaming**: Better multitasking support
- **Custom quality controls**: More granular settings

### Cross-Platform Solutions
- **Unified API** abstracting platform differences
- **Fallback mechanisms** for unsupported features
- **Platform-specific optimizations**
- **Consistent user experience** despite technical limitations

## Security & Privacy

### Permission Management
- **Screen recording permissions** with clear explanations
- **Microphone access** for commentary
- **Camera access** for facecam overlays
- **User consent** for each stream session

### Content Protection
- **DRM content blocking** (Netflix, etc.)
- **Sensitive app detection** (banking, private messaging)
- **Auto-pause for notifications** containing private info
- **Stream recording controls** and user consent

### Privacy Controls
- **Private streams** (invitation-only)
- **Viewer blocking** and moderation
- **Content filtering** for inappropriate streams
- **COPPA compliance** for underage users

## Dependencies

### External Libraries
- **react-native-webrtc**: Real-time communication
- **react-native-replay-kit**: iOS screen recording
- **react-native-media-projection**: Android screen capture
- **@livekit/react-native**: Enhanced WebRTC features

### Backend Infrastructure
- **Media server** (Janus, Kurento, or custom SFU)
- **CDN integration** for stream distribution
- **Recording service** for stream playback
- **Analytics service** for performance monitoring

## Performance & Battery

### Optimization Strategies
- **Hardware encoding**: Use device GPU when available
- **Adaptive bitrate**: Reduce quality during battery/thermal constraints
- **Background efficiency**: Minimize CPU usage when not active streaming
- **Memory management**: Efficient buffer allocation and cleanup

### Battery Life Impact
- **Streaming duration**: Target 2+ hours continuous streaming
- **Thermal management**: Auto-quality reduction when overheating
- **Battery level warnings**: Suggest quality reduction at <20%
- **Power saving mode**: Reduced quality for extended streaming

## Testing Strategy

### Functional Tests
- Screen capture on various devices
- Multi-platform streaming compatibility
- Quality adaptation algorithms
- Interactive feature responsiveness

### Performance Tests
- Battery drain measurements
- Memory usage profiling
- Network bandwidth optimization
- Latency measurements

### Stress Tests
- Multiple concurrent streams
- Extended streaming sessions
- Poor network conditions
- High viewer count scenarios

## Accessibility

### Visual Accessibility
- **Screen reader support** for streaming controls
- **High contrast mode** for overlay UI
- **Closed captions** for stream audio (future enhancement)
- **Visual indicators** for audio-only content

### Motor Accessibility
- **Voice commands** for stream controls
- **Gesture alternatives** for all touch interactions
- **Switch control** support for navigation
- **Simplified UI mode** for easier interaction

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| App Store rejection | High | Careful permission handling + compliance review |
| Patent infringement | Medium | Use well-established open source solutions |
| Performance issues | High | Extensive device testing + optimization |
| Network scaling costs | Medium | Efficient CDN usage + P2P when possible |

## Success Criteria

### Technical
- ✅ <2s stream start time on WiFi
- ✅ <500ms end-to-end latency
- ✅ 95% uptime for streaming service
- ✅ Support for 100+ concurrent viewers per stream

### User Experience
- ✅ 90% user satisfaction with stream quality
- ✅ 25% of users try streaming within 30 days
- ✅ Average 4+ concurrent viewers per stream
- ✅ <5% stream abandonment due to technical issues

### Business Impact
- ✅ 40% increase in session duration during streams
- ✅ 50% increase in community engagement
- ✅ New revenue opportunities through premium features
- ✅ Competitive parity with Discord streaming

## Timeline

**Total Duration**: 12 weeks

- **Week 1-2**: Screen capture research and permissions
- **Week 3-4**: Basic screen sharing implementation
- **Week 5-6**: WebRTC streaming pipeline
- **Week 7-8**: Quality adaptation and optimization
- **Week 9-10**: Interactive features (chat, reactions)
- **Week 11**: Stream discovery and browsing
- **Week 12**: Testing, polish, and launch preparation

**Launch Date**: December 15, 2026

## Future Enhancements

### Post-Launch Features
- **Co-streaming**: Multiple people streaming together
- **Virtual backgrounds**: Green screen effects for camera
- **Stream recording**: Save and replay streams
- **Monetization**: Tips, subscriptions, premium features
- **Advanced moderation**: AI content filtering
- **Cross-platform streaming**: Stream mobile to desktop viewers