const { defaults } = require('jest-config');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  setupFiles: [], // Skip React Native setup files that are causing issues with RN 0.76
  transformIgnorePatterns: [
    // Don't transform node_modules except for React Native modules and our own code
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|react-native-reanimated|react-native-gesture-handler|@react-native-async-storage|@react-native-community|react-native-safe-area-context|react-native-screens|expo-modules-core)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock React Native modules that cause issues in RN 0.76
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock AsyncStorage
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    // Mock specific polyfill files that contain Flow syntax
    '^@react-native/js-polyfills/(.*)': '<rootDir>/__mocks__/empty.js',
    // Mock expo to work with jest-expo
    '^expo$': '<rootDir>/__mocks__/expo.js',
    // Mock expo-modules-core to prevent web index from loading
    '^expo-modules-core$': '<rootDir>/__mocks__/expo-modules-core.js',
    '^expo-modules-core/src/web/index.web$': '<rootDir>/__mocks__/expo-modules-core/src/web/index.web.ts',
    // Mock expo/src/winter required by jest-expo
    '^expo/src/winter$': '<rootDir>/__mocks__/expo/src/winter/index.ts',
    '^expo/src/winter/(.*)$': '<rootDir>/__mocks__/expo/src/winter/index.ts',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    // Ignore the specific polyfill directories that are causing issues
    '<rootDir>/node_modules/@react-native/js-polyfills',
  ],
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/?(*.)(test|spec).(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.jest.js' }],
  },
};