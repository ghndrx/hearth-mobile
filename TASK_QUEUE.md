# Hearth Mobile Task Queue

**Last Updated**: March 26, 2026
**Next Review**: April 7, 2026

## Legend
- **P0**: Critical - Must have for competitive parity
- **P1**: High - Important for user experience
- **P2**: Medium - Nice to have features
- **P3**: Low - Future considerations

## P0 Tasks (Critical Priority)

### Cross-Device Call Handoff & Continuity (PRD-036) 🔥
**Target**: Q3 2026 | **Owner**: Mobile + Backend Team | **Effort**: 8 weeks

- [ ] **CDH-001**: Real-time device discovery and registration
  - Estimated: 2 weeks
  - Dependencies: Enhanced WebSocket infrastructure
  - Success: Users can see all their active devices during calls

- [ ] **CDH-002**: Call state preservation and synchronization
  - Estimated: 2 weeks
  - Dependencies: CDH-001
  - Success: Call participant list, roles, and settings transfer seamlessly

- [ ] **CDH-003**: WebRTC connection migration engine
  - Estimated: 2 weeks
  - Dependencies: CDH-002
  - Success: Audio/video streams transfer without interruption

- [ ] **CDH-004**: One-tap handoff UI and fallback mechanisms
  - Estimated: 2 weeks
  - Dependencies: CDH-003
  - Success: <3 second handoff time with 98%+ success rate

### Intelligent Battery Optimization (PRD-037) 🔥
**Target**: Q2 2026 | **Owner**: Mobile + ML Team | **Effort**: 10 weeks

- [ ] **BAT-001**: Battery monitoring and power mode infrastructure
  - Estimated: 2 weeks
  - Dependencies: None
  - Success: Real-time power consumption tracking per feature

- [ ] **BAT-002**: Device-adaptive performance scaling engine
  - Estimated: 2 weeks
  - Dependencies: BAT-001
  - Success: Automatic performance optimization based on device capabilities

- [ ] **BAT-003**: Smart background processing optimization
  - Estimated: 2 weeks
  - Dependencies: BAT-002
  - Success: 95% reduction in unnecessary background activity

- [ ] **BAT-004**: ML-powered usage pattern analysis
  - Estimated: 3 weeks
  - Dependencies: BAT-003
  - Success: Predictive optimization based on user behavior

- [ ] **BAT-005**: User-configurable power management controls
  - Estimated: 1 week
  - Dependencies: BAT-004
  - Success: 45% battery drain reduction matching Discord performance

### Live Activities & Ongoing Notifications (PRD-038) 🔥
**Target**: Q3 2026 | **Owner**: iOS + Android Team | **Effort**: 12 weeks

- [ ] **LAO-001**: iOS Live Activities foundation and permissions
  - Estimated: 3 weeks
  - Dependencies: iOS 16.1+ support
  - Success: Basic voice channel status on Lock Screen

- [ ] **LAO-002**: Dynamic Island integration (iPhone 14 Pro+)
  - Estimated: 3 weeks
  - Dependencies: LAO-001
  - Success: Interactive call controls in Dynamic Island

- [ ] **LAO-003**: Android ongoing notification service
  - Estimated: 3 weeks
  - Dependencies: None (parallel development)
  - Success: Media-style notification with call controls

- [ ] **LAO-004**: Cross-platform state sync and optimization
  - Estimated: 3 weeks
  - Dependencies: LAO-001, LAO-003
  - Success: System-level controls work without opening app

### Mobile Permission-Based Access Control (PRD-035)
**Target**: Q2 2026 | **Owner**: Mobile + Backend Team | **Effort**: 6 weeks

- [ ] **MPAC-001**: Individual permission override database schema
  - Estimated: 1 week
  - Dependencies: None
  - Success: Per-user, per-channel permission storage

- [ ] **MPAC-002**: Permission evaluation engine updates
  - Estimated: 2 weeks
  - Dependencies: MPAC-001
  - Success: Correct permission hierarchy and evaluation

- [ ] **MPAC-003**: Mobile UI for permission management
  - Estimated: 2 weeks
  - Dependencies: MPAC-002
  - Success: Server admins can grant individual permissions

