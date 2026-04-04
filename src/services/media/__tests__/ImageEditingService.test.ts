import ImageEditingService, { EditableImage, CropRegion, ImageAnnotation } from '../ImageEditingService';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Mock the expo modules
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
  },
  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}));

describe('ImageEditingService', () => {
  let service: ImageEditingService;

  beforeEach(() => {
    service = ImageEditingService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = ImageEditingService.getInstance();
      const instance2 = ImageEditingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initializeEditableImage', () => {
    it('should initialize an editable image successfully', async () => {
      const mockUri = 'file://test-image.jpg';
      const mockFileInfo = { exists: true };
      const mockManipulateResult = {
        uri: mockUri,
        width: 1000,
        height: 800,
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockManipulateResult);

      const result = await service.initializeEditableImage(mockUri);

      expect(result).toEqual({
        uri: mockUri,
        width: 1000,
        height: 800,
        originalUri: mockUri,
        filters: {},
        annotations: [],
      });

      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(mockUri);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
    });

    it('should throw error if file does not exist', async () => {
      const mockUri = 'file://nonexistent.jpg';
      const mockFileInfo = { exists: false };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      await expect(service.initializeEditableImage(mockUri)).rejects.toThrow('Image file not found');
    });
  });

  describe('cropImage', () => {
    it('should crop an image successfully', async () => {
      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [],
      };

      const mockCropRegion: CropRegion = {
        originX: 100,
        originY: 50,
        width: 500,
        height: 400,
      };

      const mockManipulateResult = {
        uri: 'file://cropped.jpg',
        width: 500,
        height: 400,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockManipulateResult);

      const result = await service.cropImage(mockEditableImage, mockCropRegion);

      expect(result).toEqual({
        ...mockEditableImage,
        uri: 'file://cropped.jpg',
        width: 500,
        height: 400,
        cropRegion: mockCropRegion,
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockEditableImage.originalUri,
        [
          {
            crop: {
              originX: 100,
              originY: 50,
              width: 500,
              height: 400,
            },
          },
        ],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
      );
    });
  });

  describe('addAnnotation', () => {
    it('should add an annotation to the image', () => {
      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [],
      };

      const mockAnnotation: ImageAnnotation = {
        type: 'text',
        x: 100,
        y: 200,
        content: 'Test text',
        color: '#FFFFFF',
        fontSize: 20,
      };

      const result = service.addAnnotation(mockEditableImage, mockAnnotation);

      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0]).toEqual(mockAnnotation);
      expect(result.annotations).not.toBe(mockEditableImage.annotations); // Should be a new array
    });
  });

  describe('removeAnnotation', () => {
    it('should remove an annotation from the image', () => {
      const mockAnnotation: ImageAnnotation = {
        type: 'text',
        x: 100,
        y: 200,
        content: 'Test text',
        color: '#FFFFFF',
        fontSize: 20,
      };

      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [mockAnnotation],
      };

      const result = service.removeAnnotation(mockEditableImage, 0);

      expect(result.annotations).toHaveLength(0);
      expect(result.annotations).not.toBe(mockEditableImage.annotations); // Should be a new array
    });
  });

  describe('rotateImage', () => {
    it('should rotate an image successfully', async () => {
      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [],
      };

      const mockManipulateResult = {
        uri: 'file://rotated.jpg',
        width: 800,
        height: 1000,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockManipulateResult);

      const result = await service.rotateImage(mockEditableImage, 90);

      expect(result).toEqual({
        ...mockEditableImage,
        uri: 'file://rotated.jpg',
        width: 800,
        height: 1000,
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockEditableImage.uri,
        [{ rotate: 90 }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
      );
    });
  });

  describe('flipImage', () => {
    it('should flip an image horizontally', async () => {
      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [],
      };

      const mockManipulateResult = {
        uri: 'file://flipped.jpg',
        width: 1000,
        height: 800,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockManipulateResult);

      const result = await service.flipImage(mockEditableImage, 'horizontal');

      expect(result.uri).toBe('file://flipped.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockEditableImage.uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
      );
    });
  });

  describe('getPresetFilters', () => {
    it('should return an array of preset filters', () => {
      const filters = service.getPresetFilters();

      expect(filters).toBeInstanceOf(Array);
      expect(filters.length).toBeGreaterThan(0);
      expect(filters[0]).toHaveProperty('name');
      expect(filters[0]).toHaveProperty('label');
      expect(filters[0]).toHaveProperty('adjustments');
    });
  });

  describe('finalizeImage', () => {
    it('should return the current URI for finalized image', async () => {
      const mockEditableImage: EditableImage = {
        uri: 'file://test.jpg',
        width: 1000,
        height: 800,
        originalUri: 'file://original.jpg',
        filters: {},
        annotations: [],
      };

      const result = await service.finalizeImage(mockEditableImage);
      expect(result).toBe(mockEditableImage.uri);
    });
  });
});