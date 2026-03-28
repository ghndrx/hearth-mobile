const { defaults } = require('jest-config');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  setupFiles: [], // Skip React Native setup files that are causing issues with RN 0.76
  transformIgnorePatterns: [
    // Don't transform node_modules except for React Native modules and our own code
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|react-native-reanimated|react-native-gesture-handler|@react-native-async-storage|@react-native-community|react-native-safe-area-context|react-native-screens)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock React Native modules that cause issues in RN 0.76
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock specific polyfill files that contain Flow syntax
    '^@react-native/js-polyfills/(.*)': '<rootDir>/__mocks__/empty.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    // Ignore the specific polyfill directories that are causing issues
    '<rootDir>/node_modules/@react-native/js-polyfills',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
};