- [ ] **MPAC-004**: Temporary permission grants and expiration
  - Estimated: 1 week
  - Dependencies: MPAC-003
  - Success: Time-limited permissions with auto-expiry

### Push Notifications System (PRD-001)
**Target**: Q2 2026 | **Owner**: Mobile Team | **Effort**: 6 weeks

- [ ] **PN-001**: FCM/APNs integration and device registration
  - Estimated: 1 week
  - Dependencies: Firebase project setup
  - Success: Device token registration working

- [ ] **PN-002**: Basic push notification delivery pipeline
  - Estimated: 1 week
  - Dependencies: PN-001
  - Success: Can send/receive notifications

- [ ] **PN-003**: Permission handling and notification settings
  - Estimated: 1 week
  - Dependencies: PN-002
  - Success: Granular permission controls

- [ ] **PN-004**: Smart notification batching and grouping
  - Estimated: 1 week
  - Dependencies: PN-003
  - Success: Intelligent message grouping

- [ ] **PN-005**: Rich notifications with inline actions
  - Estimated: 1 week
  - Dependencies: PN-004
  - Success: Reply from notification works

- [ ] **PN-006**: Background processing and delivery optimization
  - Estimated: 1 week
  - Dependencies: PN-005
  - Success: 99%+ delivery rate

## P1 Tasks (High Priority)

### Rich Media & File Sharing (PRD-002)
**Target**: Q3 2026 | **Owner**: Mobile Team | **Effort**: 10 weeks

- [ ] **MS-001**: File upload infrastructure and basic image support
  - Estimated: 2 weeks
  - Dependencies: CDN setup
  - Success: Can upload/display images

- [ ] **MS-002**: Camera integration and photo capture
  - Estimated: 2 weeks
  - Dependencies: MS-001
  - Success: In-app photo capture working

- [ ] **MS-003**: Video upload and compression pipeline
  - Estimated: 2 weeks
  - Dependencies: MS-002
  - Success: Video sharing functional

- [ ] **MS-004**: Image editing tools (crop, filters, annotations)
  - Estimated: 2 weeks
  - Dependencies: MS-003
  - Success: Basic editing tools work

- [ ] **MS-005**: Document and file attachment support
  - Estimated: 1 week
  - Dependencies: MS-001
  - Success: PDF/DOC sharing works

- [ ] **MS-006**: GIF integration and search
  - Estimated: 1 week
  - Dependencies: MS-001
  - Success: Giphy integration functional

### Haptic Feedback & Advanced Mobile Gestures (PRD-004)
**Target**: Q2 2026 | **Owner**: Mobile Team | **Effort**: 8 weeks

- [ ] **HF-001**: Core haptic infrastructure and basic patterns
  - Estimated: 1 week
  - Dependencies: None
  - Success: Platform-specific haptic feedback working

- [ ] **HF-002**: Platform-specific optimizations (iOS Taptic Engine, Android vibration)
  - Estimated: 1 week
  - Dependencies: HF-001
  - Success: Optimal haptic experience on both platforms

- [ ] **HF-003**: Core gesture recognition system
  - Estimated: 2 weeks
  - Dependencies: HF-002
  - Success: Advanced gestures (swipe, long-press, pinch) working

- [ ] **HF-004**: Chat and voice channel haptic integration
  - Estimated: 2 weeks
  - Dependencies: HF-003
  - Success: Contextual haptics for all interactions

- [ ] **HF-005**: Navigation and UI gesture implementation
  - Estimated: 1 week
  - Dependencies: HF-004
  - Success: Gesture-based navigation functional

- [ ] **HF-006**: Accessibility features and customization
  - Estimated: 1 week
  - Dependencies: HF-005
  - Success: WCAG 2.1 AA compliance achieved

## Summary

**Total P0 Effort**: 42 weeks (7 critical features)
**Total P1 Effort**: 18 weeks
**Q2 2026 Critical Path**: Battery Optimization + Push Notifications + Mobile Permissions (22 weeks)
**Q3 2026 Critical Path**: Cross-Device Handoff + Live Activities + Rich Media (30 weeks)

**🔥 TOP 3 CRITICAL GAPS**: Cross-Device Handoff, Battery Optimization, Live Activities