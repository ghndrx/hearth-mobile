# PRD-008: Live Activities & iOS Dynamic Island Integration

**Product**: Hearth Mobile  
**Document**: PRD-008  
**Created**: April 6, 2026  
**Owner**: Mobile Team  
**Priority**: P1 (High)  

## Overview

Implement cutting-edge iOS Live Activities and Dynamic Island integration to provide persistent, glanceable information about ongoing voice calls, active channels, and real-time messaging directly in the iOS system UI, creating a premium mobile experience beyond Discord's current capabilities.

## Problem Statement

Hearth Mobile lacks integration with modern iOS system features like Live Activities and Dynamic Island, missing opportunities to provide always-visible status updates and quick actions. Without these integrations, users must switch back to the app to check voice call status, message activity, or ongoing conversations, creating friction compared to native iOS experiences.

## Success Metrics

- **iOS Live Activities adoption**: 60% of iOS users enable Live Activities within 30 days
- **Dynamic Island engagement**: 40% of iPhone 14+ users interact with Dynamic Island controls
- **Reduced app switching**: 25% decrease in app switches during voice calls
- **User satisfaction**: >4.6/5.0 rating for iOS integration features
- **Feature discovery**: 80% of eligible users discover Live Activities through onboarding

## User Stories

### Live Activities for Voice Calls
- **As a user**, I want voice call status visible on my Lock Screen so I can see who's talking without unlocking
- **As a user**, I want mute/unmute controls accessible from the Lock Screen so I can quickly manage my audio
- **As a user**, I want to see call duration and participant count at a glance
- **As a user**, I want visual indicators for speaking participants even when my phone is locked

### Dynamic Island Integration
- **As a user**, I want ongoing voice calls to appear in the Dynamic Island so I can monitor call status while multitasking
- **As a user**, I want quick mute controls in the Dynamic Island without opening the app
- **As a user**, I want to see when others are speaking through subtle Dynamic Island animations
- **As a user**, I want tap-to-return functionality to quickly rejoin active conversations

### Live Activities for Messaging
- **As a user**, I want active DM conversations to show real-time typing indicators on the Lock Screen
- **As a user**, I want important channel notifications to persist as Live Activities until acknowledged
- **As a user**, I want quick reply functionality directly from Live Activities
- **As a user**, I want to see message previews in Live Activities while respecting my privacy settings

### Contextual Live Activities
- **As a user**, I want scheduled events (like voice meetings) to countdown in Live Activities
- **As a user**, I want file upload progress to be visible as persistent activities
- **As a user**, I want group call invitations to appear as actionable Live Activities
- **As a user**, I want screen sharing sessions to show participant info in the system UI

## Technical Requirements

### iOS Live Activities Framework
- iOS 16.1+ Live Activities implementation using ActivityKit
- Widget Extension for Lock Screen and Notification Center display
- Real-time data updates using push notifications with alert payloads
- Background app refresh integration for activity lifecycle management
- Dynamic content updates with efficient battery usage

### Dynamic Island Integration
- iPhone 14+ Dynamic Island support using Live Activities
- Compact, minimal, and expanded state designs
- Touch interactions and gesture recognition within Dynamic Island
- Seamless animations and state transitions
- Background audio session coordination

### Real-Time Data Pipeline
- Push notification infrastructure for Live Activity updates
- Efficient data serialization for activity payloads
- Rate limiting and batching for frequent updates
- Fallback mechanisms for push delivery failures
- Cross-platform coordination for activity state

### Performance Optimization
- Minimal battery impact through efficient update patterns
- Background processing compliance with iOS limitations
- Smart activity lifecycle management (start, update, end)
- Memory optimization for persistent UI elements
- Network efficiency for real-time updates

## Design Requirements

### Live Activity Lock Screen Design
- Clear visual hierarchy with essential information prioritized
- Platform-consistent design language following iOS Human Interface Guidelines
- Dark/Light mode support with automatic adaptation
- Accessibility-compliant layouts with proper contrast and sizing
- Minimal design to avoid visual clutter on Lock Screen

### Dynamic Island States
- **Compact**: Essential status indicator (active call, mute status)
- **Minimal**: Participant count and call duration
- **Expanded**: Full controls (mute, camera, participants, end call)
- Smooth transitions between states with appropriate animations
- Touch targets optimized for Dynamic Island interaction patterns

### Live Activity Content
- Contextual information hierarchy based on activity type
- Real-time visual feedback for speaking participants
- Privacy-conscious design that respects notification settings
- Consistent interaction patterns across different activity types
- Clear visual indicators for available actions

## Architecture

### Live Activities System
```
LiveActivityManager
├── ActivityController (lifecycle management and state coordination)
├── ContentProvider (data serialization for activity updates)
├── UpdateScheduler (efficient batching and timing of updates)
├── InteractionHandler (user action processing from system UI)
└── PrivacyFilter (content filtering based on user settings)

Dynamic Island Integration
├── IslandStateManager (compact/minimal/expanded state handling)
├── AnimationCoordinator (smooth transitions and visual feedback)
├── TouchInteractionHandler (gesture recognition in Dynamic Island)
└── SystemAudioCoordinator (background call integration)
```

