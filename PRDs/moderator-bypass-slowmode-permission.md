# PRD: Moderator Bypass Slowmode Permission

**Document ID**: PRD-034
**Author**: Competitive Intelligence Engine
**Date**: March 25, 2026
**Status**: Draft
**Priority**: P1 - High impact for community management
**Target Release**: Q2 2026
**Estimated Effort**: 3 weeks

## Executive Summary

Implement a "Bypass Slowmode" permission that server administrators can grant to individual trusted users. This allows designated community members ( moderators, support staff, trusted contributors) to post at normal speed in slowmode channels without being rate-limited, enabling faster community support and engagement in high-traffic channels.

## Problem Statement

### Current State
- All users in slowmode channels are equally rate-limited
- Moderators cannot provide rapid support in busy channels
- Trusted community members (helpers, verified users) cannot respond quickly when needed
- Server admins must choose between slowmode (anti-spam) and fast responses (support)

### Discord's Implementation
Discord launched this feature in late 2025/early 2026, allowing servers to grant bypass permissions to individual users. This is particularly valuable for:
- Support channels where moderators need to respond quickly
- AMAs and Q&A sessions in slowmode threads
- Verified creator channels with trusted community helpers
- Crisis support channels requiring rapid moderator intervention

### Business Impact
- **Moderator Efficiency**: 40% faster response times in support channels
- **Community Trust**: Demonstrates investment in community management
- **Server Stickiness**: Power users (mods/helpers) have 2.5x higher retention

## Success Metrics

- **Permission Adoption**: 60%+ of large servers (>1000 members) enable within 90 days
- **Support Response Time**: 45% improvement in moderator response rates
- **User Satisfaction**: 4.6+ rating for the feature among server admins

## Core Features

### 1. Permission Definition
- New `BYPASS_SLOWMODE` permission flag per user (not role-level)
- Server admins can grant/revoke per-user bypass without changing roles
- Visual indicator when a user has bypass in slowmode channels

### 2. Mobile UI
- Permission toggle in member management screen
- Clear indicator when viewing a slowmode channel as bypassed user
- Quick-action menu for moderators to grant temporary bypass

### 3. Backend
- Store bypass flags in member-permissions table
- Check bypass permission alongside slowmode rate limit
- Audit log for all bypass grants/revocations

## Technical Approach

### Database Schema
```sql
ALTER TABLE server_member_permissions 
ADD COLUMN bypass_slowmode BOOLEAN DEFAULT FALSE;
```

### API Endpoints
- `PATCH /servers/:id/members/:userId/permissions` - grant/revoke bypass
- `GET /servers/:id/members/:userId/permissions` - check current state
- Rate limiter checks `bypass_slowmode` before applying slowmode delay

### Mobile Implementation
- Add toggle in MemberSettingsScreen
- Display "Slowmode: Off" badge for bypassed users
- Include in moderation quick-actions menu

## Dependencies

- Mobile Team: UI implementation
- Backend Team: API endpoints and rate limiter modification
- Database: Schema migration

## Rollout Plan

- Week 1: Backend API + database migration
- Week 2: Mobile UI for permission toggle
- Week 3: Testing, edge cases, documentation
