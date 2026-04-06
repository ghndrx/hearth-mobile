import { FileUploadService } from '../lib/services/fileUpload/FileUploadService';
import { LocalFile } from '../lib/types';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  uploadAsync: jest.fn(() => Promise.resolve({
    body: JSON.stringify({
      id: 'test-upload-id',
      url: 'https://example.com/uploaded-file.jpg',
      filename: 'test-file.jpg',
      contentType: 'image/jpeg',
      size: 1000,
    })
  })),
  FileSystemUploadType: {
    MULTIPART: 1,
  }
}));

describe('FileUploadService', () => {
  let uploadService: FileUploadService;

  beforeEach(() => {
    uploadService = FileUploadService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = FileUploadService.getInstance();
    const instance2 = FileUploadService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should configure upload settings', () => {
    const config = {
      maxConcurrentUploads: 5,
      maxRetries: 2,
    };

    uploadService.configure(config);

    // Since we can't directly test the private config, we test via behavior
    expect(() => uploadService.configure(config)).not.toThrow();
  });

  it('should queue a file for upload', async () => {
    const localFile: LocalFile = {
      localId: 'test-local-id',
      uri: 'file://test.jpg',
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1000,
      fileType: 'image',
      width: 800,
      height: 600,
      createdAt: new Date(),
    };

    const uploadId = await uploadService.queueUpload(localFile);
    expect(typeof uploadId).toBe('string');
    expect(uploadId).toMatch(/^upload_/);
  });

  it('should get upload status', async () => {
    const localFile: LocalFile = {
      localId: 'test-local-id-2',
      uri: 'file://test2.jpg',
      name: 'test2.jpg',
      type: 'image/jpeg',
      size: 1000,
      fileType: 'image',
      createdAt: new Date(),
    };

    const uploadId = await uploadService.queueUpload(localFile);
    const status = uploadService.getUploadStatus(uploadId);

    expect(status).toBeTruthy();
    if (status) {
      expect(status.uploadId).toBe(uploadId);
      expect(status.localFile).toEqual(localFile);
    }
  });

  it('should get all uploads', () => {
    const allUploads = uploadService.getAllUploads();
    expect(Array.isArray(allUploads)).toBe(true);
  });

  it('should cancel an upload', async () => {
    const localFile: LocalFile = {
      localId: 'test-local-id-3',
      uri: 'file://test3.jpg',
      name: 'test3.jpg',
      type: 'image/jpeg',
      size: 1000,
      fileType: 'image',
      createdAt: new Date(),
    };

    const uploadId = await uploadService.queueUpload(localFile);
    await expect(uploadService.cancelUpload(uploadId)).resolves.not.toThrow();
  });

  it('should clear completed uploads', () => {
    expect(() => uploadService.clearCompleted()).not.toThrow();
  });

  it('should add and remove listeners', () => {
    const listener = {
      onProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    const removeListener = uploadService.addListener(listener);
    expect(typeof removeListener).toBe('function');

    // Test removing listener
    removeListener();
    // Should not throw
  });
});