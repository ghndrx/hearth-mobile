# PRD-030: Stage Channels — Live Audio Broadcasting

**Feature:** Stage Channels (Live Audio Stages)  
**Status:** Not Started  
**Priority:** P0  
**Target:** Q3 2026  
**Effort:** 12 weeks  
**Owner:** Mobile Team  

---

## Overview

Stage Channels enable community organizers to broadcast live audio to large audiences (hundreds to thousands of listeners) in a stage/town-hall format. This is a critical competitive gap — Discord's Stage Channels drove significant community growth and event participation. Hearth Mobile currently has zero parity in this area.

---

## Problem Statement

Hearth Mobile lacks the ability to host live audio events for large audiences. Voice channels support small-group communication but cannot scale to town-hall style events. This prevents:
- Community leaders from hosting AMA sessions
- Creators from running live Q&A broadcasts
- Organizations from conducting all-hands/meeting-style events
- Event-driven community growth

---

## User Stories

### As a Server Owner
- I can create a Stage channel with a topic and scheduled start time
- I can designate speakers and moderators for the stage
- I can go live and have all listeners auto-join the audio stream

### As a Speaker
- I can join a stage as a speaker and broadcast my audio
- I can see listener count and audience reactions in real-time
- I can hand off moderation duties to others

### As a Listener
- I can discover and join live stages from the app
- I can listen to broadcasts and react with emojis
- I can request to speak and be promoted by moderators

---

## Feature Requirements

### SC-001: Stage Channel Creation & Configuration
- Create stage channels with title, description, and scheduled time
- Configure speaker slots and moderator permissions
- Set audience capacity limits
- Auto-archive when event ends

### SC-002: Live Broadcasting (Speaker View)
- Low-latency audio encoding and streaming (Opus codec via LiveKit)
- Speaker identification and audio mixing
- Real-time listener count display
- Stage controls: mute/unmute, share screen audio, end stage

### SC-003: Audience View
- One-tap join for listeners
- Animated presence indicators
- Emoji reaction bar (visible to speakers)
- Speaker list with role badges
- "Raise hand" / request to speak flow

### SC-004: Discovery & Notifications
- "Live Now" badge on stage channels
- Push notification when a joined server starts a stage
- Scheduled stage reminders
- Discover tab integration for trending stages

### SC-005: Moderation Controls
- Mute/unmute individual speakers or all listeners
- Remove speakers from stage
- Ban users from stage
- Lock stage (prevent new listeners)

---

## Technical Approach

### Architecture
- Leverage existing LiveKit infrastructure (already used for voice channels)
- Add SFU topology for one-to-many broadcasting model
- Separate "stage" room type in the backend

### Key Technical Decisions
- **Audio Codec**: Opus (existing LiveKit support)
- **Latency Target**: <3s end-to-end for speaker audio
- **Max Audience**: 1,000 concurrent listeners per stage
- **Recording**: Optional stage recording to file for later playback

### Dependencies
- LiveKit room extension for stage topology
- New `stage:` event type in the events system
- Notification service integration for stage events
- Calendar integration for scheduled stages

### Risks
- Audio latency at scale — mitigated by SFU topology
- Resource consumption on mobile — optimize codec settings
- Discovery spam — moderation and server verification

---

## Metrics & Success Criteria

- Stage channel creation working on iOS and Android
- Audio latency <3s for 500+ concurrent listeners
- Push notification delivery <5s for stage start events
- 3 major community events hosted via stage channels in beta

---

## Out of Scope
- Video broadcasting (future)
- Stage recording and VOD playback
- Paid stage events / ticketing
- Cross-server stage syndication
