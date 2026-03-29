# PRD: Mobile Session Management & Device Trust

**Document ID**: PRD-052
**Priority**: P0 (Critical)
**Target Release**: Q2 2026
**Owner**: Mobile Platform Team & Security Team
**Estimated Effort**: 8 weeks

## Executive Summary

Implement comprehensive session management and device trust features for Hearth Mobile, enabling users to view and control all active sessions, manage trusted devices, and remotely revoke access. This addresses a critical security and privacy gap where users have no visibility or control over their account's active sessions across devices.

## Problem Statement

### Current State
- No session management UI in Hearth Mobile
- Users cannot view active sessions or devices
- No ability to remotely log out specific sessions
- No device trust or verification levels
- Limited security control for compromised accounts

### User Pain Points
- **No Visibility**: Users cannot see where their account is logged in
- **Security Risk**: Compromised devices remain authenticated indefinitely
- **No Remote Control**: Cannot revoke access without changing password
- **Trust Gap**: No way to mark devices as "trusted" for faster authentication
- **Family Account Issues**: Parents cannot manage children's session access

### Competitive Analysis
**Discord**: Offers session management showing all active connections with IP, location, and last active time. Users can revoke individual sessions.

**Telegram**: Provides active sessions list with device types, allows simultaneous logout, and supports "terminate all other sessions."

**WhatsApp**: Web/desktop session management with QR verification, ability to link/unlink devices.

## Goals & Success Metrics

### Primary KPIs
- **Session Visibility**: 90% of users can identify their active sessions
- **Remote Revocation**: <5 second session termination latency
- **Trust Setup**: 60% of users designate trusted devices within 30 days
- **Security Incidents**: 40% reduction in account compromise reports

### Secondary KPIs
- **Feature Discovery**: 50% of users find session management without prompting
- **Session Hygiene**: Average 3.2 sessions per user (vs 5.1 before)
- **Support Tickets**: 25% reduction in "someone accessed my account" tickets

## User Stories

### Epic 1: Session Visibility
**As a user, I want to see all active sessions so I can verify my account hasn't been compromised.**

```
Story 1.1: View Active Sessions
- See list of all logged-in devices with:
  - Device type and name
  - IP address (hashed for privacy)
  - Approximate location (city-level)
  - Last active timestamp
  - Current session indicator (this device)

Story 1.2: Session Details
- Tap session to see detailed information
- View login history for that session
- See permissions granted to session

Story 1.3: Session Refresh
- Pull-to-refresh for real-time session list
- Automatic refresh every 30 seconds when viewing
```

### Epic 2: Session Control
**As a user, I want to remotely terminate sessions so I can secure my account from any device.**

```
Story 2.1: Revoke Single Session
- Swipe or tap to revoke individual session
- Immediate invalidation of session token
- Confirmation dialog before termination
- Push notification to affected device

Story 2.2: Revoke All Other Sessions
- "Sign out all other devices" option
- Requires password confirmation
- Bulk token invalidation
- Confirmation with session count

Story 2.3: Self-Termination
- Easy "Sign out this device" from settings
- Useful before device sale or transfer
```

### Epic 3: Device Trust System
**As a user, I want to mark devices as trusted so I can have faster authentication without sacrificing security.**

```
Story 3.1: Trust Current Device
- One-tap "Trust this device" after login
- Trusted devices bypass 2FA for 30 days
- Visual indicator for trusted devices

Story 3.2: Manage Trusted Devices
- View list of all trusted devices
- Set expiration for trust (30/60/90 days)
- Revoke trust individually or all at once
- Auto-expire trust after set period

Story 3.3: Trust Level Configuration
- Different trust levels per device type
- Automatic trust for previously verified devices
- Require re-verification after security event
```

### Epic 4: Security Alerts & Notifications
**As a user, I want to receive alerts about suspicious sessions so I can act quickly to secure my account.**

```
Story 4.1: New Login Alerts
- Push notification on new device login
- Includes device, location, time
- Direct link to session management

Story 4.2: Suspicious Activity Alerts
- Detection of login from new location/device type
- Unusual activity pattern warnings
- One-tap "secure my account" actions

Story 4.3: Session Anomaly Detection
- Background monitoring for suspicious patterns
- Automatic session suspension for high-risk events
- Email + push notification for account changes
```

