// Mock implementation of @react-native-async-storage/async-storage
const AsyncStorage = {
  storage: new Map(),

  getItem: jest.fn(async (key) => {
    return AsyncStorage.storage.get(key) || null;
  }),

  setItem: jest.fn(async (key, value) => {
    AsyncStorage.storage.set(key, value);
    return Promise.resolve();
  }),

  removeItem: jest.fn(async (key) => {
    AsyncStorage.storage.delete(key);
    return Promise.resolve();
  }),

  clear: jest.fn(async () => {
    AsyncStorage.storage.clear();
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(async () => {
    return Array.from(AsyncStorage.storage.keys());
  }),

  multiGet: jest.fn(async (keys) => {
    return keys.map(key => [key, AsyncStorage.storage.get(key) || null]);
  }),

  multiSet: jest.fn(async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      AsyncStorage.storage.set(key, value);
    });
    return Promise.resolve();
  }),

  multiRemove: jest.fn(async (keys) => {
    keys.forEach(key => {
      AsyncStorage.storage.delete(key);
    });
    return Promise.resolve();
  })
};

export default AsyncStorage;