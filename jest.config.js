module.exports = {
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      configFile: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/**/__tests__/**/*.(ts|tsx|js)', '<rootDir>/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!node_modules/**',
  ]
};
