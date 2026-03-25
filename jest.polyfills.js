// Jest polyfills for React Native without problematic Flow syntax
// This replaces react-native/jest/setup.js to avoid Flow type parsing errors

// Mock console to avoid spam during tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global fetch
global.fetch = jest.fn();

// Mock URL and URLSearchParams
global.URL = jest.fn(() => ({
  href: '',
  origin: '',
  protocol: '',
  username: '',
  password: '',
  host: '',
  hostname: '',
  port: '',
  pathname: '',
  search: '',
  hash: '',
  searchParams: new URLSearchParams(),
}));

global.URLSearchParams = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  toString: jest.fn(() => ''),
}));

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock setTimeout and clearTimeout if needed
if (!global.setTimeout) {
  global.setTimeout = jest.fn((fn, delay) => {
    return setTimeout(fn, delay);
  });
}

if (!global.clearTimeout) {
  global.clearTimeout = jest.fn((id) => {
    return clearTimeout(id);
  });
}

// Mock setImmediate
global.setImmediate = jest.fn((fn) => setTimeout(fn, 0));
global.clearImmediate = jest.fn((id) => clearTimeout(id));