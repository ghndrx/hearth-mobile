/**
 * Mock for expo-image-picker
 */

export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
};

export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const requestCameraPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const launchImageLibraryAsync = jest.fn(() =>
  Promise.resolve({
    canceled: true,
    assets: [],
  })
);

export const launchCameraAsync = jest.fn(() =>
  Promise.resolve({
    canceled: true,
    assets: [],
  })
);