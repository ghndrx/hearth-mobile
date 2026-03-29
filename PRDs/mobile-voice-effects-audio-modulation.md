# PRD: Voice Effects & Audio Modulation

**Document ID**: PRD-054
**Priority**: P2 (Medium)
**Target Release**: Q4 2026
**Owner**: Voice Engineering Team & Mobile UX Team
**Estimated Effort**: 10 weeks

## Executive Summary

Implement a voice effects and audio modulation system for Hearth Mobile, enabling users to apply real-time voice transformations during voice channels and for voice messages. This addresses a fun/engagement gap where Discord's voice effects drive significant community engagement and user expression, particularly in gaming and social communities.

## Problem Statement

### Current State
- No voice effects or audio modulation in Hearth Mobile
- Voice communication is plain and unremarkable
- Missing community engagement driver
- Gaming communities cannot use spatial voice effects
- No personality expression through voice

### User Pain Points
- **Boring Voice Chat**: Standard voice lacks fun and personality
- **Gaming Immersion**: Cannot roleplay or create atmosphere
- **Content Creation**: Streamers need voice modulation options
- **Accessibility**: Voice effects help some neurodivergent users
- **Community Building**: Effects drive server engagement and retention

### Competitive Analysis
**Discord (2026)**:
- 15+ voice effects: Robot, Void, Music, TV, Deep, Elastic, Morph, etc.
- Custom pitch and reverb controls
- Background noise presets (café, stadium, radio)
- Per-channel effect permissions
- Voice message voice effects

**Telegram**:
- Voice message speed control (0.5x - 2x)
- Audio effects for voice messages
- Basic pitch shift

**Clubhouse/Spaces**:
- Basic room audio effects
- Host-controlled sound effects

## Goals & Success Metrics

### Primary KPIs
- **Effect Usage**: 35% of voice users try at least one effect
- **Engagement Lift**: 20% increase in voice channel DAU when effects enabled
- **Server Retention**: 15% higher retention in servers with effects enabled
- **User Satisfaction**: 4.2/5 rating for voice features
- **Content Sharing**: 50% increase in voice message sharing with effects

### Secondary KPIs
- **Premium Effects**: 10% use premium effects (if monetized)
- **Effect Creation**: 5% create custom effect presets
- **Channel Boost**: Servers with effects see 25% more voice activity

## User Stories

### Epic 1: Voice Effects Library
**As a user, I want to choose from a library of voice effects so I can express myself and have fun in voice channels.**

```
Story 1.1: Effect Categories
- Character effects: Robot, Alien, Demon, Elf, Giant, Chipmunk
- Audio quality: Radio, Phone, TV, Cassette, Vinyl
- Atmosphere: Stadium, Cave, Concert, Underwater
- Fun: Echo, Reverb, Chorus, Flanger
- Accessibility: Clarity boost, Slow speech, Pitch adjust

Story 1.2: Effect Preview
- Tap effect to hear preview in own voice
- Real-time preview while adjusting
- Preview continues while browsing other effects

Story 1.3: Effect Switching
- Quick-switch via voice channel toolbar
- Long-press for recent effects
- Favorite effects pinned to top
```

### Epic 2: Custom Audio Controls
**As a power user, I want fine-grained audio controls so I can create custom voice styles.**

```
Story 2.1: Pitch & Speed
- Pitch adjustment: -12 to +12 semitones
- Speed adjustment: 0.5x to 2.0x
- Independent or linked controls
- Real-time preview

Story 2.2: Reverb & Effects Chain
- Room size: small/medium/large/hall
- Reverb amount: 0-100%
- Echo delay: 50ms - 500ms
- Multiple effects can stack

Story 2.3: Preset Management
- Save custom presets with names
- Share presets with friends
- Import community presets
- Default preset option
```

### Epic 3: Voice Message Effects
**As a user, I want to add effects to voice messages so I can send fun and creative audio.**

```
Story 1.1: Record with Effects
- Select effect before recording voice message
- Real-time effect applied during recording
- Hear own transformed voice while recording

Story 3.2: Post-Recording Effects
- Apply effect to existing recording
- Change effect before sending
- Remove effects to send original

Story 3.3: Effect on Voice Messages
- Tap to hear original vs effect
- Quality preserved through processing
- Effect metadata attached to message
```

### Epic 4: Channel & Server Controls
**As a server admin, I want to control voice effects in my community so I can maintain the atmosphere I want.**

```
Story 4.1: Channel Effect Permissions
- Enable/disable effects per voice channel
- Set allowed effect categories per channel
- Require approval for certain effects
- Effect cooldown timers

Story 4.2: Server-Wide Settings
- Default effect for server
- Server effect presets
- Premium effect access for nitro members
- Effect leaderboard/stats

Story 4.3: Moderation Tools
- See which effects users are using
- Report misuse of effects
- Mute user's effects temporarily
```

### Epic 5: Accessibility Applications
**As a user with accessibility needs, I want voice effects for practical purposes so I can communicate more effectively.**

