# PRD-032: AI Social Features — Smart Recommendations & Automated Moderation

**Feature:** AI Social Features (Recommendations, Smart Moderation, Discovery)  
**Status:** Not Started  
**Priority:** P1  
**Target:** Q4 2026  
**Effort:** 14 weeks  
**Owner:** Mobile Team + AI/ML Team  

---

## Overview

AI Social Features bring intelligent automation to community management and discovery. Discord has invested heavily in ML-based spam moderation, friend recommendations, and content ranking. Hearth currently has only basic keyword-based moderation (40% parity). This PRD delivers AI-powered recommendations and automated moderation tools.

---

## Problem Statement

Hearth Mobile lacks intelligent automation that reduces friction for users and burden on moderators:
- Spam and abuse require manual moderator intervention
- New users struggle to discover relevant communities
- Friend recommendations are based only on explicit connections
- Content ranking is chronological, not quality-weighted

---

## User Stories

### As a Server Admin
- I can enable AI moderation with customizable sensitivity
- I can review AI action logs and override decisions
- AI auto-removes spam, harassment, and policy violations
- I get weekly moderation insights and reports

### As a User
- I receive personalized server and friend recommendations
- My feed shows relevant, high-quality content first
- I can use AI-powered search to find communities
- I can mute/block AI recommendations if preferred

### As a Platform
- We can detect and remove spam accounts automatically
- We can rank healthy communities higher in discovery
- We can identify trending communities before they go viral
- We can detect coordinated ban evasion

---

## Feature Requirements

### AI-001: AI-Powered Content Moderation
- Real-time message scanning (text + image)
- Automated actions: warn, mute, kick, ban (configurable by admin)
- Severity scoring (1-10) for moderator review queue
- Learning from admin override decisions (feedback loop)
- Support for custom word lists + global policy rules

### AI-002: Spam & Abuse Detection
- Account behavior analysis (creation date, activity patterns)
- Message velocity detection (spam burst detection)
- Invitation link spam detection
- Coordinated ban evasion detection (fingerprinting)
- Fake engagement detection (coordinated upvotes/reactions)

### AI-003: Personalized Discovery & Recommendations
- Server recommendations based on: interests, friends' memberships, activity patterns
- "People You May Know" friend suggestions (mutual servers + contacts)
- Trending servers in user's interest graph
- #Discover tab: personalized "For You" section
- Recommendation explanation ("Because you joined X")

### AI-004: Content Quality Ranking
- Quality score for messages (engagement, recency, relevance)
- "Best" sort option for channels (quality-ranked vs chronological)
- Reply thread quality highlighting
- Suppression of low-quality/off-topic content in search

### AI-005: Moderation Dashboard & Insights
- AI action log with full context
- Weekly community health report (growth, churn, moderation stats)
- Moderator performance metrics
- Anomaly detection (sudden spike in reports, new members)

### AI-006: AI Companion Chat (Optional Future)
- AI bot that can answer server questions
- Personal AI assistant for DM organization
- Smart notification summaries

---

## Technical Approach

### Architecture
- **Moderation**: Fine-tuned LLM (Llama 3-based) for content classification
- **Recommendations**: Collaborative filtering + interest graph (matrix factorization)
- **Spam Detection**: Gradient boosting (XGBoost) on account behavioral features
- **Ranking**: Learning-to-rank model (LambdaMART) for content quality

### Key Technical Decisions
- **Moderation Latency**: <500ms for message classification (async queue + cache)
- **Privacy**: On-device classification for DMs; server-side for public channels
- **Bias Monitoring**: Weekly fairness audits on AI decisions
- **Human Override**: All AI actions are overridable; 1% sampled for review

### Infrastructure
- Existing ML inference infrastructure (or new if needed)
- Kafka queue for async moderation pipeline
- Redis cache for recommendation results
- Feature store (Feast) for real-time feature serving

### Dependencies
- ML platform deployment (GPU instances)
- Feedback loop data pipeline
- Privacy/compliance review (GDPR, CCPA)
- Mobile SDK for on-device classification (optional)

### Risks
- False positive moderation — mitigated by configurable sensitivity + override
- Recommendation bubble / filter bubble — transparency controls
- Model bias — regular fairness audits, diverse training data
- Cost at scale — optimize inference, cache aggressively

---

## Metrics & Success Criteria

- AI moderation active on 100+ servers within 60 days of launch
- <2% false positive rate on automated actions (admin-confirmed)
- Recommendation CTR >15% (click-through on recommended servers)
- 25% reduction in moderator workload on AI-enabled servers
- Spam account creation reduced by 60%

---

## Out of Scope
- AI-generated content / chat bots in channels
- Audio/video content moderation
- Predictive churn modeling
- Ad targeting / behavioral advertising
- Sale of user data to third parties
