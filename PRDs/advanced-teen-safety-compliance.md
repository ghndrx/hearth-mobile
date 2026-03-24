# PRD-017: Teen Safety & Age-Appropriate Experience

**Version**: 1.0  
**Date**: March 24, 2026  
**Priority**: P0  
**Target**: Q2 2026 (accelerated due to regulatory landscape)  
**Effort**: 8 weeks  

---

## 1. Problem Statement

Discord rolled out teen-by-default settings globally in early 2026, restricting adult content visibility, enforcing safer direct messaging defaults, and adding content filtering for users under 18. This is driven by increasing global regulation (EU DSA, UK Online Safety Act, US state laws). Hearth Mobile has no age-appropriate experience framework, exposing the platform to regulatory risk and limiting adoption among younger demographics and their parents — a significant market segment.

---

## 2. Vision & Principles

- **Safety by default**: New users get restricted experiences; adults opt into broader access
- **Privacy-preserving**: Age verification without collecting unnecessary personal data
- **Transparent**: Users and parents understand exactly what restrictions apply
- **Reversible**: Users can change age settings with appropriate verification
- **Compliant**: Meet EU DSA, UK Online Safety Act, and emerging US state requirements

---

## 3. Feature Requirements

### 3.1 Age Declaration & Verification
- Birth date collection at onboarding (required to proceed)
- Age cohorts: Under 13 (blocked/minimal), 13-17 (teen), 18+ (adult)
- **Age assurance flow**: Optional verified age path (ID document upload via third-party verifier) for accessing age-gated content
- Parental consent flow for users under 16 (email/SMS to parent for verification)
- Graceful degradation: refuse service for under-13 without parental consent

### 3.2 Teen Default Experience
When user declares age < 18 or is in "teen" cohort:
- **DM restrictions**: Can only DM people they share a server with, or approved friends
- **Content filtering**: Age-restricted servers/channels hidden from discovery
- **Anti-spam**: Aggressive rate limits on friend requests and DMs
- **Username/avatar safeguards**: Restrictions on sharing personal info in display names
- **Safety notifications**: In-app warnings before sharing personal info, clicking unknown links
- **No public server directory visibility** (age-gated servers excluded from COM-001)

### 3.3 Parent/Guardian Dashboard
- Parents can link their account to a teen's account
- View summary of teen's friend list, recent activity, safety setting status
- Ability to adjust safety settings (stricter or looser than defaults)
- Receive alerts if teen's account triggers safety events
- One-click action to escalate concerns to Hearth trust & safety team

### 3.4 Adult Experience Controls
- Users 18+ can opt into teen-by-default for their own account (accountability mode)
- "Minor-safe mode" for adults who moderate mixed-age communities
- Server owners can mark servers as "adults-only" with age-gated joining
- Age-restricted channel marking (18+ content requires age verification to view)

### 3.5 Trust & Safety Backend
- Automated detection of personal info sharing patterns in messages
- Heuristics-based detection of potential grooming/solicitation patterns
- Escalation pipeline: auto-flag → human review → action (warn/ban/notify parent)
- Audit log for all T&S actions, accessible to trust & safety team
- Legal request handling workflow (law enforcement data requests)

---

## 4. Technical Approach

### Backend
- New `age_verification` service: stores age cohort, verification status, consent records
- Integration with third-party age assurance provider (AgeID, Yoti, or Veriff)
- Parental consent record storage with hashed parent email for verification
- Machine learning pipeline for personal info detection (can use OpenAI moderation API as base)
- T&S dashboard: admin panel for reviewing flagged accounts and events

### Mobile (React Native)
- `AgeVerificationScreen`: birth date entry + optional document upload
- `ParentalConsentScreen`: email/SMS to parent with consent token flow
- `SafetySettingsScreen`: user-facing controls for their own safety preferences
- `ParentalDashboardScreen`: parent-linked view of teen's account activity
- Age-gated content: server/channel lists filter based on user's age cohort
- Safety banners: inline warnings in chat for risky sharing behavior

### Data Model
```
User {
  age_cohort: "minor" | "teen" | "adult"
  age_verified: boolean
  parental_consent_obtained: boolean
  parent_account_id?: string
  safety_settings: SafetySettingsObject
  is_age_restricted_server_member: boolean
}

Server {
  is_age_restricted: boolean (default: false)
  minimum_age: number (default: 0)
}
```

---

## 5. Regulatory Compliance Matrix

| Regulation | Requirement | Hearth Implementation |
|---|---|---|
| EU DSA | Minor risk assessments, age-appropriate defaults | Age cohorts + content filtering |
| UK OSA | Safe access for children, parental controls | Parental dashboard + consent flow |
| US COPPA | Parental consent for under-13 | Refuse service / parental consent |
| US KOSA | Duty to protect minors | Safety defaults + reporting tools |

---

## 6. Success Metrics

- 100% of new users declare age at onboarding (enforcement)
- <0.1% of under-13 attempts bypass parental consent flow
- Teen accounts have <5% rate of receiving DMs from non-friends/non-shared-server users
- Parent dashboard activation rate: 20% of teen accounts have linked parent within 30 days
- Trust & Safety SLA: 95% of flagged content reviewed within 24 hours

---

## 7. Dependencies

- User authentication system (existing)
- Server/channel data model (existing)
- Notification system (PN-001, PN-002) for parent alerts
- OpenAI moderation API or equivalent for content safety detection

---

## 8. Out of Scope

- Law enforcement data request portal (Phase 2, separate legal team)
- Facial age estimation (nice-to-have, not required for MVP)
- Cross-platform age verification (Hearth web/desktop separate)
