# PRD: Biometric App Lock for Hearth Mobile

**Document ID**: PRD-055
**Priority**: P1 (High)
**Target Release**: Q2 2026
**Owner**: Mobile Platform Team & Security Team
**Estimated Effort**: 5 weeks

## Executive Summary

Implement biometric app lock functionality for Hearth Mobile, allowing users to secure the app with Face ID, Touch ID, or fingerprint authentication when launching the app or accessing sensitive sections. This addresses a privacy gap where users cannot prevent unauthorized access to their conversations and server memberships when someone else has physical access to their unlocked device.

## Problem Statement

### Current State
- Hearth Mobile has no app-level authentication
- Anyone with access to an unlocked device can read messages
- Sensitive servers/channels cannot be protected
- No privacy mode for public device sharing
- Missing competitive feature that Discord and Telegram offer

### User Pain Points
- **Device Lending**: Friends/family can snoop on private DMs
- **Shoulder Surfing**: Sensitive content visible in public
- **Children Access**: Kids can access content not meant for them
- **Work/Personal Split**: No way to protect work-related conversations
- **Theft Risk**: Stolen devices give full account access

### Competitive Analysis
**Discord**: Biometric lock via device passcode, re-authenticate after 5 min
**Telegram**: Second password or biometric for specific chats, cloud password
**Signal**: Full biometric app lock with immediate lock on background
**WhatsApp**: Fingerprint lock with customizable timeout

## Goals & Success Metrics

### Primary KPIs
- **Adoption Rate**: 45% of users enable app lock within 60 days
- **Privacy Incidents**: 30% reduction in "someone saw my messages" reports
- **User Confidence**: 4.3/5 rating for privacy features
- **False Rejects**: <2% legitimate unlock failures

### Secondary KPIs
- **Setup Completion**: 95% of users who start setup complete it
- **Feature Discovery**: 60% find the feature without guidance
- **Security Perception**: 85% feel "much more secure" after enabling

## User Stories

### Epic 1: App Lock Core
**As a user, I want to lock Hearth Mobile with biometrics so my messages stay private even if someone accesses my unlocked device.**

```
Story 1.1: Enable App Lock
- Settings > Privacy > App Lock
- Toggle to enable, immediate biometric enrollment
- Choose between Face ID, Touch ID, or fingerprint
- Set fallback PIN (required)

Story 1.2: Lock Behavior
- App locks immediately when backgrounded
- Lock after configurable timeout (immediate/30s/1m/5m)
- Lock on screen lock vs app minimize option
- Visual lock screen with app branding

Story 1.3: Unlock Experience
- Native biometric prompt (system dialog)
- Smooth transition to last viewed location
- Maintain scroll position and state
- Graceful fallback to PIN
```

### Epic 2: Lock Scope & Zones
**As a user, I want granular control over what's locked so I can balance security with convenience.**

```
Story 2.1: Full App Lock
- All content requires biometric to access
- Lock screen shows only app name and unlock button
- Notifications hidden when locked

Story 2.2: Selective Server Lock
- Lock specific servers/channels only
- Other content accessible without authentication
- Quick toggle in server settings
- Separate "private servers" list

Story 2.3: DM Lock
- Lock all direct messages
- Lock specific DM threads
- Lock media in DMs separately
```

### Epic 3: Privacy Notifications
**As a user, I want notification controls tied to app lock so even notifications don't leak content.**

```
Story 3.1: Hide Notification Content
- When locked, show "New message from Hearth" only
- Sender name hidden until unlocked
- Message preview hidden
- Attachments/media thumbnails hidden

Story 3.2: Notification Actions
- "Reply" action disabled when locked
- "Mark read" disabled
- Deep link to unlock flow
- Quick unlock via notification tap
```

### Epic 4: Intruder Detection
**As a user, I want to know if someone tries to access my app so I can take action if my device is compromised.**

```
Story 4.1: Failed Attempt Logging
- Log failed biometric attempts
- Record with timestamp, device info
- Viewable in security settings
- Automatic screenshot on failed attempts (optional)

Story 4.2: Alert Mode
- After 5 failed attempts, enable alert mode
- Take photo with front camera
- Log exact timestamp and attempt pattern
- Optional: notify via alternate channel
```

