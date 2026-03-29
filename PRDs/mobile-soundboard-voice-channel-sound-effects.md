# PRD: Mobile Soundboard & Voice Channel Sound Effects

**Document ID**: PRD-051
**Priority**: P1 (High)
**Target Release**: Q3 2026
**Owner**: Mobile Team & Audio Team
**Estimated Effort**: 12 weeks

## Executive Summary

Implement a mobile-first soundboard system that allows users to trigger sound effects and audio clips in voice channels directly from their mobile device. Discord's soundboard feature has become a staple of community engagement, particularly in gaming and casual voice channels. This PRD addresses the growing community expectation for mobile-accessible voice interaction tools.

## Problem Statement

### Current State
- Hearth Mobile has no soundboard capability
- Sound effects are desktop-only in most chat platforms
- Mobile users cannot participate in soundboard-heavy communities
- No infrastructure for server-specific or personal soundboards

### User Pain Points
- **Exclusion**: Mobile users feel left out of community traditions
- **Engagement Gap**: Soundboard culture drives community bonding
- **Content Creation**: Streamers using mobile cannot participate
- **Competitive Parity**: Discord mobile now supports soundboards

## Goals & Success Metrics

### Primary Goals
1. Enable mobile users to trigger sound effects in voice channels
2. Support both server-provided and personal soundboard libraries
3. Provide a native mobile UX optimized for quick-trigger interactions
4. Maintain voice channel quality during soundboard playback

### Success Metrics
- **Adoption**: 25% of voice channel users use soundboard within 60 days
- **Session Impact**: <5% increase in voice channel latency during playback
- **User Satisfaction**: 4.3+ rating for soundboard feature
- **Content Volume**: Average 15 sound triggers per voice session

## User Stories & Requirements

### Server Soundboard Library
**As a server member, I want to:**
- Access a server-provided soundboard when in a voice channel
- See all available sounds with custom names and icons
- Trigger sounds with a single tap
- Control playback volume independently of voice

**Requirements:**
- Server admins can upload/manage sound library (WAV, MP3, OGG up to 10MB)
- Mobile displays grid of sounds with names and icons
- Single-tap triggers sound to all voice participants
- Volume slider per sound and master soundboard volume
- Keyboard shortcuts support for desktop participants

### Personal Soundboard
**As a user, I want to:**
- Create a personal soundboard with my own clips
- Quickly access my favorite sounds across any server
- Import sounds from device storage or microphone recording

**Requirements:**
- Personal library of up to 50 sounds
- Cross-server availability (visible in all voice channels)
- Import from device: microphone recording or file picker
- Sound naming, reordering, and deletion
- Favorite/star sounds for quick access

### Sound Trigger Interface
**As a mobile user in a voice channel, I want to:**
- See a floating soundboard panel that doesn't obscure chat
- Trigger sounds with minimal taps and maximum haptic feedback
- Stop currently playing sounds instantly
- Control who hears my sounds (individual/server members)

**Requirements:**
- Floating bottom sheet / overlay in voice channels
- Grid layout (4-6 sounds visible) with scroll for more
- Long-press for sound preview (headphone-only)
- Tap to trigger, tap again to stop
- "Now Playing" indicator with waveform visualization
- Haptic feedback on trigger (short, medium intensity)

### Soundboard Management (Server Admins)
**As a server admin, I want to:**
- Upload sounds with names and images
- Set permissions for who can use sounds
- Enable/disable soundboard per voice channel
- Monitor soundboard usage statistics

**Requirements:**
- Sound upload: drag-drop or file picker (max 100 sounds per server)
- Per-channel soundboard enable/disable
- Role-based permissions (admin, moderator, everyone)
- Usage dashboard: top sounds, most active users
- Sound scheduling (certain sounds only at certain times)

## Technical Architecture

### Audio Pipeline
- Sounds are stored on CDN with regional caching
- WebRTC audio injection for playback to voice channel
- Audio is mixed with voice at the server level (not client)
- Simultaneous playback support: up to 3 sounds concurrent per user

### Mobile Implementation
- Native audio engine for low-latency playback
- Local sound cache for frequently used sounds
- Background audio support for continued playback
- Bluetooth/USB audio device compatibility

### Permissions & Moderation
- Server-level soundboard settings (enable/disable, permissions)
- Rate limiting: max 1 sound per 500ms per user
- Admin can mute individual users from soundboard
- Audit log of sound triggers with timestamps

## Feature Tasks

### SB-001: Sound Storage & CDN Infrastructure
**Estimated**: 2 weeks
**Dependencies**: None
**Success**: Sounds uploadable and streamable via CDN

### SB-002: Voice Channel Audio Injection
**Estimated**: 3 weeks
**Dependencies**: SB-001, Real-Time Voice Processing (VP-001)
**Success**: Sounds play to all voice channel participants

### SB-003: Mobile Soundboard UI & Trigger System
**Estimated**: 2 weeks
**Dependencies**: SB-002
**Success**: Soundboard interface functional with single-tap triggers

### SB-004: Personal Soundboard & Import
**Estimated**: 2 weeks
**Dependencies**: SB-003
**Success**: Personal sound library with import from device

### SB-005: Server Admin Management Panel
**Estimated**: 2 weeks
**Dependencies**: SB-001
**Success**: Admin upload and permission controls working

### SB-006: Haptics & Mobile Optimization
**Estimated**: 1 week
**Dependencies**: SB-004
**Success**: Haptic feedback and battery optimization complete

## Dependencies

- VP-001 (WebRTC core infrastructure)
- HF-004 (Haptic feedback for chat/voice) - for haptic on trigger
- Mobile Team for UI implementation

## Edge Cases & Error Handling

1. **Slow Network**: Show "sound buffering" indicator, queue trigger
2. **Microphone Active**: Duck sound slightly so voice is prominent
3. **Multiple Simultaneous Triggers**: Queue sounds, don't overlap chaotically
4. **Sound Upload Fails**: Show retry option, check file format/size
5. **Rate Limited**: Show "slow down" toast, temporarily disable trigger button
6. **Sound Deleted While Playing**: Stop playback gracefully, remove from queue
7. **Low Battery Mode**: Reduce audio quality, disable background caching

## Out of Scope

- Video/animation accompaniment to sounds (sound-only MVP)
- Soundboard for stage channels (future enhancement)
- Soundboard recording/storing triggered sounds
- Cross-server soundboard sharing

## Competitive Analysis

| Feature | Discord | Hearth Mobile (Current) | Hearth Mobile (Target) |
|---------|---------|--------------------------|-------------------------|
| Server Soundboard | ✅ | ❌ Not implemented | ✅ Q3 2026 |
| Personal Soundboard | ✅ | ❌ Not implemented | ✅ Q3 2026 |
| Mobile Soundboard | ✅ (New) | ❌ Not implemented | ✅ Q3 2026 |
| Haptic Feedback | ❌ | N/A | ✅ Q3 2026 |
| Sound Preview | ✅ | N/A | ✅ Q3 2026 |
| Sound Scheduling | ✅ | N/A | ✅ Q3 2026 |
