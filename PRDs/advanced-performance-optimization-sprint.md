# PRD-018: Performance Optimization Sprint (React Native)

**Version**: 1.0  
**Date**: March 24, 2026  
**Priority**: P0  
**Target**: Q2 2026  
**Effort**: 6 weeks  

---

## 1. Problem Statement

Discord's March 2026 patch notes highlighted a ~12% TTI (Time to Interactive) reduction from CSS selector optimization alone. User research shows that every 1 second of app load time costs ~7% in conversion. Hearth Mobile, built on React Native/Expo, has accumulated technical debt in rendering performance, JavaScript bundle size, and memory usage — particularly on lower-end Android devices. Without a dedicated performance sprint, these issues will compound as features are added.

---

## 2. Vision & Principles

- **Measured**: Every optimization is backed by before/after metrics
- **Device-inclusive**: Performance improvements target mid-range Android (the minimum spec bar)
- **Continuous**: Performance budgets enforced in CI, not just one-time fixes
- **Battery-conscious**: Performance gains must not increase power consumption

---

## 3. Target Metrics

| Metric | Current (Est.) | Target |
|---|---|---|
| Cold start TTI | ~3.5s | <2.0s |
| Warm start | ~800ms | <300ms |
| JS Bundle Size | ~4.2MB | <2.5MB |
| Memory (idle) | ~280MB | <180MB |
| Message list scroll FPS | ~45fps | 60fps |
| Voice channel join time | ~2.5s | <1.0s |

---

## 4. Feature Requirements

### 4.1 Cold Start Optimization
- ** Hermes engine tuning**: Enable Hermes bytecode caching, precompile JS on build
- **Lazy loading**: Defer non-critical screens (Settings, Profile, App Directory) until needed
- **Splash screen**: Reduce splash-to-first-paint; show skeleton loaders immediately
- **EAS Build profile tuning**: Enable `productionClientEnv` with Hermes optimizations
- **Font preloading**: Only load fonts actually used on first screen

### 4.2 JavaScript Bundle Reduction
- **Tree shaking audit**: Run bundle analyzer, remove unused code and heavy dependencies
  - Replace `moment.js` → `date-fns` (saves ~70KB)
  - Remove `lodash` full import → individual imports (saves ~50KB)
- **Code splitting**: Per-screen bundles loaded on navigation (React Navigation v6 lazy config)
- **Asset optimization**: Convert PNGs to WebP; lazy-load non-critical images
- **Native module audit**: Remove unused native modules from Expo prebuild

### 4.3 Rendering Performance
- **React.memo / useMemo / useCallback audit**: Wrap all list items and heavy components
- **Virtualized lists**: Ensure FlatList/FlashList used everywhere; replace any ScrollView with fixed height
- **Animation optimization**: Use `react-native-reanimated` for 60fps animations; avoid Animated API for complex sequences
- **Image caching**: Implement `expo-image` with aggressive disk caching for avatars and media
- **Skeleton loaders**: Replace spinners with content-shaped skeletons to reduce perceived load time

### 4.4 Memory Management
- **Memory leak fixes**: Audit `useEffect` cleanup functions; fix unremoved event listeners
- **Voice channel cleanup**: Ensure LiveKit sessions fully tear down on leave
- **Image memory cap**: Limit decoded image cache to 100MB
- **Navigation state pruning**: Clear old navigation state on deep navigation chains

### 4.5 Voice Channel Performance
- **LiveKit connection tuning**: Optimize ICE candidate gathering, use TURN for reliability
- **Audio focus**: Properly handle audio ducking when other apps play audio
- **Background mode**: Reduce battery drain when in backgrounded voice channel
- **Reconnection logic**: Auto-reconnect within 3 seconds of network recovery

### 4.6 CI Performance Budgets
- **Bundle size check**: PR fails if JS bundle grows by >5KB
- **Crash-free rate**: Must maintain >99.5% crash-free sessions
- **Memory regression**: New code cannot increase memory footprint by >10%
- **Perf test harness**: Simulate cold start on CI using Android emulator snapshot

---

## 5. Technical Approach

### Tools
- `expo-dev-client` + Flipper for native debugging
- `react-native-bundle-visualizer` for bundle analysis
- `react-native-performance` for runtime profiling
- Android Profiler + Xcode Instruments for native performance
- Webpack bundle analyzer for JS (via `expo customize`)

### Process
1. **Week 1**: Profiling sprint — instrument all screens, collect baseline metrics on 3 test devices (low/mid/high)
2. **Week 2**: Bundle reduction — tree shaking, dependency audit, code splitting
3. **Week 3**: Cold start + splash optimization
4. **Week 4**: Rendering / list virtualization audit
5. **Week 5**: Memory leak fixes + voice channel tuning
6. **Week 6**: CI perf budgets + regression testing

### Test Devices (Minimum Spec)
- Low: Moto G Power (2021) / Galaxy A12 — Android 11, 3GB RAM
- Mid: Pixel 5 / Galaxy S21 — Android 13, 8GB RAM
- High: iPhone 14 / Galaxy S23 — iOS 16 / Android 14

---

## 6. Out of Scope

- Backend performance (separate infrastructure audit)
- Network latency optimization (CDN/routing changes)
- Native module rewrites in Rust (future consideration)
- Offline performance (covered by offline mode PRD)

---

## 7. Success Metrics

- Cold start TTI <2s on mid-range devices ✅
- JS bundle <2.5MB production ✅
- 60fps scroll on message lists ✅
- <1% ANR rate in production ✅
- Memory <180MB idle on mid-range Android ✅
- Voice channel join <1s ✅

---

## 8. Dependencies

- Expo SDK up to date (confirm latest stable)
- EAS Build configured for production builds
- LiveKit client library v1.x (latest)
- React Navigation v6 configured for lazy loading
