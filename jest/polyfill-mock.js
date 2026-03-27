// Mock for React Native polyfills to avoid Flow type syntax issues
module.exports = {
  setGlobalErrorHandler: jest.fn(),
  getGlobalErrorHandler: jest.fn(),
  default: {},
};