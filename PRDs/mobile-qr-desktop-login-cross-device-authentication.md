# PRD: Mobile QR Desktop Login & Cross-Device Authentication

**Document ID**: PRD-048
**Priority**: P0 (Critical)
**Target Release**: Q2 2026
**Owner**: Mobile Platform Team & Security Team
**Estimated Effort**: 10 weeks

## Executive Summary

Implement a seamless QR code-based authentication system that allows users to log into Hearth Desktop/Web by scanning a QR code with their already-authenticated Hearth Mobile app. This feature eliminates password entry on shared/public computers, dramatically improving security and user experience. Discord's implementation of this feature has become a benchmark for modern cross-device authentication flows.

## Problem Statement

### Current State
- Hearth Mobile lacks QR-based desktop authentication
- Users must enter credentials on desktop/web clients
- No secure, passwordless login flow for shared computers
- No mobile-initiated session management for desktop

### Competitive Context
Discord's QR code login is one of their most praised mobile features:
- Users scan a QR displayed on desktop/web using their mobile app
- Mobile app shows confirmation with device name and location
- One-tap approval completes desktop login without passwords
- Sessions can be remotely revoked from mobile

### User Pain Points
- **Password Fatigue**: Users avoid entering passwords on public computers
- **Security Risk**: Password entry on shared devices is a security vector
- **Session Management**: No way to view/terminate desktop sessions from mobile
- **Friction**: 2FA adds friction to desktop login flow

## Goals & Success Metrics

### Primary Goals
1. Enable passwordless desktop/web login via mobile QR scan
2. Provide mobile-based session management and remote logout
3. Reduce desktop login time from 45s to <10s
4. Improve security by eliminating password entry on shared devices

### Success Metrics
- **Login Success Rate**: >95% QR login success rate
- **Time to Login**: <10 seconds from QR scan to desktop access
- **Security**: 0 credential phishing incidents via QR login
- **User Adoption**: 60% of mobile users use QR login within 30 days
- **Session Management**: 40% of users review active sessions monthly

## User Stories & Requirements

### QR Code Generation & Display (Mobile Initiator)
**As a user, I want to:**
- Open a QR login screen on desktop/web that displays a unique, time-limited QR code
- See my desktop session appear in the mobile app when I scan
- Approve or deny the login request with full device details

**Requirements:**
- QR codes must expire within 60 seconds and refresh every 30 seconds
- QR codes contain a signed JWT with server-generated nonce and timestamp
- Desktop must display unique session ID, device type, and approximate location
- Rate limiting: max 5 QR code generations per minute per account

### QR Scanning & Approval Flow (Mobile Scanner)
**As a mobile user, I want to:**
- Scan the QR code from the Hearth mobile app using the camera
- See exactly what device and location is attempting to log in
- Approve with a single tap after biometric verification
- Receive haptic confirmation on successful login

**Requirements:**
- Native camera integration with real-time QR detection
- Display device name, browser, IP-based location, and timestamp
- Require biometric auth (Face ID/Touch ID/fingerprint) before approval
- Haptic feedback on approval (success) or denial (error pattern)
- Offline queue for approval if mobile has no connectivity

### Session Management Dashboard
**As a user, I want to:**
- View all active desktop/web sessions from my mobile app
- See device name, location, last active time for each session
- Remotely terminate individual sessions or all sessions at once
- Receive push notification when a new device logs in

**Requirements:**
- Real-time session list with refresh capability
- Session details: device type, browser, IP, location, login time, last activity
- One-tap logout for individual sessions
- "Logout all other devices" bulk action
- Push notification on new session login with approve/deny

### Security & Anti-Fraud Measures
**As a security team, we need:**
- QR codes that cannot be replayed or intercepted
- Detection of QR code screenshots (Discord lacks this)
- Anomaly detection for unusual login locations
- Audit logging of all authentication events

**Requirements:**
- Time-based OTP embedded in QR codes
- Server-side QR code state validation (one-time use)
- Screenshot detection with warning overlay
- Login anomaly alerts for new geolocations
- Full audit trail of authentication events

## Technical Architecture

### Backend Requirements
- **QR Token Service**: Generate and validate time-limited QR tokens
- **Session Management API**: CRUD operations for user sessions
- **Authentication Broker**: Bridge between mobile scan and desktop session
- **Anomaly Detection**: Location-based and behavioral fraud detection

### Mobile Requirements
- **Camera Framework**: Native camera with QR detection (iOS AVFoundation, Android ML Kit)
- **Biometric Bridge**: Native biometric prompts before approval
- **Haptic Engine**: Platform-specific haptic patterns
- **Offline Queue**: Store pending approvals when offline

### Desktop/Web Requirements
- **QR Display Component**: Full-screen QR with auto-refresh
- **WebSocket for Real-time**: Push session state updates
- **Session Token Exchange**: OAuth2-style token swap after approval

## Feature Tasks

### QDL-001: QR Token Generation & Validation Backend
**Estimated**: 3 weeks
**Dependencies**: None
**Success**: Time-limited QR tokens generated and validated correctly

### QDL-002: Mobile Camera & QR Scanning Infrastructure
**Estimated**: 2 weeks
**Dependencies**: QDL-001
**Success**: Real-time QR detection working on iOS and Android

### QDL-003: QR Login Approval Flow with Biometrics
**Estimated**: 2 weeks
**Dependencies**: QDL-002, SEC-003 (Biometric 2FA)
**Success**: Biometric-protected approval flow functional

### QDL-004: Session Management Dashboard (Mobile)
**Estimated**: 1 week
**Dependencies**: QDL-003
**Success**: Active sessions viewable and terminable from mobile

### QDL-005: Desktop QR Display & Session Establishment
**Estimated**: 1 week
**Dependencies**: QDL-001
**Success**: Desktop shows valid QR and establishes session on approval

### QDL-006: Security Hardening & Anti-Fraud
**Estimated**: 1 week
**Dependencies**: QDL-005
**Success**: Screenshot detection and anomaly alerts working

## Edge Cases & Error Handling

1. **Expired QR**: Show "QR code expired, please refresh" with auto-refresh
2. **Camera Permission Denied**: Show settings deep link to enable camera
3. **Biometric Not Enrolled**: Fall back to PIN/password authentication
4. **Offline Mobile**: Queue approval locally, sync when online with timestamp validation
5. **Desktop Loses Connection During Scan**: Show connection error, allow retry
6. **QR Code Screenshot**: Show warning "Screenshot detected - only approve if you initiated this login"
7. **Multiple Rapid Scans**: Debounce and only process latest valid QR

## Dependencies

- SEC-003 (Biometric 2FA) - for biometric verification before approval
- Push Notifications (PN-001) - for new session login alerts
- Mobile Team for camera integration

## Out of Scope

- Login to mobile app via QR (only desktop login via mobile scanner)
- QR code for server invites (covered by CAM-005)
- Password reset via QR
- Social login integration

## Competitive Analysis

| Feature | Discord | Hearth Mobile (Current) | Hearth Mobile (Target) |
|---------|---------|--------------------------|-------------------------|
| QR Desktop Login | ✅ Full | ❌ Not implemented | ✅ Q2 2026 |
| Session Management | ✅ Basic | ❌ Not implemented | ✅ Q2 2026 |
| Screenshot Detection | ❌ Missing | N/A | ✅ Q2 2026 |
| Biometric Confirmation | ✅ | N/A | ✅ Q2 2026 |
| Location Display | ✅ | N/A | ✅ Q2 2026 |
