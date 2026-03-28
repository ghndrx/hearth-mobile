// Mock for expo - provides globalThis.expo required by jest-expo
const EventEmitter = jest.fn().mockImplementation(() => ({
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

const NativeModule = jest.fn();
const SharedObject = jest.fn();
const SharedRef = jest.fn();

globalThis.expo = {
  EventEmitter,
  NativeModule,
  SharedObject,
  SharedRef,
  isRunningInExpoGo: false,
};

module.exports = globalThis.expo;
