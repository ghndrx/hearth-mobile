# PRD-003: Voice and Video Calling System

**Product**: Hearth Mobile  
**Document**: PRD-003  
**Created**: April 6, 2026  
**Owner**: Mobile Team  
**Priority**: P0 (Critical)  

## Overview

Implement comprehensive voice and video calling capabilities to achieve competitive parity with Discord. This represents the largest feature gap between Hearth Mobile and Discord's mobile offering.

## Problem Statement

Hearth Mobile currently lacks voice and video calling functionality, representing a critical competitive disadvantage. Discord users expect high-quality voice/video capabilities across all communication channels, making this a P0 requirement for market entry.

## Success Metrics

- **Voice call quality**: >4.0/5.0 user rating for call quality
- **Connection success rate**: >98% successful call establishment  
- **Latency**: <150ms voice latency in optimal conditions
- **Adoption**: 60% of active users use voice features within 30 days
- **Video quality**: Support for 720p video calls with adaptive quality

## User Stories

### Core Voice Calling
- **As a user**, I want to start voice calls in any channel or DM so I can communicate more naturally
- **As a user**, I want push-to-talk functionality with haptic feedback so I can control when I'm heard
- **As a user**, I want background voice calling so I can multitask while staying connected
- **As a user**, I want Bluetooth headset integration so I can use my preferred audio devices

### Video Calling  
- **As a user**, I want 1:1 and group video calls so I can see people while talking
- **As a user**, I want to switch between front/rear camera during calls
- **As a user**, I want screen sharing capability so I can show my mobile screen
- **As a user**, I want picture-in-picture mode so I can use other apps during video calls

### Mobile Optimization
- **As a user**, I want automatic quality adjustment based on my connection so calls remain stable
- **As a user**, I want spatial audio in group calls so I can distinguish between speakers
- **As a user**, I want intelligent audio routing between speakers and headphones

## Technical Requirements

### Voice Infrastructure
- WebRTC implementation for peer-to-peer audio
- Opus codec for high-quality, low-bandwidth audio
- Echo cancellation and noise suppression
- Voice activity detection with sensitivity controls
- Support for 50+ users in voice channels

### Video Infrastructure  
- H.264/VP8 video encoding with mobile optimization
- Adaptive bitrate streaming based on connection quality
- Picture-in-picture (PiP) support for iOS/Android
- Screen sharing with audio capture
- Group video calls (up to 25 participants)

### Mobile-Specific Features
- Background processing for voice calls
- Proximity sensor integration for earpiece switching
- Haptic feedback for push-to-talk
- Battery optimization for extended calls
- Integration with device audio settings

### Performance Requirements
- Voice latency: <150ms in optimal conditions (<300ms acceptable)
- Video latency: <200ms for real-time feel
- CPU usage: <15% during voice calls, <25% during video
- Battery impact: <10% per hour for voice, <20% per hour for video
- Memory usage: <50MB additional during active calls

## Design Requirements

### Voice Call UI
- Minimalist interface with large, thumb-friendly controls
- Visual indicators for voice activity and connection quality
- Quick mute/unmute with haptic confirmation
- Easy camera toggle for switching to video mid-call

### Video Call UI
- Adaptive layout for different screen sizes and orientations
- Floating video windows with drag-to-reposition
- Easy camera switching and effect controls
- Screen sharing controls with annotation support

### Accessibility
- Full VoiceOver/TalkBack support for visually impaired users
- Large button mode for users with motor difficulties
- High contrast mode support
- Voice command integration

## Architecture

### Client Components
```
VoiceVideoService
├── AudioEngine (WebRTC audio processing)
├── VideoEngine (WebRTC video processing)  
├── CallManager (call state management)
├── MediaDeviceManager (camera/microphone control)
└── QualityManager (adaptive bitrate/quality)

UI Components
├── CallScreen (active call interface)
├── IncomingCallOverlay (incoming call notifications)
├── CallControls (mute, camera, effects)
└── ParticipantViews (user video tiles)
```

### Server Components
- Signaling server for call initiation and coordination
- TURN servers for NAT traversal
- Media relay servers for poor network conditions
- Call analytics and quality monitoring

## Implementation Plan

### Phase 1: Basic Voice Calling (6 weeks)
- **Week 1-2**: WebRTC integration and basic audio pipeline
- **Week 3-4**: Call signaling and connection management
- **Week 5-6**: Mobile-optimized UI and basic controls

### Phase 2: Advanced Voice Features (4 weeks)
- **Week 1-2**: Push-to-talk, background calling, Bluetooth support
- **Week 3-4**: Noise suppression, echo cancellation, quality optimization

### Phase 3: Video Calling (6 weeks)
- **Week 1-3**: Video pipeline and 1:1 video calls
- **Week 4-5**: Group video calls and screen sharing
- **Week 6**: Picture-in-picture and mobile optimizations

### Phase 4: Polish & Optimization (4 weeks)
- **Week 1-2**: Performance optimization and battery efficiency
- **Week 3-4**: Accessibility features and edge case handling

## Dependencies

### Technical Dependencies
- WebRTC SDK integration (React Native WebRTC)
- Signaling server infrastructure
- TURN/STUN server deployment
- Push notification system (for incoming calls)
- Media server infrastructure

### Team Dependencies
- Backend team: Signaling server and media infrastructure
- Infrastructure team: TURN servers and global deployment  
- Design team: Mobile-optimized call interfaces
- QA team: Cross-device testing and performance validation

## Risks and Mitigations

### Technical Risks
- **Network reliability**: Implement adaptive quality and fallback mechanisms
- **Battery drain**: Optimize audio/video processing and implement smart power management
- **Device compatibility**: Comprehensive testing across Android/iOS devices
- **Latency issues**: Global TURN server deployment and quality monitoring

### Business Risks
- **Development timeline**: Aggressive 20-week timeline requires parallel workstreams
- **Resource requirements**: Significant infrastructure and development investment
- **User expectations**: High bar set by Discord and other established platforms

## Security Considerations

- End-to-end encryption for all voice/video data
- Secure key exchange for media encryption
- Privacy controls for recording and screen sharing
- Audit logging for administrative oversight

## Success Criteria

### MVP Success (Phase 1)
- [ ] Users can make/receive voice calls in channels and DMs
- [ ] Voice quality rated >3.5/5.0 in user testing
- [ ] <5% call failure rate
- [ ] Background calling works reliably

### Full Launch Success (Phase 4)
- [ ] Complete voice/video feature parity with Discord core features
- [ ] Voice quality rated >4.0/5.0 in user testing  
- [ ] <2% call failure rate
- [ ] 60% of users try voice features within 30 days
- [ ] <10% battery drain per hour for voice calls

## Competitive Analysis

**Discord Advantages:**
- Mature infrastructure with global server presence
- Advanced noise suppression and echo cancellation  
- Rich presence integration with gaming
- Established user expectations and behavior patterns

**Hearth Mobile Opportunities:**
- Focus on general communication vs gaming-centric features
- Enhanced privacy and security features
- Simpler, more intuitive mobile interface
- Better integration with productivity workflows