# Hearth Mobile

Native iOS and Android client for Hearth chat platform built with React Native and Expo.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📱 Features

### Authentication
- **Login Screen** with email/password authentication
- **Register Screen** with comprehensive validation
- **Biometric Authentication** (Face ID, Touch ID, fingerprint)
- **Social Login** placeholders (Google, Apple, Discord)
- **Password Recovery** flow
- **Email Verification** support

### Navigation
- **Expo Router** for file-based routing
- **Protected Routes** with auth guards
- **Deep Linking** support
- **Quick Actions** (iOS/Android home screen shortcuts)
- **Spotlight/Siri** integration (iOS)

### UI Components
- **Button**: Multiple variants (primary, secondary, danger, ghost) and sizes
- **Input**: Text input with label, error states, and icons
- **Card**: Flexible card container with optional title/subtitle
- **PasswordInput**: Secure password field with show/hide toggle
- **Alert**: Error and success message banners
- **LoadingSpinner**: Consistent loading indicators
- And 20+ more specialized components

### Design System
- **NativeWind** (Tailwind CSS for React Native)
- **Dark Mode** fully supported
- **Consistent Branding** with theme colors
- **Responsive** layouts
- **Animations** for better UX

## 🏗️ Architecture

```
hearth-mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Authentication flow
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── ...
│   ├── (tabs)/              # Main app tabs
│   ├── chat/                # Chat screens
│   ├── server/              # Server screens
│   └── _layout.tsx          # Root layout
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── animations/          # Animation components
│   ├── chat/                # Chat-specific components
│   └── ...
├── lib/
│   ├── stores/              # Zustand state management
│   ├── services/            # API and platform services
│   ├── contexts/            # React contexts
│   └── types/               # TypeScript types
└── assets/                  # Images, fonts, etc.
```

## 🛠️ Tech Stack

- **React Native** 0.76.0
- **Expo** ~52.0.0
- **TypeScript** ^5.9.3
- **Expo Router** ~4.0.0 (navigation)
- **TanStack Query** ^5.0.0 (data fetching)
- **Zustand** ^5.0.0 (state management)
- **NativeWind** ^4.0.0 (styling)
- **React Native Reanimated** (animations)
- **Expo Local Authentication** (biometrics)

## 📝 Scripts

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Run on Android device/emulator
npm run ios            # Run on iOS device/simulator
npm run web            # Run in web browser

# Code Quality
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint
npm run format         # Prettier formatting
npm test               # Jest tests

# Build
npm run build:ios      # Build for iOS (EAS)
npm run build:android  # Build for Android (EAS)
npm run build:all      # Build for all platforms
```

## 🎨 Styling

This project uses **NativeWind** (Tailwind CSS for React Native):

```tsx
// Example component
<View className="flex-1 bg-white dark:bg-dark-900">
  <Text className="text-xl font-bold text-gray-900 dark:text-white">
    Hello World
  </Text>
</View>
```

Custom theme colors:
- `bg-brand` - Primary brand color
- `bg-dark-*` - Dark mode palette
- `text-dark-*` - Dark mode text colors

## 🔐 Authentication

The app uses a comprehensive auth flow:

1. **Login**: Email/password with validation
2. **Register**: Username, email, password with requirements
3. **Biometric**: Face ID/Touch ID/Fingerprint
4. **Recovery**: Forgot password flow
5. **Verification**: Email verification support

Auth state is managed via Zustand and persisted with `@react-native-async-storage/async-storage`.

## 📦 Key Dependencies

- `expo-router` - File-based navigation
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `nativewind` - Tailwind CSS styling
- `expo-local-authentication` - Biometric auth
- `react-native-safe-area-context` - Safe area handling
- `react-native-gesture-handler` - Touch gestures
- `react-native-reanimated` - Smooth animations

## 🧪 Testing

```bash
npm test              # Run tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

## 📱 Platform Support

- ✅ iOS 13+
- ✅ Android 6.0+ (API 23+)
- ✅ Web (limited support)

## 🚢 Deployment

Uses **EAS Build** for app distribution:

```bash
# Build for production
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## 📄 License

Private - Hearth Platform

## 👥 Contributing

This is a private project. Contact the team for contribution guidelines.

---

Built with ❤️ using React Native and Expo
