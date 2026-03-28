// Mock for React Native to avoid Flow syntax issues in RN 0.76

module.exports = {
  Platform: {
    OS: 'ios',
    Version: '17.0',
    select: jest.fn((options) => options.ios || options.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    openSettings: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  },
  // Add other React Native modules as needed for tests
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  PushNotificationIOS: {
    addEventListener: jest.fn(),
    requestPermissions: jest.fn(() => Promise.resolve()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  },
};