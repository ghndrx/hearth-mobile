// Jest setup file
import 'react-native-gesture-handler/jestSetup';

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock react-native modules that need special handling
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Set up global test environment
global.__DEV__ = true;