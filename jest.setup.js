// Setup gesture handler for tests
require('react-native-gesture-handler/jestSetup');

// Mock React Native polyfills to avoid Flow type syntax issues
jest.mock('@react-native/js-polyfills/error-guard', () => ({
  setGlobalErrorHandler: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id-123')),
  dismissAllNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'expo-push-token-123' })),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: {
    DEFAULT: 'DEFAULT',
    HIGH: 'HIGH',
    LOW: 'LOW',
    MAX: 'MAX',
    MIN: 'MIN'
  }
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AppState: {
      ...RN.AppState,
      currentState: 'active',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

// Mock additional Expo modules
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 15',
  deviceName: 'Test iPhone',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  sessionId: 'test-session-123',
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'test-project-id'
      }
    }
  }
}));

// expo-battery is handled by moduleNameMapper

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      strength: 99,
      frequency: 5000,
      ipAddress: '192.168.1.100',
    }
  })),
  configure: jest.fn(),
}));

// Mock API service
jest.mock('./lib/services/api', () => ({
  registerDevice: jest.fn(() => Promise.resolve({
    id: 'device-reg-123',
    registeredAt: Date.now()
  })),
  unregisterDevice: jest.fn(() => Promise.resolve())
}));

// Mock websocket service
jest.mock('./lib/services/websocket', () => ({
  websocketService: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  WebSocketMessageType: {
    MESSAGE_NEW: 'MESSAGE_NEW',
    DM_NEW: 'DM_NEW',
    MENTION: 'MENTION',
    FRIEND_REQUEST: 'FRIEND_REQUEST',
    CALL_INCOMING: 'CALL_INCOMING',
  },
}));

// React Native Animated module is handled by our custom mock