### Epic 5: Parental & Admin Controls
**As a parent/admin, I want to manage sessions for family accounts so I can maintain security oversight.**

```
Story 5.1: Family Session Management
- Parent account can view/terminate child sessions
- Age-appropriate session limits
- Activity reporting for minor accounts

Story 5.2: Server Admin Session Tools
- Server admins can view their own sessions
- Cannot view other users' sessions (privacy)
- Audit log for admin actions
```

## Technical Requirements

### Session Data Model
```typescript
interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'web' | 'tablet';
  deviceName: string;
  deviceFingerprint: string;
  ipAddress: string; // stored hashed
  location: {
    country: string;
    city: string; // approximate
    coordinates?: [number, number]; // encrypted
  };
  createdAt: Date;
  lastActiveAt: Date;
  isTrusted: boolean;
  trustExpiresAt?: Date;
  userAgent: string;
  permissions: string[];
}

interface SessionTrust {
  deviceId: string;
  trustLevel: 'none' | 'standard' | 'high';
  grantedAt: Date;
  expiresAt: Date;
  factorsVerified: AuthFactor[];
}
```

### API Endpoints
```
GET    /api/v1/sessions              - List user's active sessions
GET    /api/v1/sessions/:id          - Get session details
DELETE /api/v1/sessions/:id          - Revoke specific session
DELETE /api/v1/sessions              - Revoke all sessions except current
POST   /api/v1/sessions/:id/trust     - Mark device as trusted
DELETE /api/v1/sessions/:id/trust     - Revoke device trust
POST   /api/v1/sessions/verify        - Verify new session
```

### Security Implementation
- **Token Management**: Short-lived access tokens (15 min), long-lived refresh tokens (30 days)
- **Device Fingerprinting**: Collect device characteristics for anomaly detection
- **IP Hashing**: Never store raw IP, use one-way hash for comparison
- **Rate Limiting**: Max 10 session revocations per hour
- **Audit Logging**: All session events logged for user review

### Push Notifications
- New session login alerts
- Session revoked notifications
- Trust expiration reminders
- Suspicious activity warnings

## Implementation Plan

### Phase 1: Core Session Management (3 weeks)
- Session data model and API
- Session list UI and UX
- Individual session revocation
- "Sign out all devices" functionality

### Phase 2: Device Trust System (3 weeks)
- Trust designation UI
- Trust expiration logic
- Bypassed 2FA for trusted devices
- Trust management screen

### Phase 3: Security Alerts & Polish (2 weeks)
- Push notification integration
- New login alerts
- Suspicious activity detection
- UI polish and error handling

## UI/UX Specifications

### Session List Screen
- Card-based layout for each session
- Current device highlighted with "This device" badge
- Device icon, name, location, last active
- Swipe-to-reveal "Revoke" action
- "Sign out all others" FAB
- Pull-to-refresh

### Session Detail Screen
- Full session information
- Login history timeline
- Trust status and controls
- "Revoke session" button
- "Mark as trusted" toggle

### Security Settings Screen
- Session management entry point
- Quick stats (X active sessions, Y trusted)
- Recent security events
- "Review all sessions" CTA

## Success Criteria

### Must Have
- [ ] Session list shows all active sessions with accurate information
- [ ] Individual session revocation works within 5 seconds
- [ ] "Sign out all others" terminates all non-current sessions
- [ ] Device trust system bypasses 2FA correctly
- [ ] Push notifications sent for new logins

### Should Have
- [ ] Suspicious activity detection and alerts
- [ ] Session activity timeline
- [ ] Trust expiration with notifications

### Could Have
- [ ] Parental session oversight
- [ ] Session scheduling (auto-logout after X)
- [ ] Location history map

## Risks & Mitigation

### Privacy Risks
- **Location Data**: Users may be uncomfortable with location tracking
  - *Mitigation*: City-level only, never precise location, easy opt-out
- **Device Fingerprinting**: Some users object to fingerprinting
  - *Mitigation*: Transparent about what's collected, option to decline

### Security Risks
- **Session Fixation**: Attackers targeting session tokens
  - *Mitigation*: Token rotation, short-lived tokens, refresh token rotation
- **Notification Fatigue**: Users ignoring security alerts
  - *Mitigation*: Tiered alerts, only critical ones by default

---

**Created**: March 29, 2026
**Last Updated**: March 29, 2026
**Next Review**: April 5, 2026
