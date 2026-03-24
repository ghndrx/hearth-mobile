# PRD-016: App Directory & Third-Party Integration Platform

**Version**: 1.0  
**Date**: March 24, 2026  
**Priority**: P1  
**Target**: Q4 2026  
**Effort**: 14 weeks  

---

## 1. Problem Statement

Discord's App Directory lets users discover and add thousands of third-party apps to their servers — bots, music players, gaming tools, productivity apps. This ecosystem drives engagement, attracts diverse communities, and creates a defensible platform moat. Hearth Mobile has no extensibility story, limiting its appeal to power users and server administrators who expect Discord-like integration capabilities.

---

## 2. Vision & Principles

- **Platform-first**: Hearth should be a platform others build on, not just an app users consume
- **Safe by default**: All integrations go through a review/approval flow before public listing
- **Mobile-native**: App interactions must work well on touch, with appropriate permissions scoping
- **Performance-conscious**: Third-party apps must not degrade Hearth's performance or battery life

---

## 3. Feature Requirements

### 3.1 App Directory & Discovery
- Public directory of approved apps/bots with search, categories, ratings, and reviews
- Server admin can browse, install, and configure apps from within Hearth Mobile
- App detail pages with screenshots, description, required permissions, and privacy info
- Featured/trending apps surfaced on app startup and server settings

### 3.2 Bot/Integration SDK
- REST + WebSocket API for third-party developers to build Hearth integrations
- OAuth 2.0 flow for user/server authorization
- Event subscriptions: message events, voice state changes, member updates, etc.
- Bot token management with fine-grained permission scopes
- Developer portal with API docs, sandbox environment, and usage analytics

### 3.3 In-App App Management
- Server settings panel showing installed apps with enable/disable toggles
- Per-app permission viewer (what data can this app access?)
- App commands surfaced contextually (e.g., "/spotify play" in message input)
- App-to-app direct messaging for cross-bot workflows
- Uninstall/revoke flow with data cleanup confirmation

### 3.4 Native Integration Examples (Internal)
- **Music integration**: Play Spotify/YouTube Music in voice channels via embedded player
- **Calendar integration**: Server events sync to device calendar
- **Trello/Notion integration**: Post updates to designated channels

---

## 4. Technical Approach

### Backend
- New `apps` microservice: app registry, review pipeline, permission grants
- OAuth 2.0 authorization server with scope management
- WebSocket fan-out service for app event delivery
- Developer portal (web-based, separate from mobile app)

### Mobile (React Native)
- `AppDirectoryScreen`: browsable list with search, categories, featured carousel
- `AppDetailScreen`: install button, permission list, screenshots, reviews
- `InstalledAppsScreen`: per-server app management
- Context providers for active app commands and installed app state

### API Design
```
GET    /apps                    → List approved apps (paginated, filterable)
GET    /apps/:id                → App detail
POST   /apps/:id/install        → Install to server (OAuth check)
DELETE /apps/:id/install        → Uninstall from server
GET    /apps/:id/permissions    → Required permissions
POST   /servers/:id/apps        → List installed apps for server
GET    /apps/:id/commands       → App's slash commands
```

---

## 5. Security & Review

- All public apps require manual review before listing (spam, malicious behavior checks)
- Apps declare required permission scopes; users see exactly what data they grant
- Rate limiting on API tokens; usage quotas per app tier (free/verified/partner)
- App data deletion API endpoint (GDPR compliance)

---

## 6. Out of Scope

- Game SDK integrations (covered separately in gaming-integration PRD)
- Mobile app building (native/Hearth-as-platform for third-party mobile apps)
- Payment processing for paid app listings (Phase 2)

---

## 7. Success Metrics

- 50+ approved apps in directory by end of Q4 2026
- 30% of servers have at least 1 installed app
- Average app rating ≥ 4.0 stars
- <1% of installs result in reported abuse/spam

---

## 8. Dependencies

- OAuth 2.0 infrastructure (can reuse SEC-004 OAuth scope work)
- Server management UI (SM-001, SM-002 in TASK_QUEUE.md)
- WebSocket infrastructure for real-time app events
