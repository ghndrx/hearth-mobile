# Hearth Mobile Task Queue

> **Last Updated**: 2026-03-30
> **Priority Levels**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

## Current Sprint Focus
**Discord Parity Initiative** - Closing critical mobile UX gaps to compete with Discord mobile app

---

## P0 Tasks (Critical - Complete within 2 weeks)

### Enhanced Mobile Gesture System
- [ ] **HM-001**: Implement swipe-to-reply gesture with haptic feedback
  - **Owner**: Mobile Team Lead
  - **Est**: 5 days
  - **Dependencies**: React Native Gesture Handler v2.x upgrade
  - **Acceptance**: Swipe right on message triggers reply modal with smooth animation

- [ ] **HM-002**: Add long-press context menus for messages
  - **Owner**: UI/UX Engineer
  - **Est**: 3 days
  - **Dependencies**: HM-001
  - **Acceptance**: Long press shows context menu with reply, react, copy, delete options

- [ ] **HM-003**: Implement pull-to-refresh for message lists
  - **Owner**: Mobile Team Lead
  - **Est**: 2 days
  - **Dependencies**: None
  - **Acceptance**: Pull down refreshes messages with custom loading indicator

### Rich Notification Actions
- [ ] **HM-004**: Enable reply-from-notification functionality
  - **Owner**: Notifications Engineer
  - **Est**: 8 days
  - **Dependencies**: Background task system enhancement
  - **Acceptance**: Users can reply to messages directly from iOS/Android notifications

- [ ] **HM-005**: Add mark-as-read action to notifications
  - **Owner**: Notifications Engineer
  - **Est**: 3 days
  - **Dependencies**: HM-004
  - **Acceptance**: Mark as read button in notifications updates channel state

---

## P1 Tasks (High Priority - Complete within 4 weeks)

### Advanced Threading System
- [ ] **HM-006**: Implement basic thread creation from messages
  - **Owner**: Backend Engineer + Mobile Engineer
  - **Est**: 10 days
  - **Dependencies**: Thread data model design
  - **Acceptance**: Users can create threads from any message with title and participants

- [ ] **HM-007**: Add thread indicators in channel view
  - **Owner**: UI/UX Engineer
  - **Est**: 4 days
  - **Dependencies**: HM-006
  - **Acceptance**: Thread icon, participant count, and preview visible in channel

- [ ] **HM-008**: Build mobile-optimized thread navigation
  - **Owner**: Mobile Team Lead
  - **Est**: 6 days
  - **Dependencies**: HM-006, HM-007
  - **Acceptance**: Smooth navigation between channel and thread views

### Enhanced Gesture System (Continued)
- [ ] **HM-009**: Add swipe-left quick actions menu
  - **Owner**: Mobile Team Lead
  - **Est**: 4 days
  - **Dependencies**: HM-001, HM-002
  - **Acceptance**: Swipe left shows quick actions: react, copy, delete, report

- [ ] **HM-010**: Implement pinch-to-zoom for images and text
  - **Owner**: UI/UX Engineer
  - **Est**: 5 days
  - **Dependencies**: React Native Reanimated v3.x
  - **Acceptance**: Smooth pinch-to-zoom on images and text scaling

### Rich Notifications (Continued)
- [ ] **HM-011**: Add user avatars to notifications
  - **Owner**: Notifications Engineer
  - **Est**: 4 days
  - **Dependencies**: Image processing pipeline
  - **Acceptance**: User and server avatars display in notification content

- [ ] **HM-012**: Implement notification grouping by conversation
  - **Owner**: Notifications Engineer
  - **Est**: 6 days
  - **Dependencies**: Enhanced notification service
  - **Acceptance**: Related notifications group together, expandable on mobile

- [ ] **HM-013**: Add quick emoji reactions from notifications
  - **Owner**: Notifications Engineer + UI/UX Engineer
  - **Est**: 5 days
  - **Dependencies**: HM-004, HM-005
  - **Acceptance**: 6 quick emoji reactions available in notification actions

### Voice & Media Enhancements
- [ ] **HM-014**: Implement voice message recording with waveform display
  - **Owner**: Audio Engineer + Mobile Engineer
  - **Est**: 8 days
  - **Dependencies**: Audio processing library integration
  - **Acceptance**: Hold-to-record voice messages with visual waveform

- [ ] **HM-015**: Add in-app camera with basic filters
  - **Owner**: Mobile Team Lead + UI/UX Engineer
  - **Est**: 10 days
  - **Dependencies**: Camera permission handling, filter library
  - **Acceptance**: Built-in camera with 5 basic filters for photos/videos

### Social Features Foundation
- [ ] **HM-016**: Implement custom status system
  - **Owner**: Backend Engineer + UI/UX Engineer
  - **Est**: 7 days
  - **Dependencies**: User profile system enhancement
  - **Acceptance**: Users can set custom status with emoji and text

- [ ] **HM-017**: Add friend request and management system
  - **Owner**: Backend Engineer + Mobile Engineer
  - **Est**: 12 days
  - **Dependencies**: Social graph data model
  - **Acceptance**: Send/receive friend requests, friend list management

