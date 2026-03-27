module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/**/__tests__/**/*.(ts|tsx|js)', '<rootDir>/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!node_modules/**',
    '!coverage/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-clone-referenced-element|@react-native-community|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|react-navigation|@react-navigation|@expo/.*|expo-.*|@expo-google-fonts|react-native-.*)/)'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      configFile: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-flow', { all: true }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
      plugins: [
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        '@babel/plugin-transform-flow-strip-types',
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ],
    }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/jest/react-native-mock.js',
    '^@react-native/js-polyfills/(.*)$': '<rootDir>/jest/polyfill-mock.js',
    '^expo-battery$': '<rootDir>/jest/expo-battery-mock.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
