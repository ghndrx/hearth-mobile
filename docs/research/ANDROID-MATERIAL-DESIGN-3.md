# Android Material Design 3 Patterns for Chat Apps

**Research Date:** February 27, 2026  
**Focus:** Material Design 3 & M3 Expressive for messaging applications

## Overview

Material Design 3 (MD3), also known as "Material You," introduced significant design changes focused on personalization, accessibility, and expressive UI. The recent **Material 3 Expressive** update (2025) adds even more personality with containers, floating toolbars, and morphing elements.

---

## Core M3 Concepts for Chat Apps

### 1. Dynamic Color System

MD3's defining feature is the **dynamic color system** - extracting tonal palettes from the user's wallpaper.

#### Color Roles
```
Primary         → Main components, prominent buttons, active states
Secondary       → Less prominent components (filter chips)
Tertiary        → Contrasting accents, balance primary/secondary
Container       → Fill color for foreground elements
Surface         → Backgrounds, large low-emphasis areas
```

#### Chat-Specific Color Mapping
```kotlin
// Example from Stream SDK
ownMessagesBackground = scheme.secondaryContainer
otherMessagesBackground = scheme.tertiaryContainer
primaryAccent = scheme.primary
inputBackground = scheme.surfaceVariant
appBackground = scheme.background
barsBackground = scheme.secondaryContainer
```

#### Implementation for React Native
```typescript
// Check for Android 12+ dynamic colors
const useDynamicColors = Platform.OS === 'android' && 
                         Platform.Version >= 31;

// Fall back to custom theme
const colorScheme = useDynamicColors 
  ? await getDynamicColorScheme() 
  : defaultLightScheme;
```

### 2. Material 3 Expressive (2025-2026)

Google's latest evolution brings:

#### Containers Everywhere
- **Conversation lists** placed in rounded containers
- **Message threads** enclosed in containers with curved corners
- **Settings/menus** use container grouping
- Background layer shows through with app bar

#### Google Messages Implementation
- Message thread in container with curved top corners
- Solid color backgrounds (replaced bubbly wallpaper)
- Plus menu buttons in pill-shaped containers
- Spacious grid layout for attachments

#### Floating Toolbars
```
┌─────────────────────────────────┐
│  [Home] [DMs] [Sections] [★]   │  ← Pill highlights active tab
│                                 │
│  ┌─────────────────────────┐   │
│  │   Conversation List     │   │  ← Container
│  │   ...                   │   │
│  └─────────────────────────┘   │
│                                 │
│        [  FAB  ]               │
└─────────────────────────────────┘
```

### 3. Bottom Navigation & FAB

#### M3 Expressive Pattern
- **Shorter bottom bar** (reduced height from Material You)
- **FAB integration** - FAB sits directly in bottom bar
- **Pill-shaped indicators** for active tab
- **Morphing buttons** - shape changes on selection

#### Chat App Example (Google Chat)
```
┌─────────────────────────────────┐
│ Floating toolbar with tabs      │
│ [Chat] [Spaces] [Meet]          │
│                                 │
│ Content container               │
│                                 │
├─────────────────────────────────┤
│ [icon] [icon] [+compose]        │  ← Short bar with embedded FAB
└─────────────────────────────────┘
```

### 4. FAB Menu (Speed Dial)

M3 Expressive formalizes the FAB menu pattern:

```
Primary FAB tap expands to:
┌──────────────┐
│ [Photo]      │
│ [Camera]     │
│ [Voice]      │
│ [Location]   │
└──────────────┘
      ↑
  [  +  ]  ← Main FAB
```

Used in:
- Google Keep (text, list, voice note)
- Google Calendar (event, task, out of office)
- Google Drive (upload, scan, folder)

### 5. Message Bubbles & Containers

#### MD3 Approach
```
Own messages:        scheme.secondaryContainer
Other messages:      scheme.tertiaryContainer
Deleted messages:    scheme.onError background
Link backgrounds:    scheme.primaryContainer
```

#### Shape Language
- **Rounded corners** on all containers
- **Larger corner radius** than MD2 (16-24dp typical)
- **Consistent radius** across related elements

### 6. Typography

MD3 uses Google Sans and Roboto with:
- **Display** - Large hero text
- **Headline** - Section headers  
- **Title** - List item primary text
- **Body** - Message content
- **Label** - Timestamps, metadata

