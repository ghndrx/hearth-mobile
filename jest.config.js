module.exports = {
  preset: 'react-native',
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
        '@babel/preset-typescript',
        '@babel/preset-react',
        'module:metro-react-native-babel-preset',
      ],
      plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-transform-flow-strip-types',
      ],
    }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': 'react-native',
  },
};
