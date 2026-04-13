# AGENTS.md — Hearth mobile (Expo + React Native)

## Stack
- Expo SDK + expo-router in `app/`
- React Native + TypeScript
- NativeWind (Tailwind for RN)
- EAS Build for production binaries
- Default branch: `main`

## Commands
- Dev: `pnpm start` (Metro) or `pnpm ios` / `pnpm android`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Tests: `pnpm test` (Jest)
- Build: `pnpm build:ios` / `pnpm build:android` (EAS)

## Conventions
- Commit format: Conventional Commits.
- Branch from `main`, name `feat/<feature-id>`.
- Routes in `app/`, shared lib in `lib/`, components in `lib/components/`.
- Use expo-router file-based routing, not React Navigation directly.
- Styling via NativeWind className, not inline StyleSheet unless dynamic.

## Do not touch without explicit task
- `eas.json` — build profiles tied to provisioning
- `app.json` — bundle ids, entitlements, push cert references
- `ios/` / `android/` native dirs if present — managed by Expo prebuild

## Security
- No secrets in source. API endpoints from `expo-constants` extras.
- Secure storage via `expo-secure-store`, not AsyncStorage.
- Push tokens via Expo's push service, not raw APNs/FCM.

## Hearth-specific
- Thin client over the Hearth server API; parity with web/desktop is the goal.
- Offline message queue + optimistic UI are first-class — don't assume network.
- Voice channels use LiveKit React Native SDK.
