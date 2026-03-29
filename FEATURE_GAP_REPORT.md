# Hearth Mobile Feature Gap Report
**Version**: 2.0
**Last Updated**: March 29, 2026
**Competitor**: Discord Mobile
**Status**: Active Development

---

## Overview

This document tracks competitive feature gaps between Hearth Mobile and Discord Mobile, prioritizing areas for development to achieve feature parity and competitive differentiation.

## Current Parity: ~82%

Weighted across 6 categories: Core Messaging (95%), Voice & Video (75%), Notifications (90%), Auth & Security (72%), Mobile-Native (78%), Offline & Data (85%).

---

## Category 1: Core Messaging (95% - Near Parity)

### Parity Achieved
- Real-time messaging, reactions, editing, deletion
- Embeds & rich content
- Message search (in progress)

### In Progress
- **Threads & Forums (PRD-045)**: Q2 2026 target
- **Advanced Message Search (PRD-046)**: AI-powered semantic search

### Remaining Gap
- None critical. Minor UX polish opportunities.

---

## Category 2: Voice & Video (75% - Near Parity)

### Parity Achieved
- Voice channels, video calls, screen sharing

### In Progress
- **Background Noise Suppression (PRD-040)**: WebRTC engine with Krisp-like AI noise cancellation
- **Spatial Audio (PRD-013)**: 3D positioning for group conversations
- **Soundboard (PRD-051)**: Voice channel sound effects

### New PRDs Added (March 29, 2026)
- **Voice Effects (PRD-054)**: Real-time voice modulation (robot, pitch shift, reverb, etc.)

### Remaining Gap
- **E2E Encrypted Voice**: Not planned, low priority

---

## Category 3: Notifications & Presence (90% - Near Parity)

### Parity Achieved
- Push notifications, DND, read receipts, typing indicators

### In Progress
- **Rich Notifications (PRD-001)**: Actionable notification responses
- **Notification Intelligence (PRD-042)**: Smart batching and grouping

### Remaining Gap
- None critical.

---

## Category 4: Authentication & Security (72% - Gap)

### Parity Achieved
- Password login, 2FA (TOTP), device biometric auth

### In Progress
- **QR Desktop Login (PRD-048)**: Discord's most praised mobile feature

### New PRDs Added (March 29, 2026)
- **Session Management (PRD-052)**: View/terminate active sessions, device trust
- **Biometric App Lock (PRD-055)**: Per-app biometric lock for privacy

### Remaining Gap
- **E2E Encryption (DMs)**: Not planned, significant engineering effort

---

## Category 5: Mobile-Native Features (78% - Near Parity)

### Parity Achieved
- QR code scanning (limited vs Discord)

### In Progress
- **Haptic Feedback (PRD-038)**: Native feel gestures
- **Camera Integration (PRD-028)**: AR filters
- **Live Activities / Dynamic Island (PRD-019)**: iOS 16.1+ support
- **Widgets (PRD-019)**: Home screen widgets

### Remaining Gap
- None critical.

---

## Category 6: Offline & Data (85% - Near Parity)

### Parity Achieved
- Media caching

### In Progress
- **Offline Messaging (PRD-021)**: Message queue when disconnected
- **Data Backup (PRD-018)**: Cloud backup and restore

### Remaining Gap
- None critical.

---

## Priority Matrix

| Priority | Feature | PRD | Target | Status |
|----------|---------|-----|--------|--------|
| P0 | Session Management | PRD-052 | Q2 2026 | NEW |
| P0 | QR Desktop Login | PRD-048 | Q2 2026 | In Progress |
| P0 | Message Reminders | PRD-050 | Q2 2026 | In Progress |
| P1 | Biometric App Lock | PRD-055 | Q2 2026 | NEW |
| P1 | Mobile Soundboard | PRD-051 | Q3 2026 | In Progress |
| P1 | Mobile Widgets | PRD-019 | Q3 2026 | In Progress |
| P2 | Voice Effects | PRD-054 | Q4 2026 | NEW |
| P2 | E2E Encryption | — | TBD | Not planned |

---

## Competitive Recommendations

### 1. Session Management (P0)
Discord's session management is basic. Hearth can exceed by adding:
- Device trust levels with 2FA bypass
- Failed attempt photo capture
- Suspicious activity alerts
- Family/parental session oversight

### 2. QR Desktop Login (P0)
High impact, moderate effort. Discord's most praised feature.
- Prioritize speed and reliability
- Add animated QR for better UX
- Support persistent desktop sessions

### 3. Biometric App Lock (P1)
Addresses real privacy concern. Simple to implement relative to impact.
- System biometric integration (Face ID, fingerprint)
- Per-server/DM selective locking
- Notification content hiding when locked

### 4. Voice Effects (P2)
Community engagement driver. Discord's voice effects are popular in gaming/social.
- 10+ built-in effects
- Custom preset saving
- Per-channel effect permissions
- Voice message effects

---

## PRD Inventory

| PRD ID | Name | Priority | Status |
|--------|------|----------|--------|
| PRD-001 | Push Notifications | P0 | In Progress |
| PRD-013 | Spatial Audio | P1 | In Progress |
| PRD-019 | Widgets & Live Activities | P1 | In Progress |
| PRD-040 | Real-Time Voice Engine | P0 | In Progress |
| PRD-045 | Threads & Forum Channels | P0 | In Progress |
| PRD-046 | Intelligent Search | P0 | In Progress |
| PRD-047 | Mobile Onboarding | P0 | In Progress |
| PRD-048 | QR Desktop Login | P0 | In Progress |
| PRD-050 | Message Reminders | P0 | In Progress |
| PRD-051 | Mobile Soundboard | P1 | In Progress |
| PRD-052 | Session Management | P0 | **NEW** |
| PRD-054 | Voice Effects | P2 | **NEW** |
| PRD-055 | Biometric App Lock | P1 | **NEW** |

---

## Parity Progress

| Month | Parity % | Notes |
|-------|----------|-------|
| Feb 2026 | 72% | Baseline measurement |
| Mar 2026 | 78% | PRDs added for critical gaps |
| Apr 2026 (proj) | 82% | New PRDs (Session Mgmt, Biometric Lock, Voice Effects) |

---

*Maintained by Hearth Mobile Competitive Intelligence Team*