### Epic 5: Family & Shared Devices
**As a user on shared devices, I want separate app locks per account so each family member has their own privacy.**

```
Story 5.1: Multi-Account Lock
- Each account has independent app lock
- Biometric tied to account, not device
- Account switcher still accessible when locked
- Separate lock settings per account
```

## Technical Requirements

### Platform Implementation
```
iOS:
- LocalAuthentication framework (LAContext)
- Face ID / Touch ID integration
- Keychain for secure PIN storage
- App lifecycle monitoring (UIApplicationDelegate)

Android:
- AndroidX Biometric library
- BiometricPrompt API
- Keystore for secure PIN storage
- Activity lifecycle monitoring
```

### Biometric Types
```typescript
type BiometricType = 'face' | 'fingerprint' | 'iris';

interface AppLockConfig {
  enabled: boolean;
  lockTimeout: number; // milliseconds
  lockOnBackground: boolean;
  hideNotifications: boolean;
  failedAttemptLogging: boolean;
  alertMode: boolean;
  lockedServers: string[];
  lockedDMs: string[];
  fallbackPinHash: string;
}
```

### Security Implementation
- **PIN Storage**: Hashed in Keychain/Keystore with device-bound key
- **Biometric Keys**: Stored in Secure Enclave (iOS) / StrongBox (Android)
- **State Management**: In-memory only, cleared on lock
- **No Bypass**: Cannot disable via ADB/recovery without PIN
- **Secure Flag**: FLAG_SECURE on Android to prevent screenshots

### Notification Handling
```typescript
// When app is locked:
- Strip message content from notifications
- Hide notification preview
- Remove quick reply actions
- Show generic "New Hearth notification"
```

## Implementation Plan

### Phase 1: Core App Lock (2 weeks)
- Biometric authentication system
- Lock screen UI and unlock flow
- PIN fallback system
- App lifecycle integration

### Phase 2: Granular Controls (2 weeks)
- Selective server/DM locking
- Notification content hiding
- Lock timeout configuration

### Phase 3: Advanced Features (1 week)
- Intruder detection and logging
- Photo capture on failed attempts
- Multi-account support
- UI polish and edge cases

## UI/UX Specifications

### Lock Screen
- Full-screen or overlay based on setting
- App logo centered
- "Unlock with Face ID" / "Unlock" button
- Subtle "Forgot PIN?" link
- Respect system dark/light mode

### Settings Screen
- Section: Privacy & Security > App Lock
- Toggle with biometric enrollment flow
- Lock timeout dropdown (immediate/30s/1m/5m)
- Notification preview toggle
- Failed attempt logging toggle
- Intruder detection toggle
- Change PIN option
- View locked servers/DMs

### First-Time Setup
1. Welcome screen explaining feature
2. Biometric enrollment (system prompt)
3. PIN setup (6-digit)
4. Confirm PIN
5. Lock timeout preference
6. Notification preference
7. Done! Test unlock

## Success Criteria

### Must Have
- [ ] Face ID / Touch ID / Fingerprint unlock works
- [ ] PIN fallback works reliably
- [ ] App locks when backgrounded per timeout
- [ ] Notification content hidden when locked
- [ ] Lock screen cannot be bypassed

### Should Have
- [ ] Selective server/DM locking
- [ ] Failed attempt logging visible
- [ ] Intruder photo capture
- [ ] Multi-account support

### Could Have
- [ ] Biometric for specific messages
- [ ] Voice unlock for accessibility
- [ ] Time-based auto-lock rules

## Risks & Mitigation

### Usability Risks
- **Biometric Failures**: Users locked out after device repairs
  - *Mitigation*: Always allow PIN fallback, no permanent lockout
- **Shared Devices**: Family members sharing device
  - *Mitigation*: Per-account lock, not per-device
- **Accessibility**: Users unable to use biometrics
  - *Mitigation*: PIN always available, voice access option

### Security Risks
- **Biometric Bypass**: Technical workarounds
  - *Mitigation*: Secure Enclave/Keystore storage, no software bypass
- **Social Engineering**: Attacker tricking user to unlock
  - *Mitigation*: Intruder detection with photos, security alerts

---

**Created**: March 29, 2026
**Last Updated**: March 29, 2026
**Next Review**: April 5, 2026
