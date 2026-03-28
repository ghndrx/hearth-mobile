// Mock for expo-modules-core
// Provides minimal exports needed by expo modules

const EventEmitter = jest.fn().mockImplementation(() => ({
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

const NativeModule = jest.fn();
const SharedObject = jest.fn();
const SharedRef = jest.fn();

// Set up globalThis.expo for jest-expo
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

module.exports = {
  EventEmitter,
  NativeModule,
  SharedObject,
  SharedRef,
  uuid: {
    v4: globalThis.expo.uuidv4,
    v5: globalThis.expo.uuidv5,
  },
  default: {
    EventEmitter,
    NativeModule,
    SharedObject,
    SharedRef,
  },
};
