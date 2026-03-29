# PRD: Mobile Message Reminders & Scheduled Messages

**Document ID**: PRD-050
**Priority**: P1 (High)
**Target Release**: Q2 2026
**Owner**: Mobile Team & Messaging Platform Team
**Estimated Effort**: 8 weeks

## Executive Summary

Implement a message reminder and scheduling system that allows users to set reminders for messages, schedule messages to send later, and receive notifications at specified times. Discord's @time feature has proven to be a powerful productivity tool, and Hearth Mobile needs native mobile implementations that leverage the platform's notification capabilities for timely alerts.

## Problem Statement

### Current State
- Hearth Mobile has no message reminder capability
- No way to schedule messages to send at a future time
- No mobile-native reminder notifications for conversations
- FORUM-005 covers scheduling for forum channel announcements only

### User Pain Points
- **Forgotten Tasks**: Important messages get buried and forgotten
- **Time Zone Challenges**: Scheduling messages across time zones is error-prone
- **Follow-up Gaps**: No systematic follow-up on pending conversations
- **Meeting Coordination**: Cannot schedule meeting coordination messages

## Goals & Success Metrics

### Primary Goals
1. Enable users to set reminders on any message with custom notification time
2. Allow composing and scheduling messages to send at a future time
3. Provide rich mobile notifications that deep-link to the relevant conversation
4. Support recurring reminders for ongoing follow-ups

### Success Metrics
- **Reminder Creation**: 35% of active users set at least 1 reminder/month
- **Reminder Completion**: 75% of set reminders are acted upon
- **Message Scheduling**: 20% of scheduled messages sent successfully
- **Notification Open Rate**: >80% of reminder notifications are opened
- **Time Savings**: Users report 30% reduction in missed follow-ups

## User Stories & Requirements

### Message Reminders
**As a user, I want to:**
- Long-press or swipe any message to set a reminder
- Choose from quick options ("In 1 hour", "Tomorrow", "Next week")
- Set a custom date/time for the reminder
- Receive a notification that takes me directly to the message

**Requirements:**
- Reminder trigger: long-press menu or swipe action
- Quick presets: 15min, 1hr, 2hr, tomorrow 9am, next week, custom
- Custom picker: date + time with timezone awareness
- Notification: rich push with message preview and sender
- Deep link: notification tap opens conversation at the message
- Recurring reminders: daily, weekly, weekdays (for ongoing follow-ups)
- Reminder list: view/cancel upcoming reminders in settings

### Message Scheduling
**As a user, I want to:**
- Compose a message and choose "Send later" instead of sending immediately
- Schedule the message for a specific date/time
- Edit or cancel the scheduled message before it sends
- See scheduled messages in a dedicated "Scheduled" section

**Requirements:**
- "Send Later" button in compose screen (replaces "Send")
- Date/time picker with timezone selection
- Scheduled queue view: list of pending scheduled messages
- Edit scheduled messages: tap to reopen compose with content
- Cancel: swipe-to-delete or explicit cancel button
- Send confirmation: notification when message is sent
- Failure handling: retry logic, fallback to manual send if time passes

### @time Mentions
**As a user, I want to:**
- Type "@time 3pm" in any message and have it interpreted as a scheduled send
- Have the message held until the specified time
- Receive confirmation of the scheduled time before posting

**Requirements:**
- Parser recognizes "@time", "/schedule", natural language ("in 3 hours")
- Preview shows: "This message will be sent on [date] at [time]"
- Confirmation required before scheduling
- Works in DMs, group DMs, server channels, and threads

### Reminder Notification UX
**As a user, I want to:**
- Get a rich notification with message preview and context
- Take action directly from the notification
- Dismiss or snooze the reminder if I can't act now

**Requirements:**
- Notification shows: sender avatar, channel name, message preview (first 100 chars)
- Action buttons: "Reply", "Mark Done", "Snooze 15min"
- Reply action: inline reply composer in notification
- Snooze: re-notifies after selected interval
- Notification grouping: multiple reminders batched into single notification
- Lock screen and notification center support