#### Chat-Specific
```
Message text:    Body Large (16sp)
Timestamp:       Label Small (11sp)
Sender name:     Title Small (14sp, medium weight)
```

---

## React Native Implementation

### Recommended Library: React Native Paper

React Native Paper provides the most comprehensive MD3 implementation:

```bash
npm install react-native-paper react-native-vector-icons
```

```typescript
import { MD3LightTheme, Provider } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Custom chat colors
    ownMessage: MD3LightTheme.colors.secondaryContainer,
    otherMessage: MD3LightTheme.colors.tertiaryContainer,
  },
};

<Provider theme={theme}>
  <App />
</Provider>
```

### Dynamic Color on Android 12+

```typescript
import { DynamicColorIOS } from 'react-native';
import { 
  useMaterial3Theme 
} from '@pchmn/expo-material3-theme';

function App() {
  const { theme } = useMaterial3Theme();
  
  return (
    <PaperProvider theme={theme}>
      {/* App content */}
    </PaperProvider>
  );
}
```

### Component Patterns

#### Search App Bar (M3 Expressive)
```
┌─────────────────────────────────────┐
│ [☰]  Search messages...    [👤]    │
└─────────────────────────────────────┘
```
- Hamburger and profile OUTSIDE search field
- Thicker search bar
- Rounded pill shape

#### Bottom Sheet (Message Actions)
```typescript
<Portal>
  <Modal visible={visible}>
    <Surface style={styles.sheet}>
      <List.Item title="Reply" left={() => <Icon name="reply" />} />
      <List.Item title="Forward" left={() => <Icon name="forward" />} />
      <List.Item title="Copy" left={() => <Icon name="content-copy" />} />
      <Divider />
      <List.Item title="Delete" left={() => <Icon name="delete" />} />
    </Surface>
  </Modal>
</Portal>
```

---

## Implementation Checklist for Hearth

### Phase 1: Core MD3
- [ ] Configure React Native Paper with MD3 theme
- [ ] Implement dynamic color extraction (Android 12+)
- [ ] Set up color scheme with chat-specific roles
- [ ] Define typography scale

### Phase 2: Chat Components
- [ ] Message bubbles with container colors
- [ ] Conversation list with MD3 list items
- [ ] Bottom navigation with FAB
- [ ] Search app bar pattern

### Phase 3: M3 Expressive
- [ ] Floating toolbar for navigation
- [ ] Container-based layouts
- [ ] FAB menu for compose actions
- [ ] Pill-shaped action buttons
- [ ] Morphing selection indicators

### Phase 4: Polish
- [ ] Smooth transitions between states
- [ ] Loading indicators (contained style)
- [ ] Empty states with illustration
- [ ] Error states

---

## Key Differences from iOS HIG

| Aspect | iOS | Android MD3 |
|--------|-----|-------------|
| Colors | System accent + custom | Dynamic from wallpaper |
| Navigation | Tab bar (bottom) | Bottom nav + FAB |
| Bubbles | Gray/blue bubbles | Container colors |
| Typography | SF Pro | Roboto/Google Sans |
| Shapes | Rounded rect | More rounded, pills |
| Actions | Swipe gestures | Bottom sheet menus |

---

## Resources

### Official
- [Material Design 3](https://m3.material.io/)
- [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Dynamic Color Overview](https://m3.material.io/styles/color/dynamic-color/overview)

### Libraries
- [React Native Paper](https://callstack.github.io/react-native-paper/) - MD3 implementation
- [expo-material3-theme](https://github.com/nickmccurdy/expo-material3-theme) - Dynamic colors for Expo
- [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/) - Generate themes

### Open Source References
- [Signal Android](https://github.com/signalapp/Signal-Android) - Custom design language
- [Google Messages patterns](https://9to5google.com/2025/08/26/google-messages-chat-redesign/) - M3 Expressive implementation

---

## Notes for Cross-Platform

When building with React Native for both iOS and Android:

1. **Respect platform conventions** - Use MD3 on Android, HIG on iOS
2. **Share layout logic** - Keep component structure similar
3. **Platform-specific theming** - Switch color systems per platform
4. **Test gestures** - Android users expect bottom sheets, iOS users expect swipes

```typescript
const theme = Platform.select({
  android: androidMD3Theme,
  ios: iosTheme,
});
```

This allows Hearth to feel native on both platforms while sharing most code.
