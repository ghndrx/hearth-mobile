/**
 * Mock for expo-media-library
 */

export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const createAssetAsync = jest.fn((uri) =>
  Promise.resolve({
    id: `asset_${Date.now()}`,
    filename: 'mock_asset.jpg',
    uri,
    mediaType: 'photo',
    width: 1920,
    height: 1080,
    creationTime: new Date().getTime(),
    modificationTime: new Date().getTime(),
    duration: 0,
  })
);

export const getAlbumAsync = jest.fn((albumName) =>
  Promise.resolve(albumName === 'Hearth' ? {
    id: 'hearth_album',
    title: 'Hearth',
    assetCount: 0,
  } : null)
);

export const createAlbumAsync = jest.fn((albumName, asset, copyAsset) =>
  Promise.resolve({
    id: 'new_album_id',
    title: albumName,
    assetCount: 1,
  })
);

export const addAssetsToAlbumAsync = jest.fn((assets, album, copyAssets) =>
  Promise.resolve(true)
);

export const MediaType = {
  photo: 'photo',
  video: 'video',
  audio: 'audio',
  unknown: 'unknown',
};

// Export mock functions for testing
export const mockMediaLibraryPermissions = {
  setGranted: (granted) => {
    const status = granted ? 'granted' : 'denied';
    requestPermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
    getPermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
  },

  reset: () => {
    requestPermissionsAsync.mockClear();
    getPermissionsAsync.mockClear();
    createAssetAsync.mockClear();
    getAlbumAsync.mockClear();
    createAlbumAsync.mockClear();
    addAssetsToAlbumAsync.mockClear();
  },
};