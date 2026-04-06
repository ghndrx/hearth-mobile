/**
 * Mock for expo-file-system
 */

export const documentDirectory = 'file:///mock/documents/';

export const getInfoAsync = jest.fn(() =>
  Promise.resolve({
    exists: true,
    isDirectory: false,
    uri: 'file:///mock/test.jpg',
    size: 1024,
    modificationTime: Date.now(),
  })
);

export const makeDirectoryAsync = jest.fn(() => Promise.resolve());

export const deleteAsync = jest.fn(() => Promise.resolve());

export const readDirectoryAsync = jest.fn(() => Promise.resolve([]));

export const createDownloadResumable = jest.fn((url, localUri, options, callback) => ({
  downloadAsync: jest.fn(() =>
    Promise.resolve({
      uri: localUri,
    })
  ),
}));