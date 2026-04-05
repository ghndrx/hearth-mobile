/**
 * Mock for expo-document-picker
 */

export const getDocumentAsync = jest.fn(() =>
  Promise.resolve({
    canceled: true,
    assets: [],
  })
);