## Technical Architecture

### Reminder Storage
- Scheduled reminders stored in database with user_id, message_id, remind_at, recurrence
- Cron job or message queue processes due reminders
- Failed reminders retry with exponential backoff (max 3 attempts)

### Scheduled Message Queue
- Scheduled messages stored with send_at timestamp
- Background worker polls for due messages every 30 seconds
- Message sent via standard send pipeline when due
- Edit/cancel updates the database record

### Notification Integration
- Uses PN-001 (Push Notifications) infrastructure
- Rich notifications with inline actions (iOS UNNotificationAction, Android PendingIntent)
- Snooze implemented as new scheduled notification

## Feature Tasks

### REM-001: Reminder Data Model & Storage
**Estimated**: 1 week
**Dependencies**: None
**Success**: Reminders stored and queryable by due date

### REM-002: Mobile Reminder UI (Set & Manage)
**Estimated**: 2 weeks
**Dependencies**: REM-001, Mobile UI Framework
**Success**: Long-press menu and swipe actions for setting reminders

### REM-003: Reminder Notification Delivery
**Estimated**: 2 weeks
**Dependencies**: REM-002, PN-001 (Push Notifications)
**Success**: Rich notifications with Reply/Snooze/Mark Done actions

### REM-004: Message Scheduling Infrastructure
**Estimated**: 2 weeks
**Dependencies**: REM-001
**Success**: Scheduled messages queue with send processing

### REM-005: Scheduled Message UI
**Estimated**: 1 week
**Dependencies**: REM-004
**Success**: "Send Later" flow and scheduled queue view

### REM-006: @time Parser & Natural Language Scheduling
**Estimated**: 1 week
**Dependencies**: REM-005
**Success**: @time mentions recognized and confirmed before scheduling

### REM-007: Recurring Reminders
**Estimated**: 1 week
**Dependencies**: REM-003
**Success**: Daily/weekly recurring reminder support

## Edge Cases & Error Handling

1. **Reminder for Deleted Message**: Cancel reminder silently, log for analytics
2. **Scheduled Message in Locked Channel**: Send fails, notify user immediately
3. **Reminder While Offline**: Sync on reconnect, send immediately if overdue
4. **Time Zone Change**: Reminders stay in original timezone unless explicitly changed
5. **High Reminder Volume**: Rate limit to max 100 reminders per user
6. **Scheduled Message for Banned User**: Cancel all pending scheduled messages
7. **Notification Permission Denied**: Show in-app reminder badge instead
8. **Message Edited Before Send**: Send the edited content, log original for audit

## Dependencies

- PN-001 (Push Notifications) - for reminder notifications
- PN-003 (Permission handling) - for notification permissions
- PN-005 (Rich notifications with inline actions) - for Reply/Snooze from notification
- Mobile UI Framework for long-press menu and swipe actions

## Out of Scope

- Team/shared reminders (multiple people reminded)
- AI-suggested reminders (suggested by ML based on conversation context)
- Reminder templates
- Calendar integration for reminders
- Forum channel announcements (covered by FORUM-005)

## Competitive Analysis

| Feature | Discord | Hearth Mobile (Current) | Hearth Mobile (Target) |
|---------|---------|--------------------------|-------------------------|
| Message Reminders | ✅ | ❌ Not implemented | ✅ Q2 2026 |
| Scheduled Messages | ✅ (@time) | ❌ Not implemented | ✅ Q2 2026 |
| Notification Actions | ✅ (limited) | ❌ Not implemented | ✅ Q2 2026 |
| Recurring Reminders | ❌ | N/A | ✅ Q2 2026 |
| Natural Language @time | ✅ | N/A | ✅ Q2 2026 |
| Scheduled Message Queue | ✅ | ❌ Not implemented | ✅ Q2 2026 |
| Rich Notification Reply | ✅ | ❌ Not implemented | ✅ Q2 2026 |