### iOS Integration Points
- ActivityKit for Live Activities creation and management
- UserNotifications for push-based activity updates
- CallKit integration for voice call presentation
- Background App Refresh for activity lifecycle
- Widget Extension for Lock Screen presentation

## Implementation Plan

### Phase 1: Live Activities Foundation (4 weeks)
- **Week 1**: ActivityKit integration and basic Live Activity infrastructure
- **Week 2**: Voice call Live Activities with basic status display
- **Week 3**: Lock Screen controls for mute/unmute and call management
- **Week 4**: Real-time updates via push notifications

### Phase 2: Dynamic Island Integration (3 weeks)
- **Week 1**: Dynamic Island compact and minimal states for voice calls
- **Week 2**: Expanded Dynamic Island state with full controls
- **Week 3**: Touch interactions and animation polish

### Phase 3: Messaging Live Activities (4 weeks)
- **Week 1-2**: DM conversation Live Activities with typing indicators
- **Week 3**: Channel notification Live Activities for important updates
- **Week 4**: Quick reply functionality from Live Activities

### Phase 4: Advanced Features (3 weeks)
- **Week 1**: Scheduled event countdown and meeting reminders
- **Week 2**: File upload progress and media sharing activities
- **Week 3**: Performance optimization and battery efficiency

## iOS-Specific Considerations

### Device Compatibility
- iPhone 14+ for Dynamic Island features
- iOS 16.1+ for Live Activities support
- Graceful degradation for unsupported devices
- Feature detection and appropriate fallback experiences
- Testing across all supported iPhone models and iOS versions

### System Integration
- CallKit integration for voice call presentation in system UI
- AudioSession coordination for background audio handling
- Focus mode respect and intelligent activity suppression
- Handoff support for activity continuation across devices
- Siri Shortcuts integration for voice control of activities

### Privacy and Security
- Respect for user notification and privacy settings
- Content filtering for sensitive conversations
- Secure data handling in Widget Extension process
- Encryption for activity content in push payloads
- User control over Live Activity permissions and content

## Dependencies

### Technical Dependencies
- iOS 16.1+ deployment target for Live Activities
- ActivityKit framework integration
- Enhanced push notification infrastructure
- Widget Extension development and code signing
- CallKit integration for voice call coordination

### Team Dependencies
- iOS team: Native ActivityKit implementation and system integration
- Backend team: Push notification infrastructure for real-time updates
- Design team: iOS Human Interface Guidelines compliant designs
- QA team: Comprehensive testing across iPhone models and iOS versions

## Risks and Mitigations

### Technical Risks
- **iOS version fragmentation**: Graceful degradation for unsupported devices
- **Battery impact**: Efficient update patterns and background processing limits
- **Push notification reliability**: Fallback mechanisms and retry logic
- **Dynamic Island interaction complexity**: Thorough testing and user feedback

### Design Risks
- **Information overload**: Minimal design with clear information hierarchy
- **Privacy concerns**: Conservative defaults and granular user control
- **Accessibility compliance**: Full VoiceOver support and proper contrast ratios

## Testing Strategy

### Device Testing
- Comprehensive testing across iPhone models (12, 13, 14, 15 series)
- iOS version compatibility testing (16.1+)
- Dynamic Island specific testing on iPhone 14+ models
- Live Activity behavior testing across different system states
- Battery impact assessment and optimization validation

### Integration Testing
- CallKit integration with Live Activities coordination
- Focus mode and Do Not Disturb interaction testing
- Cross-app activity behavior and conflict resolution
- Push notification delivery and Live Activity update reliability

## Success Criteria

### MVP Success (Phase 2)
- [ ] Voice call Live Activities functional on iOS 16.1+
- [ ] Dynamic Island integration working on iPhone 14+
- [ ] 40% of eligible users try Live Activities
- [ ] <5% additional battery usage during voice calls with Live Activities

### Full Launch Success (Phase 4)
- [ ] 60% Live Activities adoption within 30 days
- [ ] 40% Dynamic Island engagement rate
- [ ] >4.6/5.0 rating for iOS integration features
- [ ] 25% reduction in app switching during voice calls
- [ ] Zero crashes related to Live Activities or Dynamic Island

## Competitive Analysis

**Discord Limitations:**
- No Live Activities support as of early 2026
- Limited Dynamic Island integration
- Basic iOS system integration compared to platform potential
- Generic notification experience without iOS-specific enhancements

**Hearth Mobile Advantages:**
- First-to-market with comprehensive Live Activities for team communication
- Premium iOS experience with full Dynamic Island utilization
- Native iOS integration that feels built for the platform
- Enhanced user experience for iOS power users and professionals
- Potential for App Store featuring due to innovative iOS integration

**Market Opportunity:**
- Differentiate from Discord through superior iOS integration
- Appeal to iOS-first users who value native platform experiences
- Demonstrate commitment to platform-specific optimization
- Create buzz through innovative use of newest iOS features
- Establish Hearth as the premium iOS communication app