```
Story 5.1: Clarity Enhancement
- Voice clarity boost for hearing-impaired
- Automatic volume normalization
- Reduce background noise emphasis
- Speech rate adjustment

Story 5.2: Communication Aid
- Slower speech for processing difficulties
- Pitch adjustment for comfort
- Consistent voice output
- Reduce anxiety about voice
```

## Technical Requirements

### Audio Processing Pipeline
```typescript
interface VoiceEffect {
  id: string;
  name: string;
  category: 'character' | 'quality' | 'atmosphere' | 'fun' | 'accessibility';
  parameters: EffectParameter[];
  processingType: 'realtime' | 'recorded';
  cpuUsage: 'low' | 'medium' | 'high';
  networkRequired: boolean;
}

interface EffectChain {
  effects: VoiceEffect[];
  pitchShift: number;    // semitones
  speedChange: number;   // multiplier
  reverb: ReverbParams;
  eq: EQBand[];
}
```

### Platform Requirements

**iOS**:
- AVAudioEngine for real-time processing
- AVAudioUnit effects (reverb, delay, pitch shift)
- Custom audio units for specialized effects
- Core ML for future AI-based effects

**Android**:
- AAudio / Oboe for low-latency audio
- OpenSL ES or AAudio effects
- Custom FFmpeg filters for complex effects
- VPIO or similar for pitch shifting

### Real-Time Requirements
- **Latency**: <50ms from voice input to output
- **CPU Usage**: <25% on mid-range devices
- **Battery Impact**: <8% additional drain during voice
- **Quality**: 48kHz sample rate maintained

### Effect Categories Implementation

**Character Effects** (Pitch + Formant):
```javascript
// Example: Robot effect
- Pitch shift: -7 semitones
- Formant shift: -3 semitones  
- Add tremolo: 15Hz, 30% depth
- Add bitcrush: 4-bit, 8kHz sample rate
```

**Quality Effects** (Filtering + Distortion):
```javascript
// Example: Radio effect
- Bandpass filter: 300Hz - 3kHz
- Add noise: -20dB static
- Compress: 4:1 ratio
- High shelf rolloff: -6dB above 4kHz
```

**Atmosphere Effects** (Reverb + Delays):
```javascript
// Example: Stadium effect
- Large reverb: 3.5s decay
- Stereo delay: 75ms L, 100ms R
- Chorusing: subtle pitch modulation
- Noise floor: crowd ambiance
```

## Implementation Plan

### Phase 1: Foundation (3 weeks)
- Audio processing engine integration
- Basic pitch and speed controls
- Effect selection UI
- Real-time preview system

### Phase 2: Core Effects (4 weeks)
- Implement character effects (5 effects)
- Implement quality effects (4 effects)
- Implement atmosphere effects (3 effects)
- Effect switching during voice

### Phase 3: Voice Messages & Advanced (3 weeks)
- Voice message effect recording
- Custom preset creation
- Channel permission integration
- Advanced accessibility effects

## UI/UX Specifications

### Voice Channel Toolbar
- Circular button with current effect icon
- Tap to open effect picker
- Long-press for recent effects
- "No effect" option always visible

### Effect Picker Modal
- Bottom sheet, 60% screen height
- Category tabs at top
- Horizontal scroll for effects within category
- Large effect preview thumbnails
- Current effect highlighted
- "Apply" and "Cancel" buttons

### Settings Integration
- Privacy & Voice > Voice Effects
- Default effect selection
- Custom preset management
- Accessibility options
- Effect quality setting (battery saver mode)

### Effect Preview
- Modal opens with microphone active
- User hears their transformed voice
- "This is how you sound" sample
- Tap different effects to hear comparison
- Smooth crossfade between effects

## Success Criteria

### Must Have
- [ ] 10+ voice effects functional in real-time
- [ ] Pitch and speed controls work smoothly
- [ ] Effect switching during voice with <100ms transition
- [ ] Voice message recording with effects
- [ ] Channel-level effect permissions

### Should Have
- [ ] Custom preset saving (up to 10)
- [ ] Effect preview before applying
- [ ] Effect usage analytics
- [ ] Battery optimization mode

### Could Have
- [ ] Community preset sharing
- [ ] AI-powered effect suggestions
- [ ] Spatial effect positioning
- [ ] Premium effect marketplace

## Risks & Mitigation

### Technical Risks
- **CPU Overload**: Too many effects cause lag
  - *Mitigation*: Effect bundling, device capability detection, graceful degradation
- **Audio Quality**: Effects degrading voice clarity
  - *Mitigation*: High-quality processing, optional "clarity mode"
- **Latency**: Effects causing voice delay
  - *Mitigation*: Proper buffer management, <50ms target

### User Experience Risks
- **Annoyance**: Users spamming effects in serious channels
  - *Mitigation*: Per-channel permissions, mute effect option
- **Accessibility Misuse**: Effects hiding harmful content
  - *Mitigation*: No effect on reported/blocked users' voice

---

**Created**: March 29, 2026
**Last Updated**: March 29, 2026
**Next Review**: April 5, 2026
