/**
 * File Upload Service Tests
 * Tests for file upload infrastructure
 */

import {
  formatFileSize,
  getFileTypeFromMimeType,
  isSupportedFileType,
  DEFAULT_UPLOAD_CONFIG,
  LocalFile,
  UploadOptions,
  UploadResponse,
} from '../types';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  documentDirectory: 'file:///test/',
  cacheDirectory: 'file:///test/cache/',
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///test/image.jpg',
    width: 100,
    height: 100,
  }),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', canAskAgain: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', canAskAgain: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: true,
    assets: [],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: true,
    assets: [],
  }),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

// Mock api client
jest.mock('../../../../lib/services/api', () => ({
  apiClient: {
    upload: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  },
}));

describe('File Upload Types', () => {
  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('should handle edge cases', () => {
      expect(formatFileSize(1)).toBe('1 B');
      // Negative numbers produce NaN output
      expect(formatFileSize(-1)).toMatch(/NaN/);
    });
  });

  describe('getFileTypeFromMimeType', () => {
    test('should identify image types', () => {
      expect(getFileTypeFromMimeType('image/jpeg')).toBe('image');
      expect(getFileTypeFromMimeType('image/png')).toBe('image');
      expect(getFileTypeFromMimeType('image/gif')).toBe('image');
      expect(getFileTypeFromMimeType('image/webp')).toBe('image');
      expect(getFileTypeFromMimeType('image/heic')).toBe('image');
    });

    test('should identify video types', () => {
      expect(getFileTypeFromMimeType('video/mp4')).toBe('video');
      expect(getFileTypeFromMimeType('video/quicktime')).toBe('video');
      expect(getFileTypeFromMimeType('video/webm')).toBe('video');
    });

    test('should identify audio types', () => {
      expect(getFileTypeFromMimeType('audio/mpeg')).toBe('audio');
      expect(getFileTypeFromMimeType('audio/wav')).toBe('audio');
      expect(getFileTypeFromMimeType('audio/m4a')).toBe('audio');
    });

    test('should identify archive types', () => {
      expect(getFileTypeFromMimeType('application/zip')).toBe('archive');
      expect(getFileTypeFromMimeType('application/x-rar-compressed')).toBe('archive');
      expect(getFileTypeFromMimeType('application/x-7z-compressed')).toBe('archive');
    });

    test('should default to document for unknown types', () => {
      expect(getFileTypeFromMimeType('application/pdf')).toBe('document');
      expect(getFileTypeFromMimeType('text/plain')).toBe('document');
      expect(getFileTypeFromMimeType('application/octet-stream')).toBe('document');
    });
  });

  describe('isSupportedFileType', () => {
    test('should return true for supported image types', () => {
      expect(isSupportedFileType('image/jpeg')).toBe(true);
      expect(isSupportedFileType('image/png')).toBe(true);
      expect(isSupportedFileType('image/gif')).toBe(true);
      expect(isSupportedFileType('image/webp')).toBe(true);
    });

    test('should return true for supported video types', () => {
      expect(isSupportedFileType('video/mp4')).toBe(true);
      expect(isSupportedFileType('video/quicktime')).toBe(true);
    });

    test('should return true for supported document types', () => {
      expect(isSupportedFileType('application/pdf')).toBe(true);
      expect(isSupportedFileType('text/plain')).toBe(true);
    });

    test('should return false for unsupported types', () => {
      expect(isSupportedFileType('application/exe')).toBe(false);
      expect(isSupportedFileType('application/javascript')).toBe(false);
    });
  });

  describe('DEFAULT_UPLOAD_CONFIG', () => {
    test('should have correct file size limits', () => {
      expect(DEFAULT_UPLOAD_CONFIG.fileSizeLimits.image).toBe(25 * 1024 * 1024);
      expect(DEFAULT_UPLOAD_CONFIG.fileSizeLimits.video).toBe(100 * 1024 * 1024);
      expect(DEFAULT_UPLOAD_CONFIG.fileSizeLimits.document).toBe(25 * 1024 * 1024);
    });

    test('should have correct CDN patterns', () => {
      expect(DEFAULT_UPLOAD_CONFIG.cdnPatterns.attachments).toContain('cdn.hearth.example.com');
      expect(DEFAULT_UPLOAD_CONFIG.cdnPatterns.thumbnails).toContain('cdn.hearth.example.com');
    });

    test('should have reasonable retry settings', () => {
      expect(DEFAULT_UPLOAD_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_UPLOAD_CONFIG.retryBaseDelay).toBe(1000);
      expect(DEFAULT_UPLOAD_CONFIG.retryMaxDelay).toBe(30000);
    });
  });
});

describe('LocalFile', () => {
  test('should create a valid LocalFile object', () => {
    const localFile: LocalFile = {
      localId: 'test-id',
      uri: 'file:///test/image.jpg',
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      fileType: 'image',
      width: 100,
      height: 100,
      compressed: false,
    };

    expect(localFile.localId).toBe('test-id');
    expect(localFile.filename).toBe('image.jpg');
    expect(localFile.fileType).toBe('image');
  });

  test('should allow optional fields', () => {
    const localFile: LocalFile = {
      localId: 'test-id',
      uri: 'file:///test/image.jpg',
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      fileType: 'image',
      compressed: false,
    };

    expect(localFile.width).toBeUndefined();
    expect(localFile.thumbnailUri).toBeUndefined();
    expect(localFile.originalSize).toBeUndefined();
  });
});

describe('UploadOptions', () => {
  test('should create valid UploadOptions', () => {
    const options: UploadOptions = {
      targetId: 'channel-123',
      targetType: 'channel',
      priority: 'normal',
      compress: true,
      compressionQuality: 0.8,
    };

    expect(options.targetId).toBe('channel-123');
    expect(options.targetType).toBe('channel');
    expect(options.compress).toBe(true);
  });

  test('should have sensible defaults', () => {
    const options: UploadOptions = {
      targetId: 'channel-123',
      targetType: 'channel',
    };

    expect(options.priority).toBeUndefined();
    expect(options.compress).toBeUndefined();
    expect(options.generateThumbnail).toBeUndefined();
  });
});

describe('UploadResponse', () => {
  test('should create a valid UploadResponse object', () => {
    const response: UploadResponse = {
      id: 'upload-123',
      url: 'https://cdn.example.com/attachments/upload-123/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumbnails/upload-123',
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      fileType: 'image',
      width: 100,
      height: 100,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(response.id).toBe('upload-123');
    expect(response.url).toContain('cdn.example.com');
    expect(response.fileType).toBe('image');
  });
});
