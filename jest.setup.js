// Basic setup for tests
require('react-native-gesture-handler/jestSetup');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock additional React Native modules for PN-006
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  const mockEventEmitter = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    emit: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  return Object.setPrototypeOf(
    {
      ...RN,
      Platform: {
        ...RN.Platform,
        OS: 'android',
        Version: 28,
      },
      NativeModules: {
        ...RN.NativeModules,
        PlatformLocalStorage: {
          clear: jest.fn(),
          getAllKeys: jest.fn(() => Promise.resolve([])),
          getItem: jest.fn(() => Promise.resolve(null)),
          removeItem: jest.fn(() => Promise.resolve()),
          setItem: jest.fn(() => Promise.resolve()),
        },
        BatteryManager: {
          getBatteryInfo: jest.fn(() => Promise.resolve({
            level: 0.8,
            isCharging: false,
            isLowPowerMode: false,
            temperature: 25,
            health: 'good',
            technology: 'Li-ion'
          })),
          getBatteryLevel: jest.fn(() => Promise.resolve(0.8)),
          isPlugged: jest.fn(() => Promise.resolve(false)),
        },
        Battery: {
          getBatteryState: jest.fn(() => Promise.resolve({
            level: 0.8,
            isCharging: false,
            isLowPowerMode: false,
          })),
        },
      },
      DeviceEventEmitter: mockEventEmitter,
      NativeEventEmitter: jest.fn().mockImplementation(() => mockEventEmitter),
    },
    RN
  );
});

// Mock performance and other APIs
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};