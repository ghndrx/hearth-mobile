# Hearth Mobile

Native iOS and Android client for [Hearth](https://github.com/greghendrickson/hearth) chat platform, built with React Native + Expo.

## Features

- 📱 **Native Performance** — True native UI components
- 🔔 **Push Notifications** — Real-time message alerts
- 🎨 **Platform-Adaptive** — iOS and Android design patterns
- 📷 **Media Sharing** — Camera integration, image picker
- 🔐 **Biometric Auth** — Face ID / Touch ID / Fingerprint
- 🌙 **Dark Mode** — System-aware theming
- 📴 **Offline Support** — Message queue, local caching

## Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
- **Navigation:** React Navigation 7
- **State:** Zustand + React Query
- **Styling:** NativeWind (Tailwind for RN)
- **Build:** EAS Build

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run on physical device
pnpm start --dev-client
```

### Building

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build both
eas build --platform all
```

## Project Structure

```
hearth-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/             # Auth screens
│   ├── (tabs)/             # Main tab navigation
│   └── _layout.tsx         # Root layout
├── components/             # Reusable components
│   ├── ui/                 # Base UI components
│   ├── chat/               # Chat-specific components
│   └── server/             # Server/channel components
├── lib/
│   ├── api/                # API client
│   ├── stores/             # Zustand stores
│   ├── hooks/              # Custom hooks
│   └── utils/              # Utilities
├── assets/                 # Images, fonts
├── app.json                # Expo config
├── eas.json                # EAS Build config
└── package.json
```

## Related

- [Hearth](https://github.com/greghendrickson/hearth) — Backend + Web client
- [Hearth Desktop](https://github.com/greghendrickson/hearth-desktop) — Desktop app

## License

MIT