---

## P2 Tasks (Medium Priority - Complete within 8 weeks)

### Advanced Search & Discovery
- [ ] **HM-018**: Implement global search across servers and DMs
  - **Owner**: Search Engineer + Backend Engineer
  - **Est**: 15 days
  - **Dependencies**: Search indexing service
  - **Acceptance**: Search messages across all accessible channels and DMs

- [ ] **HM-019**: Add search filters (date, user, channel, file type)
  - **Owner**: Search Engineer + UI/UX Engineer
  - **Est**: 8 days
  - **Dependencies**: HM-018
  - **Acceptance**: Advanced search with multiple filter options

### Screen Sharing & Streaming
- [ ] **HM-020**: Implement screen sharing in voice calls
  - **Owner**: Video Engineer + Mobile Engineer
  - **Est**: 20 days
  - **Dependencies**: WebRTC screen sharing capabilities
  - **Acceptance**: Share screen during voice/video calls on mobile

- [ ] **HM-021**: Add picture-in-picture mode for calls
  - **Owner**: Mobile Team Lead + Video Engineer
  - **Est**: 8 days
  - **Dependencies**: Platform PiP APIs, HM-020
  - **Acceptance**: Calls continue in PiP mode when app backgrounded

### Theme & Customization System
- [ ] **HM-022**: Build comprehensive theme system
  - **Owner**: UI/UX Engineer + Mobile Engineer
  - **Est**: 12 days
  - **Dependencies**: Design system enhancement
  - **Acceptance**: Multiple themes (light, dark, AMOLED, custom colors)

- [ ] **HM-023**: Add per-server custom themes
  - **Owner**: UI/UX Engineer
  - **Est**: 6 days
  - **Dependencies**: HM-022
  - **Acceptance**: Different themes can be applied to different servers

### Bot Integration Enhancements
- [ ] **HM-024**: Implement rich embed rendering for bots
  - **Owner**: Mobile Engineer + Backend Engineer
  - **Est**: 10 days
  - **Dependencies**: Rich content rendering system
  - **Acceptance**: Proper display of bot embeds with buttons and interactive components

- [ ] **HM-025**: Add slash command autocomplete
  - **Owner**: Mobile Engineer + Backend Engineer
  - **Est**: 7 days
  - **Dependencies**: Bot command indexing
  - **Acceptance**: Native autocomplete for slash commands with descriptions

---

## P3 Tasks (Low Priority - Complete within 12 weeks)

### Gaming Integration
- [ ] **HM-026**: Implement rich presence for mobile games
- [ ] **HM-027**: Add game streaming capabilities
- [ ] **HM-028**: Build tournament bracket management

### Advanced Productivity
- [ ] **HM-029**: Message scheduling system
- [ ] **HM-030**: Message templates and quick replies
- [ ] **HM-031**: Personal notes on users/servers

### Accessibility Enhancements
- [ ] **HM-032**: Advanced voice-over support
- [ ] **HM-033**: High contrast theme options
- [ ] **HM-034**: Motor accessibility improvements

---

## Backlog Items

### Performance Optimizations
- Message virtualization for large channels
- Image lazy loading optimization
- Battery usage optimization
- Memory management improvements

### Platform-Specific Features
- iOS Shortcuts app integration
- Android adaptive icons
- Apple Watch / WearOS companion
- CarPlay / Android Auto support

### Advanced Moderation
- AI-powered content filtering
- Bulk moderation actions
- Advanced audit logging
- User behavior analytics

---

## Sprint Planning Notes

### Current Capacity
- **Mobile Team Lead**: 40h/week
- **UI/UX Engineer**: 40h/week
- **Notifications Engineer**: 32h/week
- **Backend Engineer**: 40h/week
- **Audio Engineer**: 20h/week (shared resource)
- **Video Engineer**: 20h/week (shared resource)

### Blockers & Dependencies
- React Native Gesture Handler v2.x upgrade needed for gesture system
- WebRTC infrastructure upgrade required for screen sharing
- Image processing pipeline needs optimization for notification avatars
- Background task system enhancement for notification actions

### Success Metrics Tracking
- **User Engagement**: Target 25% increase in daily active users
- **Feature Adoption**: Target 70% adoption of new gesture features within 30 days
- **Performance**: Maintain <3s app startup time, <100ms gesture response
- **Quality**: Target <2% crash rate, >4.5/5 app store rating

---

## Risk Assessment

### High Risk Items
- **HM-006**: Threading system complexity might impact existing message performance
- **HM-020**: Screen sharing on mobile has platform limitations
- **HM-004**: Background notification actions have iOS/Android policy restrictions

### Medium Risk Items
- **HM-014**: Audio processing might drain battery significantly
- **HM-015**: Camera filters might not work consistently across devices
- **HM-017**: Friend system might require significant privacy considerations

### Mitigation Strategies
- Incremental rollouts with feature flags for all major features
- Performance monitoring and automatic rollback triggers
- A/B testing for UX changes with >10% user impact
- Regular security and privacy audits for social features