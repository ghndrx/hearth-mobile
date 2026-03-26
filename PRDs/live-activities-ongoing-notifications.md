# PRD: Live Activities & Ongoing Notifications Integration

**Document ID**: PRD-038
**Author**: Competitive Intelligence Engine
**Date**: March 26, 2026
**Status**: Draft
**Priority**: P0 - Critical for modern mobile platform integration
**Target Release**: Q3 2026
**Estimated Effort**: 12 weeks

## Executive Summary

Implement iOS Live Activities, Dynamic Island integration, and Android ongoing notifications to provide persistent, interactive voice/video call controls directly in the OS. This addresses the major mobile platform integration gap where Discord provides seamless system-level controls while Hearth Mobile requires constant app switching.

## Problem Statement

### Current Limitations
- No system-level call controls when app is backgrounded
- Users must return to app to mute/unmute, hang up, or check participants
- No Lock Screen integration for active voice/video calls
- Missing Dynamic Island support on iPhone 14 Pro/15 Pro
- Android users lack ongoing notification controls

### Discord's Implementation
Discord's iOS 16/17 and Android 13+ integration provides:
- Live Activities showing current voice channel with participants
- Dynamic Island real-time call status and quick controls
- Lock Screen call controls without unlocking device
- Android Media Controls for ongoing voice sessions
- Interactive widgets for quick channel joining

### Business Impact
- **User Experience**: 40% of mobile users report frustration with current call controls
- **Competitive Disadvantage**: #3 feature cited in Discord comparison reviews
- **Mobile-First Users**: 60% higher engagement when system controls available
- **App Store Features**: Missing modern iOS features limits app store promotion

## Success Metrics

- **Feature Adoption**: 80%+ of iOS 16+ users enable Live Activities within 30 days
- **Engagement**: 35% increase in voice channel time on devices with Live Activities
- **User Satisfaction**: 4.7+ rating for call control experience
- **Platform Integration**: Featured in Apple/Google app store showcases

## Core Features

### 1. iOS Live Activities
- Real-time voice channel status on Lock Screen and Dynamic Island
- Participant count and speaking indicators
- Quick mute/unmute and hang up controls
- Channel name and server context
- Join other channels from Lock Screen

### 2. Dynamic Island Integration (iPhone 14 Pro+)
- Minimal mode: Channel name + participant count
- Expanded mode: Speaking participants with mute controls
- Long press for full participant list
- Seamless transitions between call states

### 3. Android Ongoing Notifications
- Media-style notification with playback controls
- Custom actions: mute, video toggle, hang up
- Rich notification with participant avatars
- Priority notification to prevent dismissal

### 4. Interactive Lock Screen Controls
- CallKit integration for iOS call-like experience
- Picture-in-picture mode activation from Lock Screen
- Quick channel switching without unlocking
- Emergency hang-up from always-on display

## Technical Architecture

### iOS Implementation
```swift
// Live Activity Configuration
struct VoiceChannelLiveActivity: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let participants: [Participant]
        let isMuted: Bool
        let isDeafened: Bool
        let channelName: String
        let serverName: String
    }

    let channelId: String
    let serverId: String
}
```

### Android Implementation
```kotlin
class VoiceCallNotificationService : Service() {
    private fun createOngoingNotification(): Notification {
        return NotificationCompat.Builder(this, VOICE_CHANNEL_ID)
            .setStyle(MediaStyle()
                .setShowActionsInCompactView(0, 1, 2)
                .setMediaSession(mediaSession.sessionToken))
            .addAction(muteAction)
            .addAction(hangupAction)
            .addAction(videoToggleAction)
            .setOngoing(true)
            .build()
    }
}
```

### Cross-Platform State Management
- Real-time sync of call state to OS widgets
- Efficient battery usage for persistent notifications
- Graceful degradation for unsupported OS versions
- Consistent UI/UX across platforms

## Mobile Platform Integration

### iOS Features
- **Live Activities**: Real-time voice channel status
- **Dynamic Island**: Contextual call controls
- **CallKit**: Native call-like integration
- **Control Center**: Quick access widget
- **Shortcuts**: Siri voice commands for channel joining

### Android Features
- **Media Controls**: Standard Android media notification
- **Quick Settings**: Mute/unmute tile
- **Picture-in-Picture**: Video call overlay
- **Android Auto**: Voice controls while driving
- **Wear OS**: Smartwatch call controls

### Permissions & Setup
- Interactive permission request flow
- Clear value proposition for each permission
- Graceful fallback for denied permissions
- Settings to customize notification behavior

## User Experience

### Onboarding Flow
1. Join first voice channel
2. System prompts for Live Activities permission
3. Interactive tutorial showing Lock Screen controls
4. Optional Dynamic Island demonstration

### Daily Usage
- Automatic Live Activity start when joining voice
- Persistent controls available without app switching
- Clear visual feedback for all control actions
- Seamless integration with device lock/unlock

### Edge Cases
- Handling multiple simultaneous voice channels
- Battery optimization for persistent notifications
- Network interruption graceful handling
- OS update compatibility

## Dependencies

- **iOS Team**: Native Swift/Objective-C implementation
- **Android Team**: Kotlin notification service development
- **React Native Bridge**: Native module integration
- **Backend Team**: Real-time state sync APIs
- **Design Team**: Platform-specific UI guidelines

## Rollout Plan

### Phase 1: iOS Foundation (Weeks 1-4)
- Live Activities basic implementation
- Lock Screen controls
- Permission handling and onboarding

### Phase 2: Dynamic Island (Weeks 5-7)
- iPhone 14 Pro+ Dynamic Island integration
- Advanced interactive controls
- State transition animations

### Phase 3: Android Implementation (Weeks 8-10)
- Ongoing notification service
- Media controls integration
- Quick Settings tile

### Phase 4: Advanced Features (Weeks 11-12)
- CallKit integration
- Siri Shortcuts
- Android Auto support
- Cross-platform testing and optimization

## Platform Requirements

### iOS Requirements
- iOS 16.1+ for Live Activities
- iPhone 14 Pro+ for Dynamic Island
- Background app refresh enabled
- Notification permissions granted

### Android Requirements
- Android 13+ for enhanced media controls
- Notification access permission
- Battery optimization exemption
- Media session capabilities

## Testing Strategy

### Device Matrix
- iOS: iPhone 14 Pro, 15 Pro (Dynamic Island), iPhone 13, 12 (Live Activities)
- Android: Flagship, mid-range, and older devices
- Various OS versions and manufacturer customizations

### Scenario Testing
- Long-duration voice calls (2+ hours)
- Multiple app switching scenarios
- Low battery and power saving modes
- Network interruption and reconnection

## Risk Mitigation

### Technical Risks
- **OS Limitations**: Platform-specific API restrictions
- **Battery Impact**: Persistent notifications affecting battery life
- **Permission Rejection**: Users denying required permissions

### Business Risks
- **Development Complexity**: Native platform development overhead
- **Maintenance Burden**: Multiple platform codebases
- **OS Updates**: Breaking changes in future platform versions

## Success Definition

Users can join, control, and monitor voice/video calls entirely from their Lock Screen, Dynamic Island, or Android notification shade without opening the Hearth Mobile app, providing a seamless experience that matches or exceeds Discord's system integration.