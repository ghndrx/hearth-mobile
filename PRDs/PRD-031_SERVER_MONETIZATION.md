# PRD-031: Server Monetization — Boost Ecosystem & Creator Revenue

**Feature:** Server Monetization (Boosts, Premium Tiers, Creator Tips)  
**Status:** Not Started  
**Priority:** P0  
**Target:** Q3-Q4 2026  
**Effort:** 16 weeks  
**Owner:** Mobile Team + Backend  

---

## Overview

Server Monetization enables community creators to earn revenue from their communities through a boost/ subscription model. Discord's Server Boosts and Nitro have generated significant creator income and community investment. Hearth currently has only basic creator tips (30% parity). This PRD establishes the full boost ecosystem.

---

## Problem Statement

Hearth Mobile lacks meaningful monetization tools for community creators. Without revenue potential:
- Top creators migrate to Discord for income opportunities
- Server quality suffers from underfunded community management
- Hearth cannot take a revenue share to sustain platform operations
- Competitive disadvantage vs. Discord's established boost model

---

## User Stories

### As a Server Owner
- I can enable premium features for my server
- I can offer exclusive content/permissions to boosting members
- I can receive tips and boost revenue payouts
- I can set up subscription tiers for my community

### As a Community Member
- I can boost a server I love to unlock perks
- I can see my boost status and benefits on my profile
- I can tip creators directly
- I can manage my subscription and payment methods

---

## Feature Requirements

### SM-001: Server Boost System
- Members can apply 1-3 boosts to a server (linked to Hearth Premium)
- Servers unlock perks at 2/7/14 boost thresholds
- Per-server boost counter and leaderboard
- Boost cancellation and reallocation

### SM-002: Premium Server Perks (By Boost Level)
**Level 1 (2 boosts):**
- Custom server banner and icon
- 128kbps audio quality (vs 64kbps base)
- 100MB file upload limit (vs 8MB)

**Level 2 (7 boosts):**
- All Level 1 perks
- Animated server icon
- 256kbps audio quality
- 500MB file upload limit
- Exclusive role for boosters

**Level 3 (14 boosts):**
- All Level 2 perks
- Vanity URL / custom server slug
- 512MB file upload limit
- Server Insights analytics dashboard
- Priority support queue

### SM-003: Creator Tips & Payouts
- One-time tip button on server profile
- Monthly subscription model (tiered, $2.99/$5.99/$9.99)
- Creator dashboard showing earnings, tips, subscribers
- Payout system (Stripe Connect integration)
- 70/30 revenue split (Hearth 30%, creator 70%)

### SM-004: Hearth Premium Subscription
- Hearth Premium ($3.99/month or $39.99/year)
- Includes: 2 server boosts, exclusive emotes, profile effects
- Subscriber badge on profile
- Premium subscriber tab in settings

### SM-005: Monetization Dashboard (Creator Studio)
- Revenue analytics: daily/weekly/monthly earnings
- Tip leaderboard for server
- Subscriber demographics
- Payout history and pending payouts
- Tax document management (1099 support)

---

## Technical Approach

### Architecture
- Stripe Connect for marketplace payments and payouts
- New `premium_server` and `creator_subscription` tables in DB
- Boost tokens as non-fungible entitlements (use existing entitlements service)
- Webhook-driven payment processing

### Key Technical Decisions
- **Payments**: Stripe Connect (marketplace model)
- **Entitlements**: Extend existing entitlements system for boosts
- **Revenue Share**: 70/30 split, automated monthly payouts
- **Fraud Prevention**: Velocity limits on tips, bot detection

### Dependencies
- Stripe integration (payments + Connect)
- Entitlements service extension for boost tiers
- Email service for receipts and payout notifications
- KYC/identity verification for creators ($600+ payouts)

### Risks
- Payment processing complexity — Stripe handles most complexity
- Fraud and abuse — implement rate limiting and monitoring
- Tax compliance — integrate tax forms (Stripe Tax)
- Creator churn — track engagement metrics

---

## Metrics & Success Criteria

- Server boost flow working end-to-end on iOS and Android
- Stripe Connect onboarding for creators functional
- First payouts processed successfully
- 50+ servers with active boosts within 90 days of launch
- $10,000+ monthly creator payouts in first quarter

---

## Out of Scope
- Server memberships (paid access to private servers)
- Digital goods marketplace
- Ad-supported revenue sharing
- Cryptocurrency tipping
- IPO / equity grants
