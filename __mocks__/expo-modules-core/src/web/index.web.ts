// Mock for expo-modules-core/src/web/index.web
// Required by jest-expo preset

const EventEmitter = jest.fn().mockImplementation(() => ({
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

const NativeModule = jest.fn();
const SharedObject = jest.fn();
const SharedRef = jest.fn();

// Set up globalThis.expo for jest-expo
if (!globalThis.expo) {
  globalThis.expo = {
    EventEmitter,
    NativeModule,
    SharedObject,
    SharedRef,
    modules: {},
    uuidv4: jest.fn(),
    uuidv5: jest.fn(),
    getViewConfig: jest.fn(),
    reloadAppAsync: jest.fn(),
  };
}

export function registerWebGlobals() {}

export {};
