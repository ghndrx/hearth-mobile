# PRD: Biometric Age Verification System

**Document ID**: PRD-024
**Author**: Competitive Intelligence Engine
**Date**: March 25, 2026
**Status**: Draft
**Priority**: P0 - Critical for competitive parity

## Executive Summary

Implement a comprehensive biometric age verification system to ensure compliance with global age assurance regulations while maintaining user privacy through on-device processing. This addresses Discord's recent rollout of mandatory age verification and positions Hearth Mobile as a privacy-first platform.

## Problem Statement

### Current State
- Hearth Mobile lacks age verification mechanisms
- No biometric authentication options
- Limited compliance with emerging age assurance regulations
- Potential regulatory and safety risks for underage users

### Competitive Gap
Discord has implemented a "teen-by-default" policy requiring:
- Facial Age Estimation (FAE) with on-device processing
- ID verification as alternative method
- Restricted access for unverified users
- Privacy-first approach with no data leaving device

## Success Metrics

### Primary KPIs
- **Verification Completion Rate**: >85% of users complete age verification within 7 days
- **False Positive Rate**: <2% for facial age estimation
- **Privacy Compliance**: 100% on-device processing with zero data transmission
- **User Satisfaction**: >4.0/5.0 rating for verification experience

### Secondary KPIs
- Time to complete verification: <2 minutes average
- Support ticket reduction: 30% fewer age-related inquiries
- Regulatory compliance score: 100% across target markets

## User Stories

### As a New User
- I want to quickly verify my age using facial recognition so I can access all features
- I want my biometric data to remain private and never leave my device
- I want alternative verification methods if facial recognition fails

### As a Parent
- I want assurance that my teen cannot bypass age restrictions
- I want clear information about what data is collected and how it's used
- I want easy oversight of my teen's account restrictions

### As a Compliance Officer
- I want automated age verification that meets regulatory requirements
- I want detailed audit logs for verification attempts
- I want configurable restrictions based on user age

## Technical Requirements

### Core Features
1. **On-Device Facial Age Estimation**
   - ML model for age estimation (18+ detection)
   - Real-time processing using device camera
   - No image data transmission to servers
   - Fallback to ID verification if confidence <85%

2. **ID Verification System**
   - Government-issued ID upload and parsing
   - OCR and validation of age information
   - Secure document processing with immediate deletion
   - Support for 50+ international document types

3. **Age-Gated Content Controls**
   - Server/channel access restrictions
   - NSFW content filtering
   - DM restrictions for unverified users
   - Activity logging for compliance

### Platform-Specific Implementation

#### iOS
- CoreML for on-device age estimation
- Vision framework for document scanning
- Face ID/Touch ID integration for verification confirmation
- iOS 15+ privacy manifest compliance

#### Android
- TensorFlow Lite for ML inference
- CameraX for document capture
- Biometric authentication API integration
- Android 12+ privacy dashboard support

## Privacy & Security

### Data Protection
- Zero biometric data storage or transmission
- Encrypted verification status only
- Immediate deletion of uploaded documents
- GDPR/CCPA compliant data handling

### Security Measures
- Liveness detection to prevent spoofing
- Document authenticity verification
- Rate limiting on verification attempts
- Audit trail for all verification events

## Implementation Plan

### Phase 1: Foundation (4 weeks)
- Week 1-2: ML model integration and testing
- Week 3: ID verification infrastructure
- Week 4: Basic UI/UX implementation

### Phase 2: Integration (3 weeks)
- Week 5: Age-gated content system integration
- Week 6: Platform-specific optimizations
- Week 7: Security and privacy hardening

### Phase 3: Launch (2 weeks)
- Week 8: Beta testing with compliance review
- Week 9: Production rollout and monitoring

## Risks & Mitigations

### High Risk
- **ML Model Accuracy**: Continuous model training and human oversight
- **Privacy Regulations**: Legal review for all target markets
- **User Adoption**: Clear communication and incentives

### Medium Risk
- **Technical Integration**: Phased rollout with feature flags
- **Device Compatibility**: Graceful fallbacks for older devices

## Open Questions

1. Should we implement progressive verification (gradual access)?
2. What verification methods for users without compatible devices?
3. How to handle verification for shared devices?
4. Integration timeline with existing authentication system?

## Appendix

### Competitive Analysis
- Discord: On-device FAE with ID fallback
- Instagram: ID verification only
- TikTok: Age estimation with manual review

### Regulatory Landscape
- UK Online Safety Act requirements
- EU Digital Services Act compliance
- California Age-Appropriate Design Code