// Mock for expo-modules-core web index
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

export const Platform = {
  OS: 'web',
  select: (options) => options.web || options.default,
};