// Mock for expo-modules-core
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

export const mockPermissionResponse = {
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
};

export const requireNativeViewManager = () => null;
export const requireNativeModule = () => ({});
export const getViewManagerAdapterCommandsFromViewConfig = () => ({});

// Export commonly needed types/values
export { mockPermissionResponse as PermissionResponse };
export { PermissionStatus as PermissionExpiration };

// Mock platform
export const Platform = {
  OS: 'ios',
  select: (options) => options.ios || options.default,
};

// Mock other common exports
export const EventEmitter = class EventEmitter {
  addListener = jest.fn();
  removeListener = jest.fn();
  removeAllListeners = jest.fn();
  emit = jest.fn();
};