# iOS Human Interface Guidelines for Chat Apps

**Research Date:** February 25, 2026  
**Focus:** Apple HIG principles applied to Hearth mobile chat interface

---

## Table of Contents
1. [Core HIG Principles](#core-hig-principles)
2. [iOS 26 Liquid Glass Design](#ios-26-liquid-glass-design)
3. [Navigation Patterns](#navigation-patterns)
4. [Chat-Specific UI Components](#chat-specific-ui-components)
5. [Gesture Patterns](#gesture-patterns)
6. [Keyboard & Input Handling](#keyboard--input-handling)
7. [Typography & Colors](#typography--colors)
8. [Accessibility](#accessibility)
9. [Implementation Recommendations](#implementation-recommendations)

---

## Core HIG Principles

Apple's Human Interface Guidelines are built on four foundational pillars:

### 1. Clarity
- Keep UI clean, precise, and uncluttered
- Limited number of elements to prevent confusion
- Clear, recognizable instructions, symbols, and icons
- **For Hearth:** Message bubbles should be immediately distinguishable (sent vs received)

### 2. Consistency
- Use standard UI elements and visual cues
- Familiar patterns for iOS users
- **For Hearth:** Follow iMessage conventions where appropriate (blue/gray bubbles, swipe gestures)

### 3. Deference
- UI elements shouldn't distract from essential content (messages)
- Users should identify the most important elements
- **For Hearth:** Messages are the star; chrome should be minimal

### 4. Depth
- Use layers, shadows, and motion for clear hierarchy
- Guide user attention through visual hierarchy
- **For Hearth:** Overlays for reactions, context menus with subtle depth cues

---

## iOS 26 Liquid Glass Design

**Released 2025** - The most significant visual redesign since iOS 7.

### Key Features
1. **Translucent Elements**
   - Rounded, translucent UI components with "optical qualities of glass"
   - Refraction effects that react to motion, content, and inputs
   
2. **Dynamic Interactions**
   - Elements adapt to light and content
   - Simulate real-world glass effects
   
3. **Floating UI**
   - Toolbars and elements no longer pinned to device bezels
   - Appear as floating elements that adapt based on context

### Implications for Hearth
- Consider translucent navigation bars and tab bars
- Message composer could float above keyboard
- Use backdrop blur effects tastefully
- Ensure text remains legible against dynamic backgrounds

---

## Navigation Patterns

### Key Components for Chat Apps

| Component | Purpose | Hearth Usage |
|-----------|---------|--------------|
| **Status Bar** | System info (battery, connectivity) | Standard iOS behavior |
| **Navigation Bar** | Hierarchy navigation, back button | Channel name, participant info |
| **Tab Bar** | Main app sections | Chats, Contacts, Settings |
| **Modal Sheets** | Contextual actions | Compose new message, channel settings |
| **Search Bar** | Content discovery | Search messages/channels |

### Recommended Tab Structure
```
┌─────────────────────────────────────────────────┐
│  Chats  │  Contacts  │  Search  │  Settings     │
└─────────────────────────────────────────────────┘
```

---

## Chat-Specific UI Components

### Message List
- **Inverted scroll** - Newest messages at bottom
- **Auto-scroll** to bottom on new messages
- **Jump to bottom FAB** when scrolled up
- **Date separators** between message groups
- **Read indicators** (delivered, seen)

### Message Bubbles
- **Outgoing (self):** Blue/branded color, right-aligned
- **Incoming (others):** Gray/neutral, left-aligned
- **Grouping:** Consecutive messages from same sender grouped (tail on last only)
- **Timestamps:** Show on tap or inline for time gaps >5min

### Message Composer
Based on iMessage/WhatsApp patterns:
```
┌────────────────────────────────────────────────┐
│ [+] │ Message input with auto-grow │ [Send] │
└────────────────────────────────────────────────┘
```

Features:
- Auto-growing text input (1-5 lines typical max)
- Attachment button (camera, photos, files)
- Send button (enabled only when content exists)
- Typing indicator support

### Channel List
- **Conversation preview:** Avatar, name, last message, timestamp
- **Unread badges:** Count indicator
- **Swipe actions:** Archive, delete, mute, pin
- **Pull-to-refresh**

---

## Gesture Patterns

### Essential Chat Gestures

| Gesture | Action | Notes |
|---------|--------|-------|
| **Tap** | Select message, open link | Primary interaction |
| **Long press** | Context menu (react, reply, copy, delete) | 350-500ms duration |
| **Swipe right** | Reply to message | iMessage pattern |
| **Swipe left** | Delete/archive (channel list) | Destructive action |
| **Pull down** | Load earlier messages | With loading indicator |
| **Pinch** | Zoom media | Photos, videos |

### Long Press Context Menu (iOS 13+ style)
```
┌──────────────────┐
│ 😀 😍 😂 👍 👎 ❤️ │  ← Quick reactions
├──────────────────┤
│ Reply            │
│ Copy             │
│ Forward          │
│ Pin              │
│ Delete           │
└──────────────────┘
```

### Swipe-to-Reply (iMessage pattern)
- Swipe message right to initiate reply
- Visual feedback: message slides, reply indicator appears
- Threshold: ~50pt horizontal movement
- Haptic feedback on threshold

---

## Keyboard & Input Handling

### The Challenge
SwiftUI's keyboard handling for chat apps remains tricky. Key considerations:

### Approaches (2025 best practices)

#### 1. Pure SwiftUI (iOS 17+)
```swift
.safeAreaInset(edge: .bottom) {
    MessageComposer()
}
.scrollDismissesKeyboard(.interactively)
```
**Pros:** Native, simple  
**Cons:** Can lag during interactive dismiss, occasional gaps

#### 2. UIKit InputAccessoryView Wrapper
```swift
// UIViewControllerRepresentable wrapping inputAccessoryView
```
**Pros:** Smooth, battle-tested  
**Cons:** More complex, UIKit dependency

#### 3. Keyboard Manager Libraries
- `InputBarAccessoryView` (Nathan Tannar) - Popular, well-maintained
- Stream SDK's built-in handling

### Hearth Recommendation
For React Native (Hearth's likely stack):
- Use `react-native-keyboard-controller` or similar
- Implement `KeyboardAvoidingView` with care
- Test extensively on physical devices (simulators lie)

### Interactive Dismiss Requirements
- Composer should track keyboard frame during interactive drag
- No visual gap between composer and keyboard
- Smooth animation (60fps)

---

## Typography & Colors

### Typography
- **System Font:** San Francisco (automatically used)
- **Body text:** 17pt default
- **Timestamps:** 12-13pt, secondary color
- **Dynamic Type:** Support all sizes (accessibility requirement)

### Color Palette for Chat

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Outgoing bubble | Brand blue (#007AFF or custom) | Adjusted for contrast |
| Incoming bubble | #E5E5EA | #3A3A3C |
| Primary text | #000000 | #FFFFFF |
| Secondary text | #8E8E93 | #8E8E93 |
| Destructive | #FF3B30 | #FF453A |
| Background | #FFFFFF | #000000 |

### Dark Mode Requirements
- Test all UI elements in both modes
- Maintain WCAG 2.1 contrast ratios (4.5:1 for text)
- Consider OLED black (#000000) for true black mode

---

## Accessibility

### Requirements

1. **VoiceOver Support**
   - All interactive elements labeled
   - Message content readable
   - Actions announced

2. **Dynamic Type**
   - Support all text sizes
   - Test at largest accessibility sizes

3. **Reduce Motion**
   - Respect `UIAccessibility.isReduceMotionEnabled`
   - Provide alternatives to animations

4. **Color Contrast**
   - Minimum 4.5:1 for body text
   - Minimum 3:1 for large text

5. **Haptic Feedback**
   - Use system haptics appropriately
   - Don't rely solely on haptics for feedback

---

## Implementation Recommendations

### For React Native / Hearth

#### Message List
```typescript
// Use FlashList for performance
import { FlashList } from "@shopify/flash-list";

// Inverted list for chat
<FlashList
  inverted
  data={messages}
  estimatedItemSize={80}
  keyExtractor={(m) => m.id}
  renderItem={renderMessage}
/>
```

#### Gesture Handling
```typescript
// react-native-gesture-handler for swipe-to-reply
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const swipeGesture = Gesture.Pan()
  .activeOffsetX(20)
  .onUpdate((e) => {
    // Animate message position
  })
  .onEnd((e) => {
    if (e.translationX > 50) {
      // Trigger reply
    }
  });
```

#### Long Press Context Menu
- Use `react-native-context-menu-view` for native iOS feel
- Or build custom with `react-native-reanimated` + `react-native-gesture-handler`

### Screen Sizes to Support

| Device | Points |
|--------|--------|
| iPhone 16 Pro Max | 440 x 956 |
| iPhone 16/15 Pro | 393 x 852 |
| iPhone SE | 375 x 667 |

**Strategy:** Design for smallest (375pt width), test on largest

---

## Open Source References

### Signal iOS
- **Repo:** https://github.com/signalapp/Signal-iOS
- **Patterns:** Secure messaging, disappearing messages, reactions
- **UIKit-based** (not SwiftUI)

### Stream Chat SwiftUI
- **Repo:** https://github.com/GetStream/stream-chat-swiftui
- **Patterns:** Channel list, message list, composer, reactions
- **Excellent reference** for production chat UI

### Key Features to Study
1. Offline support & local storage
2. Optimistic UI updates
3. Message grouping logic
4. Typing indicators
5. Read receipts
6. Image/media handling

---

## Next Research Topics

1. **Push Notifications (APNs)** - Critical for chat engagement
2. **Offline-first Architecture** - Core to Hearth's CRDT approach
3. **React Native Performance** - Optimizing for 60fps scrolling
4. **Android Material Design 3** - Parity with iOS experience

---

## Summary

For Hearth mobile iOS:
1. **Follow HIG core principles** - Clarity, consistency, deference, depth
2. **Embrace Liquid Glass** cautiously - Translucency where it adds value
3. **Standard gestures** - Swipe reply, long press context, pull refresh
4. **Keyboard handling** requires UIKit bridge or robust RN library
5. **Accessibility first** - VoiceOver, Dynamic Type, contrast
6. **Study Signal & Stream** for production patterns
